import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------- Autenticação ----------
document.getElementById("btn-login").onclick = async () => {
  const email = document.getElementById("login-email").value.trim();
  const senha = document.getElementById("login-senha").value;
  const erro = document.getElementById("login-erro");
  try {
    await signInWithEmailAndPassword(auth, email, senha);
  } catch (e) {
    erro.textContent = "E-mail ou senha incorretos.";
    erro.style.display = "block";
  }
};

document.getElementById("btn-logout").onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
  document.getElementById("login-box").style.display = user ? "none" : "block";
  document.getElementById("admin-wrap").style.display = user ? "block" : "none";
  document.getElementById("btn-logout").style.display = user ? "inline-block" : "none";
  if (user) iniciarPainel();
});

let painelIniciado = false;
function iniciarPainel() {
  if (painelIniciado) return;
  painelIniciado = true;
  carregarCategorias();
  carregarProdutos();
  carregarZonas();
  carregarPedidos();
}

// ---------- Navegação entre abas ----------
document.querySelectorAll(".sidebar-nav button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".sidebar-nav button").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  };
});

function formatar(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// =========================================================
// CATEGORIAS
// =========================================================
let categorias = [];
let editandoCategoriaId = null;

function carregarCategorias() {
  onSnapshot(query(collection(db, "categorias"), orderBy("posicao")), (snap) => {
    categorias = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderListaCategorias();
    renderSelectCategoriaProduto();
  });
}

function renderListaCategorias() {
  const div = document.getElementById("lista-categorias");
  div.innerHTML = categorias.map(c => `
    <div class="list-row">
      <span>${c.nome}</span>
      <div class="actions">
        <button class="icon-btn" data-edit="${c.id}">Editar</button>
        <button class="icon-btn danger" data-del="${c.id}">Remover</button>
      </div>
    </div>
  `).join("") || `<p class="empty-state">Nenhuma categoria ainda.</p>`;

  div.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => {
    const cat = categorias.find(c => c.id === b.dataset.edit);
    document.getElementById("cat-nome").value = cat.nome;
    editandoCategoriaId = cat.id;
  });
  div.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (confirm("Remover essa categoria? Os produtos dela vão continuar existindo, mas sem categoria visível.")) {
      await deleteDoc(doc(db, "categorias", b.dataset.del));
    }
  });
}

document.getElementById("btn-salvar-categoria").onclick = async () => {
  const nome = document.getElementById("cat-nome").value.trim();
  if (!nome) return;
  if (editandoCategoriaId) {
    await updateDoc(doc(db, "categorias", editandoCategoriaId), { nome });
    editandoCategoriaId = null;
  } else {
    await addDoc(collection(db, "categorias"), { nome, posicao: categorias.length });
  }
  document.getElementById("cat-nome").value = "";
};

// =========================================================
// PRODUTOS
// =========================================================
let produtos = [];
let editandoProdutoId = null;
let saboresFormulario = [];

function carregarProdutos() {
  onSnapshot(collection(db, "produtos"), (snap) => {
    produtos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderListaProdutos();
  });
}

function renderSelectCategoriaProduto() {
  document.getElementById("prod-categoria").innerHTML =
    categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join("");
}

document.getElementById("prod-e-pizza").onchange = (e) => {
  document.getElementById("prod-sabores-wrap").style.display = e.target.checked ? "block" : "none";
};

function renderSaboresForm() {
  const div = document.getElementById("lista-sabores-form");
  div.innerHTML = saboresFormulario.map((s, i) => `
    <div style="display:flex;gap:8px;margin-bottom:8px;">
      <input placeholder="Nome do sabor" value="${s.nome}" data-idx="${i}" data-campo="nome" style="flex:2;">
      <input placeholder="Adicional R$" type="number" step="0.01" value="${s.extra}" data-idx="${i}" data-campo="extra" style="flex:1;">
      <button class="icon-btn danger" data-remove-sabor="${i}" type="button">×</button>
    </div>
  `).join("");
  div.querySelectorAll("input").forEach(inp => {
    inp.oninput = () => {
      const i = Number(inp.dataset.idx);
      saboresFormulario[i][inp.dataset.campo] = inp.dataset.campo === "extra" ? Number(inp.value || 0) : inp.value;
    };
  });
  div.querySelectorAll("[data-remove-sabor]").forEach(btn => {
    btn.onclick = () => { saboresFormulario.splice(Number(btn.dataset.removeSabor), 1); renderSaboresForm(); };
  });
}

