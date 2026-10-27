const corpoTabela = document.getElementById("tabela-bairros");
const semBairros = document.getElementById("sem-bairros");
const avisoBairros = document.getElementById("aviso-bairros");
const erroBairros = document.getElementById("erro-bairros");
const formBairro = document.getElementById("form-bairro");
const campoNome = document.getElementById("nome-bairro");
const campoTaxa = document.getElementById("taxa-bairro");
let temporizadorAviso;
let bairros = [];

function mostrarAviso(texto) {
  erroBairros.hidden = true;
  avisoBairros.textContent = texto;
  avisoBairros.hidden = false;

  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => {
    avisoBairros.hidden = true;
  }, 3000);
}

function mostrarErro(texto) {
  avisoBairros.hidden = true;
  erroBairros.textContent = texto;
  erroBairros.hidden = false;
}

function criarBotaoIcone(icone, rotulo) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "botao-icone";
  botao.setAttribute("aria-label", rotulo);
  botao.title = rotulo;
  botao.innerHTML = `<i class="bi ${icone}"></i>`;
  return botao;
}

function textoDaTaxa(taxa) {
  return taxa > 0 ? formatarPreco(taxa) : "Grátis";
}

function criarLinha(bairro) {
  const linha = document.createElement("tr");
  const celulaNome = document.createElement("td");
  const celulaTaxa = document.createElement("td");
  const celulaAcoes = document.createElement("td");
  const acoes = document.createElement("div");
  acoes.className = "acoes-linha";

  const botaoEditar = criarBotaoIcone("bi-pencil", "Editar bairro");
  const botaoExcluir = criarBotaoIcone("bi-trash3", "Excluir bairro");

  function mostrarValores() {
    celulaNome.textContent = bairro.nome;
    celulaTaxa.textContent = textoDaTaxa(bairro.taxa);
    acoes.replaceChildren(botaoEditar, botaoExcluir);
  }

  function editar() {
    const campoNomeEdicao = document.createElement("input");
    campoNomeEdicao.type = "text";
    campoNomeEdicao.maxLength = 60;
    campoNomeEdicao.value = bairro.nome;
    campoNomeEdicao.className = "campo-texto-inline";
    campoNomeEdicao.setAttribute("aria-label", "Nome do bairro");

    const campoTaxaEdicao = document.createElement("input");
    campoTaxaEdicao.type = "number";
    campoTaxaEdicao.min = "0";
    campoTaxaEdicao.step = "0.01";
    campoTaxaEdicao.value = bairro.taxa;
    campoTaxaEdicao.className = "campo-texto-inline campo-taxa-inline";
    campoTaxaEdicao.setAttribute("aria-label", "Taxa de entrega em reais");

    const salvar = criarBotaoIcone("bi-check-lg", "Salvar");
    const cancelar = criarBotaoIcone("bi-x-lg", "Cancelar");

    celulaNome.replaceChildren(campoNomeEdicao);
    celulaTaxa.replaceChildren(campoTaxaEdicao);
    acoes.replaceChildren(salvar, cancelar);
    campoNomeEdicao.focus();

    async function confirmar() {
      try {
        await atualizarBairro(
          bairro.id,
          campoNomeEdicao.value,
          Number.parseFloat(campoTaxaEdicao.value)
        );
        await carregarBairros();
        mostrarAviso("Bairro atualizado.");
      } catch (erro) {
        mostrarErro(erro.message);
      }
    }

    function aoApertarTecla(evento) {
      if (evento.key === "Enter") confirmar();
      if (evento.key === "Escape") mostrarValores();
    }

    salvar.addEventListener("click", confirmar);
    cancelar.addEventListener("click", mostrarValores);
    campoNomeEdicao.addEventListener("keydown", aoApertarTecla);
    campoTaxaEdicao.addEventListener("keydown", aoApertarTecla);
  }

  botaoEditar.addEventListener("click", editar);

  botaoExcluir.addEventListener("click", async () => {
    if (!confirm(`Excluir o bairro "${bairro.nome}"? Os clientes não poderão mais pedir entrega para ele.`)) return;

    try {
      await excluirBairro(bairro.id);
      await carregarBairros();
      mostrarAviso(`Bairro "${bairro.nome}" excluído.`);
    } catch (erro) {
      mostrarErro(erro.message);
    }
  });

  mostrarValores();
  celulaAcoes.appendChild(acoes);
  linha.append(celulaNome, celulaTaxa, celulaAcoes);

  return linha;
}

function desenharTabela() {
  corpoTabela.innerHTML = "";
  semBairros.hidden = bairros.length > 0;

  [...bairros]
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .forEach((bairro) => corpoTabela.appendChild(criarLinha(bairro)));
}

async function carregarBairros() {
  try {
    bairros = await listarBairros();
    desenharTabela();
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

formBairro.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const nome = campoNome.value.trim();

  try {
    await criarBairro(nome, Number.parseFloat(campoTaxa.value));
    formBairro.reset();
    campoNome.focus();
    await carregarBairros();
    mostrarAviso(`Bairro "${nome}" cadastrado.`);
  } catch (erro) {
    mostrarErro(erro.message);
  }
});

carregarBairros();