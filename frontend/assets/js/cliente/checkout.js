const formulario = document.getElementById("form-pedido");
const botaoConfirmar = document.getElementById("btn-confirmar");
const campoTroco = document.getElementById("campo-troco");
const campoTelefone = document.getElementById("telefone");
const campoBairro = document.getElementById("bairro");
const campoCep = document.getElementById("cep");
const campoRua = document.getElementById("rua");
const dicaCep = document.getElementById("dica-cep");
const dicaBairro = document.getElementById("dica-bairro");
const avisoBairros = document.getElementById("aviso-bairros");
const carrinho = lerCarrinho();

const DICA_CEP_PADRAO = "Digite o CEP para completar a rua automaticamente.";
let bairros = [];
let cupom = lerCupomAplicado(); // { codigo, percentual } ou null

// Situação do CEP digitado:
// pendente   = ainda não conferido (incompleto ou consultando)
// confirmado = o CEP identificou um bairro cadastrado, que fica travado
// manual     = não deu para identificar o bairro pelo CEP, o cliente escolhe
// bloqueado  = CEP inexistente, de outra cidade ou de bairro que não atendemos
let situacaoCep = "pendente";
let consultaCep = 0; // identifica a consulta mais recente, para ignorar respostas antigas

function bairroEscolhido() {
  return bairros.find((bairro) => String(bairro.id) === campoBairro.value) || null;
}

function textoDaTaxa(taxa) {
  return taxa > 0 ? formatarPreco(taxa) : "Grátis";
}

function atualizarTotais() {
  const subtotal = calcularTotal(carrinho);
  const bairro = bairroEscolhido();
  const desconto = cupom ? calcularDesconto(subtotal, cupom.percentual) : 0;
  const taxa = bairro ? bairro.taxa : 0;

  document.getElementById("resumo-subtotal").textContent = formatarPreco(subtotal);

  const linhaDesconto = document.getElementById("linha-desconto");
  if (linhaDesconto) {
    linhaDesconto.hidden = !cupom;

    if (cupom) {
      document.getElementById("rotulo-desconto").textContent = `Cupom ${cupom.codigo} (${cupom.percentual}%)`;
      document.getElementById("resumo-desconto").textContent = `− ${formatarPreco(desconto)}`;
    }
  }

  document.getElementById("resumo-taxa").textContent = bairro ? textoDaTaxa(bairro.taxa) : "Escolha o bairro";
  document.getElementById("resumo-total").textContent = formatarPreco(subtotal - desconto + taxa);
}

function mostrarResumo() {
  const lista = document.getElementById("resumo-itens");
  lista.innerHTML = "";

  carrinho.forEach((item) => {
    const linha = document.createElement("li");
    const nome = document.createElement("span");
    const valor = document.createElement("span");
    nome.textContent = `${item.quantidade}x ${item.nome}`;
    valor.textContent = formatarPreco(item.preco * item.quantidade);
    linha.append(nome, valor);
    lista.appendChild(linha);
  });

  atualizarTotais();
}

function bloquearPedido(mensagem) {
  avisoBairros.textContent = mensagem;
  avisoBairros.hidden = false;
  botaoConfirmar.disabled = true;
}

