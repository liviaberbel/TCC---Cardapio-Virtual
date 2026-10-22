const nomesPagamento = {
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
  dinheiro: "Dinheiro"
};

function mostrarResumo(resumo) {
  document.getElementById("resumo-pedidos").textContent = resumo.pedidosHoje;
  document.getElementById("resumo-disponiveis").textContent = resumo.produtosDisponiveis;
  document.getElementById("resumo-esgotados").textContent = resumo.produtosEsgotados;
}

function mostrarUltimosPedidos(pedidos) {
  const corpo = document.getElementById("tabela-pedidos");
  corpo.innerHTML = "";

  document.getElementById("sem-pedidos").hidden = pedidos.length > 0;

  pedidos.forEach((pedido) => {
    const linha = document.createElement("tr");

    [
      `#${pedido.numero}`,
      pedido.cliente,
      nomesPagamento[pedido.pagamento] || pedido.pagamento,
      formatarPreco(pedido.total),
      pedido.horario
    ].forEach((texto) => {
      const celula = document.createElement("td");
      celula.textContent = texto;
      linha.appendChild(celula);
    });

    corpo.appendChild(linha);
  });
}

async function carregarPainel() {
  try {
    const resumo = await buscarResumoPainel();
    mostrarResumo(resumo);
    mostrarUltimosPedidos(resumo.ultimosPedidos);
  } catch (erro) {
    const aviso = document.getElementById("erro-painel");
    aviso.textContent = "Não foi possível carregar os dados do painel.";
    aviso.hidden = false;
  }
}

carregarPainel();

/* ---------- Funcionamento de hoje ---------- */
const formFuncionamento = document.getElementById("form-funcionamento");
const camposFuncionamento = formFuncionamento.elements;
const erroFuncionamento = document.getElementById("erro-funcionamento");
const avisoFuncionamento = document.getElementById("aviso-funcionamento");

function mostrarSituacaoLoja(funcionamento) {
  const situacao = situacaoDaLoja(funcionamento);

  const selo = document.getElementById("situacao-loja");
  selo.textContent = situacao.aberta ? "Recebendo pedidos" : "Sem receber pedidos";
  selo.className = `selo ${situacao.aberta ? "selo--disponivel" : "selo--esgotado"}`;

  document.getElementById("mensagem-situacao").textContent = situacao.mensagem;
}

// Quando a loja não funciona hoje, os campos de horário ficam desabilitados
function alternarCampos() {
  const aberta = camposFuncionamento.aberta.checked;
  ["abertura", "fechamento", "entregaMin", "entregaMax"].forEach((nome) => {
    camposFuncionamento[nome].disabled = !aberta;
  });
}

async function carregarFuncionamento() {
  let funcionamento = null;

  try {
    funcionamento = await buscarFuncionamento();
  } catch (erro) {
    // sem dados, o formulário começa com os valores padrão
  }

  // Sugere os últimos valores salvos (mesmo de outro dia) para facilitar
  camposFuncionamento.abertura.value = funcionamento?.abertura || "14:00";
  camposFuncionamento.fechamento.value = funcionamento?.fechamento || "22:00";
  camposFuncionamento.entregaMin.value = funcionamento?.entregaMin ?? "";
  camposFuncionamento.entregaMax.value = funcionamento?.entregaMax ?? "";
  camposFuncionamento.aberta.checked = funcionamento ? funcionamento.aberta : true;

  alternarCampos();
  mostrarSituacaoLoja(funcionamento);
}

camposFuncionamento.aberta.addEventListener("change", alternarCampos);

formFuncionamento.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  erroFuncionamento.hidden = true;

  const dados = {
    aberta: camposFuncionamento.aberta.checked,
    abertura: camposFuncionamento.abertura.value,
    fechamento: camposFuncionamento.fechamento.value,
    entregaMin: Number.parseInt(camposFuncionamento.entregaMin.value, 10),
    entregaMax: Number.parseInt(camposFuncionamento.entregaMax.value, 10)
  };

  if (dados.aberta && dados.fechamento <= dados.abertura) {
    erroFuncionamento.textContent = "O horário de fechamento precisa ser depois do de abertura.";
    erroFuncionamento.hidden = false;
    return;
  }

  if (dados.aberta && dados.entregaMax < dados.entregaMin) {
    erroFuncionamento.textContent = "O tempo máximo de entrega não pode ser menor que o mínimo.";
    erroFuncionamento.hidden = false;
    return;
  }

  try {
    const salvo = await salvarFuncionamento(dados);
    mostrarSituacaoLoja(salvo);

    avisoFuncionamento.textContent = "Funcionamento de hoje salvo.";
    avisoFuncionamento.hidden = false;
    setTimeout(() => { avisoFuncionamento.hidden = true; }, 3000);
  } catch (erro) {
    erroFuncionamento.textContent = erro.message;
    erroFuncionamento.hidden = false;
  }
});

carregarFuncionamento();

// A cada minuto, confere se a loja já abriu ou fechou
setInterval(() => {
  buscarFuncionamento().then(mostrarSituacaoLoja).catch(() => {});
}, 60000);

/* ---------- Aviso de validade ---------- */
async function carregarAvisosDeValidade() {
  try {
    const produtos = await listarProdutos();
    const lista = document.getElementById("lista-validade");
    lista.innerHTML = "";

    // Só interessam os produtos que ainda têm estoque
    const alertas = produtos
      .filter((produto) => produto.quantidade > 0)
      .map((produto) => ({ produto, situacao: situacaoDaValidade(produto.validade) }))
      .filter(({ situacao }) => situacao && ["vencido", "hoje"].includes(situacao.estado))
      .sort((a, b) => (a.situacao.estado === "vencido" ? -1 : 1) - (b.situacao.estado === "vencido" ? -1 : 1));

    alertas.forEach(({ produto, situacao }) => {
      const item = document.createElement("li");

      const link = document.createElement("a");
      link.href = `produto-form.html?id=${produto.id}`;
      link.textContent = produto.nome;

      const texto = document.createElement("span");
      texto.textContent = situacao.texto;

      item.append(link, texto);
      lista.appendChild(item);
    });

    document.getElementById("aviso-validade").hidden = alertas.length === 0;
  } catch (erro) {
    // sem a lista de produtos, o aviso simplesmente não aparece
  }
}

carregarAvisosDeValidade();