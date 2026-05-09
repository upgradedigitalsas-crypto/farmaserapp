import { google } from 'googleapis'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Normaliza strings para comparar nombres sin tildes ni mayúsculas
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
    // Si hay duplicados preferimos la ciudad que NO sea ANDES (datos históricos erróneos)
    const cityMap = new Map<string, string>()
    const cityCount = new Map<string, Map<string, number>>() // nombre → { ciudad: frecuencia }

    rows.forEach((row) => {
      const name = norm(row[2] || '')
      const city = (row[6] || '').trim()
      if (!name || !city) return

      if (!cityCount.has(name)) cityCount.set(name, new Map())
      const counter = cityCount.get(name)!
      counter.set(city, (counter.get(city) || 0) + 1)
    })

    // Para cada nombre, elegir la ciudad más frecuente (excluyendo ANDES si hay alternativa)
    cityCount.forEach((counter, name) => {
      const cities = Array.from(counter.entries()).sort((a, b) => b[1] - a[1])
      // Intentar ciudad más frecuente que no sea ANDES
      const best = cities.find(([c]) => c.toUpperCase() !== 'ANDES') || cities[0]
      if (best) cityMap.set(name, best[0])
    })

    // 3. Leer todos los planned_visits de Firestore
    const snap = await getDocs(collection(db, 'planned_visits'))
    const visits = snap.docs.map(d => ({ id: d.id, ...d.data() as any }))

    let updated = 0
    let skipped = 0
    let notFound = 0
    const log: string[] = []

    // 4. Actualizar doctorDetails.city para cada visita
    for (const v of visits) {
      const doctorKey = norm(v.doctorName || '')
      const correctCity = cityMap.get(doctorKey)
      const currentCity = v.doctorDetails?.city || ''

      if (!correctCity) {
        notFound++
        continue
      }

      if (norm(currentCity) === norm(correctCity)) {
        skipped++
        continue
      }

      // Ciudad distinta → actualizar
      await updateDoc(doc(db, 'planned_visits', v.id), {
        'doctorDetails.city': correctCity,
      })
      log.push(`✅ ${v.doctorName}: "${currentCity}" → "${correctCity}"`)
      updated++
    }

    return NextResponse.json({
      success: true,
      total_visits: visits.length,
      updated,
      skipped,
      notFound,
      sample_log: log.slice(0, 50),
    })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
