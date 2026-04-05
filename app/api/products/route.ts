import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let key = process.env.GOOGLE_PRIVATE_KEY;
    const sheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID;

    if (!email || !key || !sheetId) {
      return NextResponse.json({ error: "Faltan variables en Vercel" });
    }

    // --- LIMPIEZA DE LLAVE (EL FIX) ---
    // 1. Quitar comillas al principio y al final si existen
    if (key.startsWith('"') && key.endsWith('"')) {
      key = key.substring(1, key.length - 1);
    }
    // 2. Arreglar saltos de línea y quitar espacios accidentales
    const cleanedKey = key.replace(/\\n/g, '\n').trim();

    const auth = new google.auth.JWT(
      email, 
      undefined, 
      cleanedKey, 
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Productos!A2:C500', 
    });

    const rows = response.data.values || [];
    
    const products = rows
      .filter(row => row[0] && row[1])
      .map((row) => ({
        id: String(row[0]),
        name: String(row[1]),
        category: String(row[2] || '').trim(),
      }))
      .filter((p) => p.category.toLowerCase() !== 'transferencia'); 

    return NextResponse.json(products);
  } catch (error: any) {
    console.error('ERROR DE DECODIFICACIÓN:', error.message);
    return NextResponse.json({ 
      error: "Error de Llave Privada",
      detalle: "La llave en Vercel tiene un formato que Google no soporta.",
      mensaje_google: error.message 
    }, { status: 500 });
  }
}
