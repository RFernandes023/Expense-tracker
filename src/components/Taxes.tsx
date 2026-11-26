import { useState } from 'react';
import { fmt } from '../lib/format';
import { computeDeductions, totalDeduction } from '../lib/irs';
import type { Settings, Transaction } from '../lib/types';

const HELP: Record<string, string> = {
  gerais: 'Supermercado, energia, telecomunicações, vestuário, combustível… (setores gerais no e-Fatura).',
  saude: 'Farmácia, consultas, exames e seguros de saúde. IVA a 6% ou isento; outras taxas com receita médica.',
  educacao: 'Propinas, creche, explicações, livros e material escolar.',
  habitacao: 'Rendas de habitação própria e permanente com contrato registado nas Finanças.',
  iva: 'Restauração, alojamento, cabeleireiros, oficinas, veterinários, ginásios e passes (passes: 100% do IVA).',
  lares: 'Lares e apoio domiciliário para ascendentes ou dependentes.',
  ppr: 'Entregas em Planos Poupança Reforma (limite depende da idade).'
};

export function Taxes({ txs, settings }: { txs: Transaction[]; settings: Settings }) {
  const years = [...new Set(txs.map((t) => Number(t.date.slice(0, 4))))].sort((a, b) => b - a);
  const [year, setYear] = useState(years[0] ?? new Date().getFullYear());
  const lines = computeDeductions(txs, year, settings);
  const total = totalDeduction(lines);
  const missing = lines.reduce((s, l) => s + l.missingNif, 0);

  return (
    <div className="grid">
      <div className="card hero">
        <div className="label">Deduções à coleta estimadas · IRS {year}</div>
        <div className="big num">{fmt(total)}</div>
        <div className="row">
          <div className="pill"><span>Agregado</span><b>{settings.taxpayers} titular{settings.taxpayers > 1 ? 'es' : ''}{settings.dependents ? ` + ${settings.dependents} dep.` : ''}</b></div>
          <div className="pill"><span>Despesa sem NIF</span><b className="num">{fmt(missing)}</b></div>
        </div>
      </div>
      {years.length > 1 && (
        <div className="chips">{years.map((y) => <button key={y} className={`chip ${y === year ? 'active' : ''}`} onClick={() => setYear(y)}>{y}</button>)}</div>
      )}
      <div className="card">
        <h2>Por tipo de dedução</h2>
        {lines.map((l) => {
          const pct = l.cap ? Math.min(100, (l.deduction / l.cap) * 100) : 0;
          return (
            <div className="progress-line" key={l.key}>
              <div className="top"><span><b>{l.label}</b> <span className="small muted">· {l.rateLabel}</span></span><b className="num">{fmt(l.deduction)}</b></div>
              <div className="bar" style={{ height: 10 }}><i style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--success)' : 'linear-gradient(90deg, var(--primary-2), var(--primary))' }} /></div>
              <div className="small muted" style={{ marginTop: 4 }}>
                {HELP[l.key]} Despesa registada: {fmt(l.spent)}{l.missingNif > 0 && <span style={{ color: 'var(--warn)', fontWeight: 600 }}> · {fmt(l.missingNif)} sem NIF</span>}
                {pct >= 100 && <span style={{ color: 'var(--success)', fontWeight: 600 }}> · limite atingido ✓</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="card small muted">
        <b>ℹ️ Nota:</b> valores estimados com base nas regras gerais do Código do IRS (percentagens e limites de referência) e apenas nos movimentos que registaste.
        Os limites podem mudar com o Orçamento do Estado e existem majorações (ex.: famílias monoparentais, interior, dependentes).
        Confirma sempre no <a href="https://faturas.portaldasfinancas.gov.pt" target="_blank" rel="noreferrer">e-Fatura</a> e no simulador do Portal das Finanças.
      </div>
    </div>
  );
}
