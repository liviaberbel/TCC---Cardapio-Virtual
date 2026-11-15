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
  pedidoAberto = pedido;
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
  entrega.appendChild(criarParagrafo(`Joanópolis${e.cep ? ` · CEP ${formatarCep(e.cep)}` : ""}`));
    if (e.bairroConfirmado === false) {
    entrega.appendChild(criarParagrafo(
      "Atenção: o bairro foi informado pelo cliente e não pôde ser confirmado pelo CEP. Confira o endereço antes de entregar."
    ));
  }
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

  const blocos = [criarBlocoStatus(pedido), cliente, entrega, pagamento, itens];

  if (pedido.desconto > 0) {
    blocos.push(criarLinhaDupla(
      `Desconto (cupom ${pedido.cupom})`,
      `− ${formatarPreco(pedido.desconto)}`,
      "detalhe-linha"
    ));
  }

  if (pedido.taxaEntrega !== undefined) {
    blocos.push(criarLinhaDupla(
      "Taxa de entrega",
      pedido.taxaEntrega > 0 ? formatarPreco(pedido.taxaEntrega) : "Grátis",
      "detalhe-linha"
    ));
  }

  blocos.push(criarLinhaDupla("Total", formatarPreco(pedido.total), "detalhe-total"));
  corpo.append(...blocos);

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

/* ---------- Atualização automática e aviso de novo pedido ---------- */
const avisoNovoPedido = document.getElementById("aviso-novo-pedido");
const tituloOriginal = document.title;
let temporizadorNovoPedido;

function avisarNovoPedido(quantidade) {
  mostrarToast(
    quantidade === 1 ? "Chegou 1 novo pedido!" : `Chegaram ${quantidade} novos pedidos!`,
    "info",
    8000
  );

  // Se a aba está em segundo plano, o título chama a atenção
  if (document.hidden) {
    document.title = `(${quantidade}) Novo pedido · ${tituloOriginal}`;
  }
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) document.title = tituloOriginal;
});

async function atualizarPedidos() {
  const pedidos = await listarPedidos();
  if (!dadosMudaram("pedidos", pedidos)) return;

  const maiorNumeroAntes = Math.max(0, ...todosPedidos.map((pedido) => pedido.numero));
  const novos = pedidos.filter((pedido) => pedido.numero > maiorNumeroAntes).length;

  todosPedidos = pedidos;
  aplicarBusca();

  if (novos > 0) avisarNovoPedido(novos);
}

// Não atualiza enquanto a janela de detalhes de um pedido está aberta
atualizarPeriodicamente(atualizarPedidos, 10, { pausarSe: () => dialogo.open });

/* ---------- Comanda: impressão e PDF ---------- */
let pedidoAberto = null;
const CHAVE_PAPEL = "papelDaComanda";
const comanda = document.getElementById("comanda");
const seletorPapel = document.getElementById("papel-comanda");

// Lembra o papel escolhido (folha comum ou bobina)
seletorPapel.value = localStorage.getItem(CHAVE_PAPEL) || "a4";
seletorPapel.addEventListener("change", () => {
  localStorage.setItem(CHAVE_PAPEL, seletorPapel.value);
});

function linhaDaComanda(esquerda, direita, classe = "") {
  const linha = document.createElement("div");
  linha.className = `comanda__linha ${classe}`.trim();

  const a = document.createElement("span");
  const b = document.createElement("span");
  a.textContent = esquerda;
  b.textContent = direita;

  linha.append(a, b);
  return linha;
}

// Cria uma seção com título; o conteúdo pode ser texto ou elementos
function secaoDaComanda(titulo, ...conteudo) {
  const secao = document.createElement("section");
  secao.className = "comanda__secao";

  const cabecalho = document.createElement("h3");
  cabecalho.textContent = titulo;
  secao.appendChild(cabecalho);

  conteudo.forEach((item) => {
    if (typeof item === "string") {
      const paragrafo = document.createElement("p");
      paragrafo.textContent = item;
      secao.appendChild(paragrafo);
    } else {
      secao.appendChild(item);
    }
  });

  return secao;
}

