import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const rawKey = process.env.FIREBASE_PRIVATE_KEY;
    // Limpieza profunda de la llave para evitar el error de DECODER
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

export async function GET() {
  try {
    const now = new Date();
    const inactiveUsers: any[] = [];
    
    // Admin tiene permiso total, no le afectan las reglas de Firestore
    const snapshot = await db.collection('users').where('role', '==', 'visitor').get();
    
    snapshot.forEach((doc) => {
      const user = doc.data();
      const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
      
      if (!lastLogin) {
        inactiveUsers.push({ name: user.name || 'Sin registro', email: user.email, days: 'Nunca' });
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
          htmlContent: `<h2>Reporte de Inactividad</h2><p>Hay ${inactiveUsers.length} usuarios inactivos:</p><ul>${inactiveUsers.map(u => `<li>${u.name} (${u.email}) - ${u.days}</li>`).join('')}</ul>`
        }),
      });
    }

    return NextResponse.json({ success: true, count: inactiveUsers.length });
  } catch (error: any) {
    return NextResponse.json({ error: "Error de Servidor Admin", detail: error.message }, { status: 500 });
  }
}
