import { describe, expect, it } from 'vitest';
import { materializeRecurring, monthlySeries, totals } from './analytics';
import { addMonths } from './format';
import { computeDeductions, pprCap, vatIncluded } from './irs';
import { generateInsights } from './insights';
import { defaultSettings, demoData, toCSV } from './storage';
import type { Transaction } from './types';

let n = 0;
const id = () => `id${n++}`;
const tx = (p: Partial<Transaction>): Transaction => ({ id: id(), type: 'expense', amount: 10, category: 'outros', description: '', date: '2026-03-10', ...p });

describe('format', () => {
  it('addMonths atravessa anos', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });
});

describe('IRS', () => {
  it('limita despesas gerais a 250 € por sujeito passivo', () => {
    const t = [tx({ category: 'supermercado', amount: 2000 })];
    expect(computeDeductions(t, 2026, { taxpayers: 1, age: 30 }).find((l) => l.key === 'gerais')!.deduction).toBe(250);
    expect(computeDeductions(t, 2026, { taxpayers: 2, age: 30 }).find((l) => l.key === 'gerais')!.deduction).toBe(500);
  });
  it('saúde 15% e ignora despesas sem NIF', () => {
    const t = [tx({ category: 'saude', amount: 100 }), tx({ category: 'saude', amount: 50, withNif: false })];
    const l = computeDeductions(t, 2026, { taxpayers: 1, age: 30 }).find((x) => x.key === 'saude')!;
    expect(l.deduction).toBe(15);
    expect(l.missingNif).toBe(50);
  });
  it('IVA: 15% do IVA na restauração e 100% no passe', () => {
    const t = [tx({ category: 'restauracao', amount: 113 }), tx({ category: 'passe', amount: 106 })];
    const l = computeDeductions(t, 2026, { taxpayers: 1, age: 30 }).find((x) => x.key === 'iva')!;
    expect(l.deduction).toBeCloseTo(13 * 0.15 + 6, 2);
  });
  it('apenas conta o ano pedido', () => {
    const t = [tx({ category: 'saude', amount: 100, date: '2025-12-31' })];
    expect(computeDeductions(t, 2026, { taxpayers: 1, age: 30 }).find((x) => x.key === 'saude')!.deduction).toBe(0);
  });
  it('PPR por idade', () => {
    expect(pprCap(30)).toBe(400);
    expect(pprCap(40)).toBe(350);
    expect(pprCap(60)).toBe(300);
    expect(vatIncluded(123, 0.23)).toBeCloseTo(23);
  });
});

describe('analytics', () => {
  it('totais e série mensal', () => {
    const t = [tx({ type: 'income', amount: 1000, category: 'salario' }), tx({ amount: 300 })];
    expect(totals(t)).toEqual({ income: 1000, expense: 300, balance: 700 });
    const s = monthlySeries(t, '2026-04', 3);
    expect(s.map((x) => x.key)).toEqual(['2026-02', '2026-03', '2026-04']);
    expect(s[1].expense).toBe(300);
  });
  it('materializa recorrentes sem duplicar e ajusta fim de mês', () => {
    const base = [tx({ id: 'r', recurring: true, date: '2026-01-31', amount: 50 })];
    const a = materializeRecurring(base, '2026-03', id);
    expect(a.map((t) => t.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    expect(materializeRecurring(a, '2026-03', id)).toBe(a);
  });
});

describe('insights', () => {
  it('gera alertas e dicas para dados de exemplo', () => {
    const txs = demoData(new Date(2026, 10, 26));
    const ins = generateInsights(txs, '2026-11', { ...defaultSettings, budgets: { restauracao: 50 } });
    const ids = ins.map((i) => i.id);
    expect(ids).toContain('budget-restauracao');
    expect(ids).toContain('housing');
    expect(ids).toContain('telecom');
    expect(ids).toContain('nif');
    expect(ids).toContain('irs-jovem');
    expect(ins[0].level).toBe('alerta');
  });
  it('não rebenta sem dados', () => {
    expect(generateInsights([], '2026-11', defaultSettings).length).toBeGreaterThanOrEqual(0);
  });
  it('CSV usa vírgula decimal', () => {
    expect(toCSV([tx({ amount: 12.5, description: 'a "b"' })])).toContain('-12,50');
  });
});
