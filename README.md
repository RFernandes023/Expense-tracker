# 💶 Carteira PT — Gestor de despesas para Portugal

App de controlo de despesas com **sugestões de poupança adaptadas à realidade portuguesa** (IRS, e-Fatura, tarifas de energia, passes, PPR, IRS Jovem…).
Funciona no **browser** (PWA instalável) e no **Android** (APK via Capacitor), com **login Google**, dados na **MongoDB Atlas** e **leitura de faturas com Gemini**.

👉 **Para pôr online, segue o [guia de configuração](docs/SETUP.md).**

## Funcionalidades

- **Leitura de faturas com IA (Gemini)**: tira uma foto ou escolhe um PDF.
  - Fotos e PDFs digitalizados → **OCR** multimodal.
  - PDFs com **texto pesquisável** → o texto é extraído no servidor e só o texto é analisado (mais rápido e barato).
  - Também aceita texto colado (ex.: fatura recebida por email).
  - Extrai comerciante, NIF, data, total, IVA, ATCUD, linhas e sugere a categoria; avisa se a fatura não tem o teu NIF.
  - O ficheiro original fica guardado e o **texto integral da fatura é pesquisável** na lista de movimentos.
- **Conta Google + MongoDB Atlas**: dados sincronizados entre o telemóvel e o browser.

- **Movimentos**: despesas e receitas com 21 categorias portuguesas (supermercado, restauração, renda, luz/água/gás, passe, oficina, ginásio…), pesquisa, filtros, movimentos **recorrentes mensais**.
- **Resumo**: saldo do mês, gráfico dos últimos 6 meses, distribuição por categoria (donut), taxa de poupança, média diária.
- **Orçamentos** por categoria com alertas quando são ultrapassados.
- **IRS / e-Fatura**: estimativa das deduções à coleta em tempo real
  - Despesas gerais familiares (35%, até 250 € por titular)
  - Saúde (15%, até 1000 €), Educação (30%, até 800 €), Rendas (15%, até 700 €), Lares (25%, até 403,75 €)
  - Benefício do IVA por exigência de fatura (15% do IVA; passes 100%; até 250 €)
  - PPR (20%, limite por idade)
  - Marca quais despesas foram registadas **sem NIF** e quanto deixas de deduzir.
- **Sugestões personalizadas** geradas a partir dos teus dados: taxa de esforço com habitação, restauração, energia (simulador ERSE, potência, bi-horária, tarifa social), telecomunicações (fim de fidelização), passe Navegante/Andante/Ferroviário Verde, supermercado, subscrições, seguros, PPR até 31/12, IRS Jovem, calendário fiscal (e-Fatura em fevereiro, IRS abril–junho, subsídios), fundo de emergência — com **poupança anual estimada**.
- **Guia de poupança em Portugal** com links oficiais (ERSE, Portal das Finanças, IGCP, Banco de Portugal, DGEG, ANACOM).
- Tema claro/escuro, design mobile-first, layout de desktop com barra lateral.
- Exportar/importar cópia de segurança (JSON) e exportar CSV (compatível com Excel PT).

> ⚠️ Os valores fiscais são estimativas com base nas regras gerais do Código do IRS e podem mudar com o Orçamento do Estado. Confirma sempre no Portal das Finanças.

## Arquitetura

```
Browser / PWA ─┐                      ┌─ MongoDB Atlas (users, transactions, receipts)
               ├──► Vercel  /api/* ───┼─ Google OAuth (login)
APK Android ───┘   (serverless)       └─ Gemini API (OCR de faturas)
```

- `api/` — funções serverless: `auth/google`, `auth/callback`, `auth/exchange`, `me`, `transactions`, `ocr`, `receipts`, `health`.
- `server/` — base de dados, sessões (JWT), validação e integração Gemini.
- A chave do Gemini e a ligação à BD ficam **só no servidor**.
- Login: fluxo OAuth no servidor → código de uso único → sessão JWT (30 dias). No Android abre no Chrome e volta à app via deep link `pt.carteira.app://auth`.

## Desenvolvimento

```bash
npm install
npm test             # testes (IRS, sugestões, auth, validação, leitura de faturas)
npm run typecheck
npx vercel dev       # app + API locais (ver docs/SETUP.md)
npm run build:artifact  # versão demo num só HTML, sem servidor (modo local)
```

## Android

O projeto Android (Capacitor) está em `android/`.

**Via GitHub Actions (sem instalar nada):** define a variável `API_URL` no repositório e cada push corre o workflow *CI — Web + Android APK*, que gera o `carteira-pt.apk`. Ver [docs/SETUP.md](docs/SETUP.md#7-apk-android).

**Localmente** (requer Android Studio / Android SDK e JDK 21):

```bash
npm run android:sync     # build web + copiar para o projeto Android
npm run android:open     # abrir no Android Studio
# ou: cd android && ./gradlew assembleDebug
```

**Como PWA**: abre a versão web no Chrome do Android → menu ⋮ → *Instalar app*.

## Publicar a versão web

A app e a API são publicadas na **Vercel** (ligação ao GitHub; cada push para `main` faz deploy). Ver [docs/SETUP.md](docs/SETUP.md).

## Estrutura

```
src/
  lib/          lógica pura e testada
    categories.ts  categorias e mapeamento para deduções IRS
    irs.ts         cálculo das deduções à coleta
    insights.ts    motor de sugestões para Portugal
    guide.ts       guia de poupança
    analytics.ts   totais, séries, recorrentes
    storage.ts     persistência, backup, CSV, dados de exemplo
  components/   ecrãs (Resumo, Movimentos, IRS, Dicas, Definições) e gráficos SVG
android/        projeto nativo Capacitor
```

Stack: React 19 + TypeScript + Vite + vite-plugin-pwa + Capacitor 7 · Vercel Functions + MongoDB + Gemini API. Sem bibliotecas de gráficos — SVG próprio, bundle leve.
