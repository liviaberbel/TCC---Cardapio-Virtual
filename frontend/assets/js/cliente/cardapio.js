// Quando restarem essa quantidade ou menos, o card mostra "Restam N".
// Use 0 para nunca mostrar, ou 999 para mostrar sempre.
const LIMITE_AVISO = 5;

let lojaAberta = false; // atualizado a partir do funcionamento de hoje
let todosProdutos = [];

/* ---------- Carrinho (guardado no navegador) ---------- */
function atualizarContador() {
  const contador = document.getElementById("carrinho-contador");
  if (!contador) return;

  const total = calcularQuantidade(lerCarrinho());
  contador.textContent = total;
  contador.hidden = total === 0;
}

function quantidadeNoCarrinho(id) {
  const item = lerCarrinho().find((i) => i.id === id);
  return item ? item.quantidade : 0;
}

function adicionarAoCarrinho(produto) {
  // Não deixa passar do que existe em estoque
  if (quantidadeNoCarrinho(produto.id) >= produto.quantidade) return;

  const carrinho = lerCarrinho();
  const existente = carrinho.find((item) => item.id === produto.id);

  if (existente) {
    existente.quantidade++;
  } else {
    carrinho.push({
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      imagem: produto.imagem,
      quantidade: 1
    });
  }

  salvarCarrinho(carrinho);
  atualizarContador();
}

/* ---------- Cards ---------- */
function atualizarBotao(botao, produto) {
  const esgotado = produto.quantidade <= 0;
  const noLimite = !esgotado && quantidadeNoCarrinho(produto.id) >= produto.quantidade;

  botao.disabled = esgotado || noLimite || !lojaAberta;
  botao.textContent = esgotado
    ? "Indisponível"
    : !lojaAberta
      ? "Loja fechada"
      : noLimite
        ? "Máximo no carrinho"
        : "Adicionar";
}

function criarCard(produto) {
  const esgotado = produto.quantidade <= 0;

  const card = document.createElement("article");
  card.className = "card-produto" + (esgotado ? " card-produto--esgotado" : "");
  card.innerHTML = `
    <div class="card-produto__imagem"></div>
    <div class="card-produto__corpo">
      <h3 class="card-produto__nome"></h3>
      <p class="card-produto__descricao"></p>
      <p class="card-produto__peso"></p>
      <div class="card-produto__rodape">
        <span class="card-produto__preco"></span>
        <span class="selo"></span>
      </div>
      <button class="botao" type="button"></button>
    </div>`;

  card.querySelector(".card-produto__nome").textContent = produto.nome;
  card.querySelector(".card-produto__descricao").textContent = produto.descricao;
  card.querySelector(".card-produto__preco").textContent = formatarPreco(produto.preco);

  const peso = card.querySelector(".card-produto__peso");
  if (produto.pesoGramas) {
    peso.textContent = `≈ ${produto.pesoGramas} g`;
  } else {
    peso.remove();
  }

  const selo = card.querySelector(".selo");
  if (esgotado) {
    selo.textContent = "Esgotado";
  } else if (produto.quantidade <= LIMITE_AVISO) {
    selo.textContent = `Restam ${produto.quantidade}`;
  } else {
    selo.textContent = "Disponível";
  }
  selo.classList.add(esgotado ? "selo--esgotado" : "selo--disponivel");

  const botao = card.querySelector(".botao");
  atualizarBotao(botao, produto);
  botao.addEventListener("click", () => {
    adicionarAoCarrinho(produto);
    atualizarBotao(botao, produto);
  });

  if (produto.imagem) {
    const img = document.createElement("img");
    img.className = "card-produto__imagem";
    img.src = produto.imagem;
    img.alt = produto.nome;
    card.querySelector("div.card-produto__imagem").replaceWith(img);
  }

  return card;
}

