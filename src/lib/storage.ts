import { addMonths, monthKey, uid } from './format';
import type { AppData, Settings, Transaction } from './types';

const KEY = 'carteira-pt:v1';

export const defaultSettings: Settings = {
  name: '',
  taxpayers: 1,
  dependents: 0,
  age: 30,
  monthlyIncome: 0,
  budgets: {},
  theme: 'auto'
};

export function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as AppData;
      return { version: 1, transactions: d.transactions ?? [], settings: { ...defaultSettings, ...d.settings } };
    }
  } catch { /* storage indisponível */ }
  return { version: 1, transactions: [], settings: defaultSettings };
}

export function save(d: AppData) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ }
}

export function parseBackup(text: string): AppData {
  const d = JSON.parse(text);
  if (!d || !Array.isArray(d.transactions)) throw new Error('Ficheiro inválido');
  return { version: 1, transactions: d.transactions, settings: { ...defaultSettings, ...d.settings } };
}

export function toCSV(txs: Transaction[]): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [...txs].sort((a, b) => a.date.localeCompare(b.date)).map((t) =>
    [t.date, t.type === 'income' ? 'Receita' : 'Despesa', t.category, esc(t.description), (t.type === 'income' ? t.amount : -t.amount).toFixed(2).replace('.', ','), t.withNif === false ? 'Não' : 'Sim'].join(';')
  );
  return ['Data;Tipo;Categoria;Descrição;Valor;Com NIF', ...rows].join('\n');
}

/** Dados de exemplo realistas para uma pessoa a viver em Lisboa (últimos 6 meses). */
export function demoData(now = new Date()): Transaction[] {
  const end = monthKey(now);
  const txs: Transaction[] = [];
  const add = (key: string, day: number, type: 'income' | 'expense', category: string, amount: number, description: string, withNif = true) => {
    const [y, m] = key.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    const d = Math.min(day, last, key === end ? now.getDate() : last);
    txs.push({ id: uid(), type, category, amount: Math.round(amount * 100) / 100, description, date: `${key}-${String(d).padStart(2, '0')}`, withNif });
  };
  const r = (base: number, spread: number) => base + (Math.random() - 0.5) * spread;
  for (let i = 5; i >= 0; i--) {
    const k = addMonths(end, -i);
    const mm = Number(k.slice(5, 7));
    add(k, 1, 'income', 'salario', 1650, 'Salário');
    if (mm === 7 || mm === 12) add(k, 15, 'income', 'subsidio', 1650, mm === 7 ? 'Subsídio de férias' : 'Subsídio de Natal');
    add(k, 1, 'expense', 'habitacao', 750, 'Renda T1');
    add(k, 5, 'expense', 'energia', r(68, 20), 'EDP / eletricidade');
    add(k, 6, 'expense', 'energia', r(22, 6), 'EPAL água');
    add(k, 8, 'expense', 'telecom', 64.99, 'Pacote fibra + móvel');
    add(k, 2, 'expense', 'passe', 40, 'Passe Navegante');
    add(k, 3, 'expense', 'subscricoes', 13.99, 'Streaming');
    add(k, 3, 'expense', 'subscricoes', 10.99, 'Música');
    add(k, 4, 'expense', 'ginasio', 34.9, 'Ginásio');
    for (const d of [4, 11, 18, 25]) add(k, d, 'expense', 'supermercado', r(62, 30), ['Continente', 'Pingo Doce', 'Lidl', 'Mercadona'][d % 4]);
    for (const d of [2, 6, 9, 13, 16, 20, 23, 27]) add(k, d, 'expense', 'restauracao', r(14, 10), d % 3 ? 'Almoço' : 'Jantar fora', d % 4 !== 0);
    add(k, 12, 'expense', 'combustivel', r(55, 20), 'Gasolina');
    if (i % 2 === 0) add(k, 14, 'expense', 'saude', r(45, 30), 'Farmácia');
    if (i % 3 === 0) add(k, 19, 'expense', 'cabeleireiro', 18, 'Barbeiro');
    add(k, 21, 'expense', 'lazer', r(60, 50), i % 2 ? 'Cinema e concerto' : 'Fim de semana fora');
    if (i === 2) add(k, 10, 'expense', 'vestuario', 89.9, 'Roupa de inverno');
    if (i === 4) add(k, 9, 'expense', 'educacao', 120, 'Curso online');
  }
  return txs;
}
