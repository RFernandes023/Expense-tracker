import { useRef, useState } from 'react';
import { api, prepareFile, type OcrResult } from '../lib/api';
import { fmt } from '../lib/format';

/** Botão para ler faturas: foto/imagem (OCR) ou PDF (texto pesquisável ou digitalizado), ou texto colado. */
export function ReceiptScanner({ onResult }: { onResult: (r: OcrResult) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [pasting, setPasting] = useState(false);
  const [text, setText] = useState('');

  const run = async (fn: () => Promise<OcrResult>) => {
    setErr('');
    try {
      onResult(await fn());
      setPasting(false);
      setText('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível ler a fatura.');
    } finally {
      setBusy('');
    }
  };

  const onFile = (f: File) => {
    setBusy(f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf') ? 'A ler o PDF…' : 'A ler a fatura com IA…');
    run(async () => api.ocr(await prepareFile(f)));
  };

  return (
    <div className="scanner">
      <div className="scanner-row">
        <button type="button" className="btn scan-btn" disabled={!!busy} onClick={() => input.current?.click()}>
          {busy ? <><span className="spinner" /> {busy}</> : <>📷 Ler fatura <span className="small muted">foto ou PDF</span></>}
        </button>
        <button type="button" className="btn" disabled={!!busy} onClick={() => setPasting((v) => !v)} aria-expanded={pasting}>📋 Texto</button>
      </div>
      <input ref={input} type="file" accept="image/*,application/pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      {pasting && (
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="ocr-text">Cola o texto da fatura (ex.: de um email)</label>
          <textarea id="ocr-text" className="input" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          <button type="button" className="btn" disabled={!!busy || text.trim().length < 20} onClick={() => { setBusy('A analisar o texto…'); run(() => api.ocr({ text })); }}>Analisar texto</button>
        </div>
      )}
      {err && <p className="scan-err" role="alert">{err}</p>}
    </div>
  );
}

export function OcrSummary({ r, deductible }: { r: OcrResult; deductible: boolean }) {
  const i = r.invoice;
  return (
    <div className="ocr-box">
      <div className="ocr-head">
        <b>{r.source === 'text' ? '📄 Lido do texto do PDF' : '🔍 Lido por OCR'}</b>
        <span className={`tag ${i.confidence >= 0.7 ? 'ok' : 'warn'}`}>{i.confidence >= 0.7 ? 'confiança alta' : 'confirma os valores'}</span>
      </div>
      <div className="small">
        {i.merchant && <div><b>{i.merchant}</b>{i.merchantNif && <span className="muted"> · NIF {i.merchantNif}</span>}</div>}
        <div className="muted">
          {i.documentType && <>{i.documentType} · </>}IVA {fmt(i.vatTotal)}{i.atcud && <> · ATCUD {i.atcud}</>}
        </div>
        {deductible && !i.customerNif && <div className="ocr-warn">⚠️ Fatura sem o teu NIF — não conta para as deduções do IRS.</div>}
        {i.customerNif && <div className="muted">NIF do cliente: {i.customerNif}</div>}
        {i.items.length > 0 && (
          <details>
            <summary>{i.items.length} linha(s) da fatura</summary>
            <ul className="ocr-items">{i.items.map((it, k) => <li key={k}><span>{it.name}</span><span className="num">{fmt(it.total)}</span></li>)}</ul>
          </details>
        )}
      </div>
    </div>
  );
}
