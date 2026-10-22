const corpoTabela = document.getElementById("tabela-produtos");
const semProdutos = document.getElementById("sem-produtos");
const avisoProdutos = document.getElementById("aviso-produtos");
const erroProdutos = document.getElementById("erro-produtos");
let temporizadorAviso;

function mostrarAviso(texto) {
  erroProdutos.hidden = true;
  avisoProdutos.textContent = texto;
  avisoProdutos.hidden = false;

  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => {
    avisoProdutos.hidden = true;
  }, 3000);
}

function mostrarErro(texto) {
  avisoProdutos.hidden = true;
  erroProdutos.textContent = texto;
  erroProdutos.hidden = false;
}

function atualizarSelo(selo, quantidade) {
  const esgotado = quantidade <= 0;
  selo.textContent = esgotado ? "Esgotado" : "Disponível";
  selo.classList.toggle("selo--esgotado", esgotado);
  selo.classList.toggle("selo--disponivel", !esgotado);
}

function criarLinha(produto) {
  const linha = document.createElement("tr");
  linha.innerHTML = `
    <td><div class="miniatura"></div></td>
    <td>
      <strong class="produto-nome"></strong>
      <span class="produto-categoria"></span>
      <span class="produto-validade"></span>
    </td>
    <td class="produto-preco"></td>
    <td>
      <input type="number" class="campo-quantidade" min="0" step="1" aria-label="Quantidade disponível">
    </td>
    <td><span class="selo"></span></td>
    <td>
      <div class="acoes-linha">
        <a class="botao-icone" data-acao="editar" aria-label="Editar produto"><i class="bi bi-pencil"></i></a>
        <button type="button" class="botao-icone" data-acao="excluir" aria-label="Excluir produto"><i class="bi bi-trash3"></i></button>
      </div>
    </td>`;

  linha.querySelector(".produto-nome").textContent = produto.nome;
  linha.querySelector(".produto-categoria").textContent =
    produto.categoria + (produto.pesoGramas ? ` · ${produto.pesoGramas} g` : "");
  linha.querySelector(".produto-preco").textContent = formatarPreco(produto.preco);
  linha.querySelector('[data-acao="editar"]').href = `produto-form.html?id=${produto.id}`;

  const situacaoValidade = situacaoDaValidade(produto.validade);
  const campoValidade = linha.querySelector(".produto-validade");
  if (situacaoValidade) {
    campoValidade.textContent = situacaoValidade.texto;
    campoValidade.classList.add(`produto-validade--${situacaoValidade.estado}`);
  } else {
    campoValidade.remove();
  }

  const campo = linha.querySelector(".campo-quantidade");
  const selo = linha.querySelector(".selo");
  campo.value = produto.quantidade;
  atualizarSelo(selo, produto.quantidade);

  if (produto.imagem) {
    const img = document.createElement("img");
    img.className = "miniatura";
    img.src = produto.imagem;
    img.alt = produto.nome;
    linha.querySelector("div.miniatura").replaceWith(img);
  }

  // Salva sozinho quando a proprietária muda o número e sai do campo (ou aperta Enter)
  campo.addEventListener("change", async () => {
    const quantidade = Number.parseInt(campo.value, 10);

    if (Number.isNaN(quantidade) || quantidade < 0) {
      campo.value = produto.quantidade;
      mostrarErro("Informe uma quantidade válida (zero ou mais).");
      return;
    }

    try {
      await atualizarQuantidade(produto.id, quantidade);
      produto.quantidade = quantidade;
      campo.value = quantidade;
      atualizarSelo(selo, quantidade);
      mostrarAviso(`Quantidade de "${produto.nome}" atualizada.`);
    } catch (erro) {
      campo.value = produto.quantidade;
      mostrarErro(erro.message);
    }
  });

  linha.querySelector('[data-acao="excluir"]').addEventListener("click", async () => {
    if (!confirm(`Excluir "${produto.nome}"? Essa ação não pode ser desfeita.`)) return;

    try {
      await excluirProduto(produto.id);
      todosProdutos = todosProdutos.filter((p) => p.id !== produto.id);
      aplicarBusca();
      mostrarAviso(`"${produto.nome}" foi excluído.`);
    } catch (erro) {
      mostrarErro(erro.message);
    }
  });

  return linha;
}

let todosProdutos = [];
const campoBusca = document.getElementById("busca-produtos");

function mostrarTabela(produtos, termo = "") {
  corpoTabela.innerHTML = "";

  semProdutos.textContent = termo.trim()
    ? "Nenhum produto encontrado para essa busca."
    : "Nenhum produto cadastrado ainda.";
  semProdutos.hidden = produtos.length > 0;

  produtos.forEach((produto) => corpoTabela.appendChild(criarLinha(produto)));
}

function aplicarBusca() {
  const termo = campoBusca.value;
  const encontrados = todosProdutos.filter((produto) => produtoCombinaComBusca(produto, termo));
  mostrarTabela(encontrados, termo);
}

async function carregarProdutos() {
  try {
    todosProdutos = await listarProdutos();
    aplicarBusca();
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

campoBusca.addEventListener("input", aplicarBusca);
carregarProdutos();