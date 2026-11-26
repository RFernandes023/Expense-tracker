import { useState } from 'react';
import { fmt0 } from '../lib/format';
import { GUIDE } from '../lib/guide';
import type { Insight, InsightLevel } from '../lib/insights';
import { Empty, InsightCard } from './ui';

const FILTERS: [InsightLevel | 'all', string][] = [['all', 'Todas'], ['alerta', '🚨 Alertas'], ['poupanca', '💰 Poupança'], ['fiscal', '🧾 IRS'], ['info', 'ℹ️ Info']];

export function Tips({ insights }: { insights: Insight[] }) {
  const [f, setF] = useState<InsightLevel | 'all'>('all');
  const [section, setSection] = useState(GUIDE[0].id);
  const list = insights.filter((i) => f === 'all' || i.level === f);
  const potential = insights.reduce((s, i) => s + (i.saving ?? 0), 0);
  const sec = GUIDE.find((g) => g.id === section)!;

  return (
    <div className="grid two">
      <div className="card">
        <h2>Sugestões personalizadas {potential > 0 && <span className="saving small">💰 até {fmt0(potential)}/ano</span>}</h2>
        <div className="chips">{FILTERS.map(([k, l]) => <button key={k} className={`chip ${f === k ? 'active' : ''}`} onClick={() => setF(k)}>{l}</button>)}</div>
        {list.length === 0 ? <Empty icon="✨" text="Sem sugestões nesta categoria. Regista mais movimentos para análises mais precisas." /> : list.map((i) => <InsightCard key={i.id} i={i} />)}
      </div>
      <div className="card">
        <h2>Guia de poupança em Portugal 🇵🇹</h2>
        <div className="chips">{GUIDE.map((g) => <button key={g.id} className={`chip ${section === g.id ? 'active' : ''}`} onClick={() => setSection(g.id)}>{g.title}</button>)}</div>
        {sec.tips.map((t) => (
          <div className="insight" key={t.title}>
            <div className="ic">{t.icon}</div>
            <div>
              <h3>{t.title}</h3>
              <p>{t.body}</p>
              {t.url && <div className="foot"><a href={t.url} target="_blank" rel="noreferrer">Saber mais ↗</a></div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
