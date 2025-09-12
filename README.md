# AFUJF — Front-end (Web/App)

Projeto de site responsivo em **HTML + CSS + JS + Bootstrap 5**, pronto para virar **PWA** e futuramente ser empacotado como aplicativo (Capacitor/Cordova).  
Enquanto o back-end (NodeJS + MongoDB) não chega, usamos **localStorage** para sessão e dados de exemplo.

---

## 📌 Sumário
- [Stack & Cores](#-stack--cores)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Páginas](#-páginas)
- [Como Rodar Localmente](#-como-rodar-localmente)
- [Dados em localStorage](#-dados-em-localstorage)
- [Exemplos de Dados](#-exemplos-de-dados)
- [Sessão & Perfis](#-sessão--perfis)
- [PWA / App](#-pwa--app)
- [Integração Futura (Node + MongoDB)](#-integração-futura-node--mongodb)
- [Checklist do que já foi feito](#-checklist-do-que-já-foi-feito)

---

## 🧰 Stack & Cores

**Front-end:** HTML, CSS, JavaScript, Bootstrap 5, Bootstrap Icons  
**Cores do projeto:**
- Gradiente: `#008B5C → #0068A9`
- Branco: `#FFFFFF`
- Preto (texto): `#353535`
- Sucesso: `#009420`
- Erro: `#D00000`

---

## 🗂 Estrutura de Pastas

/ (raiz do site)
├── index.html (opcional: redireciona para dashboard.html)
├── login.html
├── dashboard.html
├── carteirinha.html
├── convenios.html
├── eventos.html
├── associados.html (placeholder/admin futuramente)
├── /assets
│ ├── afujf.png (logo quadrado usado na navbar)
│ ├── /banners (imagens de eventos)
│ └── /logos (logos de convênios)
└── /css, /js (se preferir separar)

markdown
Copiar código

> Coloque **`assets/afujf.png`** e ajuste os caminhos, caso use outra estrutura.

---

## 🧭 Páginas

### Navbar (todas as páginas)
- Botão **quadrado fixo** (logo `afujf.png`) no canto **superior-esquerdo**.
- Ao clicar, abre **offcanvas** com:
  - Dashboard
  - Minha carteirinha
  - Convênios AFUJF
  - Eventos
  - Associados *(Admin; só aparece com `role: "admin"`)*

### `login.html`
- Login por **Matrícula** + **Senha**.
- UI moderna (gradiente, sombras, animações).
- Senha de desenvolvimento: **`afujf2025`** *(texto não aparece na UI; apenas para teste)*.
- Redireciona para `dashboard.html` e cria `localStorage.session`.

### `dashboard.html`
- Banner de **eventos** (carrossel sem setas, um por vez).
- Seção **Minha Carteirinha** com número aleatório `0000000-0000` e **Validade `MM/AAAA`**.
- Botão **Visualizar Carteirinha** → `carteirinha.html`.
- **Convênios AFUJF** (carrossel 1 logo por vez; 5s).
- **Próximos eventos** (teasers; ao clicar, abre `eventos.html`).

### `carteirinha.html`
- Mesma navbar.
- Título **“Minha Carteirinha”** + cartão em destaque.
- **Informações & Ajuda** com ícones coloridos e orientações de uso/validação.

### `convenios.html`
- Design moderno (glassmorphism, bordas em gradiente animadas, ribbon de desconto, skeleton).
- **Busca**, **categoria**, **ordenação** (Relevância, A–Z, Maior desconto) e **Favoritos** (⭐ via `localStorage`).
- Grid responsiva: logo (ou iniciais), categoria, desconto.
- **Modal** de detalhes (logo, categoria, desconto, link, descrição, telefone, endereço).
- Lê `localStorage.convenios` se existir, senão carrega exemplos.

### `eventos.html`
- Cards com banner, “pill” de **data** grande, tags e localização.
- **Modal** com quando/onde/categoria, **Gratuito/Pago**, link **Inscrever-se** e **.ICS** para calendário.
- Filtros: **Busca**, **Categoria**, **Mês**, **Somente futuros** (padrão), **Ordenação** (mais próximos, A–Z, recém-criados).
- Deep link: `eventos.html#e=<id>` abre o evento direto.
- Lê `localStorage.eventos` se existir, senão carrega exemplos.

---

## ▶️ Como Rodar Localmente

1. Baixe/clon e coloque os arquivos em uma pasta.
2. Sirva com um servidor estático **ou** abra os HTMLs direto no navegador.
   - Python: `python -m http.server 5500`
   - Node (serve): `npx serve .`
3. Acesse `http://localhost:5500/dashboard.html` (exemplo).

> Em produção, hospede como site estático (Netlify, Vercel, S3, etc.).

---

## 🧠 Dados em localStorage

| Chave                           | Descrição                                                         |
|---------------------------------|-------------------------------------------------------------------|
| `session`                       | `{ matricula, role }` (“public” ou “admin”)                      |
| `convenios`                     | Array de convênios (ver formato)                                 |
| `favoritesConvenios`            | Array de *ids* de convênios favoritos                            |
| `eventos`                       | Array de eventos (ver formato)                                   |

---

## 🧾 Exemplos de Dados

### Convênios
```js
localStorage.setItem("convenios", JSON.stringify([
  {
    "name": "Clínica Bem-Estar",
    "logo": "assets/logos/bemestar.png",
    "href": "https://exemplo.com",
    "category": "Clínicas",
    "discount": "15% off",
    "description": "Consultas e exames com condições especiais.",
    "phone": "(32) 0000-0000",
    "address": "Rua A, 100"
  }
]));
Eventos
js
Copiar código
localStorage.setItem("eventos", JSON.stringify([
  {
    "id": "noite-integracao",                      // opcional; vira slug do title se faltar
    "title": "Noite de Integração dos Associados",
    "start": "2025-10-20T19:00:00-03:00",
    "end":   "2025-10-20T21:00:00-03:00",
    "location": "Sede AFUJF",
    "category": "Social",
    "banner": "assets/banners/integracao.jpg",
    "description": "Descrição do evento...",
    "link": "https://exemplo.com/inscricao",
    "price": 0
  }
]));
👤 Sessão & Perfis
Defina a sessão manualmente para testes:

js
Copiar código
// Público
localStorage.setItem("session",
  JSON.stringify({ matricula: "0000000-0000", role: "public" })
);

// Admin (mostra 'Associados' no menu)
localStorage.setItem("session",
  JSON.stringify({ matricula: "0000000-0000", role: "admin" })
);
Para sair, use o botão Sair (remove session e volta ao login.html).
Senha de desenvolvimento do login: afujf2025.

📱 PWA / App
PWA (recomendado agora):

Criar manifest.json (nome, ícones, start_url, theme_color).

Registrar um service worker para cache offline.

Incluir no head:

html
Copiar código
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#0068A9">
Empacotar como app (Capacitor):

bash
Copiar código
npm i -D @capacitor/cli @capacitor/core
npx cap init afujf com.afujf.app
npx cap add android
npx cap add ios
# build estático para ./www (ou configure)
npx cap copy
npx cap open android
🔌 Integração Futura (Node + MongoDB)
Stack: Node.js + Express + Mongoose + JWT

Coleções:

users (matricula, senha hash, role)

convenios (name, logo, href, category, discount, description, phone, address, createdAt)

eventos (title, start, end, location, category, banner, description, link, price, createdAt)

Rotas sugeridas:

bash
Copiar código
POST   /api/auth/login
GET    /api/convenios
POST   /api/convenios            (admin)
PUT    /api/convenios/:id        (admin)
DELETE /api/convenios/:id        (admin)

GET    /api/eventos
POST   /api/eventos              (admin)
PUT    /api/eventos/:id          (admin)
DELETE /api/eventos/:id          (admin)
No front, troque as leituras de localStorage por fetch e envie o JWT no header Authorization: Bearer ....

✅ Checklist do que já foi feito
 Login por matrícula + senha (UI clean, animações).

 Navbar fixa com logo-quadrado (offcanvas).

 Dashboard com banner de eventos, Minha Carteirinha, convênios e próximos eventos.

 Carteirinha (página própria com Informações & Ajuda e ícones).

 Convênios (busca, filtros, ordenação, favoritos, modal, skeleton, design moderno).

 Eventos (busca, filtros, ordenação, modal, .ics, deep link, skeleton).

 Preparado para PWA e para integração com Node + MongoDB.

