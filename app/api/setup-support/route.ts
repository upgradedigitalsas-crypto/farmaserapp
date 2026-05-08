import { NextResponse } from 'next/server'
import * as admin from 'firebase-admin'

if (!admin.apps.length) {
  try {
    const rawKey = process.env.FIREBASE_PRIVATE_KEY
    const formattedKey = rawKey
      ? rawKey.replace(/\\n/g, '\n').replace(/"/g, '').trim()
      : undefined
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedKey,
      }),
    })
  } catch (e: any) {
    console.error('Admin init error:', e.message)
  }
}

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // Protección simple con token secreto
  const { searchParams } = new URL(req.url)
  if (searchParams.get('token') !== 'farmaser2025upgrade') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const email = 'upgradedigitalsas@gmail.com'
    const password = 'Upgrade2025!'

    // Intentar crear el usuario
    let uid: string
    try {
      const existing = await admin.auth().getUserByEmail(email)
      // Si ya existe, solo actualizamos la contraseña
      await admin.auth().updateUser(existing.uid, { password })
      uid = existing.uid
      return NextResponse.json({
        status: 'updated',
        message: `Usuario ya existía. Contraseña actualizada.`,
        email,
        password,
        uid,
      })
    } catch {
      // No existe → crear
      const newUser = await admin.auth().createUser({
        email,
        password,
        displayName: 'UpgradeDigital Soporte',
        emailVerified: true,
      })
      uid = newUser.uid
      return NextResponse.json({
        status: 'created',
        message: 'Usuario creado exitosamente.',
        email,
        password,
        uid,
      })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
