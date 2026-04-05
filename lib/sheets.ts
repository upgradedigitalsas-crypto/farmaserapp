const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY;
const SPREADSHEET_ID = process.env.NEXT_PUBLIC_SPREADSHEET_ID;

export async function getDoctorsFromSheet() {
  try {
    const range = 'Medicos!A:Z'; 
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`
    );
    const data = await response.json();
    const rows = data.values || [];
    if (rows.length <= 1) return [];

    return rows.slice(1).map((row: any, index: number) => {
      return {
        id: row[0] || `doc-${index}`,
        name: row[3] || 'Sin nombre',        // D: name
        email_doc: row[4] || '',             // E: email
        address: row[5] || '',               // F: address
        phone: row[6] || '',                 // G: phone
        city: row[7] || '',                  // H: city
        specialty: row[8] || '',             // I: speciality
        category: row[9] || '',              // J: category
        type: row[10] || '',                 // K: type
        assignedTo: row[12] || '',           // M: emailName (Visitador)
      };
    });
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}
