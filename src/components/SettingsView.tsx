import { useRef, useState } from 'react';
import { expenseCategories } from '../lib/categories';
import { parseBackup, toCSV } from '../lib/storage';
import type { AppData, Settings } from '../lib/types';

interface Props {
  data: AppData;
  setSettings: (s: Settings) => void;
  replaceData: (d: AppData) => void;
  onDemo: () => void;
  notify: (msg: string) => void;
}

function download(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function SettingsView({ data, setSettings, replaceData, onDemo, notify }: Props) {
  const s = data.settings;
  const file = useRef<HTMLInputElement>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setSettings({ ...s, [k]: v });
  const num = (v: string) => Math.max(0, Number(v.replace(',', '.')) || 0);

  const importFile = async (f: File) => {
    try {
      replaceData(parseBackup(await f.text()));
      notify('Cópia de segurança importada ✓');
    } catch { notify('Ficheiro inválido'); }
  };

  return (
    <div className="grid two">
      <div className="grid">
        <div className="card">
          <h2>Perfil e agregado</h2>
          <div className="field"><label htmlFor="nm">Nome</label><input id="nm" className="input" value={s.name} onChange={(e) => set('name', e.target.value)} placeholder="Como te chamas?" /></div>
          <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 10 }}>
            <div className="field"><label htmlFor="age">Idade</label><input id="age" className="input" inputMode="numeric" value={s.age || ''} onChange={(e) => set('age', num(e.target.value))} /></div>
            <div className="field"><label htmlFor="inc">Rendimento líquido/mês</label><input id="inc" className="input" inputMode="decimal" placeholder="auto" value={s.monthlyIncome || ''} onChange={(e) => set('monthlyIncome', num(e.target.value))} /></div>
            <div className="field"><label htmlFor="tp">Titulares (IRS)</label>
              <select id="tp" className="input" value={s.taxpayers} onChange={(e) => set('taxpayers', Number(e.target.value) as 1 | 2)}><option value={1}>1 — sozinho(a)</option><option value={2}>2 — casal</option></select></div>
            <div className="field"><label htmlFor="dp">Dependentes</label><input id="dp" className="input" inputMode="numeric" value={s.dependents} onChange={(e) => set('dependents', Math.round(num(e.target.value)))} /></div>
          </div>
          <div className="field"><label htmlFor="th">Tema</label>
            <select id="th" className="input" value={s.theme} onChange={(e) => set('theme', e.target.value as Settings['theme'])}><option value="auto">Automático</option><option value="light">Claro</option><option value="dark">Escuro</option></select></div>
        </div>
        <div className="card">
          <h2>Dados</h2>
          <p className="small muted" style={{ marginTop: 0 }}>Os teus dados ficam apenas neste dispositivo. Faz cópias de segurança regularmente.</p>
          <div className="btn-row">
            <button className="btn" onClick={() => download(`carteira-pt-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json')}>⬇️ Exportar cópia</button>
            <button className="btn" onClick={() => file.current?.click()}>⬆️ Importar cópia</button>
            <button className="btn" onClick={() => download('movimentos.csv', '﻿' + toCSV(data.transactions), 'text/csv;charset=utf-8')}>📄 Exportar CSV</button>
            <button className="btn" onClick={onDemo}>🧪 Dados de exemplo</button>
            {confirmWipe ? (
              <>
                <button className="btn danger" onClick={() => { replaceData({ ...data, transactions: [] }); setConfirmWipe(false); notify('Dados apagados'); }}>Confirmar: apagar tudo</button>
                <button className="btn" onClick={() => setConfirmWipe(false)}>Cancelar</button>
              </>
            ) : <button className="btn danger" onClick={() => setConfirmWipe(true)}>🗑️ Apagar tudo</button>}
          </div>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }} />
        </div>
      </div>
      <div className="card">
        <h2>Orçamento mensal por categoria</h2>
        <p className="small muted" style={{ marginTop: 0 }}>Define limites e recebe alertas quando os ultrapassares. Deixa vazio para não usar.</p>
        {expenseCategories.map((c) => (
          <div key={c.id} className="cat-row" style={{ gridTemplateColumns: '28px 1fr 110px' }}>
            <span style={{ fontSize: 18 }}>{c.icon}</span>
            <label htmlFor={`b-${c.id}`} className="small" style={{ fontWeight: 600 }}>{c.label}</label>
            <input id={`b-${c.id}`} className="input num" style={{ padding: '8px 10px', textAlign: 'right' }} inputMode="decimal" placeholder="— €"
              value={s.budgets[c.id] || ''}
              onChange={(e) => { const v = num(e.target.value); const b = { ...s.budgets }; if (v) b[c.id] = v; else delete b[c.id]; set('budgets', b); }} />
          </div>
        ))}
      </div>
    </div>
  );
}
