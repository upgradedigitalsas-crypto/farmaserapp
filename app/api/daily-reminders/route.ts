import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (token !== 'farmaser_admin_123') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const visitsRef = collection(db, 'planned_visits');
    const q = query(visitsRef, where('visitDate', '==', tomorrowStr));
    const snap = await getDocs(q);
    const visits = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const visitsByRep: Record<string, any[]> = {};
    visits.forEach(v => {
      const email = v.userEmail?.toLowerCase().trim();
      if (email && v.status === 'Planeada') {
        if (!visitsByRep[email]) visitsByRep[email] = [];
        visitsByRep[email].push(v);
      }
    });

    const emailPromises = Object.keys(visitsByRep).map(async (email) => {
      const repVisits = visitsByRep[email];
      repVisits.sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));

      let tableRows = '';
      repVisits.forEach(v => {
        tableRows += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${v.startTime || '--:--'}</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${v.doctorName || 'N/A'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${v.doctorDetails?.category || 'A'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${v.doctorDetails?.city || 'N/A'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 11px; color: #666;">${v.doctorDetails?.address || 'Sin dirección'}</td>
          </tr>
        `;
      });

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'Farmaser App <onboarding@resend.dev>',
          to: email,
          subject: `📋 Ruta para Mañana (${tomorrowStr})`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #eee;border-radius:10px;overflow:hidden;">
                  <div style="background:#2563eb;padding:20px;text-align:center;"><h2 style="color:white;margin:0;">HOJA DE RUTA</h2></div>
                  <div style="padding:20px;">
                    <p>Hola, aquí tienes tu agenda para mañana <strong>${tomorrowStr}</strong>:</p>
                    <table style="width:100%;border-collapse:collapse;margin-top:20px;">
                      <tr style="background:#f8fafc;font-size:12px;">
                        <th style="padding:10px;">Hora</th><th style="padding:10px;">Médico</th><th style="padding:10px;">Cat</th><th style="padding:10px;">Ciudad</th><th style="padding:10px;">Dirección</th>
                      </tr>
                      ${tableRows}
                    </table>
                  </div>
                </div>`
        })
      });
    });

    await Promise.all(emailPromises);
    return NextResponse.json({ success: true, count: Object.keys(visitsByRep).length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
