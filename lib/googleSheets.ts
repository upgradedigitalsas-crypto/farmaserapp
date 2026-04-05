import { google } from 'googleapis'

export async function getDoctorsFromSheet() {
  try {
    // 🔍 BUSCAMOS EL NOMBRE EXACTO QUE TIENES EN VERCEL
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    
    // 🛡️ SANITIZADOR DE LLAVE PRIVADA
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || ''
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/"/g, '')

    if (!email || !privateKey) {
      throw new Error('Faltan credenciales: No se encontró GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY en Vercel.')
    }

    const auth = new google.auth.JWT({
      email: email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID, // El nombre exacto en tu Vercel
      range: 'Medicos!A2:M10000',
    })

    const rows = response.data.values
    if (!rows) return []

    return rows.map((row) => ({
      id: row[0] || Math.random().toString(), 
      visitadorId: row[0] || '',             
      name: row[2] || '',                    
      specialty: row[7] || '',               
      city: row[6] || '',                    
      assignedTo: row[11] || '',             
      category: row[8] || '',                
    }))
  } catch (error: any) {
    console.error('Error en Sheets:', error.message || error)
    throw error
  }
}
