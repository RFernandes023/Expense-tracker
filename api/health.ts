import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handler } from '../server/http.js';

/** Diagnóstico: indica que variáveis estão configuradas (nunca os valores). */
export default handler(async (_req: VercelRequest, res: VercelResponse) => {
  const has = (k: string) => Boolean(process.env[k]);
  res.json({
    ok: true,
    configured: {
      mongodb: has('MONGODB_URI'),
      google: has('GOOGLE_CLIENT_ID') && has('GOOGLE_CLIENT_SECRET'),
      gemini: has('GEMINI_API_KEY'),
      jwt: has('JWT_SECRET'),
      appUrl: has('APP_URL')
    }
  });
});
