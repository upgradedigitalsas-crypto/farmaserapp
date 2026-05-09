import admin from 'firebase-admin'

if (!admin.apps.length) {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || ''
  privateKey = privateKey.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n')

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'farmaser-app',
      clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
      privateKey,
    }),
  })
}

export const adminDb = admin.firestore()
