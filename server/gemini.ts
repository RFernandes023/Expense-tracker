import { expenseCategories } from '../src/lib/categories.js';
import { env, optionalEnv } from './env.js';

export interface InvoiceData {
  merchant: string;
  merchantNif: string;
  customerNif: string;
  date: string; // YYYY-MM-DD
  total: number;
  vatTotal: number;
  atcud: string;
  documentType: string;
  category: string;
  description: string;
  items: { name: string; total: number }[];
  rawText: string;
  confidence: number;
}

export type InvoiceSource = 'ocr' | 'text';

const CATEGORY_LIST = expenseCategories.map((c) => `- ${c.id}: ${c.label}`).join('\n');

export const PROMPT = `És um assistente que lê faturas e talões portugueses (fatura, fatura simplificada, fatura-recibo, talão de compra).
Extrai os dados do documento e responde APENAS com JSON no esquema pedido.
Regras:
- "date" no formato YYYY-MM-DD (data de emissão).
- "total" é o valor total pago com IVA, em euros, como número (ex.: 23.5).
- "vatTotal" é o total de IVA do documento (0 se não constar).
- "merchantNif" é o NIF do emitente (9 dígitos, sem prefixo PT). "customerNif" é o NIF do adquirente/cliente; deixa vazio se for "Consumidor final" ou não existir.
- "atcud" é o código ATCUD se existir (ex.: "JFP3KX2M-123"), senão vazio.
- "category" tem de ser um destes ids, o que melhor descreve a despesa:
${CATEGORY_LIST}
- "description" é uma descrição curta em português (até 40 caracteres), ex.: "Continente — compras" ou "Farmácia Silva".
- "items" lista até 15 linhas principais com nome e total.
- "rawText" é a transcrição integral do texto do documento, linha a linha, para pesquisa.
- "confidence" entre 0 e 1 indica a confiança na leitura do total e da data.`;

export const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    merchant: { type: 'STRING' },
    merchantNif: { type: 'STRING' },
    customerNif: { type: 'STRING' },
    date: { type: 'STRING' },
    total: { type: 'NUMBER' },
    vatTotal: { type: 'NUMBER' },
    atcud: { type: 'STRING' },
    documentType: { type: 'STRING' },
    category: { type: 'STRING', enum: expenseCategories.map((c) => c.id) },
    description: { type: 'STRING' },
    items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, total: { type: 'NUMBER' } }, required: ['name', 'total'] } },
    rawText: { type: 'STRING' },
    confidence: { type: 'NUMBER' }
  },
  required: ['merchant', 'date', 'total', 'category', 'description', 'rawText']
};

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
  const n = Number(String(v ?? '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};
const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '').slice(-9);

/** Normaliza/valida a resposta do modelo. */
export function normalizeInvoice(raw: Record<string, unknown>, today = new Date()): InvoiceData {
  const validCats = new Set(expenseCategories.map((c) => c.id));
  let date = String(raw.date ?? '');
  const pt = date.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (pt) date = `${pt[3]}-${pt[2].padStart(2, '0')}-${pt[1].padStart(2, '0')}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) date = today.toISOString().slice(0, 10);
  const customerNif = digits(raw.customerNif);
  return {
    merchant: String(raw.merchant ?? '').trim().slice(0, 80),
    merchantNif: digits(raw.merchantNif),
    customerNif: customerNif.length === 9 && customerNif !== '999999990' ? customerNif : '',
    date,
    total: Math.abs(toNum(raw.total)),
    vatTotal: Math.abs(toNum(raw.vatTotal)),
    atcud: String(raw.atcud ?? '').trim().slice(0, 40),
    documentType: String(raw.documentType ?? '').trim().slice(0, 40),
    category: validCats.has(String(raw.category)) ? String(raw.category) : 'outros',
    description: String(raw.description ?? raw.merchant ?? '').trim().slice(0, 60),
    items: Array.isArray(raw.items) ? raw.items.slice(0, 15).map((i: any) => ({ name: String(i?.name ?? '').slice(0, 60), total: toNum(i?.total) })) : [],
    rawText: String(raw.rawText ?? '').slice(0, 20000),
    confidence: Math.max(0, Math.min(1, toNum(raw.confidence) || 0.5))
  };
}

/** Extrai o texto de um PDF pesquisável (vazio se for digitalizado/imagem). */
export async function pdfText(buf: Buffer): Promise<string> {
  try {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    return text.replace(/[ \t]+/g, ' ').trim();
  } catch {
    return '';
  }
}

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

export async function callGemini(parts: Part[], fetchImpl: typeof fetch = fetch): Promise<Record<string, unknown>> {
  const model = optionalEnv('GEMINI_MODEL', 'gemini-2.5-flash');
  const r = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env('GEMINI_API_KEY') },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: PROMPT }, ...parts] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA }
    })
  });
  const body = (await r.json().catch(() => ({}))) as any;
  if (!r.ok) throw new Error(`Gemini: ${body?.error?.message ?? r.statusText}`);
  const text = body?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
  if (!text) throw new Error('Gemini não devolveu resultado (documento ilegível ou bloqueado).');
  return JSON.parse(text);
}

/**
 * Lê uma fatura. PDFs com texto pesquisável são lidos a partir do texto (mais rápido e barato);
 * imagens e PDFs digitalizados vão para OCR multimodal do Gemini.
 */
export async function readInvoice(
  input: { mime: string; data?: Buffer; text?: string },
  fetchImpl: typeof fetch = fetch
): Promise<{ invoice: InvoiceData; source: InvoiceSource }> {
  let text = input.text?.trim() ?? '';
  if (!text && input.mime === 'application/pdf' && input.data) text = await pdfText(input.data);
  if (text.length >= 40) {
    const raw = await callGemini([{ text: `Texto extraído do documento:\n"""\n${text.slice(0, 30000)}\n"""` }], fetchImpl);
    const invoice = normalizeInvoice(raw);
    if (!invoice.rawText) invoice.rawText = text.slice(0, 20000);
    return { invoice, source: 'text' };
  }
  if (!input.data) throw new Error('Documento vazio.');
  const raw = await callGemini([{ inline_data: { mime_type: input.mime, data: input.data.toString('base64') } }], fetchImpl);
  return { invoice: normalizeInvoice(raw), source: 'ocr' };
}
