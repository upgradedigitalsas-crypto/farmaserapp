import { getDoctorsFromSheet } from '@/lib/googleSheets'
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    const data = await getDoctorsFromSheet()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
