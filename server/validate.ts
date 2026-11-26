import type { TxDoc } from './db.js';

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined);

/** Valida e normaliza um movimento enviado pelo cliente. Devolve null se for inválido. */
export function sanitizeTx(raw: any, userId: string, now = new Date()): TxDoc | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = str(raw.id, 64);
  const amount = Number(raw.amount);
  if (!id || !/^[\w-]+$/.test(id)) return null;
  if (raw.type !== 'expense' && raw.type !== 'income') return null;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return null;
  if (typeof raw.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) return null;
  const doc: TxDoc = {
    _id: id,
    userId,
    type: raw.type,
    amount: Math.round(amount * 100) / 100,
    category: str(raw.category, 40) || 'outros',
    description: str(raw.description, 200) ?? '',
    date: raw.date,
    updatedAt: now
  };
  if (typeof raw.withNif === 'boolean') doc.withNif = raw.withNif;
  if (raw.recurring === true) doc.recurring = true;
  const opt = { recurringOf: 64, merchant: 120, merchantNif: 9, atcud: 40, ocrText: 20000, receiptId: 64 } as const;
  for (const [k, max] of Object.entries(opt)) {
    const v = str(raw[k], max);
    if (v) (doc as any)[k] = v;
  }
  if (Number.isFinite(Number(raw.vat)) && raw.vat !== undefined && raw.vat !== null) doc.vat = Math.round(Number(raw.vat) * 100) / 100;
  return doc;
}

/** Converte documento da BD para o formato do cliente. */
export function toClient(d: TxDoc) {
  const { _id, userId: _u, updatedAt: _t, ...rest } = d;
  return { id: _id, ...rest };
}

export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