async function carregarBairros() {
  const lista = await listarBairros();
  bairros = [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  bairros.forEach((bairro) => {
    const opcao = document.createElement("option");
    opcao.value = bairro.id;
    opcao.textContent = `${bairro.nome} (${bairro.taxa > 0 ? formatarPreco(bairro.taxa) : "entrega grátis"})`;
    campoBairro.appendChild(opcao);
  });

  if (bairros.length === 0) {
    bloquearPedido("No momento não há bairros cadastrados para entrega. Fale com a loja pelo WhatsApp.");
  }
}

// Confere de novo o cupom aplicado no carrinho (ele pode ter vencido nesse meio-tempo)
async function revalidarCupom() {
  if (!cupom) return;

  try {
    const valido = await conferirCupom(cupom.codigo);
    cupom = { codigo: valido.codigo, percentual: valido.percentual };
    salvarCupomAplicado(cupom);
  } catch (erro) {
    if (erro instanceof TypeError) return; // sem conexão: o servidor confere no envio

    alert(`O cupom ${cupom.codigo} foi removido do pedido. ${erro.message}`);
    salvarCupomAplicado(null);
    cupom = null;
  }
}

/* ---------- CEP e bairro ---------- */
function mostrarDicaBairro(texto) {
  if (dicaBairro) dicaBairro.textContent = texto;
}

// Aplica o resultado da conferência do CEP na tela
function aplicarResultadoDoCep(situacao, mensagem, bairro = null) {
  situacaoCep = situacao;
  dicaCep.textContent = mensagem;

  if (situacao === "confirmado") {
    // O bairro vem do CEP e não pode ser trocado
    campoBairro.value = bairro.id;
    campoBairro.disabled = true;
    mostrarDicaBairro("Bairro definido pelo CEP. Para mudar, informe outro CEP.");
  } else {
    campoBairro.disabled = false;
    campoBairro.value = "";
    mostrarDicaBairro(situacao === "manual"
      ? "Não deu para confirmar o bairro pelo CEP. Escolha o seu bairro."
      : "");
  }

  atualizarTotais();
}

async function preencherPeloCep() {
  const digitos = campoCep.value.replace(/\D/g, "");

  // CEP incompleto: o resultado anterior deixa de valer
  if (digitos.length !== 8) {
    consultaCep++;
    aplicarResultadoDoCep("pendente", DICA_CEP_PADRAO);
    return;
  }

  const minhaConsulta = ++consultaCep;
  situacaoCep = "pendente";
  dicaCep.textContent = "Conferindo o CEP...";
  campoBairro.disabled = true; // enquanto confere

  try {
    const endereco = await consultarCep(digitos);
    if (minhaConsulta !== consultaCep) return; // o cliente já mudou o CEP

    if (!endereco) {
      aplicarResultadoDoCep("bloqueado", "Não encontramos esse CEP. Confira o número ou fale com a loja pelo WhatsApp.");
      return;
    }

    if (normalizarTexto(endereco.cidade) !== "joanopolis") {
      aplicarResultadoDoCep("bloqueado",
        `Esse CEP é de ${endereco.cidade}${endereco.uf ? `/${endereco.uf}` : ""}. Entregamos somente em Joanópolis.`);
      return;
    }

    if (endereco.rua) campoRua.value = endereco.rua;

    if (!endereco.bairro) {
      aplicarResultadoDoCep("manual", "CEP encontrado, mas sem o nome do bairro. Informe a rua e escolha o bairro.");
      return;
    }

    const bairro = bairros.find((b) => normalizarTexto(b.nome) === normalizarTexto(endereco.bairro));

    if (!bairro) {
      aplicarResultadoDoCep("bloqueado",
        `Ainda não entregamos no bairro ${endereco.bairro}. Fale com a loja pelo WhatsApp.`);
      return;
    }

    aplicarResultadoDoCep("confirmado",
      endereco.rua ? "Endereço encontrado. Confira e informe o número." : "CEP encontrado. Informe a rua e o número.",
      bairro);
  } catch (erro) {
    if (minhaConsulta !== consultaCep) return;
    aplicarResultadoDoCep("manual", "Não foi possível conferir o CEP agora. Informe a rua e escolha o bairro.");
  }
}

/* ---------- Envio ---------- */
async function enviar(evento) {
  evento.preventDefault();

  if (situacaoCep === "bloqueado") {
    alert(dicaCep.textContent);
    return;
  }

  if (situacaoCep === "pendente") {
    alert("Informe o CEP completo e aguarde a conferência do endereço.");
    return;
  }

  const bairro = bairroEscolhido();
  if (!bairro) {
    alert("Escolha o seu bairro.");
    return;
  }

  botaoConfirmar.disabled = true;
  botaoConfirmar.textContent = "Enviando...";

  const dados = new FormData(formulario);
  const forma = dados.get("pagamento");

  // O front envia só o id e a quantidade dos itens, o id do bairro e o nome do cupom;
  // os preços, a taxa e o desconto são calculados pelo back-end, que também confere o bairro pelo CEP
  const pedido = {
    cliente: {
      nome: dados.get("nome").trim(),
      telefone: dados.get("telefone")
    },
    endereco: {
      cep: dados.get("cep").replace(/\D/g, ""),
      rua: dados.get("rua").trim(),
      numero: dados.get("numero").trim(),
      complemento: dados.get("complemento").trim(),
      referencia: dados.get("referencia").trim()
    },
    bairroId: bairro.id,
    cupom: cupom ? cupom.codigo : null,
    pagamento: {
      forma,
      troco: forma === "dinheiro" ? dados.get("troco").trim() : ""
    },
    observacoes: dados.get("observacoes").trim(),
    itens: carrinho.map((item) => ({ produtoId: item.id, quantidade: item.quantidade }))
  };

  try {
    const resposta = await enviarPedido(pedido);

    const subtotal = calcularTotal(carrinho);
    const descontoEstimado = cupom ? calcularDesconto(subtotal, cupom.percentual) : 0;

    sessionStorage.setItem("ultimoPedido", JSON.stringify({
      numero: resposta.numero,
      nome: pedido.cliente.nome,
      total: resposta.total ?? subtotal - descontoEstimado + bairro.taxa,
      pagamento: forma,
      telefone: pedido.cliente.telefone,
      previsao: resposta.previsaoEntrega
    }));

    salvarCarrinho([]);
    salvarCupomAplicado(null);
    window.location.href = "pedido-confirmado.html";
  } catch (erro) {
    alert(erro instanceof TypeError
      ? "Não foi possível conectar ao servidor. Tente novamente."
      : erro.message);
    botaoConfirmar.disabled = false;
    botaoConfirmar.textContent = "Confirmar pedido";
  }
}

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

  await revalidarCupom();
  mostrarResumo();

  try {
    await carregarBairros();
  } catch (erro) {
    bloquearPedido("Não foi possível carregar os bairros de entrega. Tente novamente em instantes.");
  }

  campoTelefone.addEventListener("input", () => {
    campoTelefone.value = formatarTelefone(campoTelefone.value);
  });

  campoCep.addEventListener("input", () => {
    campoCep.value = formatarCep(campoCep.value);
    preencherPeloCep();
  });

  formulario.addEventListener("change", (evento) => {
    campoTroco.hidden = formulario.pagamento.value !== "dinheiro";
    if (evento.target === campoBairro) atualizarTotais();
  });

  formulario.addEventListener("submit", enviar);

  // Se o navegador já preencheu o CEP sozinho, confere logo
  if (campoCep.value) {
    campoCep.value = formatarCep(campoCep.value);
    preencherPeloCep();
  }
}

iniciar();