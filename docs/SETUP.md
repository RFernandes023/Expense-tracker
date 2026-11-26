# 🚀 Pôr a Carteira PT online (24/7) — guia passo a passo

Tempo estimado: 30–40 minutos. Tudo nos planos **gratuitos**. Não precisas de instalar nada no PC.

| Peça | Serviço | Para quê |
|---|---|---|
| Site + API | **Vercel** (Hobby) | App online 24/7 no teu browser e servidor para o APK |
| Base de dados | **MongoDB Atlas** (M0) | Guarda movimentos, definições e faturas |
| OCR | **Google Gemini** (AI Studio) | Lê faturas: fotos, PDFs digitalizados e PDFs com texto |
| Login | **Google OAuth** | Entrar com a tua conta Google |

Vais juntar **7 valores** que no fim colas na Vercel. Abre um bloco de notas e vai guardando:

```
MONGODB_URI=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GEMINI_API_KEY=
JWT_SECRET=
APP_URL=
ALLOWED_EMAILS=
```

> 🔒 Estes valores são segredos. Não os partilhes nem os coloques no código/GitHub.

---

## 1. Escolher o endereço da app (APP_URL)

O endereço vai ser `https://NOME.vercel.app`. Escolhe já um nome (ex.: `carteira-pt-rui`), porque o Google precisa dele no passo 4.

```
APP_URL=https://carteira-pt-rui.vercel.app
ALLOWED_EMAILS=o-teu-email@gmail.com
```

`ALLOWED_EMAILS` garante que só tu (e quem adicionares, separado por vírgulas) consegue entrar — importante porque o OCR usa a tua chave Gemini.

## 2. Chave do Gemini (GEMINI_API_KEY)

1. Vai a **https://aistudio.google.com** e entra com a tua conta Google.
2. Aceita os termos, se for a primeira vez.
3. No menu da esquerda (ou canto superior direito) clica **Get API key**.
4. Clica **Create API key**. Se pedir, escolhe **Create API key in new project** (ou um projeto existente).
5. Copia a chave (começa por `AIza…`) → `GEMINI_API_KEY=AIza…`

Notas:
- O plano gratuito chega bem para uso pessoal (dezenas de faturas por dia).
- ⚠️ **Privacidade:** no plano gratuito, a Google pode usar o conteúdo enviado para melhorar os produtos. Se não quiseres isso para as tuas faturas, ativa a faturação no projeto (*Set up billing* no AI Studio): o uso pessoal custa cêntimos por mês e os dados deixam de ser usados.
- Se a chave for exposta, apaga-a no AI Studio e cria outra.
- Para usar outro modelo (ex.: um mais recente), define `GEMINI_MODEL` com o nome indicado no AI Studio.

## 3. MongoDB Atlas (MONGODB_URI)

1. Cria conta em **https://www.mongodb.com/cloud/atlas/register** (podes usar "Sign up with Google").
2. **Create a cluster** → escolhe **M0 (Free)** → fornecedor AWS, região **Frankfurt (eu-central-1)** ou outra na Europa → **Create Deployment**.
3. No ecrã "Connect to Cluster0":
   - Cria um utilizador da base de dados (ex.: `carteira`) e clica **Autogenerate Secure Password**. **Copia a password.** → **Create Database User**.
4. **Network Access** (menu da esquerda) → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`) → Confirm.
   (Necessário porque a Vercel não tem IP fixo. O acesso continua protegido pelo utilizador/password.)
5. **Database → Connect → Drivers** → copia a *connection string*:
   `mongodb+srv://carteira:<db_password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
6. Substitui `<db_password>` pela password do passo 3 → `MONGODB_URI=…`

As coleções (`users`, `transactions`, `receipts`) são criadas automaticamente no primeiro uso.

## 4. Login com Google (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET)

1. Vai a **https://console.cloud.google.com** e seleciona o projeto criado no passo 2 (ou cria um: *Select a project → New project*).
2. Menu ☰ → **APIs & Services → OAuth consent screen** (pode aparecer como **Google Auth Platform**) → **Get started**:
   - App name: `Carteira PT` · User support email: o teu email
   - Audience: **External**
   - Contact email: o teu email → aceita → **Create**
3. Em **Audience** → **Test users → Add users** → adiciona o teu email (e de quem mais quiseres).
   (Em modo *Testing* só estes utilizadores conseguem entrar — perfeito para uso pessoal.)
