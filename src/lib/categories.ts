import type { TxType } from './types';

/** Tipo de dedução à coleta no IRS (Portugal) associado à categoria. */
export type Deduction =
  | 'gerais' // Despesas gerais familiares
  | 'saude'
  | 'educacao'
  | 'habitacao' // rendas de habitação permanente
  | 'lares'
  | 'iva' // exigência de fatura: 15% do IVA suportado
  | 'passe' // passes de transportes públicos (100% do IVA)
  | 'ppr'
  | null;

export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
  type: TxType;
  deduction: Deduction;
  /** taxa de IVA típica, usada para estimar o benefício por exigência de fatura */
  vat?: number;
}

export const CATEGORIES: Category[] = [
  { id: 'supermercado', label: 'Supermercado', icon: '🛒', color: '#10b981', type: 'expense', deduction: 'gerais' },
  { id: 'restauracao', label: 'Restauração e cafés', icon: '🍽️', color: '#f97316', type: 'expense', deduction: 'iva', vat: 0.13 },
  { id: 'habitacao', label: 'Renda / Prestação casa', icon: '🏠', color: '#6366f1', type: 'expense', deduction: 'habitacao' },
  { id: 'energia', label: 'Luz, água e gás', icon: '💡', color: '#eab308', type: 'expense', deduction: 'gerais' },
  { id: 'telecom', label: 'Internet e telemóvel', icon: '📶', color: '#0ea5e9', type: 'expense', deduction: 'gerais' },
  { id: 'combustivel', label: 'Combustível e portagens', icon: '⛽', color: '#ef4444', type: 'expense', deduction: 'gerais' },
  { id: 'passe', label: 'Passe transportes públicos', icon: '🚇', color: '#14b8a6', type: 'expense', deduction: 'passe', vat: 0.06 },
  { id: 'auto', label: 'Oficina e automóvel', icon: '🔧', color: '#64748b', type: 'expense', deduction: 'iva', vat: 0.23 },
  { id: 'saude', label: 'Saúde e farmácia', icon: '💊', color: '#ec4899', type: 'expense', deduction: 'saude' },
  { id: 'educacao', label: 'Educação e livros', icon: '🎓', color: '#8b5cf6', type: 'expense', deduction: 'educacao' },
  { id: 'cabeleireiro', label: 'Cabeleireiro e estética', icon: '💇', color: '#d946ef', type: 'expense', deduction: 'iva', vat: 0.23 },
  { id: 'ginasio', label: 'Ginásio', icon: '🏋️', color: '#22c55e', type: 'expense', deduction: 'iva', vat: 0.23 },
  { id: 'veterinario', label: 'Animais e veterinário', icon: '🐾', color: '#a16207', type: 'expense', deduction: 'iva', vat: 0.23 },
  { id: 'vestuario', label: 'Vestuário e calçado', icon: '👕', color: '#f43f5e', type: 'expense', deduction: 'gerais' },
  { id: 'subscricoes', label: 'Subscrições e streaming', icon: '📺', color: '#7c3aed', type: 'expense', deduction: 'gerais' },
  { id: 'seguros', label: 'Seguros', icon: '🛡️', color: '#0891b2', type: 'expense', deduction: null },
  { id: 'lazer', label: 'Lazer e viagens', icon: '🏖️', color: '#06b6d4', type: 'expense', deduction: 'gerais' },
  { id: 'lares', label: 'Lares e apoio a idosos', icon: '🧓', color: '#78716c', type: 'expense', deduction: 'lares' },
  { id: 'ppr', label: 'PPR (poupança reforma)', icon: '🐷', color: '#0d9488', type: 'expense', deduction: 'ppr' },
  { id: 'impostos', label: 'Impostos e taxas (IUC, IMI)', icon: '🏛️', color: '#475569', type: 'expense', deduction: null },
  { id: 'outros', label: 'Outros', icon: '📦', color: '#94a3b8', type: 'expense', deduction: null },

  { id: 'salario', label: 'Salário', icon: '💼', color: '#16a34a', type: 'income', deduction: null },
  { id: 'subsidio', label: 'Subsídios (férias/Natal)', icon: '🎁', color: '#65a30d', type: 'income', deduction: null },
  { id: 'freelance', label: 'Recibos verdes', icon: '🧾', color: '#0284c7', type: 'income', deduction: null },
  { id: 'reembolso', label: 'Reembolso IRS', icon: '💶', color: '#059669', type: 'income', deduction: null },
  { id: 'rendimento_outros', label: 'Outros rendimentos', icon: '➕', color: '#4d7c0f', type: 'income', deduction: null }
];

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): Category {
  return byId.get(id) ?? byId.get('outros')!;
}

export const expenseCategories = CATEGORIES.filter((c) => c.type === 'expense');
export const incomeCategories = CATEGORIES.filter((c) => c.type === 'income');
