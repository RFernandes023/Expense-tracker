import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { materializeRecurring } from './lib/analytics';
import { addMonths, monthKey, monthLabel, uid } from './lib/format';
import { generateInsights } from './lib/insights';
import { computeDeductions, totalDeduction } from './lib/irs';
import { demoData, load, save } from './lib/storage';
import type { AppData, Settings, Transaction } from './lib/types';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { TxForm } from './components/TxForm';
import { Taxes } from './components/Taxes';
import { Tips } from './components/Tips';
import { SettingsView } from './components/SettingsView';

type Tab = 'inicio' | 'movimentos' | 'irs' | 'dicas' | 'definicoes';
const TABS: { id: Tab; label: string; icon: string; title: string }[] = [
  { id: 'inicio', label: 'Início', icon: '🏠', title: 'Resumo' },
  { id: 'movimentos', label: 'Movimentos', icon: '📋', title: 'Movimentos' },
  { id: 'irs', label: 'IRS', icon: '🧾', title: 'Deduções IRS' },
  { id: 'dicas', label: 'Dicas', icon: '💡', title: 'Dicas para poupar' },
  { id: 'definicoes', label: 'Definições', icon: '⚙️', title: 'Definições' }
];

export function App() {
  const [data, setData] = useState<AppData>(() => {
    const d = load();
    return { ...d, transactions: materializeRecurring(d.transactions, monthKey(new Date()), uid) };
  });
  const [tab, setTab] = useState<Tab>('inicio');
  const [month, setMonth] = useState(monthKey(new Date()));
  const [editing, setEditing] = useState<Transaction | 'new' | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number>(undefined);

  useEffect(() => save(data), [data]);
  useEffect(() => {
    const t = data.settings.theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }, [data.settings.theme]);

  // Botão "voltar" do Android: fecha a folha aberta ou regressa ao início.
  const stateRef = useRef({ editing, tab });
  stateRef.current = { editing, tab };
  useEffect(() => {
    const h = CapApp.addListener('backButton', () => {
      const s = stateRef.current;
      if (s.editing) setEditing(null);
      else if (s.tab !== 'inicio') setTab('inicio');
      else CapApp.exitApp();
    });
    return () => { h.then((x) => x.remove()).catch(() => {}); };
  }, []);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2400);
  }, []);

  const upsert = (t: Transaction) => {
    setData((d) => {
      const exists = d.transactions.some((x) => x.id === t.id);
      const txs = exists ? d.transactions.map((x) => (x.id === t.id ? t : x)) : [...d.transactions, t];
      return { ...d, transactions: materializeRecurring(txs, monthKey(new Date()), uid) };
    });
    setEditing(null);
    setMonth(t.date.slice(0, 7));
    notify(editing === 'new' ? 'Movimento adicionado ✓' : 'Alterações guardadas ✓');
  };
  const remove = (id: string) => {
    setData((d) => ({ ...d, transactions: d.transactions.filter((x) => x.id !== id).map((x) => (x.recurringOf === id ? { ...x, recurringOf: undefined } : x)) }));
    setEditing(null);
    notify('Movimento apagado');
  };
  const loadDemo = () => {
    setData((d) => ({ ...d, transactions: demoData(), settings: { ...d.settings, budgets: { restauracao: 120, supermercado: 260, lazer: 80, ...d.settings.budgets } } }));
    setMonth(monthKey(new Date()));
    setTab('inicio');
    notify('Dados de exemplo carregados');
  };
  const setSettings = (s: Settings) => setData((d) => ({ ...d, settings: s }));

  const insights = useMemo(() => generateInsights(data.transactions, month, data.settings), [data, month]);
  const deductionTotal = useMemo(() => totalDeduction(computeDeductions(data.transactions, Number(month.slice(0, 4)), data.settings)), [data, month]);
  const current = TABS.find((t) => t.id === tab)!;
  const showMonth = tab === 'inicio' || tab === 'movimentos' || tab === 'dicas';
  const go = (t: Tab) => { setTab(t); window.scrollTo({ top: 0 }); };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><img src="./icon.svg" alt="" /> Carteira PT</div>
        {TABS.map((t) => <button key={t.id} className={`side-btn ${tab === t.id ? 'active' : ''}`} onClick={() => go(t.id)}><span>{t.icon}</span>{t.label}</button>)}
        <button className="side-add" onClick={() => setEditing('new')}>+ Novo movimento</button>
        <div className="small muted" style={{ marginTop: 'auto', padding: 8 }}>Feito para Portugal 🇵🇹<br />Dados guardados localmente.</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><h1>{current.title}</h1>{!showMonth && <div className="sub">Carteira PT</div>}</div>
          {showMonth && (
            <div className="month-switch">
              <button onClick={() => setMonth(addMonths(month, -1))} aria-label="Mês anterior">‹</button>
              <span>{monthLabel(month)}</span>
              <button onClick={() => setMonth(addMonths(month, 1))} aria-label="Mês seguinte">›</button>
            </div>
          )}
        </header>

        {tab === 'inicio' && <Dashboard txs={data.transactions} month={month} setMonth={setMonth} settings={data.settings} insights={insights} deductionTotal={deductionTotal} onEdit={setEditing} go={go} onDemo={loadDemo} onAdd={() => setEditing('new')} />}
        {tab === 'movimentos' && <Transactions txs={data.transactions} month={month} onEdit={setEditing} />}
        {tab === 'irs' && <Taxes txs={data.transactions} settings={data.settings} />}
        {tab === 'dicas' && <Tips insights={insights} />}
        {tab === 'definicoes' && <SettingsView data={data} setSettings={setSettings} replaceData={(d) => setData({ ...d, transactions: materializeRecurring(d.transactions, monthKey(new Date()), uid) })} onDemo={loadDemo} notify={notify} />}
      </main>

      <nav className="bottom-nav">
        {TABS.slice(0, 2).map((t) => <button key={t.id} className={`nav-btn ${tab === t.id ? 'active' : ''}`} onClick={() => go(t.id)}><span className="ic">{t.icon}</span>{t.label}</button>)}
        <button className="fab" onClick={() => setEditing('new')} aria-label="Novo movimento">+</button>
        {TABS.slice(2, 4).map((t) => <button key={t.id} className={`nav-btn ${tab === t.id ? 'active' : ''}`} onClick={() => go(t.id)}><span className="ic">{t.icon}</span>{t.label}</button>)}
      </nav>
      {/* Definições acessíveis no telemóvel pelo ícone no topo */}
      {tab !== 'definicoes' && <button className="settings-fab" onClick={() => go('definicoes')} aria-label="Definições">⚙️</button>}

      {editing && <TxForm initial={editing === 'new' ? undefined : editing} onSave={upsert} onDelete={remove} onClose={() => setEditing(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
