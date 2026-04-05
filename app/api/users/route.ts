import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let key = process.env.GOOGLE_PRIVATE_KEY || '';
    const sheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID;

    // --- EL LIMPIADOR DEFINITIVO ---
    const cleanKey = key
      .trim()
      .replace(/^"(.*)"$/, '$1') // Quita comillas dobles si envuelven todo el texto
      .replace(/^'(.*)'$/, '$1') // Quita comillas simples si envuelven todo el texto
      .replace(/\\n/g, '\n');    // Convierte el texto \n en saltos de línea reales

    const auth = new google.auth.JWT(
      email, 
      undefined, 
      cleanKey, 
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Usuarios!A2:B150',
    });

    return NextResponse.json({ 
      success: true, 
      total: response.data.values?.length || 0,
      users: response.data.values 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: "Error de conexión", 
      detalle: error.message,
      ayuda: "Si dice 'DECODER', la llave sigue teniendo comillas invisibles."
    }, { status: 500 });
  }
}