function montarComanda(pedido) {
  comanda.innerHTML = "";

  const topo = document.createElement("header");
  topo.className = "comanda__topo";

  const loja = document.createElement("p");
  loja.className = "comanda__loja";
  loja.textContent = CONFIG.loja.nome;

  const numero = document.createElement("h2");
  numero.textContent = `Pedido #${pedido.numero}`;

  const data = document.createElement("p");
  data.textContent = formatarDataHora(pedido.data);

  topo.append(loja, numero, data);

  const cliente = secaoDaComanda("Cliente", pedido.cliente.nome, pedido.cliente.telefone);

  const e = pedido.endereco;
  const linhasEndereco = [
    `${e.rua}, ${e.numero}${e.complemento ? ` - ${e.complemento}` : ""}`,
    `${e.bairro} · Joanópolis${e.cep ? ` · CEP ${formatarCep(e.cep)}` : ""}`
  ];
  if (e.referencia) linhasEndereco.push(`Referência: ${e.referencia}`);
  if (e.bairroConfirmado === false) {
    linhasEndereco.push("ATENÇÃO: bairro não confirmado pelo CEP. Conferir o endereço.");
  }
  const entrega = secaoDaComanda("Entrega", ...linhasEndereco);

  const listaItens = document.createElement("div");
  pedido.itens.forEach((item) => {
    listaItens.appendChild(linhaDaComanda(`${item.quantidade}x ${item.nome}`, formatarPreco(item.preco * item.quantidade)));
  });
  const itens = secaoDaComanda("Itens", listaItens);

  const valores = document.createElement("div");
  if (pedido.subtotal !== undefined) {
    valores.appendChild(linhaDaComanda("Subtotal", formatarPreco(pedido.subtotal)));
  }
  if (pedido.desconto > 0) {
    valores.appendChild(linhaDaComanda(`Desconto (cupom ${pedido.cupom})`, `− ${formatarPreco(pedido.desconto)}`));
  }
  if (pedido.taxaEntrega !== undefined) {
    valores.appendChild(linhaDaComanda(
      "Taxa de entrega",
      pedido.taxaEntrega > 0 ? formatarPreco(pedido.taxaEntrega) : "Grátis"
    ));
  }
  valores.appendChild(linhaDaComanda("TOTAL", formatarPreco(pedido.total), "comanda__total"));

  const textosPagamento = [nomePagamento(pedido.pagamento.forma)];
  if (pedido.pagamento.troco) textosPagamento.push(`Troco para: ${pedido.pagamento.troco}`);
  const pagamento = secaoDaComanda("Pagamento", valores, ...textosPagamento);

  comanda.append(topo, cliente, entrega, itens, pagamento);

  if (pedido.observacoes) {
    comanda.appendChild(secaoDaComanda("Observações", pedido.observacoes));
  }

  const rodape = document.createElement("p");
  rodape.className = "comanda__rodape";
  rodape.textContent = `Impresso em ${formatarDataHora(new Date().toISOString())}`;
  comanda.appendChild(rodape);
}

function imprimirPedido(pedido) {
  montarComanda(pedido);

  // Tamanho do papel
  const bobina = seletorPapel.value === "bobina";
  comanda.classList.toggle("comanda--bobina", bobina);

  let estilo = document.getElementById("estilo-pagina");
  if (!estilo) {
    estilo = document.createElement("style");
    estilo.id = "estilo-pagina";
    document.head.appendChild(estilo);
  }
  estilo.textContent = bobina
    ? "@page { size: 80mm auto; margin: 3mm; }"
    : "@page { size: A4; margin: 12mm; }";

  // Durante a impressão, a página inteira some e só a comanda aparece
  document.body.classList.add("imprimindo-comanda");
  window.print();
}

window.addEventListener("afterprint", () => {
  document.body.classList.remove("imprimindo-comanda");
});

document.getElementById("btn-imprimir").addEventListener("click", () => {
  if (pedidoAberto) imprimirPedido(pedidoAberto);
});