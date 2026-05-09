import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'farmaser-app'
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

const norm = (s: string) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// Convierte un documento Firestore REST en objeto plano
function fromFirestore(fsDoc: any): Record<string, any> {
  const fields = fsDoc.fields || {}
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries<any>(fields)) {
    if (v.stringValue !== undefined) out[k] = v.stringValue
    else if (v.integerValue !== undefined) out[k] = v.integerValue
    else if (v.mapValue) out[k] = fromFirestore(v.mapValue)
    else out[k] = null
  }
  return out
}

// Construye el patch body para actualizar solo doctorDetails.city
function makePatch(city: string) {
  return {
    fields: {
      doctorDetails: {
        mapValue: {
          fields: {
            city: { stringValue: city },
          },
        },
      },
    },
  }
}

export async function GET() {
  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    let key = process.env.GOOGLE_PRIVATE_KEY || ''
    key = key.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n')
    const sheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID

    // Auth con scope de Sheets + Firestore
    const auth = new google.auth.JWT(email, undefined, key, [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/datastore',
      'https://www.googleapis.com/auth/firebase',
    ])
    const tokenRes = await auth.getAccessToken()
    const token = tokenRes.token
    if (!token) throw new Error('No se pudo obtener access token')

    // 1. Leer Google Sheets
    const sheets = google.sheets({ version: 'v4', auth })
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Medicos!A2:M10000',
    })
    const rows = res.data.values || []

    // 2. Construir mapa nombre → ciudad (más frecuente, excluyendo ANDES)
    const cityCount = new Map<string, Map<string, number>>()
    rows.forEach((row) => {
      const name = norm(row[2] || '')
      const city = (row[6] || '').trim()
      if (!name || !city) return
      if (!cityCount.has(name)) cityCount.set(name, new Map())
      const c = cityCount.get(name)!
      c.set(city, (c.get(city) || 0) + 1)
    })
    const cityMap = new Map<string, string>()
    cityCount.forEach((counter, name) => {
      const sorted = Array.from(counter.entries()).sort((a, b) => b[1] - a[1])
      const best = sorted.find(([c]) => c.toUpperCase() !== 'ANDES') || sorted[0]
      if (best) cityMap.set(name, best[0])
    })

    // 3. Paginar todos los planned_visits via REST
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    let allDocs: any[] = []
    let pageToken = ''
    do {
      const url = `${FS_BASE}/planned_visits?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`
      const r = await fetch(url, { headers })
      const json = await r.json()
      if (json.documents) allDocs = allDocs.concat(json.documents)
      pageToken = json.nextPageToken || ''
    } while (pageToken)

    // 4. Actualizar los que tienen ciudad incorrecta
    let updated = 0, skipped = 0, notFound = 0
    const log: string[] = []

    for (const fsDoc of allDocs) {
      const data = fromFirestore(fsDoc)
      const details = data.doctorDetails || {}
      const doctorKey = norm(data.doctorName || '')
      const correctCity = cityMap.get(doctorKey)
      const currentCity = (details.city || '').trim()

      if (!correctCity) { notFound++; continue }
      if (norm(currentCity) === norm(correctCity)) { skipped++; continue }

      // Construir patch que SOLO actualiza city dentro de doctorDetails
      // Para no pisar los otros campos del mapa, recuperamos todos y añadimos city
      const docName = fsDoc.name // projects/.../documents/planned_visits/ID
      const existingDetails = fsDoc.fields?.doctorDetails?.mapValue?.fields || {}
      const patchBody = {
        fields: {
          doctorDetails: {
            mapValue: {
              fields: {
                ...existingDetails,
                city: { stringValue: correctCity },
              },
            },
          },
        },
      }

      const patchUrl = `https://firestore.googleapis.com/v1/${docName}?updateMask.fieldPaths=doctorDetails`
      const pr = await fetch(patchUrl, { method: 'PATCH', headers, body: JSON.stringify(patchBody) })
      if (pr.ok) {
        log.push(`${data.doctorName}: "${currentCity}" → "${correctCity}"`)
        updated++
      } else {
        const err = await pr.text()
        log.push(`ERROR ${data.doctorName}: ${err.slice(0, 80)}`)
      }
    }

    return NextResponse.json({
      success: true,
      total_visits: allDocs.length,
      updated,
      skipped,
      notFound,
      log: log.slice(0, 100),
    })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
