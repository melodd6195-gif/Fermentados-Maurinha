# Login, banco e painel: como ligar

O site já está conectado ao seu projeto Supabase (arquivo `config.js`).

## 1) Ajustes no Supabase (uma vez)

**Authentication > Sign In / Providers > Email**
- Para TESTAR: desligue **"Confirm email"**. Assim o cadastro entra direto, sem esperar e-mail.
  (O Supabase grátis manda poucos e-mails por hora, então a confirmação atrapalha nos testes.)
- Para PUBLICAR: ligue de novo e configure um e-mail próprio em Project Settings > Authentication > SMTP.

**Authentication > URL Configuration**
- **Site URL:** o endereço do site (por enquanto, o do teste, ex.: `http://192.168.0.15:8000`).
- **Redirect URLs:** adicione o mesmo endereço e `http://localhost:8000` (serve para o link "Esqueci a senha").

## 2) Conta de administrador (Maurinha)

1. Authentication > Users > **Add user** > e-mail e senha (marque **Auto Confirm User**).
2. SQL Editor: rode `supabase/migrations/004_admin.sql` trocando o e-mail.
3. Abra `admin.html` no navegador e entre com esse e-mail. (No site aparece também um botão "Painel" para ela.)

## 3) O que existe agora

**Site (index.html)**
- Cardápio, preços, tamanhos e "Esgotado" vêm do banco (a Maurinha muda pelo painel).
- Pedido é gravado no banco (preço conferido no servidor) e segue para o WhatsApp com o número do pedido.
- Se o banco ficar fora do ar, o site continua funcionando só com WhatsApp, como antes.
- Cadastro e login (opcional): salva endereço e telefone, mostra histórico, "Pedir de novo" e cancelar pedido novo.

**Painel (admin.html)**
- Pedidos: filtros, resumo do dia, detalhe com endereço e observações, preencher valor dos itens "a confirmar", taxa de entrega, mudar status, botão de WhatsApp do cliente. Aviso sonoro quando chega pedido novo (com a página aberta).
- Produtos: editar nome, preço, tamanho, esgotado, visível; trocar foto (envia para o Storage); adicionar produto.
- Configurações: pausar pedidos, taxa, pedido mínimo, formas de pagamento, WhatsApp da loja.

## 4) Teste rápido (5 minutos)

1. No site, faça um pedido sem entrar na conta. Deve aparecer "Pedido nº 1001".
2. Abra `admin.html`, entre como Maurinha: o pedido aparece em "Em andamento".
3. Abra o pedido, clique em "Confirmar pedido".
4. No site, crie uma conta, faça outro pedido e veja em "Meus pedidos".

## 5) Antes de divulgar para clientes

- Ligar "Confirm email" com SMTP próprio e o **CAPTCHA** (Authentication > Attack Protection).
- Trocar Site URL pelo endereço definitivo.
- Hospedar o site (Netlify, Cloudflare Pages ou GitHub Pages).
