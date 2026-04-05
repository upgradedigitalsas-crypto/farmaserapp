import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Inicializar Firebase Admin (Solo si no está inicializado)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
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

    // Esta lectura ignora las reglas de seguridad porque es ADMIN
    const snapshot = await db.collection('users').where('role', '==', 'visitor').get();
    
    snapshot.forEach((doc) => {
      const user = doc.data();
      const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
      
      if (!lastLogin) {
        inactiveUsers.push({ name: user.name || 'Sin nombre', email: user.email, days: 'Nunca' });
      } else {
        const diffDays = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 3) {
          inactiveUsers.push({ name: user.name, email: user.email, days: `${diffDays} días` });
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
          htmlContent: `<h3>Reporte de Usuarios Inactivos:</h3><ul>${inactiveUsers.map(u => `<li>${u.name} (${u.email}) - ${u.days}</li>`).join('')}</ul>`
        }),
      });
    }

    return NextResponse.json({ success: true, message: `Reporte enviado para ${inactiveUsers.length} usuarios.` });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Error en el servidor Admin", details: error.message }, { status: 500 });
  }
}
