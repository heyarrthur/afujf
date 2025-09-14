AFUJF - Backend (Auth/Login)

Passos:
1) Entre na pasta server
   cd server

2) Instale dependências
   npm i

3) Crie o arquivo .env (baseado no .env.example)
   - MONGODB_URI=Sua string do MongoDB
   - JWT_SECRET=um-segredo-forte
   - AUTO_OPEN=true (opcional)

4) (Opcional) Seed do usuário de teste
   npm run seed

5) Suba o servidor
   npm run dev

O servidor abrirá automaticamente http://localhost:4000/login.html
Se não quiser abrir, defina AUTO_OPEN=false no .env.

O front é servido de front-end/public (coloque seus arquivos lá).
As chamadas de login devem ir para /api/auth/login (mesma origem).
