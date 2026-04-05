import { google } from 'googleapis';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let key = process.env.GOOGLE_PRIVATE_KEY || '';
    const sheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID;
    const cleanKey = key.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
    const auth = new google.auth.JWT(email, undefined, cleanKey, ['https://www.googleapis.com/auth/spreadsheets.readonly']);
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Borramos todo para re-escribir limpio
    const snap = await getDocs(collection(db, 'medical_centers'));
    const allDocs = snap.docs;
    for (let i = 0; i < allDocs.length; i += 400) {
      const deleteBatch = writeBatch(db);
      allDocs.slice(i, i + 400).forEach((d) => deleteBatch.delete(d.ref));
      await deleteBatch.commit();
    }

    // 2. Leemos el rango completo
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Medicos!A2:M9000', 
    });

    const rows = res.data.values || [];
    let count = 0;

    // 3. Carga sin filtros de correo
    for (let i = 0; i < rows.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = rows.slice(i, i + 400);
      
      chunk.forEach((row) => {
        const dName = row[3]?.trim();   
        let vEmail = row[12]?.toLowerCase().trim() || ''; 

        // Si no tiene correo, le ponemos uno para que no se pierda el registro
        if (!vEmail.includes('@')) {
          vEmail = 'pendiente@farmaser.com';
        }

        if (dName) { // Solo pedimos que tenga nombre
          batch.set(doc(collection(db, 'medical_centers')), {
            name: dName,
            address: row[5]?.trim() || '',
            city: row[7]?.trim() || '',
            specialty: row[8]?.trim() || '',
            category: row[9]?.trim() || '',
            type: row[10]?.trim() || 'Medico',
            userEmail: vEmail,
            email: vEmail,
            status: 'active',
            activo: true,
            updatedAt: new Date().toISOString()
          });
          count++;
        }
      });
      await batch.commit();
    }

    return NextResponse.json({ success: true, count, total_excel: rows.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
