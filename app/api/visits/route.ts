import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const visits = [
    { id: 1, doctor: 'Dr. Juan García', type: 'Médico', date: '2024-03-28' },
    { id: 2, doctor: 'Droguería Central', type: 'Droguería', date: '2024-03-28' },
  ]
  return NextResponse.json(visits)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    return NextResponse.json({ success: true, data: body })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 400 })
  }
}
