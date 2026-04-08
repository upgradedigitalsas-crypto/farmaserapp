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
    // Volvemos a la validación segura por URL
    const { searchParams } = new URL(request.url);
    if (searchParams.get('token') !== 'farmaser_admin_123') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const todayObj = new Date();
    todayObj.setDate(todayObj.getDate() + 1);
    const tomorrowStr = todayObj.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    const snapshot = await db.collection('planned_visits').where('visitDate', '==', tomorrowStr).get();
    
    if (snapshot.empty) {
      return NextResponse.json({ message: `No hay rutas programadas para ${tomorrowStr}` });
    }

    const visitsByRep: Record<string, any[]> = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const email = data.userEmail;
      if (!visitsByRep[email]) visitsByRep[email] = [];
      visitsByRep[email].push(data);
    });

    const emailPromises = Object.keys(visitsByRep).map(async (repEmail) => {
      const visits = visitsByRep[repEmail].sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));

      let htmlContent = `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #eee;border-radius:20px;padding:30px;">
          <h2 style="color:#2563eb;text-align:center;font-size:24px;margin-bottom:10px;">¡Prepara tu día de mañana! 🚀</h2>
          <p style="text-align:center;color:#64748b;font-size:14px;margin-bottom:30px;">Aquí tienes tu itinerario programado para el <strong>${tomorrowStr}</strong>.</p>
          <div style="display:flex;flex-direction:column;gap:15px;">
      `;

      visits.forEach((v, index) => {
        htmlContent += `
          <div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:20px;border-radius:0 15px 15px 0;">
            <p style="margin:0;font-size:12px;color:#3b82f6;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">🕒 ${v.startTime || 'Sin hora'} ${v.endTime ? ` - ${v.endTime}` : ''}</p>
            <p style="margin:0;font-size:18px;font-weight:900;color:#0f172a;text-transform:uppercase;">${v.doctorName}</p>
            <p style="margin:5px 0 0 0;font-size:12px;color:#64748b;font-weight:bold;text-transform:uppercase;">
               📍 ${v.doctorDetails?.address || 'Dirección no registrada'} — ${v.doctorDetails?.city || ''}
            </p>
          </div>
        `;
      });

      htmlContent += `
          </div>
          <div style="margin-top:40px;text-align:center;">
            <a href="https://www.gestiondiariafarmaser.com/reports" style="background:#2563eb;color:white;padding:15px 25px;text-decoration:none;border-radius:10px;font-weight:bold;font-size:13px;text-transform:uppercase;">IR A LA APP PARA REPORTAR</a>
          </div>
          <p style="margin-top:30px;font-size:10px;color:#94a3b8;text-align:center;text-transform:uppercase;">Sistema de Notificaciones Automáticas Farmaser</p>
        </div>`;

      return fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY as string },
        body: JSON.stringify({
          sender: { name: "Gestion Diaria Farmaser", email: "notificaciones@gestiondiariafarmaser.com" },
          to: [{ email: repEmail }],
          subject: `📋 Tu Ruta para Mañana (${tomorrowStr})`,
          htmlContent: htmlContent
        }),
      });
    });

    await Promise.all(emailPromises);
    return NextResponse.json({ success: true, visitadores_notificados: Object.keys(visitsByRep).length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
