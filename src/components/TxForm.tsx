import { useEffect, useState } from 'react';
import { api, HAS_BACKEND, type OcrResult } from '../lib/api';
import { expenseCategories, getCategory, incomeCategories } from '../lib/categories';
import { todayISO, uid } from '../lib/format';
import type { Transaction, TxType } from '../lib/types';
import { OcrSummary, ReceiptScanner } from './ReceiptScanner';
import { Sheet, Toggle } from './ui';

interface Props {
  initial?: Transaction;
  onSave: (t: Transaction) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export function TxForm({ initial, onSave, onDelete, onClose }: Props) {
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense');
  const [amount, setAmount] = useState(initial ? String(initial.amount).replace('.', ',') : '');
  const [category, setCategory] = useState(initial?.category ?? 'supermercado');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [withNif, setWithNif] = useState(initial?.withNif !== false);
  const [recurring, setRecurring] = useState(!!initial?.recurring);
  const [err, setErr] = useState('');
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [extra, setExtra] = useState<Pick<Transaction, 'merchant' | 'merchantNif' | 'vat' | 'atcud' | 'ocrText' | 'receiptId'>>({
    merchant: initial?.merchant, merchantNif: initial?.merchantNif, vat: initial?.vat, atcud: initial?.atcud, ocrText: initial?.ocrText, receiptId: initial?.receiptId
  });
  const [preview, setPreview] = useState<{ url: string; mime: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  const applyOcr = (r: OcrResult) => {
    const i = r.invoice;
    setOcr(r);
    setType('expense');
    if (i.total > 0) setAmount(i.total.toFixed(2).replace('.', ','));
    setDate(i.date);
    setCategory(i.category);
    setDescription(i.description || i.merchant);
    setWithNif(!!i.customerNif);
    setExtra({ merchant: i.merchant || undefined, merchantNif: i.merchantNif || undefined, vat: i.vatTotal || undefined, atcud: i.atcud || undefined, ocrText: i.rawText || undefined, receiptId: r.receiptId ?? extra.receiptId });
    setErr('');
  };

  const showReceipt = async () => {
    if (!extra.receiptId) return;
    setLoadingPreview(true);
    try {
      const blob = await api.receipt(extra.receiptId);
      const url = URL.createObjectURL(blob);
      if (blob.type === 'application/pdf') window.open(url, '_blank');
      setPreview({ url, mime: blob.type });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível abrir a fatura.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const cats = type === 'expense' ? expenseCategories : incomeCategories;
  const cat = getCategory(category);

  const switchType = (t: TxType) => {
    setType(t);
    setCategory(t === 'expense' ? 'supermercado' : 'salario');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount.replace(/\s/g, '').replace(',', '.'));
    if (!value || value <= 0 || !Number.isFinite(value)) return setErr('Indica um valor válido.');
    if (!date) return setErr('Indica a data.');
    onSave({
      id: initial?.id ?? uid(), type, amount: Math.round(value * 100) / 100, category, description: description.trim(), date,
      withNif: type === 'expense' && cat.deduction ? withNif : undefined,
      recurring: initial?.recurringOf ? undefined : recurring || undefined,
      recurringOf: initial?.recurringOf,
      ...(type === 'expense' ? extra : {})
    });
  };

  return (
    <Sheet title={initial ? 'Editar movimento' : 'Novo movimento'} onClose={onClose}>
      <form onSubmit={submit}>
        {HAS_BACKEND && <ReceiptScanner onResult={applyOcr} />}
        {ocr && <OcrSummary r={ocr} deductible={!!cat.deduction} />}
        {!ocr && extra.receiptId && (
          <div className="receipt-preview">
            {preview?.mime.startsWith('image/') ? <img src={preview.url} alt="Fatura digitalizada" /> : (
              <button type="button" className="btn block" onClick={showReceipt} disabled={loadingPreview}>{loadingPreview ? 'A abrir…' : '🧾 Ver fatura original'}</button>
            )}
          </div>
        )}
        <div className="seg">
          <button type="button" className={type === 'expense' ? 'on' : ''} onClick={() => switchType('expense')}>Despesa</button>
          <button type="button" className={type === 'income' ? 'on' : ''} onClick={() => switchType('income')}>Receita</button>
        </div>
        <div className="field" style={{ alignItems: 'center' }}>
          <input className="amount-input num" inputMode="decimal" placeholder="0,00 €" value={amount} autoFocus={!initial}
            onChange={(e) => { setAmount(e.target.value.replace(/[^\d,.]/g, '')); setErr(''); }} aria-label="Valor" style={{ color: type === 'income' ? 'var(--success)' : undefined }} />
        </div>
        <div className="field">
          <label>Categoria</label>
          <div className="cat-grid">
            {cats.map((c) => (
              <button type="button" key={c.id} className={`cat-opt ${category === c.id ? 'on' : ''}`} onClick={() => setCategory(c.id)}>
                <span className="e">{c.icon}</span>{c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 10 }}>
          <div className="field"><label htmlFor="desc">Descrição</label><input id="desc" className="input" value={description} placeholder={cat.label} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="field"><label htmlFor="date">Data</label><input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        {type === 'expense' && cat.deduction && (
          <div className="switch-row">
            <div><div className="t">Fatura com NIF</div><div className="d">Conta para as deduções do IRS no e-Fatura</div></div>
            <Toggle checked={withNif} onChange={setWithNif} label="Fatura com NIF" />
          </div>
        )}
        {!initial?.recurringOf && (
          <div className="switch-row">
            <div><div className="t">Repetir todos os meses</div><div className="d">Ex.: renda, salário, ginásio, subscrições</div></div>
            <Toggle checked={recurring} onChange={setRecurring} label="Repetir mensalmente" />
          </div>
        )}
        {err && <p style={{ color: 'var(--danger)', fontWeight: 600 }}>{err}</p>}
        <div className="btn-row" style={{ marginTop: 10 }}>
          {initial && onDelete && <button type="button" className="btn danger" onClick={() => onDelete(initial.id)}>Apagar</button>}
          <button type="submit" className="btn primary" style={{ flex: 1 }}>{initial ? 'Guardar alterações' : 'Adicionar'}</button>
        </div>
      </form>
    </Sheet>
  );
}
