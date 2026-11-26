import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { api, HAS_BACKEND, IS_NATIVE, loadSession, loginUrl, saveSession, setToken, setUnauthorizedHandler, type Session } from './lib/api';
import { materializeRecurring } from './lib/analytics';
import { addMonths, monthKey, monthLabel, uid } from './lib/format';
import { generateInsights } from './lib/insights';
import { computeDeductions, totalDeduction } from './lib/irs';
import { defaultSettings, demoData, load, save } from './lib/storage';
import type { AppData, Settings, Transaction } from './lib/types';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { TxForm } from './components/TxForm';
import { Taxes } from './components/Taxes';
import { Tips } from './components/Tips';
import { SettingsView } from './components/SettingsView';
import { Login } from './components/Login';

type Tab = 'inicio' | 'movimentos' | 'irs' | 'dicas' | 'definicoes';
const TABS: { id: Tab; label: string; icon: string; title: string }[] = [
  { id: 'inicio', label: 'Início', icon: '🏠', title: 'Resumo' },
  { id: 'movimentos', label: 'Movimentos', icon: '📋', title: 'Movimentos' },
  { id: 'irs', label: 'IRS', icon: '🧾', title: 'Deduções IRS' },
  { id: 'dicas', label: 'Dicas', icon: '💡', title: 'Dicas para poupar' },
  { id: 'definicoes', label: 'Definições', icon: '⚙️', title: 'Definições' }
];

