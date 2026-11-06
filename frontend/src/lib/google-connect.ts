import { getStoredTheme } from '@/lib/theme'

/** Opens the Google connect window straight away so popup blockers allow it, before the URL is known. */
export function openGoogleConnectPopup() {
  const popup = window.open('', 'google-drive-connect', 'width=540,height=720')
  if (popup) {
    const [background, color] = getStoredTheme() === 'dark' ? ['#090d16', '#a7b4c8'] : ['#fafcfd', '#475569']
    popup.document.write(`<html><head><title>Connecting...</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:${background};color:${color};}</style></head><body><div style="text-align:center;"><h2>Connecting to Google...</h2><p>Please wait while we redirect you.</p></div></body></html>`)
  }
  return popup
}
