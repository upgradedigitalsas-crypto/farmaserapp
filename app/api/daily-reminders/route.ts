import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// 1. Inicializamos el Pase Maestro (Admin) igual que el otro reporte
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
    // Usamos el token que ya probaste
    if (searchParams.get('token') !== 'farmaser_admin_123') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Calculamos la fecha de MAÑANA en horario Colombia
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    // 3. Buscamos citas para mañana (Usando el Pase Maestro)
    const snap = await db.collection('planned_visits')
      .where('visitDate', '==', tomorrowStr)
      .where('status', '==', 'Planeada')
      .get();

    if (snap.empty) {
      return NextResponse.json({ message: 'No hay citas para mañana' });
    }

    // 4. Agrupamos por visitador
    const visitsByRep: Record<string, any[]> = {};
    snap.docs.forEach(doc => {
      const v = doc.data();
      const email = v.userEmail?.toLowerCase().trim();
      if (email) {
        if (!visitsByRep[email]) visitsByRep[email] = [];
        visitsByRep[email].push(v);
      }
    });

    // 5. Enviamos con Brevo (Igual que tu reporte exitoso)
    const emailPromises = Object.keys(visitsByRep).map(async (email) => {
      const repVisits = visitsByRep[email];
      repVisits.sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));

      let tableRows = '';
      repVisits.forEach(v => {
        tableRows += `
          <tr>
            <td style="padding:10px;border-bottom:1px solid #eee;"><strong>${v.startTime || '--:--'}</strong></td>
            <td style="padding:10px;border-bottom:1px solid #eee;">${v.doctorName || 'N/A'}</td>
            <td style="padding:10px;border-bottom:1px solid #eee;">${v.doctorDetails?.category || 'A'}</td>
            <td style="padding:10px;border-bottom:1px solid #eee;">${v.doctorDetails?.city || 'N/A'}</td>
            <td style="padding:10px;border-bottom:1px solid #eee;font-size:11px;color:#666;">${v.doctorDetails?.address || 'Sin dirección'}</td>
          </tr>`;
      });

      return fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY as string,
        },
        body: JSON.stringify({
          sender: { name: "Gestion Farmaser", email: "notificaciones@gestiondiariafarmaser.com" },
          to: [{ email: email }],
          subject: `📋 Recordatorio: Tu Ruta de Mañana (${tomorrowStr})`,
          htmlContent: `
            <div style="font-family:sans-serif;max-width:700px;margin:auto;border:1px solid #eee;padding:20px;border-radius:15px;">
              <h2 style="color:#1e3a8a;text-align:center;">Hoja de Ruta - Mañana</h2>
              <p>Hola, este es tu recordatorio de visitas para mañana <strong>${tomorrowStr}</strong>:</p>
              <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:20px;">
                <thead>
                  <tr style="background:#f8fafc;text-align:left;">
                    <th style="padding:10px;border-bottom:2px solid #e2e8f0;">Hora</th>
                    <th style="padding:10px;border-bottom:2px solid #e2e8f0;">Médico/Droguería</th>
                    <th style="padding:10px;border-bottom:2px solid #e2e8f0;">Cat.</th>
                    <th style="padding:10px;border-bottom:2px solid #e2e8f0;">Ciudad</th>
                    <th style="padding:10px;border-bottom:2px solid #e2e8f0;">Dirección</th>
                  </tr>
                </thead>
                <tbody>${tableRows}</tbody>
              </table>
              <div style="margin-top:30px;text-align:center;">
                <a href="https://www.gestiondiariafarmaser.com/reports" style="background:#2563eb;color:white;padding:12px 20px;text-decoration:none;border-radius:8px;font-weight:bold;">IR A REPORTAR</a>
              </div>
            </div>`
        }),
      });
    });

    await Promise.all(emailPromises);
    return NextResponse.json({ success: true, visitadores_notificados: Object.keys(visitsByRep).length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
