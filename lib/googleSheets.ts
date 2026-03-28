import { google } from 'googleapis'

export async function getGoogleSheetsData(spreadsheetId: string, sheetName: string, apiKey: string) {
  try {
    const sheets = google.sheets({ version: 'v4', auth: apiKey })
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
    })
    return response.data.values || []
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error)
    return []
  }
}

export async function updateGoogleSheetsData(
  spreadsheetId: string,
  range: string,
  values: any[][],
  apiKey: string
) {
  try {
    const sheets = google.sheets({ version: 'v4', auth: apiKey })
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    })
    return true
  } catch (error) {
    console.error('Error updating Google Sheets:', error)
    return false
  }
}
