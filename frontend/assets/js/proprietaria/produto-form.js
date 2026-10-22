const parametros = new URLSearchParams(window.location.search);
const idEdicao = parametros.has("id") ? Number.parseInt(parametros.get("id"), 10) : null;

const formulario = document.getElementById("form-produto");
const campos = formulario.elements;
const campoFoto = document.getElementById("foto");
const areaPreview = document.getElementById("foto-preview");
const botaoSalvar = document.getElementById("btn-salvar");
const caixaErro = document.getElementById("erro-form");
const botaoAjustarAtual = document.getElementById("btn-ajustar-atual");
const botaoCancelarFoto = document.getElementById("btn-cancelar-foto");

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB
let validadeOriginal = ""; // validade que o produto já tinha (na edição)
let fotoAtual = null; // endereço da foto que o produto já tem (na edição)

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
  img.alt = "Foto do produto";
  areaPreview.appendChild(img);
}

/* ---------- Foto ---------- */
// Volta a mostrar a foto que o produto já tinha (ou o espaço vazio) e fecha o editor
function restaurarPreview() {
  fecharEditorFoto();
  areaPreview.hidden = false;
  mostrarPreview(fotoAtual);
  botaoAjustarAtual.hidden = !fotoAtual;
  campoFoto.value = "";
}

async function abrirEditor(origem, mensagemDeErro) {
  caixaErro.hidden = true;

  try {
    await abrirEditorFoto(origem);
    areaPreview.hidden = true;
    botaoAjustarAtual.hidden = true;
  } catch (erro) {
    mostrarErro(mensagemDeErro);
    campoFoto.value = "";
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

  abrirEditor(URL.createObjectURL(arquivo), "Não foi possível abrir essa imagem. Tente outra foto.");
});

botaoAjustarAtual.addEventListener("click", () => {
  abrirEditor(fotoAtual, "Não foi possível ajustar a foto atual. Escolha a foto novamente para ajustá-la.");
});

botaoCancelarFoto.addEventListener("click", restaurarPreview);

/* ---------- Categorias ---------- */
async function carregarCategorias() {
  try {
    const categorias = await listarCategorias();

    categorias.forEach((categoria) => {
      const opcao = document.createElement("option");
      opcao.value = categoria.id;
      opcao.textContent = categoria.nome;
      campos.categoria.appendChild(opcao);
    });

    if (categorias.length === 0) {
      mostrarErro("Ainda não há categorias. Crie uma na tela de Categorias antes de cadastrar produtos.");
    }
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

// Usa o id da categoria quando existir; senão, procura pelo nome
function selecionarCategoria(produto) {
  if (produto.categoriaId) {
    campos.categoria.value = produto.categoriaId;
    return;
  }

  const opcao = [...campos.categoria.options].find(
    (o) => normalizarTexto(o.textContent) === normalizarTexto(produto.categoria || "")
  );
  if (opcao) campos.categoria.value = opcao.value;
}

/* ---------- Edição ---------- */
async function prepararEdicao() {
  document.getElementById("titulo-pagina").textContent = "Editar produto";
  document.title = "Gordelicias da Lari | Editar produto";

  try {
    const produto = await buscarProduto(idEdicao);

    campos.nome.value = produto.nome;
    selecionarCategoria(produto);
    campos.descricao.value = produto.descricao || "";
    campos.preco.value = produto.preco;
    campos.quantidade.value = produto.quantidade;
    campos.pesoGramas.value = produto.pesoGramas ?? "";

    validadeOriginal = (produto.validade || "").slice(0, 10);
    campos.validade.value = validadeOriginal;

    if (produto.imagem) {
      fotoAtual = produto.imagem;
      mostrarPreview(fotoAtual);
      botaoAjustarAtual.hidden = false;
    }
  } catch (erro) {
    mostrarErro(erro.message);
    formulario.hidden = true;
  }
}

/* ---------- Salvar ---------- */
formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  caixaErro.hidden = true;

  const textoPeso = campos.pesoGramas.value.trim();

  const dados = {
    nome: campos.nome.value.trim(),
    categoriaId: Number.parseInt(campos.categoria.value, 10),
    descricao: campos.descricao.value.trim(),
    preco: Number.parseFloat(campos.preco.value),
    quantidade: Number.parseInt(campos.quantidade.value, 10),
    pesoGramas: textoPeso ? Number.parseInt(textoPeso, 10) : null,
    validade: campos.validade.value || null
  };

  if (!dados.nome || Number.isNaN(dados.categoriaId)) {
    mostrarErro("Preencha o nome e escolha a categoria do produto.");
    return;
  }

  if (dados.pesoGramas !== null && (Number.isNaN(dados.pesoGramas) || dados.pesoGramas < 1 || dados.pesoGramas > 5000)) {
    mostrarErro("O peso deve ser um número de 1 a 5000 gramas.");
    return;
  }

  // Data no passado só é aceita se for a mesma que o produto já tinha
  if (dados.validade && dados.validade < hojeISO() && dados.validade !== validadeOriginal) {
    mostrarErro("A validade não pode ser uma data que já passou.");
    return;
  }

  botaoSalvar.disabled = true;
  botaoSalvar.textContent = "Salvando...";

  try {
    // Se o editor está aberto, a foto enviada é a recortada; senão, a foto atual é mantida
    const foto = editorFotoAtivo() ? await exportarFotoEditada() : null;

    await salvarProduto(dados, foto, idEdicao);
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

// As categorias precisam carregar antes de preencher o formulário de edição
carregarCategorias().then(() => {
  if (idEdicao !== null) prepararEdicao();
});