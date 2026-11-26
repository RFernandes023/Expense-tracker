import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { cols } from '../server/db.js';
import { readInvoice } from '../server/gemini.js';
import { handler, requireUser } from '../server/http.js';
import { ALLOWED_MIME } from '../server/validate.js';

export const config = { maxDuration: 60 };

/**
 * POST { mime, data (base64), name?, text?, save? }
 * Lê a fatura com Gemini e (opcionalmente) guarda o ficheiro na base de dados.
 */
export default handler(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') return res.status(405).end();
  const s = await requireUser(req, res);
  if (!s) return;
  const { mime, data, name, text, save } = req.body ?? {};
  if (text && typeof text === 'string') {
    const { invoice, source } = await readInvoice({ mime: 'text/plain', text: text.slice(0, 30000) });
    return res.json({ invoice, source, receiptId: null });
  }
  if (!ALLOWED_MIME.includes(mime) || typeof data !== 'string') return res.status(400).json({ error: 'Formato não suportado. Usa JPG, PNG, WEBP, HEIC ou PDF.' });
  const buf = Buffer.from(data, 'base64');
  if (buf.length === 0 || buf.length > 4 * 1024 * 1024) return res.status(413).json({ error: 'Ficheiro demasiado grande (máx. 4 MB).' });

  const { invoice, source } = await readInvoice({ mime, data: buf });
  let receiptId: string | null = null;
  if (save !== false) {
    const { receipts } = await cols();
    receiptId = randomUUID();
    await receipts.insertOne({ _id: receiptId, userId: s.userId, mime, name: typeof name === 'string' ? name.slice(0, 120) : undefined, data: buf, size: buf.length, createdAt: new Date() });
  }
  res.json({ invoice, source, receiptId });
});