/* ---------- Categorias ---------- */
function criarId(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function agruparPorCategoria(produtos) {
  const grupos = new Map();
  produtos.forEach((produto) => {
    if (!grupos.has(produto.categoria)) grupos.set(produto.categoria, []);
    grupos.get(produto.categoria).push(produto);
  });
  return grupos;
}

function mostrarCardapio(produtos) {
  const cardapio = document.getElementById("cardapio");
  const menu = document.getElementById("menu-categorias");
  cardapio.innerHTML = "";
  menu.innerHTML = "";

  agruparPorCategoria(produtos).forEach((itens, categoria) => {
    const id = criarId(categoria);

    const chip = document.createElement("a");
    chip.className = "chip-categoria";
    chip.href = `#${id}`;
    chip.textContent = categoria;
    menu.appendChild(chip);

    const secao = document.createElement("section");
    secao.className = "categoria";
    secao.id = id;

    const titulo = document.createElement("h2");
    titulo.className = "categoria__titulo";
    titulo.textContent = categoria;

    const grade = document.createElement("div");
    grade.className = "grade-produtos";
    itens.forEach((produto) => grade.appendChild(criarCard(produto)));

    secao.append(titulo, grade);
    cardapio.appendChild(secao);
  });
}

/* ---------- Busca ---------- */
function aplicarBusca() {
  const termo = document.getElementById("busca").value;
  const encontrados = todosProdutos.filter((produto) => produtoCombinaComBusca(produto, termo));

  mostrarCardapio(encontrados);

  if (encontrados.length === 0 && termo.trim()) {
    const aviso = document.createElement("p");
    aviso.className = "sem-resultados";
    aviso.textContent = `Nenhum doce encontrado para "${termo.trim()}".`;
    document.getElementById("cardapio").appendChild(aviso);
  }
}

/* ---------- Funcionamento e WhatsApp ---------- */
// Devolve true quando a situação da loja (aberta ou fechada) mudou
async function atualizarFuncionamento() {
  let funcionamento = null;

  try {
    funcionamento = await buscarFuncionamento();
  } catch (erro) {
    // sem conseguir consultar, a loja é tratada como fechada
  }

  const situacao = situacaoDaLoja(funcionamento);
  const partes = [situacao.mensagem];

  if (["aberta", "antes"].includes(situacao.estado)) {
    partes.push(`Entrega em ${funcionamento.entregaMin} a ${funcionamento.entregaMax} minutos`);
  }

  const texto = document.getElementById("texto-horario");
  if (texto) texto.textContent = partes.join(" · ");

  document.getElementById("ponto-horario")
    ?.classList.toggle("aviso-horario__ponto--fechado", !situacao.aberta);

  const mudou = situacao.aberta !== lojaAberta;
  lojaAberta = situacao.aberta;
  return mudou;
}

function configurarWhatsapp() {
  const botao = document.getElementById("btn-whatsapp");
  if (!botao) return;

  const mensagem = encodeURIComponent("Olá! Vim pelo cardápio virtual da Gordelicias da Lari.");
  botao.href = `https://wa.me/${CONFIG.loja.whatsapp}?text=${mensagem}`;
}

/* ---------- Frase inicial ---------- */
async function mostrarFraseInicial() {
  const titulo = document.getElementById("titulo-boas-vindas");
  const subtitulo = document.getElementById("subtitulo-boas-vindas");

  try {
    const frase = escolherFrase(await buscarFrase());
    titulo.textContent = frase.titulo;
    subtitulo.textContent = frase.subtitulo;
    subtitulo.hidden = !frase.subtitulo;
  } catch (erro) {
    // se algo falhar, continua o texto que já está na página
  }

  document.getElementById("boas-vindas")?.classList.remove("boas-vindas--oculto");
}

/* ---------- Início e atualização automática ---------- */
async function atualizarCardapio() {
  const mudouLoja = await atualizarFuncionamento();
  const produtos = await listarProdutos();
  const mudaramProdutos = dadosMudaram("produtos", produtos);

  if (mudaramProdutos) todosProdutos = produtos;
  if (mudaramProdutos || mudouLoja) aplicarBusca();
}

async function iniciar() {
  try {
    await atualizarFuncionamento();
  } catch (erro) {
    // Mesmo sem o horário, o cardápio precisa aparecer
  }

  try {
    todosProdutos = await listarProdutos();
    dadosMudaram("produtos", todosProdutos); // ponto de partida para as próximas conferências
    mostrarCardapio(todosProdutos);
  } catch (erro) {
    document.getElementById("cardapio").textContent =
      "Não foi possível carregar o cardápio. Tente novamente em instantes.";
  }

  // Atualiza sozinho: estoque, produtos e horário de funcionamento
  atualizarPeriodicamente(atualizarCardapio, 15);
}

configurarWhatsapp();
atualizarContador();
document.getElementById("busca")?.addEventListener("input", aplicarBusca);
mostrarFraseInicial();
iniciar();