document.getElementById("btn-add-sabor").onclick = () => {
  saboresFormulario.push({ nome: "", extra: 0 });
  renderSaboresForm();
};

function limparFormProduto() {
  document.getElementById("prod-nome").value = "";
  document.getElementById("prod-desc").value = "";
  document.getElementById("prod-preco").value = "";
  document.getElementById("prod-imagem").value = "";
  document.getElementById("prod-e-pizza").checked = false;
  document.getElementById("prod-sabores-wrap").style.display = "none";
  saboresFormulario = [];
  renderSaboresForm();
  editandoProdutoId = null;
  document.getElementById("btn-cancelar-edicao").style.display = "none";
}

document.getElementById("btn-cancelar-edicao").onclick = limparFormProduto;

document.getElementById("btn-salvar-produto").onclick = async () => {
  const nome = document.getElementById("prod-nome").value.trim();
  const preco = Number(document.getElementById("prod-preco").value);
  const categoriaId = document.getElementById("prod-categoria").value;
  if (!nome || !preco || !categoriaId) {
    alert("Preencha nome, preço e categoria.");
    return;
  }
  const dados = {
    nome,
    descricao: document.getElementById("prod-desc").value.trim(),
    preco,
    imagem: document.getElementById("prod-imagem").value.trim(),
    categoriaId,
    isPizza: document.getElementById("prod-e-pizza").checked,
    sabores: document.getElementById("prod-e-pizza").checked ? saboresFormulario.filter(s => s.nome) : []
  };
  if (editandoProdutoId) {
    await updateDoc(doc(db, "produtos", editandoProdutoId), dados);
  } else {
    await addDoc(collection(db, "produtos"), dados);
  }
  limparFormProduto();
};

function renderListaProdutos() {
  const div = document.getElementById("lista-produtos");
  div.innerHTML = produtos.map(p => `
    <div class="list-row">
      <div>
        <b>${p.nome}</b> — ${formatar(p.preco)}
        <div class="meta" style="font-size:12px;color:var(--text-soft);">${categorias.find(c => c.id === p.categoriaId)?.nome || "sem categoria"}</div>
      </div>
      <div class="actions">
        <button class="icon-btn" data-edit="${p.id}">Editar</button>
        <button class="icon-btn danger" data-del="${p.id}">Remover</button>
      </div>
    </div>
  `).join("") || `<p class="empty-state">Nenhum produto ainda.</p>`;

  div.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => {
    const p = produtos.find(x => x.id === b.dataset.edit);
    document.getElementById("prod-nome").value = p.nome;
    document.getElementById("prod-desc").value = p.descricao || "";
    document.getElementById("prod-preco").value = p.preco;
    document.getElementById("prod-imagem").value = p.imagem || "";
    document.getElementById("prod-categoria").value = p.categoriaId;
    document.getElementById("prod-e-pizza").checked = !!p.isPizza;
    document.getElementById("prod-sabores-wrap").style.display = p.isPizza ? "block" : "none";
    saboresFormulario = (p.sabores || []).map(s => ({ ...s }));
    renderSaboresForm();
    editandoProdutoId = p.id;
    document.getElementById("btn-cancelar-edicao").style.display = "block";
    document.getElementById("tab-produtos").scrollIntoView({ behavior: "smooth" });
  });
  div.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (confirm("Remover esse produto?")) await deleteDoc(doc(db, "produtos", b.dataset.del));
  });
}

// =========================================================
// ZONAS DE ENTREGA
// =========================================================
let zonas = [];
let editandoZonaId = null;

