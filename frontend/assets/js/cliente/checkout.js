const formulario = document.getElementById("form-pedido");
const botaoConfirmar = document.getElementById("btn-confirmar");
const campoTroco = document.getElementById("campo-troco");
const campoTelefone = document.getElementById("telefone");
const campoBairro = document.getElementById("bairro");
const campoCep = document.getElementById("cep");
const campoRua = document.getElementById("rua");
const dicaCep = document.getElementById("dica-cep");
const avisoBairros = document.getElementById("aviso-bairros");
const carrinho = lerCarrinho();

const DICA_CEP_PADRAO = "Digite o CEP para completar a rua automaticamente.";
let bairros = [];
let cepForaDaCidade = false;
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

  document.getElementById("resumo-subtotal").textContent = formatarPreco(subtotal);
  document.getElementById("resumo-taxa").textContent = bairro ? textoDaTaxa(bairro.taxa) : "Escolha o bairro";
  document.getElementById("resumo-total").textContent = formatarPreco(subtotal + (bairro ? bairro.taxa : 0));
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

/* ---------- CEP ---------- */
// Se o bairro devolvido pelo CEP for igual a um bairro cadastrado, já deixa ele escolhido
function selecionarBairroPeloNome(nome) {
  if (!nome) return;

  const bairro = bairros.find((b) => normalizarTexto(b.nome) === normalizarTexto(nome));
  if (bairro) {
    campoBairro.value = bairro.id;
    atualizarTotais();
  }
}

async function preencherPeloCep() {
  const digitos = campoCep.value.replace(/\D/g, "");

  if (digitos.length !== 8) {
    dicaCep.textContent = DICA_CEP_PADRAO;
    return;
  }

  const minhaConsulta = ++consultaCep;
  dicaCep.textContent = "Buscando o endereço...";

  try {
    const endereco = await consultarCep(digitos);
    if (minhaConsulta !== consultaCep) return; // o cliente já mudou o CEP

    if (!endereco) {
      dicaCep.textContent = "Não encontramos esse CEP. Preencha o endereço manualmente.";
      return;
    }

    if (normalizarTexto(endereco.cidade) !== "joanopolis") {
      cepForaDaCidade = true;
      dicaCep.textContent =
        `Esse CEP é de ${endereco.cidade}${endereco.uf ? `/${endereco.uf}` : ""}. Entregamos somente em Joanópolis.`;
      return;
    }

    if (endereco.rua) campoRua.value = endereco.rua;
    selecionarBairroPeloNome(endereco.bairro);

    dicaCep.textContent = endereco.rua
      ? "Endereço encontrado. Confira e informe o número."
      : "CEP encontrado, mas sem o nome da rua. Informe a rua e o número.";
  } catch (erro) {
    if (minhaConsulta !== consultaCep) return;
    dicaCep.textContent = "Não foi possível consultar o CEP agora. Preencha o endereço manualmente.";
  }
}

/* ---------- Envio ---------- */
async function enviar(evento) {
  evento.preventDefault();

  if (cepForaDaCidade) {
    alert("Entregamos somente em Joanópolis. Confira o CEP informado.");
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

  // O front envia só o id e a quantidade dos itens e o id do bairro;
  // os preços e a taxa são calculados pelo back-end
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
      total: resposta.total ?? calcularTotal(carrinho) + bairro.taxa,
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
    cepForaDaCidade = false;
    preencherPeloCep();
  });

  formulario.addEventListener("change", (evento) => {
    campoTroco.hidden = formulario.pagamento.value !== "dinheiro";
    if (evento.target === campoBairro) atualizarTotais();
  });

  formulario.addEventListener("submit", enviar);
}

iniciar();