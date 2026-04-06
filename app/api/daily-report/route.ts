import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    // 1. Candado de seguridad: Evitar que cualquiera active la API
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (token !== 'farmaser-cron-secreto-2026') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Calcular la fecha exacta en zona horaria de Colombia
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }); // Formato: YYYY-MM-DD
    const adminEmail = 'entrenamientofarmaser@gmail.com';

    // 3. Obtener Visitas Planeadas de hoy
    const plannedRef = collection(db, 'planned_visits');
    const qPlanned = query(plannedRef, where('visitDate', '==', today));
    const plannedSnap = await getDocs(qPlanned);
    const plannedVisits = plannedSnap.docs.map(d => d.data());

    // 4. Obtener Visitas Reales (Reportadas) de hoy
    const realRef = collection(db, 'visits');
    const qReal = query(realRef, where('date', '==', today)); 
    const realSnap = await getDocs(qReal);
    const realVisits = realSnap.docs.map(d => d.data());

    if (plannedVisits.length === 0 && realVisits.length === 0) {
      return NextResponse.json({ message: `Sin actividad reportada para el dia ${today}` });
    }

    // 5. Construir la tabla del correo
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
        <p style="margin-top: 30px; font-size: 10px; color: #999; text-align: center;">Generado automáticamente por Farmaser CRM</p>
      </div>
    `;

    // 6. Enviar vía Brevo
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY as string,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: "Farmaser CRM", email: "alertas@farmaser.com" },
        to: [{ email: adminEmail }],
        subject: `📊 Reporte Diario de Citas - ${today}`,
        htmlContent: htmlContent
      }),
    });

    return NextResponse.json({ success: true, message: 'Reporte enviado con éxito a ' + adminEmail, date: today });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
