import { getCategory } from './categories';
import type { Settings, Transaction } from './types';

/**
 * Regras simplificadas das deduções à coleta do IRS (Código do IRS, valores de referência).
 * São estimativas: os valores oficiais são os do e-Fatura / Portal das Finanças.
 */
export const IRS_RULES = {
  gerais: { rate: 0.35, capPerTaxpayer: 250, label: 'Despesas gerais familiares' },
  saude: { rate: 0.15, cap: 1000, label: 'Saúde' },
  educacao: { rate: 0.3, cap: 800, label: 'Educação e formação' },
  habitacao: { rate: 0.15, cap: 700, label: 'Rendas de habitação' },
  lares: { rate: 0.25, cap: 403.75, label: 'Lares' },
  iva: { rate: 0.15, cap: 250, label: 'IVA por exigência de fatura' },
  ppr: { rate: 0.2, label: 'PPR' }
} as const;

export function pprCap(age: number): number {
  if (age < 35) return 400;
  if (age <= 50) return 350;
  return 300;
}

export interface DeductionLine {
  key: string;
  label: string;
  spent: number; // despesa elegível
  deduction: number; // dedução estimada (já com limite)
  cap: number; // dedução máxima
  rateLabel: string;
  missingNif: number; // despesa elegível registada sem NIF
}

/** IVA contido num valor com IVA incluído. */
export const vatIncluded = (gross: number, rate: number) => (gross * rate) / (1 + rate);

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeDeductions(txs: Transaction[], year: number, s: Pick<Settings, 'taxpayers' | 'age'>): DeductionLine[] {
  const yearTx = txs.filter((t) => t.type === 'expense' && t.date.startsWith(String(year)));
  const acc = {
    gerais: { spent: 0, missing: 0 },
    saude: { spent: 0, missing: 0 },
    educacao: { spent: 0, missing: 0 },
    habitacao: { spent: 0, missing: 0 },
    lares: { spent: 0, missing: 0 },
    iva: { spent: 0, missing: 0, vat: 0 },
    ppr: { spent: 0, missing: 0 }
  };

  for (const t of yearTx) {
    const c = getCategory(t.category);
    if (!c.deduction) continue;
    const hasNif = t.withNif !== false;
    if (c.deduction === 'iva' || c.deduction === 'passe') {
      const a = acc.iva;
      if (!hasNif) { a.missing += t.amount; continue; }
      a.spent += t.amount;
      const vat = vatIncluded(t.amount, c.vat ?? 0.23);
      a.vat += c.deduction === 'passe' ? vat / IRS_RULES.iva.rate : vat; // passes: 100% do IVA
      continue;
    }
    const a = acc[c.deduction];
    if (!hasNif) a.missing += t.amount;
    else a.spent += t.amount;
  }

  const gCap = IRS_RULES.gerais.capPerTaxpayer * s.taxpayers;
  const lines: DeductionLine[] = [
    { key: 'gerais', label: IRS_RULES.gerais.label, spent: acc.gerais.spent, deduction: Math.min(acc.gerais.spent * 0.35, gCap), cap: gCap, rateLabel: `35% · até ${gCap} €`, missingNif: acc.gerais.missing },
    { key: 'saude', label: IRS_RULES.saude.label, spent: acc.saude.spent, deduction: Math.min(acc.saude.spent * 0.15, 1000), cap: 1000, rateLabel: '15% · até 1000 €', missingNif: acc.saude.missing },
    { key: 'educacao', label: IRS_RULES.educacao.label, spent: acc.educacao.spent, deduction: Math.min(acc.educacao.spent * 0.3, 800), cap: 800, rateLabel: '30% · até 800 €', missingNif: acc.educacao.missing },
    { key: 'habitacao', label: IRS_RULES.habitacao.label, spent: acc.habitacao.spent, deduction: Math.min(acc.habitacao.spent * 0.15, 700), cap: 700, rateLabel: '15% · até 700 €', missingNif: acc.habitacao.missing },
    { key: 'iva', label: IRS_RULES.iva.label, spent: acc.iva.spent, deduction: Math.min(acc.iva.vat * 0.15, 250), cap: 250, rateLabel: '15% do IVA · até 250 €', missingNif: acc.iva.missing },
    { key: 'lares', label: IRS_RULES.lares.label, spent: acc.lares.spent, deduction: Math.min(acc.lares.spent * 0.25, 403.75), cap: 403.75, rateLabel: '25% · até 403,75 €', missingNif: acc.lares.missing }
  ];
  const pc = pprCap(s.age);
  lines.push({ key: 'ppr', label: IRS_RULES.ppr.label, spent: acc.ppr.spent, deduction: Math.min(acc.ppr.spent * 0.2, pc), cap: pc, rateLabel: `20% · até ${pc} €`, missingNif: 0 });

  return lines.map((l) => ({ ...l, spent: round2(l.spent), deduction: round2(l.deduction), missingNif: round2(l.missingNif) }));
}

export const totalDeduction = (lines: DeductionLine[]) => round2(lines.reduce((s, l) => s + l.deduction, 0));
