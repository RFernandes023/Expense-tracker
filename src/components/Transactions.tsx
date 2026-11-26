import { useMemo, useState } from 'react';
import { inMonth, totals } from '../lib/analytics';
import { CATEGORIES, getCategory } from '../lib/categories';
import { fmt, formatDate } from '../lib/format';
import type { Transaction } from '../lib/types';
import { Empty, TxRow } from './ui';

export function Transactions({ txs, month, onEdit }: { txs: Transaction[]; month: string; onEdit: (t: Transaction) => void }) {
  const [q, setQ] = useState('');
  const [type, setType] = useState<'all' | 'expense' | 'income' | 'nonif'>('all');
  const [cat, setCat] = useState('');

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return inMonth(txs, month)
      .filter((t) => (type === 'all' ? true : type === 'nonif' ? t.withNif === false && getCategory(t.category).deduction : t.type === type))
      .filter((t) => !cat || t.category === cat)
      .filter((t) => !s || t.description.toLowerCase().includes(s) || getCategory(t.category).label.toLowerCase().includes(s))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [txs, month, q, type, cat]);

  const groups = useMemo(() => {
    const m = new Map<string, Transaction[]>();
    for (const t of list) m.set(t.date, [...(m.get(t.date) ?? []), t]);
    return [...m.entries()];
  }, [list]);
  const tot = totals(list);
  const used = new Set(inMonth(txs, month).map((t) => t.category));

  return (
    <div className="card">
      <div className="search"><input className="input" placeholder="Procurar movimentos…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="chips">
        {([['all', 'Todos'], ['expense', 'Despesas'], ['income', 'Receitas'], ['nonif', 'Sem NIF']] as const).map(([k, l]) => (
          <button key={k} className={`chip ${type === k ? 'active' : ''}`} onClick={() => setType(k)}>{l}</button>
        ))}
        <select className="chip" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {CATEGORIES.filter((c) => used.has(c.id)).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
      </div>
      <div className="small muted" style={{ display: 'flex', gap: 14, margin: '4px 4px 0' }}>
        <span>{list.length} movimentos</span><span style={{ color: 'var(--success)' }}>+{fmt(tot.income)}</span><span style={{ color: 'var(--danger)' }}>−{fmt(tot.expense)}</span>
      </div>
      {groups.length === 0 ? <Empty icon="🔎" text="Nenhum movimento encontrado." /> : groups.map(([d, items]) => (
        <div key={d}>
          <div className="day-head"><span>{formatDate(d)}</span><span className="num">{fmt(totals(items).balance)}</span></div>
          {items.map((t) => <TxRow key={t.id} t={t} onClick={() => onEdit(t)} />)}
        </div>
      ))}
    </div>
  );
}
