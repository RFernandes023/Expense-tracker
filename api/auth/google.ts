import type { VercelRequest, VercelResponse } from '@vercel/node';
import { signState } from '../../server/auth.js';
import { appUrl, env } from '../../server/env.js';
import { handler } from '../../server/http.js';

/** Início do login com Google (Authorization Code flow). */
export default handler(async (req: VercelRequest, res: VercelResponse) => {
  const platform = req.query.platform === 'android' ? 'android' : 'web';
  const params = new URLSearchParams({
    client_id: env('GOOGLE_CLIENT_ID'),
    redirect_uri: `${appUrl()}/api/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state: signState(platform),
    prompt: 'select_account'
  });
  res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});
