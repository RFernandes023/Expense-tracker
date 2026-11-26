import { getCategory } from '../lib/categories';
import { fmt0, MONTHS_SHORT } from '../lib/format';

export function Donut({ data, total, size = 180 }: { data: { category: string; amount: number }[]; total: number; size?: number }) {
  const r = 70, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" role="img" aria-label="Despesas por categoria">
      <circle cx="90" cy="90" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="22" />
      {total > 0 && data.map((d) => {
        const len = (d.amount / total) * c;
        const el = (
          <circle key={d.category} cx="90" cy="90" r={r} fill="none" stroke={getCategory(d.category).color} strokeWidth="22"
            strokeDasharray={`${Math.max(len - 2, 0.1)} ${c}`} strokeDashoffset={-offset} transform="rotate(-90 90 90)">
            <title>{`${getCategory(d.category).label}: ${fmt0(d.amount)}`}</title>
          </circle>
        );
        offset += len;
        return el;
      })}
      <text x="90" y="84" textAnchor="middle" fontSize="12" fill="var(--muted)" fontWeight="600">Despesas</text>
      <text x="90" y="106" textAnchor="middle" fontSize="20" fill="var(--text)" fontWeight="800">{fmt0(total)}</text>
    </svg>
  );
}

export function Bars({ series, onPick, active }: { series: { key: string; income: number; expense: number }[]; onPick?: (k: string) => void; active?: string }) {
  const max = Math.max(1, ...series.flatMap((s) => [s.income, s.expense]));
  const h = 140, bw = 14;
  const step = 300 / series.length;
  return (
    <svg viewBox={`0 0 300 ${h + 26}`} width="100%" role="img" aria-label="Receitas e despesas por mês">
      {[0.25, 0.5, 0.75, 1].map((p) => <line key={p} x1="0" x2="300" y1={h - h * p} y2={h - h * p} stroke="var(--border)" strokeDasharray="3 4" />)}
      {series.map((s, i) => {
        const x = i * step + step / 2;
        const hi = (s.income / max) * h, he = (s.expense / max) * h;
        const m = Number(s.key.slice(5, 7));
        return (
          <g key={s.key} onClick={() => onPick?.(s.key)} style={{ cursor: onPick ? 'pointer' : undefined }} opacity={active && active !== s.key ? 0.55 : 1}>
            <rect x={x - step / 2} y="0" width={step} height={h + 26} fill="transparent" />
            <rect x={x - bw - 1} y={h - hi} width={bw} height={hi} rx="4" fill="var(--success)"><title>{`Receitas: ${fmt0(s.income)}`}</title></rect>
            <rect x={x + 1} y={h - he} width={bw} height={he} rx="4" fill="var(--danger)"><title>{`Despesas: ${fmt0(s.expense)}`}</title></rect>
            <text x={x} y={h + 18} textAnchor="middle" fontSize="11" fill={active === s.key ? 'var(--text)' : 'var(--muted)'} fontWeight={active === s.key ? 800 : 600}>{MONTHS_SHORT[m - 1]}</text>
          </g>
        );
      })}
    </svg>
  );
}
