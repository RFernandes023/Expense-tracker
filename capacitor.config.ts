import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Se APP_URL estiver definido na build (GitHub Actions: variável API_URL), a app Android
 * abre diretamente o site publicado na Vercel — fica sempre atualizada sem gerar novo APK.
 * Sem APP_URL, usa a versão embutida em dist/.
 */
const url = process.env.APP_URL?.replace(/\/+$/, '');

const config: CapacitorConfig = {
  appId: 'pt.carteira.app',
  appName: 'Carteira PT',
  webDir: 'dist',
  android: { backgroundColor: '#0b1220' },
  ...(url ? { server: { url, cleartext: false } } : {})
};

export default config;
