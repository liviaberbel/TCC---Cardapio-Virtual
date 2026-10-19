const formulario = document.getElementById("form-pedido");
const botaoConfirmar = document.getElementById("btn-confirmar");
const campoTroco = document.getElementById("campo-troco");
const campoTelefone = document.getElementById("telefone");
const carrinho = lerCarrinho();

function formatarTelefone(valor) {
  const n = valor.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

function mostrarResumo() {
  const lista = document.getElementById("resumo-itens");

  carrinho.forEach((item) => {
    const linha = document.createElement("li");
    const nome = document.createElement("span");
    const valor = document.createElement("span");
    nome.textContent = `${item.quantidade}x ${item.nome}`;
    valor.textContent = formatarPreco(item.preco * item.quantidade);
    linha.append(nome, valor);
    lista.appendChild(linha);
  });

  document.getElementById("resumo-total").textContent = formatarPreco(calcularTotal(carrinho));
}

async function enviar(evento) {
  evento.preventDefault();

  botaoConfirmar.disabled = true;
  botaoConfirmar.textContent = "Enviando...";

  const dados = new FormData(formulario);
  const forma = dados.get("pagamento");

  // O front envia só o id e a quantidade; os preços são calculados pelo back-end
  const pedido = {
    cliente: {
      nome: dados.get("nome").trim(),
      telefone: dados.get("telefone")
    },
    endereco: {
      rua: dados.get("rua").trim(),
      numero: dados.get("numero").trim(),
      bairro: dados.get("bairro").trim(),
      complemento: dados.get("complemento").trim(),
      referencia: dados.get("referencia").trim()
    },
    pagamento: {
      forma,
      troco: forma === "dinheiro" ? dados.get("troco").trim() : ""
    },
    observacoes: dados.get("observacoes").trim(),
    itens: carrinho.map((item) => ({ produtoId: item.id, quantidade: item.quantidade }))
  };

  try {
    const resposta = await enviarPedido(pedido);

    sessionStorage.setItem("ultimoPedido", JSON.stringify({
      numero: resposta.numero,
      nome: pedido.cliente.nome,
      total: calcularTotal(carrinho),
      pagamento: forma,
      telefone: pedido.cliente.telefone,
      previsao: resposta.previsaoEntrega
    }));

    salvarCarrinho([]);
    window.location.href = "pedido-confirmado.html";
  } catch (erro) {
    alert(erro instanceof TypeError
      ? "Não foi possível conectar ao servidor. Tente novamente."
      : erro.message);
    botaoConfirmar.disabled = false;
    botaoConfirmar.textContent = "Confirmar pedido";
  }
}

/* ---------- Início ---------- */
async function iniciar() {
  if (carrinho.length === 0) {
    // Sem itens, não há o que finalizar
    window.location.replace("carrinho.html");
    return;
  }

  try {
    const situacao = situacaoDaLoja(await buscarFuncionamento());
    if (!situacao.aberta) {
      alert(situacao.mensagem);
      window.location.replace("carrinho.html");
      return;
    }
  } catch (erro) {
    // Se não der para conferir, o pedido ainda é conferido na hora do envio
  }

  mostrarResumo();

  campoTelefone.addEventListener("input", () => {
    campoTelefone.value = formatarTelefone(campoTelefone.value);
  });

  formulario.addEventListener("change", () => {
    campoTroco.hidden = formulario.pagamento.value !== "dinheiro";
  });

  formulario.addEventListener("submit", enviar);
}

iniciar();