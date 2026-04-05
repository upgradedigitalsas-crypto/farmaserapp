import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// CONFIGURACIÓN MAESTRA PARA 2026
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Esta línea es la que arregla el error de "Missing permissions"
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    const inactiveUsers: any[] = [];

    // Usamos la colección directa (Admin salta las reglas de seguridad)
    const snapshot = await db.collection('users').get();
    
    snapshot.forEach((doc) => {
      const user = doc.data();
      if (user.role === 'visitor') {
        const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
        if (!lastLogin) {
          inactiveUsers.push({ name: user.name || 'Sin nombre', email: user.email, days: 'Nunca' });
        } else {
          const diffDays = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 3) {
            inactiveUsers.push({ name: user.name, email: user.email, days: `${diffDays} días` });
          }
        }
      }
    });

    if (inactiveUsers.length > 0) {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY as string,
        },
        body: JSON.stringify({
          sender: { name: "Sistema Farmaser", email: "no-reply@gestiondiariafarmaser.com" },
          to: [{ email: "entrenamientofarmaser@gmail.com", name: "Benjamín" }],
          subject: "⚠️ Alerta de Inactividad Farmaser",
          htmlContent: `<h2>Reporte de Inactividad</h2><ul>${inactiveUsers.map(u => `<li>${u.name}: ${u.days}</li>`).join('')}</ul>`
        }),
      });
    }

    return NextResponse.json({ success: true, count: inactiveUsers.length });
  } catch (error: any) {
    return NextResponse.json({ error: "Error de servidor Admin", detail: error.message }, { status: 500 });
  }
}
