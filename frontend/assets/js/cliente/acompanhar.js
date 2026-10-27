const formulario = document.getElementById("form-acompanhar");
const campoNumero = document.getElementById("numero");
const campoTelefone = document.getElementById("telefone");
const caixaErro = document.getElementById("erro-acompanhar");
const resultado = document.getElementById("resultado");

const ETAPAS = [
  { status: "recebido", icone: "bi-receipt" },
  { status: "preparo", icone: "bi-box-seam" },
  { status: "entrega", icone: "bi-bicycle" },
  { status: "entregue", icone: "bi-house-check" }
];

let temporizador;

function desenharEtapas(status) {
  const lista = document.getElementById("etapas");
  lista.innerHTML = "";

  const atual = ETAPAS.findIndex((etapa) => etapa.status === status);
  const finalizado = status === "entregue";

  ETAPAS.forEach((etapa, indice) => {
    const item = document.createElement("li");
    item.className = "etapa";
    if (finalizado || indice < atual) item.classList.add("etapa--concluida");
    else if (indice === atual) item.classList.add("etapa--atual");

    item.innerHTML = `<span class="etapa__icone"><i class="bi ${etapa.icone}"></i></span>
                      <span class="etapa__nome"></span>`;
    item.querySelector(".etapa__nome").textContent = STATUS_PEDIDO[etapa.status].texto;
    lista.appendChild(item);
  });
}

function mostrarResultado(pedido) {
  document.getElementById("res-titulo").textContent = `Pedido #${pedido.numero}`;
  document.getElementById("res-status").replaceChildren(criarSeloStatus(pedido.status));
  document.getElementById("res-data").textContent = `Feito em ${formatarDataHora(pedido.data)}`;

  const cancelado = pedido.status === "cancelado";
  document.getElementById("etapas").hidden = cancelado;
  document.getElementById("aviso-cancelado").hidden = !cancelado;
  if (!cancelado) desenharEtapas(pedido.status);

  const lista = document.getElementById("res-itens");
  lista.innerHTML = "";
  pedido.itens.forEach((item) => {
    const linha = document.createElement("li");
    const nome = document.createElement("span");
    const valor = document.createElement("span");
    nome.textContent = `${item.quantidade}x ${item.nome}`;
    valor.textContent = formatarPreco(item.preco * item.quantidade);
    linha.append(nome, valor);
    lista.appendChild(linha);
  });

  document.getElementById("res-linha-taxa").hidden = pedido.taxaEntrega === undefined;
  document.getElementById("res-taxa").textContent =
  pedido.taxaEntrega > 0 ? formatarPreco(pedido.taxaEntrega) : "Grátis";

  document.getElementById("res-total").textContent = formatarPreco(pedido.total);

  const texto = encodeURIComponent(`Olá! Quero falar sobre o pedido nº ${pedido.numero}.`);
  document.getElementById("btn-whatsapp").href = `https://wa.me/${CONFIG.loja.whatsapp}?text=${texto}`;

  resultado.hidden = false;
}

async function consultar(numero, telefone, silencioso = false) {
  caixaErro.hidden = true;

  try {
    const pedido = await consultarPedido(numero, telefone);
    mostrarResultado(pedido);

    // Atualiza sozinho a cada 30 segundos, para o cliente ver a mudança de status
    clearInterval(temporizador);
    temporizador = setInterval(() => consultar(numero, telefone, true), 30000);
  } catch (erro) {
    if (silencioso) return;

    resultado.hidden = true;
    clearInterval(temporizador);
    caixaErro.textContent = erro instanceof TypeError
      ? "Não foi possível conectar ao servidor. Tente novamente."
      : erro.message;
    caixaErro.hidden = false;
  }
}

campoTelefone.addEventListener("input", () => {
  campoTelefone.value = formatarTelefone(campoTelefone.value);
});

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
  consultar(Number.parseInt(campoNumero.value, 10), campoTelefone.value);
});

/* ---------- Início ---------- */
const parametros = new URLSearchParams(window.location.search);
if (parametros.has("numero")) {
  campoNumero.value = parametros.get("numero");
}

// Quem acabou de fazer o pedido já vê o andamento, sem digitar nada
const ultimoPedido = JSON.parse(sessionStorage.getItem("ultimoPedido") || "null");
if (ultimoPedido && ultimoPedido.telefone && String(ultimoPedido.numero) === campoNumero.value) {
  campoTelefone.value = ultimoPedido.telefone;
  consultar(ultimoPedido.numero, ultimoPedido.telefone);
}