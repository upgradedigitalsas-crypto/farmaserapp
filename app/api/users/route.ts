import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Obtener usuarios del Google Sheets
    const users = [
      { id: 1, name: 'Pablo Palacios', email: 'pablo@farmaser.com', role: 'admin' },
      { id: 2, name: 'Visitador 1', email: 'visitador1@farmaser.com', role: 'visitador' },
    ]

    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
