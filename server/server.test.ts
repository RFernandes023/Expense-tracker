import { beforeAll, describe, expect, it } from 'vitest';
import { signSession, signState, verifySession, verifyState } from './auth';
import { normalizeInvoice, readInvoice } from './gemini';
import { sanitizeTx, toClient } from './validate';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-with-enough-length-1234567890';
  process.env.GEMINI_API_KEY = 'test-key';
});

/** PDF mínimo com uma linha de texto pesquisável. */
function makePdf(text: string): Buffer {
  const stream = `BT /F1 12 Tf 50 750 Td (${text}) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

const geminiReply = (obj: object) => async (_url: any, init: any) => {
  (geminiReply as any).last = JSON.parse(init.body);
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), { status: 200 });
};

describe('auth', () => {
  it('sessão JWT ida e volta', async () => {
    const t = await signSession('u1', 'a@b.pt');
    expect(await verifySession(t)).toEqual({ userId: 'u1', email: 'a@b.pt' });
    expect(await verifySession(t + 'x')).toBeNull();
  });
  it('state assinado e com validade', () => {
    const s = signState('android');
    expect(verifyState(s)).toBe('android');
    expect(verifyState(s.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')))).toBeNull();
    expect(verifyState(s, Date.now() + 11 * 60 * 1000)).toBeNull();
    expect(verifyState('lixo')).toBeNull();
  });
});

describe('validação de movimentos', () => {
  it('aceita e normaliza', () => {
    const d = sanitizeTx({ id: 'abc', type: 'expense', amount: '12.345', category: 'saude', description: 'x', date: '2026-01-02', withNif: false, ocrText: 'FARMACIA', evil: 1 }, 'u')!;
    expect(d).toMatchObject({ _id: 'abc', userId: 'u', amount: 12.35, withNif: false, ocrText: 'FARMACIA' });
    expect((d as any).evil).toBeUndefined();
    expect(toClient(d)).toMatchObject({ id: 'abc', amount: 12.35 });
    expect('userId' in toClient(d)).toBe(false);
  });
  it('rejeita inválidos', () => {
    expect(sanitizeTx({ id: 'a', type: 'x', amount: 1, date: '2026-01-01' }, 'u')).toBeNull();
    expect(sanitizeTx({ id: 'a', type: 'expense', amount: -1, date: '2026-01-01' }, 'u')).toBeNull();
    expect(sanitizeTx({ id: '$where', type: 'expense', amount: 1, date: '2026-01-01' }, 'u')).toBeNull();
    expect(sanitizeTx({ id: 'a', type: 'expense', amount: 1, date: '01/01/2026' }, 'u')).toBeNull();
  });
});

describe('leitura de faturas', () => {
  it('normaliza formatos portugueses', () => {
    const i = normalizeInvoice({ merchant: 'Pingo Doce', date: '05/03/2026', total: '1.234,56', vatTotal: '12,30', category: 'xpto', customerNif: 'PT 999999990', merchantNif: 'PT500829993', description: 'Compras' });
    expect(i.date).toBe('2026-03-05');
    expect(i.total).toBe(1234.56);
    expect(i.vatTotal).toBe(12.3);
    expect(i.category).toBe('outros');
    expect(i.customerNif).toBe(''); // consumidor final
    expect(i.merchantNif).toBe('500829993');
  });
  it('PDF pesquisável usa o texto (sem enviar o ficheiro)', async () => {
    const pdf = makePdf('FATURA FS 1/123 Farmacia Central NIF 501234567 Total 15,90 EUR IVA 0,90 Data 2026-02-10');
    const fetchMock = geminiReply({ merchant: 'Farmácia Central', date: '2026-02-10', total: 15.9, category: 'saude', description: 'Farmácia', rawText: '' });
    const r = await readInvoice({ mime: 'application/pdf', data: pdf }, fetchMock as any);
    expect(r.source).toBe('text');
    expect(r.invoice.total).toBe(15.9);
    expect(r.invoice.rawText).toContain('Farmacia Central');
    const parts = (geminiReply as any).last.contents[0].parts;
    expect(parts.some((p: any) => p.inline_data)).toBe(false);
  });
  it('imagem vai para OCR multimodal', async () => {
    const fetchMock = geminiReply({ merchant: 'Café', date: '2026-02-10', total: 3.2, category: 'restauracao', description: 'Café', rawText: 'CAFE' });
    const r = await readInvoice({ mime: 'image/jpeg', data: Buffer.from([0xff, 0xd8, 0xff]) }, fetchMock as any);
    expect(r.source).toBe('ocr');
    const parts = (geminiReply as any).last.contents[0].parts;
    expect(parts[1].inline_data.mime_type).toBe('image/jpeg');
    expect((geminiReply as any).last.generationConfig.responseMimeType).toBe('application/json');
  });
  it('erro da API é propagado com mensagem', async () => {
    const bad = async () => new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 });
    await expect(readInvoice({ mime: 'image/png', data: Buffer.from([1]) }, bad as any)).rejects.toThrow('API key not valid');
  });
});
