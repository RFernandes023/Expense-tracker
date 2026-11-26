import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cols } from '../server/db.js';
import { handler, requireUser } from '../server/http.js';

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  const s = await requireUser(req, res);
  if (!s) return;
  const { users } = await cols();
  if (req.method === 'PUT') {
    const settings = req.body?.settings;
    if (!settings || typeof settings !== 'object' || JSON.stringify(settings).length > 20000) return res.status(400).json({ error: 'Definições inválidas' });
    await users.updateOne({ _id: s.userId }, { $set: { settings } });
    return res.json({ ok: true });
  }
  const user = await users.findOne({ _id: s.userId });
  if (!user) return res.status(401).json({ error: 'Utilizador não encontrado' });
  res.json({ user: { email: user.email, name: user.name, picture: user.picture }, settings: user.settings ?? null });
});