4. Em **Clients** → **Create client**:
   - Application type: **Web application** · Name: `Carteira PT`
   - **Authorized redirect URIs** → **Add URI**:
     - `https://carteira-pt-rui.vercel.app/api/auth/callback` (o teu APP_URL + `/api/auth/callback`)
   - **Create**
5. Copia **Client ID** → `GOOGLE_CLIENT_ID=` e **Client secret** → `GOOGLE_CLIENT_SECRET=`

> O APK usa o mesmo cliente Web: o login abre no Chrome e volta à app automaticamente. Não é preciso SHA-1 nem cliente Android.

## 5. Segredo das sessões (JWT_SECRET)

Precisas de um texto aleatório longo. Forma fácil: abre qualquer página no browser, carrega **F12 → Console** e escreve:

```js
crypto.randomUUID() + crypto.randomUUID()
```

Copia o resultado (sem aspas) → `JWT_SECRET=…`

## 6. Publicar na Vercel (app 24/7)

1. O código tem de estar no branch **main** do GitHub (faz merge do Pull Request deste trabalho).
2. Vai a **https://vercel.com/signup** → **Continue with GitHub**.
3. **Add New… → Project** → importa o repositório `expense-tracker` (se não aparecer: *Adjust GitHub App Permissions* e dá acesso ao repositório).
4. **Project Name**: o nome escolhido no passo 1 (ex.: `carteira-pt-rui`). Framework: **Vite** (detetado automaticamente).
5. Abre **Environment Variables** e cola as 7 variáveis (podes colar o bloco inteiro de uma vez no primeiro campo).
6. **Deploy**. Em ~1 minuto a app fica em `https://carteira-pt-rui.vercel.app`.
7. Verifica: abre `https://carteira-pt-rui.vercel.app/api/health` → todos os valores em `configured` devem ser `true`.

A partir daqui, cada push para `main` atualiza a app automaticamente.

> Se a Vercel te der um domínio diferente do esperado (ex.: nome já ocupado), atualiza `APP_URL` na Vercel (*Settings → Environment Variables*), o redirect URI na Google Cloud, e faz **Redeploy**.

### Usar no browser e instalar como app
- **PC**: abre o endereço → *Entrar com Google*. No Chrome/Edge podes clicar no ícone ⊕ da barra de endereço para instalar.
- **Android (sem APK)**: Chrome → ⋮ → **Instalar app**.

## 7. APK Android

1. No GitHub: repositório → **Settings → Secrets and variables → Actions → separador Variables → New repository variable**:
   - Name: `API_URL` · Value: o teu APP_URL (ex.: `https://carteira-pt-rui.vercel.app`)
2. **Actions** → workflow **CI — Web + Android APK** → **Run workflow** (ou faz um push).
3. Quando terminar (✅), abre a execução → em **Artifacts** descarrega `carteira-pt-apk` (zip com o `carteira-pt.apk`).
4. No telemóvel: abre o APK → permite *instalar apps desconhecidas* → Instalar.
5. Para uma versão "oficial": cria uma tag `v1.0.0` (GitHub → Releases → *Draft a new release*) e o APK fica anexado à Release.

Os dados são os mesmos no APK e no browser — estão todos no MongoDB Atlas.

## Problemas comuns

| Sintoma | Solução |
|---|---|
| `Error 400: redirect_uri_mismatch` | O redirect URI na Google Cloud tem de ser exatamente `APP_URL/api/auth/callback`. |
| "Access blocked: app has not completed verification" | Adiciona o teu email em **Test users** (passo 4.3). |
| "A conta … não tem acesso" | Adiciona o email a `ALLOWED_EMAILS` e faz Redeploy. |
| `/api/health` mostra `false` | Falta essa variável na Vercel → adiciona e **Redeploy**. |
| Erro de ligação à base de dados | Confirma a password no `MONGODB_URI` e o `0.0.0.0/0` em Network Access. |
| OCR: "API key not valid" | Copia de novo a chave do AI Studio para `GEMINI_API_KEY`. |
| APK: "Servidor não configurado" | Falta a variável `API_URL` no GitHub (passo 7.1); volta a correr o workflow. |
| APK: depois do login fica no Chrome | Toca em **Abrir a Carteira PT** na página que aparece. |

## Desenvolvimento local (opcional)

```bash
npm install
cp .env.example .env.local   # preenche, com APP_URL=http://localhost:3000
npx vercel dev               # app + API em http://localhost:3000
```
Adiciona também `http://localhost:3000/api/auth/callback` aos redirect URIs na Google Cloud.
