import type { VercelRequest, VercelResponse } from '@vercel/node';
import { signSession } from '../../server/auth.js';
import { cols } from '../../server/db.js';
import { handler } from '../../server/http.js';

/** Troca o código de uso único (válido 5 min) por uma sessão. */
export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') return res.status(405).end();
  const code = String(req.body?.code ?? '');
  const { authcodes, users } = await cols();
  const entry = code ? await authcodes.findOneAndDelete({ _id: code }) : null;
  if (!entry || Date.now() - entry.createdAt.getTime() > 5 * 60 * 1000) return res.status(400).json({ error: 'Código de login inválido ou expirado.' });
  const user = await users.findOne({ _id: entry.userId });
  if (!user) return res.status(400).json({ error: 'Utilizador não encontrado.' });
  res.json({ token: await signSession(user._id, user.email), user: { email: user.email, name: user.name, picture: user.picture }, settings: user.settings ?? null });
});
