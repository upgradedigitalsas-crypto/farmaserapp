import { google } from 'googleapis'
import { adminDb } from '@/lib/firebaseAdmin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const norm = (s: string) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export async function GET() {
  try {
    // 1. Leer médicos actuales desde Google Sheets
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    let key = process.env.GOOGLE_PRIVATE_KEY || ''
    key = key.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n')
    const sheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID

    const auth = new google.auth.JWT(email, undefined, key, [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ])
    const sheets = google.sheets({ version: 'v4', auth })
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Medicos!A2:M10000',
    })

    const rows = res.data.values || []

    // 2. Construir mapa nombre → ciudad
    // Contar frecuencia de cada ciudad por nombre para elegir la más común
    const cityCount = new Map<string, Map<string, number>>()

    rows.forEach((row) => {
      const name = norm(row[2] || '')
      const city = (row[6] || '').trim()
      if (!name || !city) return
      if (!cityCount.has(name)) cityCount.set(name, new Map())
      const counter = cityCount.get(name)!
      counter.set(city, (counter.get(city) || 0) + 1)
    })

    // Para cada nombre: elegir ciudad más frecuente, excluyendo ANDES si hay alternativa
    const cityMap = new Map<string, string>()
    cityCount.forEach((counter, name) => {
      const cities = Array.from(counter.entries()).sort((a, b) => b[1] - a[1])
      const best = cities.find(([c]) => c.toUpperCase() !== 'ANDES') || cities[0]
      if (best) cityMap.set(name, best[0])
    })

    // 3. Leer todos los planned_visits con Firebase Admin (sin restricción de reglas)
    const snap = await adminDb.collection('planned_visits').get()
    const visits = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))

    let updated = 0
    let skipped = 0
    let notFound = 0
    const log: string[] = []

    // 4. Actualizar doctorDetails.city donde difiera
    const BATCH_SIZE = 400
    let batch = adminDb.batch()
    let batchCount = 0

    for (const v of visits) {
      const doctorKey = norm(v.doctorName || '')
      const correctCity = cityMap.get(doctorKey)
      const currentCity = (v.doctorDetails?.city || '').trim()

      if (!correctCity) { notFound++; continue }
      if (norm(currentCity) === norm(correctCity)) { skipped++; continue }

      const ref = adminDb.collection('planned_visits').doc(v.id)
      batch.update(ref, { 'doctorDetails.city': correctCity })
      log.push(`${v.doctorName}: "${currentCity}" → "${correctCity}"`)
      updated++
      batchCount++

      if (batchCount >= BATCH_SIZE) {
        await batch.commit()
        batch = adminDb.batch()
        batchCount = 0
      }
    }

    if (batchCount > 0) await batch.commit()

    return NextResponse.json({
      success: true,
      total_visits: visits.length,
      updated,
      skipped,
      notFound,
      sample_log: log.slice(0, 80),
    })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
