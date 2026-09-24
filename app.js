import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, onSnapshot, addDoc, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, configLoja } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById("nome-pizzaria").textContent = configLoja.nomePizzaria;

let categorias = [];
let produtos = [];
let zonas = [];
let categoriaAtiva = null;
let carrinho = JSON.parse(localStorage.getItem("carrinho") || "[]");

// ---------- Carregar dados em tempo real ----------
onSnapshot(query(collection(db, "categorias"), orderBy("posicao")), (snap) => {
  categorias = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (!categoriaAtiva && categorias.length) categoriaAtiva = categorias[0].id;
  renderTabs();
  renderGrid();
});

onSnapshot(collection(db, "produtos"), (snap) => {
  produtos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderGrid();
});

onSnapshot(collection(db, "zonas"), (snap) => {
  zonas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const sel = document.getElementById("ck-bairro");
  sel.innerHTML = zonas.map(z => `<option value="${z.id}">${z.nome} · ${formatar(z.taxa)}</option>`).join("");
});

function formatar(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ---------- Renderizar categorias e produtos ----------
function renderTabs() {
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = categorias.map(c =>
    `<button class="tab ${c.id === categoriaAtiva ? "active" : ""}" data-cat="${c.id}">${c.nome}</button>`
  ).join("");
  tabs.querySelectorAll(".tab").forEach(btn => {
    btn.onclick = () => { categoriaAtiva = btn.dataset.cat; renderTabs(); renderGrid(); };
  });
}

function renderGrid() {
  const grid = document.getElementById("grid");
  const lista = produtos.filter(p => p.categoriaId === categoriaAtiva);
  if (!lista.length) {
    grid.innerHTML = `<p class="empty-state">Nenhum produto nessa categoria ainda.</p>`;
    return;
  }
  grid.innerHTML = lista.map(p => `
    <div class="card">
      <img src="${p.imagem || 'https://via.placeholder.com/400x300?text=Sem+foto'}" alt="${p.nome}">
      <div class="card-body">
        <h3>${p.nome}</h3>
        <p>${p.descricao || ""}</p>
        <div class="card-footer">
          <span class="price">${formatar(p.preco)}</span>
          <button class="add-btn" data-id="${p.id}">Adicionar</button>
        </div>
      </div>
    </div>
  `).join("");
  grid.querySelectorAll(".add-btn").forEach(btn => {
    btn.onclick = () => abrirProduto(btn.dataset.id);
  });
}

// ---------- Modal de produto ----------
let produtoAtual = null;
let saboresEscolhidos = [];
let qtdAtual = 1;

function abrirProduto(id) {
  produtoAtual = produtos.find(p => p.id === id);
  saboresEscolhidos = [];
  qtdAtual = 1;
  document.getElementById("p-img").src = produtoAtual.imagem || "https://via.placeholder.com/400x300?text=Sem+foto";
  document.getElementById("p-nome").textContent = produtoAtual.nome;
  document.getElementById("p-desc").textContent = produtoAtual.descricao || "";
  document.getElementById("p-obs").value = "";
  document.getElementById("qty-valor").textContent = "1";

  const saboresDiv = document.getElementById("p-sabores");
  if (produtoAtual.isPizza && produtoAtual.sabores?.length) {
    saboresDiv.innerHTML = `<label>Escolha até 2 sabores</label>` + produtoAtual.sabores.map((s, i) => `
      <div class="flavor-option">
        <input type="checkbox" data-idx="${i}">
        <span style="flex:1;">${s.nome}</span>
        <span>${s.extra ? "+ " + formatar(s.extra) : ""}</span>
      </div>
    `).join("");
    saboresDiv.querySelectorAll("input[type=checkbox]").forEach(chk => {
      chk.onchange = () => {
        const idx = Number(chk.dataset.idx);
        if (chk.checked) {
          if (saboresEscolhidos.length >= 2) { chk.checked = false; return; }
          saboresEscolhidos.push(idx);
        } else {
          saboresEscolhidos = saboresEscolhidos.filter(i => i !== idx);
        }
        atualizarBotaoAdd();
      };
    });
  } else {
    saboresDiv.innerHTML = "";
  }

  atualizarBotaoAdd();
  abrir("overlay-produto");
}

function precoUnitario() {
  let preco = produtoAtual.preco;
  saboresEscolhidos.forEach(i => { preco += produtoAtual.sabores[i].extra || 0; });
  return preco;
}

function atualizarBotaoAdd() {
  document.getElementById("btn-add-carrinho").textContent =
    `Adicionar · ${formatar(precoUnitario() * qtdAtual)}`;
}

document.getElementById("qty-mais").onclick = () => { qtdAtual++; document.getElementById("qty-valor").textContent = qtdAtual; atualizarBotaoAdd(); };
document.getElementById("qty-menos").onclick = () => { if (qtdAtual > 1) qtdAtual--; document.getElementById("qty-valor").textContent = qtdAtual; atualizarBotaoAdd(); };

document.getElementById("btn-add-carrinho").onclick = () => {
  carrinho.push({
    produtoId: produtoAtual.id,
    nome: produtoAtual.nome,
    sabores: saboresEscolhidos.map(i => produtoAtual.sabores[i].nome),
    obs: document.getElementById("p-obs").value,
    qtd: qtdAtual,
    precoUnit: precoUnitario()
  });
  salvarCarrinho();
  fechar("overlay-produto");
};

function salvarCarrinho() {
  localStorage.setItem("carrinho", JSON.stringify(carrinho));
  renderCartBar();
}

function renderCartBar() {
  const bar = document.getElementById("cart-bar");
  const totalItens = carrinho.reduce((s, i) => s + i.qtd, 0);
  const totalValor = carrinho.reduce((s, i) => s + i.qtd * i.precoUnit, 0);
  if (totalItens > 0) {
    bar.classList.add("show");
    document.getElementById("cart-summary").textContent = `${totalItens} ${totalItens === 1 ? "item" : "itens"} · ${formatar(totalValor)}`;
  } else {
    bar.classList.remove("show");
  }
}

document.getElementById("cart-bar").onclick = () => { renderCarrinho(); abrir("overlay-carrinho"); };

function renderCarrinho() {
  const div = document.getElementById("lista-carrinho");
  if (!carrinho.length) {
    div.innerHTML = `<p class="empty-state">Carrinho vazio.</p>`;
  } else {
    div.innerHTML = carrinho.map((item, idx) => `
      <div class="cart-item">
        <div>
          <div>${item.qtd}x ${item.nome}</div>
          ${item.sabores.length ? `<div class="meta">${item.sabores.join(" + ")}</div>` : ""}
          ${item.obs ? `<div class="meta">Obs: ${item.obs}</div>` : ""}
          <button class="remove" data-idx="${idx}">Remover</button>
        </div>
        <div>${formatar(item.qtd * item.precoUnit)}</div>
      </div>
    `).join("");
    div.querySelectorAll(".remove").forEach(btn => {
      btn.onclick = () => { carrinho.splice(Number(btn.dataset.idx), 1); salvarCarrinho(); renderCarrinho(); };
    });
  }
  document.getElementById("carrinho-subtotal").textContent = formatar(subtotal());
}

function subtotal() {
  return carrinho.reduce((s, i) => s + i.qtd * i.precoUnit, 0);
}

document.getElementById("btn-ir-checkout").onclick = () => {
  if (!carrinho.length) return;
  fechar("overlay-carrinho");
  atualizarTotaisCheckout();
  abrir("overlay-checkout");
};

document.getElementById("ck-bairro").onchange = atualizarTotaisCheckout;

function taxaSelecionada() {
  const zona = zonas.find(z => z.id === document.getElementById("ck-bairro").value);
  return zona ? zona.taxa : 0;
}

function atualizarTotaisCheckout() {
  const sub = subtotal();
  const taxa = taxaSelecionada();
  document.getElementById("ck-subtotal").textContent = formatar(sub);
  document.getElementById("ck-taxa").textContent = formatar(taxa);
  document.getElementById("ck-total").textContent = formatar(sub + taxa);
}

document.getElementById("btn-confirmar-pedido").onclick = async () => {
  const nome = document.getElementById("ck-nome").value.trim();
  const telefone = document.getElementById("ck-telefone").value.trim();
  const endereco = document.getElementById("ck-endereco").value.trim();
  const zonaId = document.getElementById("ck-bairro").value;
  const pagamento = document.getElementById("ck-pagamento").value;
  const erro = document.getElementById("ck-erro");

  if (!nome || !telefone || !endereco || !zonaId) {
    erro.textContent = "Preencha todos os campos antes de confirmar.";
    erro.style.display = "block";
    return;
  }
  erro.style.display = "none";

  const zona = zonas.find(z => z.id === zonaId);
  const sub = subtotal();
  const total = sub + zona.taxa;

  const pedido = {
    itens: carrinho.map(i => ({ nome: i.nome, sabores: i.sabores, obs: i.obs, qtd: i.qtd, precoUnit: i.precoUnit })),
    subtotal: sub,
    taxaEntrega: zona.taxa,
    bairro: zona.nome,
    total,
    clienteNome: nome,
    clienteTelefone: telefone,
    clienteEndereco: endereco,
    pagamento,
    status: "recebido",
    criadoEm: serverTimestamp()
  };

  await addDoc(collection(db, "pedidos"), pedido);

  fechar("overlay-checkout");

  if (pagamento === "pix") {
    document.getElementById("pix-valor").textContent = formatar(total);
    document.getElementById("pix-chave").textContent = configLoja.chavePix;
    const msg = encodeURIComponent(`Olá! Segue o comprovante do meu pedido (${nome} - ${formatar(total)}).`);
    document.getElementById("btn-whatsapp").href = `https://wa.me/${configLoja.whatsappNumero}?text=${msg}`;
    abrir("overlay-pix");
  } else {
    abrir("overlay-sucesso");
  }

  carrinho = [];
  salvarCarrinho();
};

document.getElementById("btn-fechar-pix").onclick = () => fechar("overlay-pix");
document.getElementById("btn-fechar-sucesso").onclick = () => fechar("overlay-sucesso");

// ---------- Helpers de modal ----------
function abrir(id) { document.getElementById(id).classList.add("show"); }
function fechar(id) { document.getElementById(id).classList.remove("show"); }
document.querySelectorAll("[data-close]").forEach(btn => {
  btn.onclick = () => fechar(btn.dataset.close);
});

renderCartBar();
