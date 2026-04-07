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
    if (searchParams.get('token') !== 'farmaser_admin_123') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const snap = await db.collection('planned_visits')
      .where('visitDate', '==', tomorrowStr)
      .where('status', '==', 'Planeada')
      .get();

    if (snap.empty) return NextResponse.json({ message: 'No hay citas para mañana' });

    const visitsByRep: Record<string, any[]> = {};
    snap.docs.forEach(doc => {
      const v = doc.data();
      const email = v.userEmail?.toLowerCase().trim();
      if (email) {
        if (!visitsByRep[email]) visitsByRep[email] = [];
        visitsByRep[email].push(v);
      }
    });

    const emailPromises = Object.keys(visitsByRep).map(async (email) => {
      const repVisits = visitsByRep[email];
      repVisits.sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));

      let tableRows = '';
      repVisits.forEach(v => {
        const detail = v.doctorDetails || {};
        
        // 🛠️ TRATAMIENTO DE DIRECCIÓN (Misma lógica de Cartera)
        const direccion = detail.address || detail.direccion || '';
        const barrio = detail.neighborhood || detail.barrio || '';
        
        // Si la dirección es "Principal", intentamos usar el barrio. 
        // Si no hay barrio, dejamos "Principal" para no dejarlo vacío.
        let dirFinal = '';
        if (direccion === 'Principal') {
           dirFinal = barrio || 'Principal';
        } else {
           dirFinal = `${direccion} ${barrio}`.trim();
        }

        tableRows += `
          <tr>
            <td style="padding:10px;border-bottom:1px solid #eee;"><strong>${v.startTime || '--:--'}</strong></td>
            <td style="padding:10px;border-bottom:1px solid #eee;">${v.doctorName || 'N/A'}</td>
            <td style="padding:10px;border-bottom:1px solid #eee;">${detail.category || 'A'}</td>
            <td style="padding:10px;border-bottom:1px solid #eee;">${detail.city || 'N/A'}</td>
            <td style="padding:10px;border-bottom:1px solid #eee;font-size:11px;color:#2563eb;font-weight:bold;text-transform:uppercase;">${dirFinal}</td>
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
            <div style="font-family:sans-serif;max-width:800px;margin:auto;border:1px solid #eee;padding:20px;border-radius:15px;">
              <h2 style="color:#1e3a8a;text-align:center;text-transform:uppercase;font-style:italic;">Hoja de Ruta - Mañana</h2>
              <p style="color:#64748b;font-size:14px;">Hola, este es tu recordatorio de visitas programadas para mañana <strong>${tomorrowStr}</strong>:</p>
              <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:20px;">
                <thead>
                  <tr style="background:#f8fafc;text-align:left;color:#475569;text-transform:uppercase;font-size:10px;">
                    <th style="padding:12px;border-bottom:2px solid #e2e8f0;">Hora</th>
                    <th style="padding:12px;border-bottom:2px solid #e2e8f0;">Médico/Droguería</th>
                    <th style="padding:12px;border-bottom:2px solid #e2e8f0;">Cat.</th>
                    <th style="padding:12px;border-bottom:2px solid #e2e8f0;">Ciudad</th>
                    <th style="padding:12px;border-bottom:2px solid #e2e8f0;">Dirección Completa (Columna E)</th>
                  </tr>
                </thead>
                <tbody>${tableRows}</tbody>
              </table>
              <div style="margin-top:40px;text-align:center;">
                <a href="https://www.gestiondiariafarmaser.com/reports" style="background:#2563eb;color:white;padding:15px 25px;text-decoration:none;border-radius:10px;font-weight:bold;font-size:13px;text-transform:uppercase;">IR A LA APP PARA REPORTAR</a>
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
