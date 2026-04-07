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
      tableRows += `<tr><td style="padding:10px;border-bottom:1px solid #eee;">${v.userEmail || v.representativeEmail || 'N/A'}</td><td style="padding:10px;border-bottom:1px solid #eee;">${v.startTime || '--'}</td><td style="padding:10px;border-bottom:1px solid #eee;">${v.doctorName || v.doctor || 'N/A'}</td></tr>`;
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
        htmlContent: `<div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #eee;padding:20px;border-radius:15px;"><h2>Reporte Diario - ${today}</h2><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f8fafc;text-align:left;"><th style="padding:10px;">Visitador</th><th style="padding:10px;">Hora</th><th style="padding:10px;">Contacto</th></tr></thead><tbody>${tableRows}</tbody></table></div>`
      }),
    });

    const brevoData = await res.json();
    return NextResponse.json({ success: res.ok, detail: brevoData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
