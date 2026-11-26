import { addMonths } from './format';
import type { Transaction } from './types';

export const inMonth = (txs: Transaction[], key: string) => txs.filter((t) => t.date.startsWith(key));

export function totals(txs: Transaction[]) {
  let income = 0, expense = 0;
  for (const t of txs) t.type === 'income' ? (income += t.amount) : (expense += t.amount);
  return { income, expense, balance: income - expense };
}

export function byCategory(txs: Transaction[], type: 'expense' | 'income' = 'expense') {
  const m = new Map<string, number>();
  for (const t of txs) if (t.type === type) m.set(t.category, (m.get(t.category) ?? 0) + t.amount);
  return [...m.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

export function monthlySeries(txs: Transaction[], endKey: string, months = 6) {
  const out: { key: string; income: number; expense: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const key = addMonths(endKey, -i);
    out.push({ key, ...totals(inMonth(txs, key)) });
  }
  return out;
}

/** Média mensal de uma categoria nos últimos `months` meses com movimentos (inclui o mês atual). */
export function avgCategory(txs: Transaction[], category: string, endKey: string, months = 3) {
  let sum = 0;
  for (let i = 0; i < months; i++) {
    const key = addMonths(endKey, -i);
    sum += inMonth(txs, key).filter((t) => t.type === 'expense' && t.category === category).reduce((s, t) => s + t.amount, 0);
  }
  return sum / months;
}

/**
 * Gera as ocorrências em falta dos movimentos recorrentes até ao mês `untilKey`.
 * Mantém o dia do mês (limitado ao último dia do mês).
 */
export function materializeRecurring(txs: Transaction[], untilKey: string, makeId: () => string): Transaction[] {
  const existing = new Set(txs.filter((t) => t.recurringOf).map((t) => `${t.recurringOf}|${t.date.slice(0, 7)}`));
  const created: Transaction[] = [];
  for (const t of txs) {
    if (!t.recurring || t.recurringOf) continue;
    let key = addMonths(t.date.slice(0, 7), 1);
    const day = Number(t.date.slice(8, 10));
    while (key <= untilKey) {
      if (!existing.has(`${t.id}|${key}`)) {
        const [y, m] = key.split('-').map(Number);
        const last = new Date(y, m, 0).getDate();
        created.push({ ...t, id: makeId(), recurring: false, recurringOf: t.id, date: `${key}-${String(Math.min(day, last)).padStart(2, '0')}` });
      }
      key = addMonths(key, 1);
    }
  }
  return created.length ? [...txs, ...created] : txs;
}
