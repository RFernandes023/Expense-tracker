const eur = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const eur0 = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export const fmt = (n: number) => eur.format(n);
export const fmt0 = (n: number) => eur0.format(Math.round(n));

export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-11" */
export const monthKey = (d: Date | string) => (typeof d === 'string' ? d.slice(0, 7) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);

export function addMonths(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export const todayISO = () => {
  const d = new Date();
  return `${monthKey(d)}-${String(d.getDate()).padStart(2, '0')}`;
};

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
