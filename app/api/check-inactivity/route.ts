import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    const now = new Date();
    const inactiveUsers: any[] = [];

    snapshot.forEach((doc) => {
      const user = doc.data();
      if (user.role === 'visitor') {
        if (!user.lastLogin) {
          inactiveUsers.push({ name: user.name || 'Sin nombre', email: user.email, dateText: 'Nunca ha entrado', days: 'N/A' });
        } else {
          const lastLoginDate = new Date(user.lastLogin);
          const diffTime = Math.abs(now.getTime() - lastLoginDate.getTime());
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays >= 3) {
            inactiveUsers.push({
              name: user.name || 'Sin nombre',
              email: user.email,
              dateText: lastLoginDate.toLocaleDateString(),
              days: diffDays + ' días'
            });
          }
        }
      }
    });

    if (inactiveUsers.length === 0) {
      return NextResponse.json({ message: 'Todos los visitadores están activos.' });
    }

    const tableRows = inactiveUsers.map(u => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${u.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${u.email}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; color: red;">${u.days}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e3a8a;">Farmaser: Reporte de Inactividad</h2>
        <p>Hola Benjamín, estos usuarios llevan 3 días o más sin conexión:</p>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f4f4f4;">
              <th style="padding: 10px; text-align: left;">Nombre</th>
              <th style="padding: 10px; text-align: left;">Email</th>
              <th style="padding: 10px; text-align: left;">Días Inactivo</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    `;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY as string,
      },
      body: JSON.stringify({
        sender: { name: "Sistema Farmaser", email: "no-reply@gestiondiariafarmaser.com" },
        to: [{ email: "entrenamientofarmaser@gmail.com", name: "Benjamín" }],
        subject: "⚠️ Alerta de Inactividad: Visitadores Farmaser",
        htmlContent: htmlContent,
      }),
    });

    return NextResponse.json({ message: 'Alerta procesada correctamente.' });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Error de permisos o conexión.' }, { status: 500 });
  }
}
