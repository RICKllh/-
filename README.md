# Site de Pedidos da Pizzaria

Site completo: cardápio pro cliente (`index.html`) + painel administrativo (`admin.html`), usando **Firebase** como banco de dados gratuito (é o que faz o pedido do cliente aparecer no seu painel em tempo real).

## Passo 1 — Criar o projeto no Firebase (grátis)

1. Acesse **console.firebase.google.com** e clique em "Adicionar projeto". Dê um nome (ex: `pizzaria-do-fulano`) e conclua a criação.
2. No menu lateral, vá em **Compilação > Firestore Database** → "Criar banco de dados" → escolha o modo **de produção** → escolha a região mais perto (ex: `southamerica-east1`).
3. Ainda no menu lateral, vá em **Compilação > Authentication** → aba "Sign-in method" → ative **E-mail/senha**.
4. Na aba "Users" do Authentication, clique em "Adicionar usuário" e cadastre o e-mail e senha que **você** (dono da pizzaria) vai usar pra entrar no painel admin.

## Passo 2 — Pegar as chaves do projeto

1. No console, clique no ícone de engrenagem → **Configurações do projeto**.
2. Role até "Seus aplicativos" e clique no ícone `</>` (Web) para registrar um app.
3. Copie o objeto `firebaseConfig` que aparece.
4. Abra o arquivo `firebase-config.js` deste projeto e cole os valores no lugar de `"COLE_AQUI"`.
5. No mesmo arquivo, preencha `chavePix` (sua chave Pix) e `whatsappNumero` (seu número, só números, com código do país: `55` + DDD + número).

## Passo 3 — Regras de segurança do Firestore

Vá em **Firestore Database > Regras** e cole isto (permite qualquer pessoa ler o cardápio e criar pedidos, mas só o dono logado pode alterar produtos):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /categorias/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /produtos/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /zonas/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /pedidos/{doc} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

Clique em "Publicar".

## Passo 4 — Subir pro GitHub e publicar

1. Crie um repositório novo no GitHub e suba todos os arquivos desta pasta (`index.html`, `admin.html`, `style.css`, `app.js`, `admin.js`, `firebase-config.js`).
2. No repositório, vá em **Settings > Pages** → em "Source" escolha a branch `main` e a pasta `/root` → Salvar.
3. Em alguns minutos o GitHub te dá um link tipo `https://seuusuario.github.io/nome-do-repo/`.
4. O cardápio fica em `.../index.html` e o painel em `.../admin.html`. Guarde esse segundo link só pra você.

## Passo 5 — Usar o painel

1. Acesse `admin.html`, entre com o e-mail/senha cadastrados no Passo 1.
2. Crie primeiro as **Categorias** (ex: Pizzas, Bebidas).
3. Cadastre os **Bairros e taxas de entrega** (a taxa varia por bairro, como você pediu).
4. Cadastre os **Produtos**: se for pizza, marque a caixinha "é uma pizza" e adicione os sabores com o valor extra de cada um (deixe 0 se não tiver adicional).
5. A aba **Pedidos** atualiza sozinha assim que um cliente finaliza uma compra — você muda o status conforme for preparando e entregando.

## Sobre as imagens dos produtos

Pra manter simples, a imagem é um link (URL). Você pode subir a foto em qualquer serviço gratuito (ex: imgur.com) e colar o link no campo "URL da imagem" do painel. Se depois quiser subir foto direto do celular sem precisar de link, dá pra evoluir isso usando o Firebase Storage — é só pedir.

## Limitações desta primeira versão

- Sem notificação sonora de pedido novo (dá pra adicionar depois).
- Sem histórico de pedidos por cliente.
- Pagamento Pix é manual: o cliente paga e manda o comprovante pelo WhatsApp, não tem confirmação automática (isso exigiria integração com um banco/gateway de pagamento).
