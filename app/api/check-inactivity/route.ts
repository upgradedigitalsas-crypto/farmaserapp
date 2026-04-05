import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Evita que Next.js intente convertir esto en una página estática
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("role", "==", "visitor"));
    const snapshot = await getDocs(q);
    
    const now = new Date();
    const inactiveUsers: any[] = [];

    snapshot.forEach((doc) => {
      const user = doc.data();
      const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
      
      if (!lastLogin) {
        inactiveUsers.push({ 
          name: user.name || 'Sin nombre', 
          email: user.email || 'Sin correo', 
          days: 'Nunca ha entrado' 
        });
      } else {
        const diffDays = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 3) {
          inactiveUsers.push({ 
            name: user.name || 'Visitador', 
            email: user.email, 
            days: `${diffDays} días` 
          });
        }
      }
    });

    // Si hay inactivos, intentamos enviar a Brevo
    if (inactiveUsers.length > 0) {
      const brevoKey = process.env.BREVO_API_KEY;
      
      if (!brevoKey) {
        return NextResponse.json({ error: "Falta la API Key de Brevo en Vercel/env" }, { status: 500 });
      }

      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': brevoKey,
        },
        body: JSON.stringify({
          sender: { name: "Sistema Farmaser", email: "no-reply@gestiondiariafarmaser.com" },
          to: [{ email: "entrenamientofarmaser@gmail.com", name: "Benjamín" }],
          subject: "⚠️ Alerta de Inactividad: Visitadores Farmaser",
          htmlContent: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>Reporte de Inactividad</h2>
              <p>Hola Benjamín, se han detectado ${inactiveUsers.length} usuarios con 3 o más días sin conexión:</p>
              <ul>
                ${inactiveUsers.map(u => `<li><strong>${u.name}</strong> (${u.email}) - Inactivo: ${u.days}</li>`).join('')}
              </ul>
            </div>
          `
        }),
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Proceso completado. ${inactiveUsers.length} inactivos reportados.` 
    });

  } catch (error: any) {
    console.error("Error en API Alertas:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Error de permisos o base de datos",
      details: error.message 
    }, { status: 500 });
  }
}
