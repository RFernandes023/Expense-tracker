import type { ReactNode } from 'react';
import { getCategory } from '../lib/categories';
import { fmt, formatDate } from '../lib/format';
import type { Insight } from '../lib/insights';
import type { Transaction } from '../lib/types';

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        <div className="sheet-head"><h3>{title}</h3><button className="x" onClick={onClose} aria-label="Fechar">✕</button></div>
        {children}
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle" aria-label={label}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span />
    </label>
  );
}

export function TxRow({ t, onClick, showDate }: { t: Transaction; onClick?: () => void; showDate?: boolean }) {
  const c = getCategory(t.category);
  const deductible = c.deduction && t.type === 'expense';
  return (
    <div className={`tx ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <div className="tx-ic" style={{ background: `${c.color}22` }}>{c.icon}</div>
      <div className="tx-main">
        <div className="tx-title">{t.description || c.label}</div>
        <div className="tx-meta">
          <span>{c.label}</span>
          {showDate && <span>· {formatDate(t.date)}</span>}
          {(t.recurring || t.recurringOf) && <span className="tag">🔁 mensal</span>}
          {deductible && (t.withNif === false ? <span className="tag warn">sem NIF</span> : <span className="tag ok">e-Fatura</span>)}
        </div>
      </div>
      <div className={`tx-amt num ${t.type === 'income' ? 'in' : ''}`}>{t.type === 'income' ? '+' : '−'}{fmt(t.amount)}</div>
    </div>
  );
}

export function InsightCard({ i }: { i: Insight }) {
  return (
    <div className={`insight ${i.level}`}>
      <div className="ic">{i.icon}</div>
      <div>
        <h3>{i.title}</h3>
        <p>{i.body}</p>
        {(i.saving || i.link) && (
          <div className="foot">
            {i.saving ? <span className="saving">💰 até {fmt(Math.round(i.saving)).replace(/,00/, '')}/ano</span> : null}
            {i.link && <a href={i.link.url} target="_blank" rel="noreferrer">{i.link.label} ↗</a>}
          </div>
        )}
      </div>
    </div>
  );
}

export function Empty({ icon, text, action }: { icon: string; text: string; action?: ReactNode }) {
  return <div className="empty"><div className="e">{icon}</div><p>{text}</p>{action}</div>;
}
