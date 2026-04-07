import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const rawKey = process.env.FIREBASE_PRIVATE_KEY;
    const formattedKey = rawKey 
      ? rawKey.replace(/\\n/g, '\n').replace(/"/g, '').trim() 
      : undefined;

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedKey,
      }),
    });
  } catch (error: any) {
    console.error('Error de inicialización Admin:', error.message);
  }
}

const db = admin.firestore();
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (token !== 'farmaser-cron-secreto-2026') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    const adminEmail = 'entrenamientofarmaser@gmail.com';

    // Buscar actividad de hoy
    const plannedSnap = await db.collection('planned_visits').where('visitDate', '==', today).get();
    const plannedVisits = plannedSnap.docs.map(d => d.data());

    const realSnap = await db.collection('visits').where('date', '==', today).get();
    const realVisits = realSnap.docs.map(d => d.data());

    if (plannedVisits.length === 0 && realVisits.length === 0) {
      return NextResponse.json({ message: `Sin actividad reportada para el dia ${today}` });
    }

    let tableRows = '';
    const allActivity = [
      ...plannedVisits.map(v => ({...v, type: 'Planeada'})), 
      ...realVisits.map(v => ({...v, type: 'Reportada'}))
    ];

    allActivity.forEach((item: any) => {
      tableRows += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.userEmail || item.representativeEmail || 'N/A'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.startTime || '--'} a ${item.endTime || '--'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.doctorName || item.doctor || 'N/A'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">
            <span style="background: ${item.type === 'Reportada' ? '#dcfce7' : '#dbeafe'}; color: ${item.type === 'Reportada' ? '#166534' : '#1e40af'}; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">
              ${item.type.toUpperCase()}
            </span>
          </td>
        </tr>
      `;
    });

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 15px;">
        <h2 style="color: #1e3a8a; text-transform: uppercase; font-size: 18px;">Resumen Diario de Actividad</h2>
        <p style="color: #666;">Fecha: <strong>${today}</strong></p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px;">
          <thead>
            <tr style="background: #f8fafc; text-align: left;">
              <th style="padding: 10px;">Visitador</th>
              <th style="padding: 10px;">Horario</th>
              <th style="padding: 10px;">Contacto</th>
              <th style="padding: 10px;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;

    // Envío usando el remitente verificado notificaciones@gestiondiariafarmaser.com
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY as string,
      },
      body: JSON.stringify({
        sender: { name: "Gestion Diaria Farmaser", email: "notificaciones@gestiondiariafarmaser.com" }, 
        to: [{ email: adminEmail }],
        subject: `📊 Reporte Diario de Citas - ${today}`,
        htmlContent: htmlContent
      }),
    });

    const brevoResult = await brevoResponse.json();

    if (!brevoResponse.ok) {
      throw new Error(`Brevo rechazó el envío: ${JSON.stringify(brevoResult)}`);
    }

    return NextResponse.json({ success: true, message: '¡Reporte enviado!', brevo: brevoResult });
  } catch (error: any) {
    return NextResponse.json({ error: "Error en el servidor", detail: error.message }, { status: 500 });
  }
}
