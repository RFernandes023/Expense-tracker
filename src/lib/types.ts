export type TxType = 'expense' | 'income';

export interface Transaction {
  id: string;
  type: TxType;
  amount: number; // sempre positivo, em euros
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
  withNif?: boolean; // fatura pedida com NIF (e-Fatura)
  recurring?: boolean; // repete todos os meses
  recurringOf?: string; // id do movimento original
  // Dados lidos da fatura (OCR / texto do PDF)
  merchant?: string;
  merchantNif?: string;
  vat?: number;
  atcud?: string;
  ocrText?: string; // texto integral da fatura, pesquisável
  receiptId?: string; // ficheiro original guardado na base de dados
}

export interface Settings {
  name: string;
  taxpayers: 1 | 2; // sujeitos passivos no agregado
  dependents: number;
  age: number;
  monthlyIncome: number; // rendimento líquido mensal estimado (0 = usar receitas registadas)
  budgets: Record<string, number>; // orçamento mensal por categoria
  theme: 'auto' | 'light' | 'dark';
}

export interface AppData {
  version: 1;
  transactions: Transaction[];
  settings: Settings;
}
