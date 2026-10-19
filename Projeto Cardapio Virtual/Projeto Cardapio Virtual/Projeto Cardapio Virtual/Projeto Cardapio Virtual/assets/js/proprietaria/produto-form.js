const parametros = new URLSearchParams(window.location.search);
const idEdicao = parametros.has("id") ? Number.parseInt(parametros.get("id"), 10) : null;

const formulario = document.getElementById("form-produto");
const campos = formulario.elements;
const campoFoto = document.getElementById("foto");
const areaPreview = document.getElementById("foto-preview");
const botaoSalvar = document.getElementById("btn-salvar");
const caixaErro = document.getElementById("erro-form");

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB
let fotoEscolhida = null;

function mostrarErro(texto) {
  caixaErro.textContent = texto;
  caixaErro.hidden = false;
}

function mostrarPreview(origem) {
  areaPreview.innerHTML = "";

  if (!origem) {
    areaPreview.innerHTML = `<i class="bi bi-image"></i><span>Nenhuma foto selecionada</span>`;
    return;
  }

  const img = document.createElement("img");
  img.src = origem;
  img.alt = "Pré-visualização da foto do produto";
  areaPreview.appendChild(img);
}

async function carregarCategorias() {
  try {
    const produtos = await listarProdutos();
    const categorias = [...new Set(produtos.map((produto) => produto.categoria))];
    const lista = document.getElementById("lista-categorias");

    categorias.forEach((categoria) => {
      const opcao = document.createElement("option");
      opcao.value = categoria;
      lista.appendChild(opcao);
    });
  } catch (erro) {
    // Sem as sugestões, a proprietária ainda pode digitar a categoria
  }
}

async function prepararEdicao() {
  document.getElementById("titulo-pagina").textContent = "Editar produto";
  document.title = "Gordelicias da Lari | Editar produto";

  try {
    const produto = await buscarProduto(idEdicao);

    campos.nome.value = produto.nome;
    campos.categoria.value = produto.categoria;
    campos.descricao.value = produto.descricao || "";
    campos.preco.value = produto.preco;
    campos.quantidade.value = produto.quantidade;

    if (produto.imagem) mostrarPreview(produto.imagem);
  } catch (erro) {
    mostrarErro(erro.message);
    formulario.hidden = true;
  }
}

campoFoto.addEventListener("change", () => {
  caixaErro.hidden = true;
  const arquivo = campoFoto.files[0];
  if (!arquivo) return;

  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    mostrarErro("Escolha uma imagem JPG, PNG ou WebP.");
    campoFoto.value = "";
    return;
  }

  if (arquivo.size > TAMANHO_MAXIMO) {
    mostrarErro("A foto é muito grande. O limite é 5 MB.");
    campoFoto.value = "";
    return;
  }

  fotoEscolhida = arquivo;
  mostrarPreview(URL.createObjectURL(arquivo));
});

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  caixaErro.hidden = true;

  const dados = {
    nome: campos.nome.value.trim(),
    categoria: campos.categoria.value.trim(),
    descricao: campos.descricao.value.trim(),
    preco: Number.parseFloat(campos.preco.value),
    quantidade: Number.parseInt(campos.quantidade.value, 10)
  };

  if (!dados.nome || !dados.categoria) {
    mostrarErro("Preencha o nome e a categoria do produto.");
    return;
  }

  botaoSalvar.disabled = true;
  botaoSalvar.textContent = "Salvando...";

  try {
    await salvarProduto(dados, fotoEscolhida, idEdicao);
    window.location.href = "produtos.html";
  } catch (erro) {
    mostrarErro(erro instanceof TypeError
      ? "Não foi possível conectar ao servidor. Tente novamente."
      : erro.message);
    botaoSalvar.disabled = false;
    botaoSalvar.textContent = "Salvar produto";
  }
});

/* ---------- Início ---------- */
mostrarPreview(null);
carregarCategorias();

if (idEdicao !== null) {
  prepararEdicao();
}