# Farmaser - Gestión de Visitadores Médicos

App moderna web de gestión de visitadores médicos con integración Google Sheets.

## Features

- ✅ Autenticación con Google, Microsoft y correo
- ✅ Lectura de Google Sheets en tiempo real
- ✅ Gestión de visitas médicas
- ✅ Calendario de itinerarios
- ✅ Dashboard con KPIs
- ✅ Panel administrativo
- ✅ Multi-rol (Visitador, Admin)

## Stack Tecnológico

- **Frontend**: Next.js 14, React 18, TypeScript
- **UI**: Tailwind CSS, Lucide Icons
- **Auth**: Firebase Authentication
- **Database**: Google Sheets API
- **State**: Zustand
- **Hosting**: Hostinger

## Setup Local

### 1. Requisitos previos

```bash
node >= 18.0
npm >= 9.0
```

### 2. Clonar y instalar

```bash
npm install
```

### 3. Configurar variables de entorno

Copiar `.env.example` a `.env.local` y completar:

```
NEXT_PUBLIC_FIREBASE_API_KEY=xxxxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxxxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxxxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxxxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxxxx

NEXT_PUBLIC_GOOGLE_SHEETS_ID=tu_id_de_spreadsheet
NEXT_PUBLIC_GOOGLE_API_KEY=tu_api_key_google
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Setup Firebase

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Crear nuevo proyecto
3. Habilitar autenticación (Google, Microsoft, Email)
4. Copiar credenciales a `.env.local`

## Setup Google Sheets API

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Habilitar "Google Sheets API"
3. Crear credenciales (API Key)
4. Crear spreadsheet de ejemplo
5. Copiar ID del spreadsheet a `.env.local`

## Deploy en Hostinger

### 1. Build para producción

```bash
npm run build
npm start
```

### 2. Usar PM2 para mantener el proceso

```bash
npm install -g pm2
pm2 start npm --name "farmaser" -- start
pm2 startup
pm2 save
```

### 3. Configurar Nginx (reverse proxy)

```nginx
server {
  listen 80;
  server_name tu_dominio.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

### 4. SSL con Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu_dominio.com
```

## Estructura del Proyecto

```
farmaser-app/
├── app/
│   ├── api/              # API routes
│   ├── components/       # Componentes reutilizables
│   ├── dashboard/        # Dashboard page
│   ├── visits/           # Visitas page
│   ├── itinerary/        # Itinerarios page
│   ├── login/            # Login page
│   ├── admin/            # Admin page
│   ├── layout.tsx        # Root layout
│   ├── globals.css       # Estilos globales
│   └── page.tsx          # Home page
├── lib/
│   ├── firebase.ts       # Config Firebase
│   ├── googleSheets.ts   # Google Sheets API
│   └── store.ts          # Zustand store
├── public/               # Archivos estáticos
├── .env.example          # Variables de ejemplo
├── next.config.js        # Config Next.js
├── tailwind.config.js    # Config Tailwind
└── tsconfig.json         # Config TypeScript
```

## Próximos Pasos

- [ ] Integrar completamente Google Sheets API
- [ ] Completar autenticación Firebase
- [ ] Agregar validaciones
- [ ] Crear módulos de Base Cuota y Ventas
- [ ] Agregar reportes PDF
- [ ] Notificaciones en tiempo real
- [ ] Mobile app

## Support

Para soporte, contactar a: pablo@farmaser.com
