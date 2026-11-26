import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cols } from '../server/db.js';
import { handler, requireUser } from '../server/http.js';
import { sanitizeTx, toClient } from '../server/validate.js';

export default handler(async (req: VercelRequest, res: VercelResponse) => {
  const s = await requireUser(req, res);
  if (!s) return;
  const { transactions, receipts } = await cols();

  if (req.method === 'GET') {
    const list = await transactions.find({ userId: s.userId }).sort({ date: -1 }).toArray();
    return res.json({ transactions: list.map(toClient) });
  }

  if (req.method === 'POST') {
    const input: unknown[] = Array.isArray(req.body?.transactions) ? req.body.transactions : [];
    if (input.length === 0 || input.length > 2000) return res.status(400).json({ error: 'Envia entre 1 e 2000 movimentos.' });
    const docs = input.map((t) => sanitizeTx(t, s.userId)).filter((d) => d !== null);
    if (docs.length === 0) return res.status(400).json({ error: 'Movimentos inválidos.' });
    await transactions.bulkWrite(docs.map((d) => ({ replaceOne: { filter: { _id: d._id, userId: s.userId }, replacement: d, upsert: true } })));
    return res.json({ saved: docs.length, rejected: input.length - docs.length });
  }

  if (req.method === 'DELETE' && req.query.all === '1') {
    const r = await transactions.deleteMany({ userId: s.userId });
    await receipts.deleteMany({ userId: s.userId });
    return res.json({ deleted: r.deletedCount });
  }

  if (req.method === 'DELETE') {
    const id = String(req.query.id ?? '');
    const doc = await transactions.findOneAndDelete({ _id: id, userId: s.userId });
    if (doc?.receiptId) await receipts.deleteOne({ _id: doc.receiptId, userId: s.userId });
    await transactions.updateMany({ userId: s.userId, recurringOf: id }, { $unset: { recurringOf: '' } });
    return res.json({ deleted: doc ? 1 : 0 });
  }

  res.status(405).end();
});
