const corpoTabela = document.getElementById("tabela-pedidos");
const semPedidos = document.getElementById("sem-pedidos");
const erroPedidos = document.getElementById("erro-pedidos");
const campoBusca = document.getElementById("busca-pedidos");
const dialogo = document.getElementById("detalhes-pedido");

const nomesPagamento = {
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
  dinheiro: "Dinheiro"
};

let todosPedidos = [];

function formatarDataHora(dataIso) {
  return new Date(dataIso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function nomePagamento(forma) {
  return nomesPagamento[forma] || forma;
}

/* ---------- Janela de detalhes ---------- */
function criarBloco(titulo) {
  const bloco = document.createElement("section");
  bloco.className = "detalhe";

  const cabecalho = document.createElement("h3");
  cabecalho.textContent = titulo;
  bloco.appendChild(cabecalho);

  return bloco;
}

function criarParagrafo(texto) {
  const paragrafo = document.createElement("p");
  paragrafo.textContent = texto;
  return paragrafo;
}

function criarLinhaDupla(esquerda, direita, classe) {
  const linha = document.createElement(classe ? "div" : "li");
  if (classe) linha.className = classe;

  const a = document.createElement("span");
  const b = document.createElement("span");
  a.textContent = esquerda;
  b.textContent = direita;

  linha.append(a, b);
  return linha;
}

async function mudarStatus(pedido, novoStatus) {
  try {
    await atualizarStatusPedido(pedido.numero, novoStatus);
    pedido.status = novoStatus;
    aplicarBusca();
    abrirDetalhes(pedido);
  } catch (erro) {
    alert(erro.message);
  }
}

function criarBlocoStatus(pedido) {
  const bloco = criarBloco("Status do pedido");
  bloco.appendChild(criarSeloStatus(pedido.status));

  const proximo = STATUS_PEDIDO[pedido.status]?.proximo;
  if (!proximo) return bloco; // pedido finalizado: sem ações

  const acoes = document.createElement("div");
  acoes.className = "detalhe-acoes";

  const avancar = document.createElement("button");
  avancar.type = "button";
  avancar.className = "botao botao--pequeno";
  avancar.textContent = `Marcar como "${STATUS_PEDIDO[proximo].texto}"`;
  avancar.addEventListener("click", () => mudarStatus(pedido, proximo));

  const cancelar = document.createElement("button");
  cancelar.type = "button";
  cancelar.className = "botao botao--contorno botao--pequeno";
  cancelar.textContent = "Cancelar pedido";
  cancelar.addEventListener("click", () => {
    if (confirm(`Cancelar o pedido #${pedido.numero}? Os produtos voltam para o estoque.`)) {
      mudarStatus(pedido, "cancelado");
    }
  });

  acoes.append(avancar, cancelar);
  bloco.appendChild(acoes);
  return bloco;
}

function abrirDetalhes(pedido) {
  document.getElementById("detalhes-titulo").textContent = `Pedido #${pedido.numero}`;

  const corpo = document.getElementById("detalhes-corpo");
  corpo.innerHTML = "";

  // Cliente
  const cliente = criarBloco("Cliente");
  cliente.appendChild(criarParagrafo(pedido.cliente.nome));
  cliente.appendChild(criarParagrafo(pedido.cliente.telefone));

  const whatsapp = document.createElement("a");
  whatsapp.className = "botao botao--secundario";
  whatsapp.target = "_blank";
  whatsapp.rel = "noopener";
  whatsapp.href = `https://wa.me/55${pedido.cliente.telefone.replace(/\D/g, "")}`;
  whatsapp.innerHTML = `<i class="bi bi-whatsapp"></i> Chamar no WhatsApp`;
  cliente.appendChild(whatsapp);

  // Entrega
  const e = pedido.endereco;
  const entrega = criarBloco("Entrega");
  entrega.appendChild(criarParagrafo(`${e.rua}, ${e.numero}${e.complemento ? ` - ${e.complemento}` : ""}`));
  entrega.appendChild(criarParagrafo(e.bairro));
  if (e.referencia) entrega.appendChild(criarParagrafo(`Referência: ${e.referencia}`));

  // Pagamento
  const pagamento = criarBloco("Pagamento");
  pagamento.appendChild(criarParagrafo(nomePagamento(pedido.pagamento.forma)));
  if (pedido.pagamento.troco) {
    pagamento.appendChild(criarParagrafo(`Troco para: ${pedido.pagamento.troco}`));
  }

  // Itens
  const itens = criarBloco("Itens");
  const lista = document.createElement("ul");
  lista.className = "detalhe-itens";
  pedido.itens.forEach((item) => {
    lista.appendChild(criarLinhaDupla(
      `${item.quantidade}x ${item.nome}`,
      formatarPreco(item.preco * item.quantidade)
    ));
  });
  itens.appendChild(lista);

  const total = criarLinhaDupla("Total", formatarPreco(pedido.total), "detalhe-total");

  corpo.append(criarBlocoStatus(pedido), cliente, entrega, pagamento, itens, total);

  // Observações (só aparecem se o cliente escreveu algo)
  if (pedido.observacoes) {
    const observacoes = criarBloco("Observações");
    observacoes.appendChild(criarParagrafo(pedido.observacoes));
    corpo.appendChild(observacoes);
  }

  if (!dialogo.open) dialogo.showModal();
}

document.getElementById("fechar-detalhes").addEventListener("click", () => dialogo.close());

// Clicar fora da janela também fecha
dialogo.addEventListener("click", (evento) => {
  if (evento.target === dialogo) dialogo.close();
});

/* ---------- Tabela ---------- */
function criarLinha(pedido) {
  const linha = document.createElement("tr");

  [
    `#${pedido.numero}`,
    formatarDataHora(pedido.data),
    pedido.cliente.nome,
    nomePagamento(pedido.pagamento.forma),
    formatarPreco(pedido.total)
  ].forEach((texto) => {
    const celula = document.createElement("td");
    celula.textContent = texto;
    linha.appendChild(celula);
  });

    const celulaStatus = document.createElement("td");
    celulaStatus.appendChild(criarSeloStatus(pedido.status));
    linha.appendChild(celulaStatus);

  const celulaAcoes = document.createElement("td");
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "botao botao--contorno botao--pequeno";
  botao.textContent = "Detalhes";
  botao.addEventListener("click", () => abrirDetalhes(pedido));
  celulaAcoes.appendChild(botao);
  linha.appendChild(celulaAcoes);

  return linha;
}

function pedidoCombinaComBusca(pedido, termo) {
  const busca = normalizarTexto(termo);
  if (!busca) return true;

  const texto = normalizarTexto(`${pedido.numero} ${pedido.cliente.nome} ${pedido.cliente.telefone}`);
  return busca.split(/\s+/).every((palavra) => texto.includes(palavra));
}

const filtroStatus = document.getElementById("filtro-status");

function aplicarBusca() {
  const termo = campoBusca.value;
  const status = filtroStatus.value;

  const encontrados = todosPedidos.filter((pedido) =>
    pedidoCombinaComBusca(pedido, termo) && (!status || pedido.status === status)
  );

  corpoTabela.innerHTML = "";
  encontrados.forEach((pedido) => corpoTabela.appendChild(criarLinha(pedido)));

  semPedidos.textContent = termo.trim() || status
    ? "Nenhum pedido encontrado para essa busca."
    : "Nenhum pedido recebido ainda.";
  semPedidos.hidden = encontrados.length > 0;
}

filtroStatus.addEventListener("change", aplicarBusca);

async function carregarPedidos() {
  erroPedidos.hidden = true;

  try {
    todosPedidos = await listarPedidos();
    aplicarBusca();
  } catch (erro) {
    erroPedidos.textContent = erro.message;
    erroPedidos.hidden = false;
  }
}

campoBusca.addEventListener("input", aplicarBusca);
document.getElementById("btn-atualizar").addEventListener("click", carregarPedidos);

carregarPedidos();