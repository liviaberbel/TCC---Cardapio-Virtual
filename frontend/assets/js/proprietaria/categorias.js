const corpoTabela = document.getElementById("tabela-categorias");
const semCategorias = document.getElementById("sem-categorias");
const avisoCategorias = document.getElementById("aviso-categorias");
const erroCategorias = document.getElementById("erro-categorias");
const formCategoria = document.getElementById("form-categoria");
const campoNome = document.getElementById("nome-categoria");
let temporizadorAviso;

function mostrarAviso(texto) {
  erroCategorias.hidden = true;
  avisoCategorias.textContent = texto;
  avisoCategorias.hidden = false;

  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => {
    avisoCategorias.hidden = true;
  }, 3000);
}

function mostrarErro(texto) {
  avisoCategorias.hidden = true;
  erroCategorias.textContent = texto;
  erroCategorias.hidden = false;
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

function criarLinha(categoria) {
  const linha = document.createElement("tr");
  const celulaNome = document.createElement("td");
  const celulaTotal = document.createElement("td");
  const celulaAcoes = document.createElement("td");
  const acoes = document.createElement("div");
  acoes.className = "acoes-linha";

  celulaTotal.textContent = categoria.totalProdutos;

  const botaoEditar = criarBotaoIcone("bi-pencil", "Renomear categoria");
  const botaoExcluir = criarBotaoIcone("bi-trash3", "Excluir categoria");

  // Categoria com produtos não pode ser excluída
  if (categoria.totalProdutos > 0) {
    botaoExcluir.disabled = true;
    botaoExcluir.title = "Mude os produtos para outra categoria antes de excluir";
  }

  function mostrarNome() {
    celulaNome.textContent = categoria.nome;
  }

  function editarNome() {
    const campo = document.createElement("input");
    campo.type = "text";
    campo.maxLength = 40;
    campo.value = categoria.nome;
    campo.className = "campo-texto-inline";
    campo.setAttribute("aria-label", "Novo nome da categoria");

    const salvar = criarBotaoIcone("bi-check-lg", "Salvar nome");
    const cancelar = criarBotaoIcone("bi-x-lg", "Cancelar");

    const bloco = document.createElement("div");
    bloco.className = "edicao-inline";
    bloco.append(campo, salvar, cancelar);

    celulaNome.replaceChildren(bloco);
    campo.focus();
    campo.select();

    async function confirmar() {
      const novoNome = campo.value.trim();

      if (!novoNome || novoNome === categoria.nome) {
        mostrarNome();
        return;
      }

      try {
        await renomearCategoria(categoria.id, novoNome);
        categoria.nome = novoNome;
        mostrarNome();
        mostrarAviso("Categoria renomeada.");
      } catch (erro) {
        mostrarErro(erro.message);
      }
    }

    salvar.addEventListener("click", confirmar);
    cancelar.addEventListener("click", mostrarNome);
    campo.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter") confirmar();
      if (evento.key === "Escape") mostrarNome();
    });
  }

  botaoEditar.addEventListener("click", editarNome);

  botaoExcluir.addEventListener("click", async () => {
    if (!confirm(`Excluir a categoria "${categoria.nome}"?`)) return;

    try {
      await excluirCategoria(categoria.id);
      linha.remove();
      semCategorias.hidden = corpoTabela.children.length > 0;
      mostrarAviso(`Categoria "${categoria.nome}" excluída.`);
    } catch (erro) {
      mostrarErro(erro.message);
    }
  });

  mostrarNome();
  acoes.append(botaoEditar, botaoExcluir);
  celulaAcoes.appendChild(acoes);
  linha.append(celulaNome, celulaTotal, celulaAcoes);

  return linha;
}

async function carregarCategorias() {
  try {
    const categorias = await listarCategorias();

    corpoTabela.innerHTML = "";
    semCategorias.hidden = categorias.length > 0;
    categorias.forEach((categoria) => corpoTabela.appendChild(criarLinha(categoria)));
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

formCategoria.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const nome = campoNome.value.trim();
  if (!nome) return;

  try {
    await criarCategoria(nome);
    campoNome.value = "";
    await carregarCategorias();
    mostrarAviso(`Categoria "${nome}" criada.`);
  } catch (erro) {
    mostrarErro(erro.message);
  }
});

carregarCategorias();