function carregarZonas() {
  onSnapshot(collection(db, "zonas"), (snap) => {
    zonas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderListaZonas();
  });
}

function renderListaZonas() {
  const div = document.getElementById("lista-zonas");
  div.innerHTML = zonas.map(z => `
    <div class="list-row">
      <span>${z.nome} — ${formatar(z.taxa)}</span>
      <div class="actions">
        <button class="icon-btn" data-edit="${z.id}">Editar</button>
        <button class="icon-btn danger" data-del="${z.id}">Remover</button>
      </div>
    </div>
  `).join("") || `<p class="empty-state">Nenhum bairro cadastrado ainda.</p>`;

  div.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => {
    const z = zonas.find(x => x.id === b.dataset.edit);
    document.getElementById("zona-nome").value = z.nome;
    document.getElementById("zona-taxa").value = z.taxa;
    editandoZonaId = z.id;
  });
  div.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (confirm("Remover esse bairro?")) await deleteDoc(doc(db, "zonas", b.dataset.del));
  });
}

document.getElementById("btn-salvar-zona").onclick = async () => {
  const nome = document.getElementById("zona-nome").value.trim();
  const taxa = Number(document.getElementById("zona-taxa").value || 0);
  if (!nome) return;
  if (editandoZonaId) {
    await updateDoc(doc(db, "zonas", editandoZonaId), { nome, taxa });
    editandoZonaId = null;
  } else {
    await addDoc(collection(db, "zonas"), { nome, taxa });
  }
  document.getElementById("zona-nome").value = "";
  document.getElementById("zona-taxa").value = "";
};

// =========================================================
// PEDIDOS
// =========================================================
const STATUS_LABEL = {
  recebido: "Recebido",
  preparando: "Preparando",
  saiu: "Saiu para entrega",
  entregue: "Entregue"
};

function carregarPedidos() {
  onSnapshot(query(collection(db, "pedidos"), orderBy("criadoEm", "desc")), (snap) => {
    const pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderListaPedidos(pedidos);
  });
}

function renderListaPedidos(pedidos) {
  const div = document.getElementById("lista-pedidos");
  div.innerHTML = pedidos.map(p => `
    <div class="order-card">
      <div class="order-head">
        <span class="status-pill status-${p.status}">${STATUS_LABEL[p.status] || p.status}</span>
        <div style="display:flex;gap:8px;align-items:center;">
          <select data-status="${p.id}">
            ${Object.entries(STATUS_LABEL).map(([v, l]) => `<option value="${v}" ${p.status === v ? "selected" : ""}>${l}</option>`).join("")}
          </select>
          <button class="icon-btn danger" data-del-pedido="${p.id}">Apagar</button>
        </div>
      </div>
      <ul>
        ${p.itens.map(i => `<li>${i.qtd}x ${i.nome}${i.sabores?.length ? " (" + i.sabores.join(" + ") + ")" : ""}${i.obs ? " — obs: " + i.obs : ""}</li>`).join("")}
      </ul>
      <div class="info-row"><b>Cliente:</b> ${p.clienteNome}</div>
      <div class="info-row"><b>Telefone:</b> ${p.clienteTelefone}</div>
      <div class="info-row"><b>Endereço:</b> ${p.clienteEndereco} — ${p.bairro}</div>
      <div class="info-row"><b>Pagamento:</b> ${p.pagamento === "pix" ? "Pix" : "Na entrega"}</div>
      <div class="info-row"><b>Total:</b> ${formatar(p.total)} (entrega ${formatar(p.taxaEntrega)})</div>
    </div>
  `).join("") || `<p class="empty-state">Nenhum pedido ainda.</p>`;

  div.querySelectorAll("[data-status]").forEach(sel => {
    sel.onchange = async () => {
      await updateDoc(doc(db, "pedidos", sel.dataset.status), { status: sel.value });
    };
  });

  div.querySelectorAll("[data-del-pedido]").forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Apagar esse pedido? Essa ação não pode ser desfeita.")) {
        await deleteDoc(doc(db, "pedidos", btn.dataset.delPedido));
      }
    };
  });
}
