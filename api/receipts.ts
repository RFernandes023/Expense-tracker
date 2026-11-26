import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cols } from '../server/db.js';
import { handler, requireUser } from '../server/http.js';

/** GET ?id= devolve o ficheiro original da fatura. */
export default handler(async (req: VercelRequest, res: VercelResponse) => {
  const s = await requireUser(req, res);
  if (!s) return;
  const { receipts } = await cols();
  const doc = await receipts.findOne({ _id: String(req.query.id ?? ''), userId: s.userId });
  if (!doc) return res.status(404).json({ error: 'Fatura não encontrada' });
  res.setHeader('Content-Type', doc.mime);
  res.setHeader('Cache-Control', 'private, max-age=86400');
  const data = Buffer.isBuffer(doc.data) ? doc.data : Buffer.from((doc.data as any).buffer);
  res.status(200).send(data);
});
