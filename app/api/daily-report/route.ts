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
    const { searchParams } = new URL(request.url);
    if (searchParams.get('token') !== 'farmaser-cron-secreto-2026') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    const adminEmail = 'entrenamientofarmaser@gmail.com';

    const plannedSnap = await db.collection('planned_visits').where('visitDate', '==', today).get();
    const realSnap = await db.collection('visits').where('date', '==', today).get();

    if (plannedSnap.empty && realSnap.empty) {
      return NextResponse.json({ message: 'Sin actividad hoy' });
    }

    let tableRows = '';
    const all = [
      ...plannedSnap.docs.map(d => ({...d.data(), type: 'Planeada'})),
      ...realSnap.docs.map(d => ({...d.data(), type: 'Reportada'}))
    ];
    
    all.forEach((v: any) => {
      const isReported = v.type === 'Reportada';
      tableRows += `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee;">${v.userEmail || v.representativeEmail || 'N/A'}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;">${v.startTime || '--'}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;">${v.doctorName || v.doctor || 'N/A'}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;">
            <span style="background: ${isReported ? '#dcfce7' : '#fef9c3'}; color: ${isReported ? '#166534' : '#854d0e'}; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; text-transform: uppercase;">
              ${v.type}
            </span>
          </td>
        </tr>`;
    });

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY as string,
      },
      body: JSON.stringify({
        sender: { name: "Gestion Diaria Farmaser", email: "notificaciones@gestiondiariafarmaser.com" },
        to: [{ email: adminEmail }],
        subject: `📊 Reporte Diario Farmaser - ${today}`,
        htmlContent: `
          <div style="font-family:sans-serif;max-width:700px;margin:auto;border:1px solid #eee;padding:20px;border-radius:15px;">
            <h2 style="color:#1e3a8a;">Reporte de Actividad - ${today}</h2>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead>
                <tr style="background:#f8fafc;text-align:left;">
                  <th style="padding:10px;border-bottom:2px solid #e2e8f0;">Visitador</th>
                  <th style="padding:10px;border-bottom:2px solid #e2e8f0;">Hora</th>
                  <th style="padding:10px;border-bottom:2px solid #e2e8f0;">Médico o Droguería</th>
                  <th style="padding:10px;border-bottom:2px solid #e2e8f0;">Estado</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>`
      }),
    });

    const data = await res.json();
    return NextResponse.json({ success: res.ok, detail: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
