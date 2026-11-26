import { byCategory, inMonth, monthlySeries, totals } from '../lib/analytics';
import { getCategory } from '../lib/categories';
import { fmt, fmt0 } from '../lib/format';
import type { Insight } from '../lib/insights';
import type { Settings, Transaction } from '../lib/types';
import { Bars, Donut } from './Charts';
import { Empty, InsightCard, TxRow } from './ui';

interface Props {
  txs: Transaction[];
  month: string;
  setMonth: (k: string) => void;
  settings: Settings;
  insights: Insight[];
  deductionTotal: number;
  onEdit: (t: Transaction) => void;
  go: (tab: 'movimentos' | 'dicas' | 'irs') => void;
  onDemo: () => void;
  onAdd: () => void;
}

export function Dashboard({ txs, month, setMonth, settings, insights, deductionTotal, onEdit, go, onDemo, onAdd }: Props) {
  const mtx = inMonth(txs, month);
  const t = totals(mtx);
  const cats = byCategory(mtx);
  const series = monthlySeries(txs, month, 6);
  const recent = [...mtx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const savingRate = t.income > 0 ? Math.round((t.balance / t.income) * 100) : null;
  const potential = insights.reduce((s, i) => s + (i.saving ?? 0), 0);
  const [y, m] = month.split('-').map(Number);
  const now = new Date();
  const daysInMonth = new Date(y, m, 0).getDate();
  const isCurrent = now.getFullYear() === y && now.getMonth() + 1 === m;
  const dayAvg = t.expense / (isCurrent ? now.getDate() : daysInMonth);

  if (txs.length === 0) {
    return (
      <div className="card">
        <Empty icon="👋" text="Bem-vindo à Carteira PT! Regista a tua primeira despesa ou experimenta com dados de exemplo de uma pessoa a viver em Lisboa."
          action={<div className="btn-row" style={{ justifyContent: 'center' }}><button className="btn primary" onClick={onAdd}>+ Adicionar movimento</button><button className="btn" onClick={onDemo}>Carregar exemplo</button></div>} />
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="grid two">
        <div className="card hero">
          <div className="label">{settings.name ? `Olá, ${settings.name} · ` : ''}Saldo do mês</div>
          <div className="big num">{fmt(t.balance)}</div>
          <div className="row">
            <div className="pill"><span>Receitas</span><b className="num">{fmt(t.income)}</b></div>
            <div className="pill"><span>Despesas</span><b className="num">{fmt(t.expense)}</b></div>
          </div>
        </div>
        <div className="card">
          <h2>Últimos 6 meses <span className="small muted">🟩 receitas 🟥 despesas</span></h2>
          <Bars series={series} active={month} onPick={setMonth} />
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><span>Taxa de poupança</span><b className="num" style={{ color: savingRate !== null && savingRate < 0 ? 'var(--danger)' : undefined }}>{savingRate === null ? '—' : `${savingRate}%`}</b></div>
        <div className="kpi"><span>Média diária</span><b className="num">{fmt(dayAvg)}</b></div>
        <div className="kpi" onClick={() => go('irs')} style={{ cursor: 'pointer' }}><span>Deduções IRS {y}</span><b className="num">{fmt0(deductionTotal)}</b></div>
        <div className="kpi" onClick={() => go('dicas')} style={{ cursor: 'pointer' }}><span>Poupança possível</span><b className="num" style={{ color: 'var(--success)' }}>{fmt0(potential)}/ano</b></div>
      </div>

      <div className="grid two">
        <div className="card">
          <h2>Para onde vai o dinheiro</h2>
          {cats.length === 0 ? <Empty icon="🧘" text="Sem despesas neste mês." /> : (
            <div className="donut-wrap">
              <Donut data={cats} total={t.expense} />
              <div className="legend">
                {cats.slice(0, 6).map((c) => {
                  const cat = getCategory(c.category);
                  const b = settings.budgets[c.category];
                  const pct = b ? Math.min(100, (c.amount / b) * 100) : (c.amount / t.expense) * 100;
                  return (
                    <div className="cat-row" key={c.category}>
                      <span style={{ fontSize: 18 }}>{cat.icon}</span>
                      <div>
                        <div className="small" style={{ fontWeight: 600 }}>{cat.label}</div>
                        <div className="bar"><i style={{ width: `${pct}%`, background: b && c.amount > b ? 'var(--danger)' : cat.color }} /></div>
                      </div>
                      <div className="small num" style={{ textAlign: 'right' }}><b>{fmt0(c.amount)}</b>{b ? <div className="muted">de {fmt0(b)}</div> : null}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <h2>Sugestões para ti <button className="link" onClick={() => go('dicas')}>Ver todas →</button></h2>
          {insights.length === 0 ? <Empty icon="✨" text="Tudo em ordem! Continua a registar para receberes dicas." /> : insights.slice(0, 3).map((i) => <InsightCard key={i.id} i={i} />)}
        </div>
      </div>

      <div className="card">
        <h2>Movimentos recentes <button className="link" onClick={() => go('movimentos')}>Ver todos →</button></h2>
        {recent.length === 0 ? <Empty icon="📭" text="Sem movimentos neste mês." /> : recent.map((r) => <TxRow key={r.id} t={r} showDate onClick={() => onEdit(r)} />)}
      </div>
    </div>
  );
}
