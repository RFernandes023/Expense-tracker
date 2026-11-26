import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ANDROID_SCHEME, decodeIdToken, randomCode, verifyState, type Platform } from '../../server/auth.js';
import { cols } from '../../server/db.js';
import { appUrl, env, isEmailAllowed } from '../../server/env.js';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Página que devolve o utilizador à app Android através do deep link. */
function androidPage(url: string, ok: boolean) {
  return `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Carteira PT</title><style>body{font-family:system-ui,sans-serif;background:#0b1220;color:#e5edf8;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:16px}
a{display:inline-block;margin-top:16px;background:#14b8a6;color:#fff;padding:14px 22px;border-radius:14px;text-decoration:none;font-weight:700}</style></head>
<body><div><h2>${ok ? 'Sessão iniciada ✓' : 'Não foi possível iniciar sessão'}</h2><p>A voltar à app…</p><a href="${esc(url)}">Abrir a Carteira PT</a></div>
<script>location.href=${JSON.stringify(url)}</script></body></html>`;
}

function finish(res: VercelResponse, platform: Platform, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  if (platform === 'android') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(androidPage(`${ANDROID_SCHEME}://auth?${qs}`, !!params.auth_code));
  } else {
    res.redirect(302, `${appUrl()}/?${qs}`);
  }
}

export default async function callback(req: VercelRequest, res: VercelResponse) {
  const platform = verifyState(String(req.query.state ?? ''));
  if (!platform) return finish(res, 'web', { auth_error: 'Pedido de login inválido ou expirado. Tenta novamente.' });
  if (req.query.error) return finish(res, platform, { auth_error: 'Login cancelado.' });
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(req.query.code ?? ''),
        client_id: env('GOOGLE_CLIENT_ID'),
        client_secret: env('GOOGLE_CLIENT_SECRET'),
        redirect_uri: `${appUrl()}/api/auth/callback`,
        grant_type: 'authorization_code'
      })
    });
    const tok = (await r.json()) as { id_token?: string; error_description?: string };
    if (!r.ok || !tok.id_token) throw new Error(tok.error_description ?? 'Falha ao obter token da Google');
    const id = decodeIdToken(tok.id_token);
    if (id.aud !== env('GOOGLE_CLIENT_ID') || !id.email || id.email_verified === false) throw new Error('Conta Google inválida');
    if (!isEmailAllowed(id.email)) return finish(res, platform, { auth_error: `A conta ${id.email} não tem acesso a esta app.` });

    const { users, authcodes } = await cols();
    const now = new Date();
    await users.updateOne(
      { _id: id.sub },
      { $set: { email: id.email, name: id.name ?? id.email, picture: id.picture, lastLoginAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );
    const code = randomCode();
    await authcodes.insertOne({ _id: code, userId: id.sub, createdAt: now });
    finish(res, platform, { auth_code: code });
  } catch (e) {
    console.error(e);
    finish(res, platform, { auth_error: e instanceof Error ? e.message : 'Erro no login' });
  }
}
