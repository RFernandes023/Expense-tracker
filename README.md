# 💶 Carteira PT — Gestor de despesas para Portugal

App de controlo de despesas com **sugestões de poupança adaptadas à realidade portuguesa** (IRS, e-Fatura, tarifas de energia, passes, PPR, IRS Jovem…).
Funciona no **browser** (PWA instalável e offline) e no **Android** (APK nativo via Capacitor).

## Funcionalidades

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
- **Privacidade**: tudo guardado localmente no dispositivo. Exportar/importar cópia de segurança (JSON) e exportar CSV (compatível com Excel PT).

> ⚠️ Os valores fiscais são estimativas com base nas regras gerais do Código do IRS e podem mudar com o Orçamento do Estado. Confirma sempre no Portal das Finanças.

## Começar

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes da lógica (IRS, recorrentes, sugestões)
npm run build      # build de produção em dist/ (PWA)
```

## Android

O projeto Android (Capacitor) está em `android/`.

**Via GitHub Actions (sem instalar nada):** cada push corre o workflow *CI — Web + Android APK*, que gera o `carteira-pt.apk` (artefacto do workflow). Criando uma tag `v1.0.0`, o APK é anexado a uma Release. Instala-o no telemóvel (permitir "fontes desconhecidas").

**Localmente** (requer Android Studio / Android SDK e JDK 21):

```bash
npm run android:sync     # build web + copiar para o projeto Android
npm run android:open     # abrir no Android Studio
# ou: cd android && ./gradlew assembleDebug
```

**Como PWA**: abre a versão web no Chrome do Android → menu ⋮ → *Instalar app*.

## Publicar a versão web

O workflow `pages.yml` publica `dist/` no GitHub Pages a cada push em `main` (ativa *Settings → Pages → Source: GitHub Actions*). Como usa caminhos relativos, também funciona em qualquer alojamento estático (Netlify, Vercel, Cloudflare Pages).

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

Stack: React 19 + TypeScript + Vite + vite-plugin-pwa + Capacitor 7. Sem bibliotecas de gráficos — SVG próprio, bundle leve.