export function App() {
  const [session, setSession] = useState<Session | null>(() => (HAS_BACKEND ? loadSession() : null));
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [sync, setSync] = useState<'ok' | 'loading' | 'error'>('ok');
  const cacheKey = HAS_BACKEND ? session?.user.email : undefined;
  const [data, setData] = useState<AppData>(() => {
    const d = load(HAS_BACKEND ? loadSession()?.user.email ?? '__none__' : undefined);
    return { ...d, transactions: materializeRecurring(d.transactions, monthKey(new Date()), uid) };
  });
  const [tab, setTab] = useState<Tab>('inicio');
  const [month, setMonth] = useState(monthKey(new Date()));
  const [editing, setEditing] = useState<Transaction | 'new' | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number>(undefined);
  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2600);
  }, []);

  useEffect(() => { if (!HAS_BACKEND || cacheKey) save(data, cacheKey); }, [data, cacheKey]);

  const logout = useCallback(() => {
    saveSession(null);
    setToken('');
    setSession(null);
    setData({ version: 1, transactions: [], settings: defaultSettings });
  }, []);
  useEffect(() => setUnauthorizedHandler(() => { logout(); setAuthError('A sessão expirou. Entra novamente.'); }), [logout]);

  /** Troca o código de login por uma sessão e carrega os dados da conta. */
  const completeLogin = useCallback(async (code: string) => {
    setAuthBusy(true);
    setAuthError('');
    try {
      const r = await api.exchange(code);
      const s = { token: r.token, user: r.user };
      saveSession(s);
      setToken(r.token);
      const cached = load(r.user.email);
      setData({ ...cached, settings: { ...defaultSettings, ...cached.settings, ...(r.settings ?? {}) } });
      setSession(s);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Erro no login');
    } finally {
      setAuthBusy(false);
    }
  }, []);

  // Regresso do login: na web via ?auth_code=…, no Android via deep link pt.carteira.app://auth?auth_code=…
  useEffect(() => {
    if (!HAS_BACKEND) return;
    const handle = (url: URL) => {
      const code = url.searchParams.get('auth_code');
      const error = url.searchParams.get('auth_error');
      if (error) setAuthError(error);
      if (code) completeLogin(code);
    };
    const here = new URL(window.location.href);
    if (here.searchParams.has('auth_code') || here.searchParams.has('auth_error')) {
      handle(here);
      window.history.replaceState(null, '', here.pathname);
    }
    const h = CapApp.addListener('appUrlOpen', ({ url }) => {
      if (!url.startsWith('pt.carteira.app://auth')) return;
      Browser.close().catch(() => {});
      handle(new URL(url.replace('pt.carteira.app://auth', 'https://app.local/auth')));
    });
    return () => { h.then((x) => x.remove()).catch(() => {}); };
  }, [completeLogin]);

  const startLogin = () => {
    setAuthError('');
    if (IS_NATIVE) Browser.open({ url: loginUrl('android') }).catch((e) => setAuthError(String(e)));
    else window.location.href = loginUrl('web');
  };

  // Carrega os movimentos da conta; na primeira vez envia os dados que existiam só neste dispositivo.
  useEffect(() => {
    if (!HAS_BACKEND || !session) return;
    let cancelled = false;
    setSync('loading');
    (async () => {
      try {
        const [{ transactions }, me] = await Promise.all([api.list(), api.me()]);
        if (cancelled) return;
        let txs = transactions;
        const local = load().transactions;
        if (txs.length === 0 && local.length > 0) {
          await api.upsert(local);
          txs = local;
          save({ ...load(), transactions: [] });
          notify(`${local.length} movimentos deste dispositivo enviados para a tua conta`);
        }
        const all = materializeRecurring(txs, monthKey(new Date()), uid);
        const created = all.filter((t) => !txs.some((x) => x.id === t.id));
        if (created.length) await api.upsert(created);
        if (cancelled) return;
        setData((d) => ({ ...d, transactions: all, settings: { ...defaultSettings, ...d.settings, ...(me.settings ?? {}) } }));
        setSync('ok');
      } catch {
        if (!cancelled) setSync('error');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  /** Envia alterações para o servidor (otimista: a interface já foi atualizada). */
  const push = useCallback((p: Promise<unknown>) => {
    if (!HAS_BACKEND) return;
    setSync('loading');
    p.then(() => setSync('ok')).catch((e) => { setSync('error'); notify(e instanceof Error ? e.message : 'Erro ao sincronizar'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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


  const upsert = (t: Transaction) => {
    const exists = data.transactions.some((x) => x.id === t.id);
    const txs = exists ? data.transactions.map((x) => (x.id === t.id ? t : x)) : [...data.transactions, t];
    const all = materializeRecurring(txs, monthKey(new Date()), uid);
    const created = all.filter((x) => !txs.includes(x));
    setData((d) => ({ ...d, transactions: all }));
    push(api.upsert([t, ...created]));
    setEditing(null);
    setMonth(t.date.slice(0, 7));
    notify(editing === 'new' ? 'Movimento adicionado ✓' : 'Alterações guardadas ✓');
  };
  const remove = (id: string) => {
    setData((d) => ({ ...d, transactions: d.transactions.filter((x) => x.id !== id).map((x) => (x.recurringOf === id ? { ...x, recurringOf: undefined } : x)) }));
    push(api.remove(id));
    setEditing(null);
    notify('Movimento apagado');
  };
  const loadDemo = () => {
    const demo = demoData();
    setData((d) => ({ ...d, transactions: [...d.transactions, ...demo], settings: { ...d.settings, budgets: { restauracao: 120, supermercado: 260, lazer: 80, ...d.settings.budgets } } }));
    push(api.upsert(demo));
    setMonth(monthKey(new Date()));
    setTab('inicio');
    notify('Dados de exemplo carregados');
  };
  const settingsTimer = useRef<number>(undefined);
  const setSettings = (s: Settings) => {
    setData((d) => ({ ...d, settings: s }));
    window.clearTimeout(settingsTimer.current);
    if (HAS_BACKEND) settingsTimer.current = window.setTimeout(() => push(api.saveSettings(s)), 800);
  };
  const replaceData = (d: AppData) => {
    const all = materializeRecurring(d.transactions, monthKey(new Date()), uid);
    const removed = data.transactions.filter((t) => !all.some((x) => x.id === t.id));
    setData({ ...d, transactions: all });
    if (HAS_BACKEND) {
      if (all.length) push(api.upsert(all));
      if (all.length === 0 && removed.length) push(api.removeAll());
      else if (removed.length) push(Promise.all(removed.map((t) => api.remove(t.id))));
      push(api.saveSettings(d.settings));
    }
  };

  const insights = useMemo(() => generateInsights(data.transactions, month, data.settings), [data, month]);
  const deductionTotal = useMemo(() => totalDeduction(computeDeductions(data.transactions, Number(month.slice(0, 4)), data.settings)), [data, month]);
  const current = TABS.find((t) => t.id === tab)!;
  const showMonth = tab === 'inicio' || tab === 'movimentos' || tab === 'dicas';
  const go = (t: Tab) => { setTab(t); window.scrollTo({ top: 0 }); };

  if (HAS_BACKEND && !session) return <Login onLogin={startLogin} error={authError} busy={authBusy} />;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><img src="./icon.svg" alt="" /> Carteira PT</div>
        {TABS.map((t) => <button key={t.id} className={`side-btn ${tab === t.id ? 'active' : ''}`} onClick={() => go(t.id)}><span>{t.icon}</span>{t.label}</button>)}
        <button className="side-add" onClick={() => setEditing('new')}>+ Novo movimento</button>
        <div className="small muted" style={{ marginTop: 'auto', padding: 8 }}>Feito para Portugal 🇵🇹<br />{session ? session.user.email : 'Dados guardados localmente.'}</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><h1>{current.title}</h1>{!showMonth && <div className="sub">Carteira PT</div>}{sync !== 'ok' && <span className={`sync-pill ${sync === 'error' ? 'err' : ''}`}>{sync === 'loading' ? '⟳ a sincronizar' : '⚠ sem sincronização'}</span>}</div>
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
        {tab === 'definicoes' && <SettingsView data={data} setSettings={setSettings} replaceData={replaceData} onDemo={loadDemo} notify={notify} session={session} sync={sync} onLogout={logout} />}
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
