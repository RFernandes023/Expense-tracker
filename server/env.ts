/** Configuração do servidor (variáveis de ambiente definidas na Vercel). */
export function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') throw new Error(`Variável de ambiente em falta: ${name}`);
  return v;
}

export const optionalEnv = (name: string, fallback = '') => process.env[name] || fallback;

/** URL pública da app, sem barra final (ex.: https://carteira-pt.vercel.app). */
export const appUrl = () => env('APP_URL').replace(/\/+$/, '');

/** Emails autorizados (separados por vírgula). Vazio = qualquer conta Google. */
export function isEmailAllowed(email: string): boolean {
  const list = optionalEnv('ALLOWED_EMAILS').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.length === 0 || list.includes(email.toLowerCase());
}
