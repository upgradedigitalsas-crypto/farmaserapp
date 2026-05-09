/**
 * Descarga un CSV de forma confiable en desktop Y móvil.
 * - Móvil (Android/iOS): abre el panel nativo de compartir (Web Share API)
 * - Desktop: dispara la descarga directa con <a download>
 */
export async function downloadCSV(csvContent: string, filename: string): Promise<void> {
  // Asegurar BOM UTF-8 para que Excel lo abra correctamente
  const content = csvContent.startsWith('﻿') ? csvContent : '﻿' + csvContent
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })

  // ── Intento 1: Web Share API (móvil nativo) ──────────────────────────────
  try {
    const file = new File([blob], filename, { type: 'text/csv' })
    if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: filename })
      return
    }
  } catch {
    // El usuario canceló el panel o no es compatible → seguir con fallback
  }

  // ── Intento 2: <a download> (desktop + Android Chrome) ──────────────────
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 150)
}
