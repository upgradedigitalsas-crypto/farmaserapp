import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const rawKey = process.env.FIREBASE_PRIVATE_KEY;
    const formattedKey = rawKey ? rawKey.replace(/\\n/g, '\n').replace(/"/g, '').trim() : undefined;
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedKey,
      }),
    });
  } catch (error: any) {
    console.error('Error Admin:', error.message);
  }
}

const db = admin.firestore();
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 🛡️ SEGURIDAD CRON VERCEL
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Acceso denegado. Solo Vercel puede ejecutar esto.' }, { status: 401 });
    }

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    const adminEmail = 'entrenamientofarmaser@gmail.com';

    const plannedSnap = await db.collection('planned_visits').where('visitDate', '==', today).get();
    const realSnap = await db.collection('visit_reports').where('reportedAt', '>=', new Date(today)).get();

    if (plannedSnap.empty && realSnap.empty) {
      return NextResponse.json({ message: 'Sin actividad hoy' });
    }

    let tableRows = '';
    const allPlanned = plannedSnap.docs.map(d => ({...d.data(), type: 'Planeada'}));
    const allReal = realSnap.docs.map(d => ({...d.data(), type: 'Reportada'}));

    [...allPlanned, ...allReal].forEach((v: any) => {
      const isReported = v.type === 'Reportada';
      tableRows += `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #eee;font-size:12px;">${v.userEmail || 'N/A'}</td>
          <td style="padding:12px;border-bottom:1px solid #eee;font-size:12px;">${v.startTime || '--:--'}</td>
          <td style="padding:12px;border-bottom:1px solid #eee;font-size:12px;"><strong>${v.doctorName || 'N/A'}</strong></td>
          <td style="padding:12px;border-bottom:1px solid #eee;">
            <span style="background:${isReported ? '#dcfce7' : '#fef9c3'};color:${isReported ? '#166534' : '#854d0e'};padding:4px 8px;border-radius:6px;font-size:10px;font-weight:bold;text-transform:uppercase;">
              ${v.type}
            </span>
          </td>
        </tr>`;
    });

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY as string },
      body: JSON.stringify({
        sender: { name: "Gestion Diaria Farmaser", email: "notificaciones@gestiondiariafarmaser.com" },
        to: [{ email: adminEmail }],
        subject: `📊 Reporte Gerencial Farmaser - ${today}`,
        htmlContent: `
          <div style="font-family:sans-serif;max-width:700px;margin:auto;border:1px solid #eee;padding:30px;border-radius:20px;">
            <h2 style="color:#1e3a8a;margin-bottom:20px;">Resumen de Actividad Diaria</h2>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#f8fafc;text-align:left;">
                  <th style="padding:12px;border-bottom:2px solid #e2e8f0;font-size:11px;color:#64748b;text-transform:uppercase;">Visitador</th>
                  <th style="padding:12px;border-bottom:2px solid #e2e8f0;font-size:11px;color:#64748b;text-transform:uppercase;">Hora</th>
                  <th style="padding:12px;border-bottom:2px solid #e2e8f0;font-size:11px;color:#64748b;text-transform:uppercase;">Médico</th>
                  <th style="padding:12px;border-bottom:2px solid #e2e8f0;font-size:11px;color:#64748b;text-transform:uppercase;">Estado</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>`
      }),
    });

    return NextResponse.json({ success: true, date: today });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
