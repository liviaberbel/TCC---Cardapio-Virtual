const listaItens = document.getElementById("lista-itens");
let estoque = {}; // id do produto -> quantidade disponível

function alterarQuantidade(id, variacao) {
  const carrinho = lerCarrinho();
  const item = carrinho.find((i) => i.id === id);
  if (!item) return;

  // Não deixa aumentar além do estoque
  if (variacao > 0 && item.quantidade >= (estoque[id] ?? Infinity)) return;

  item.quantidade += variacao;

  // Se a quantidade chegar a zero, o item sai do carrinho
  const atualizado = item.quantidade <= 0
    ? carrinho.filter((i) => i.id !== id)
    : carrinho;

  salvarCarrinho(atualizado);
  mostrarCarrinho();
}

function removerItem(id) {
  salvarCarrinho(lerCarrinho().filter((i) => i.id !== id));
  mostrarCarrinho();
}

function criarItem(item) {
  const elemento = document.createElement("article");
  elemento.className = "item-carrinho";
  elemento.innerHTML = `
    <div class="item-carrinho__imagem"></div>
    <div class="item-carrinho__info">
      <h3 class="item-carrinho__nome"></h3>
      <span class="item-carrinho__preco"></span>
    </div>
    <div class="quantidade">
      <button type="button" class="quantidade__botao" data-acao="diminuir" aria-label="Diminuir quantidade">
        <i class="bi bi-dash-lg"></i>
      </button>
      <span class="quantidade__valor"></span>
      <button type="button" class="quantidade__botao" data-acao="aumentar" aria-label="Aumentar quantidade">
        <i class="bi bi-plus-lg"></i>
      </button>
    </div>
    <span class="item-carrinho__subtotal"></span>
    <button type="button" class="item-carrinho__remover" aria-label="Remover item">
      <i class="bi bi-trash3"></i>
    </button>`;

  elemento.querySelector(".item-carrinho__nome").textContent = item.nome;
  elemento.querySelector(".item-carrinho__preco").textContent = formatarPreco(item.preco);
  elemento.querySelector(".quantidade__valor").textContent = item.quantidade;
  elemento.querySelector(".item-carrinho__subtotal").textContent =
    formatarPreco(item.preco * item.quantidade);

  elemento.querySelector('[data-acao="diminuir"]')
    .addEventListener("click", () => alterarQuantidade(item.id, -1));
  elemento.querySelector('[data-acao="aumentar"]')
    .addEventListener("click", () => alterarQuantidade(item.id, 1));
  elemento.querySelector(".item-carrinho__remover")
    .addEventListener("click", () => removerItem(item.id));

  // Desabilita o "+" quando já chegou no limite do estoque
  elemento.querySelector('[data-acao="aumentar"]').disabled =
    item.quantidade >= (estoque[item.id] ?? Infinity);

  if (item.imagem) {
    const img = document.createElement("img");
    img.className = "item-carrinho__imagem";
    img.src = item.imagem;
    img.alt = item.nome;
    elemento.querySelector("div.item-carrinho__imagem").replaceWith(img);
  }

  return elemento;
}

function mostrarCarrinho() {
  const carrinho = lerCarrinho();
  const vazio = carrinho.length === 0;

  document.getElementById("carrinho-vazio").hidden = !vazio;
  document.getElementById("carrinho-conteudo").hidden = vazio;

  listaItens.innerHTML = "";
  carrinho.forEach((item) => listaItens.appendChild(criarItem(item)));

  document.getElementById("resumo-quantidade").textContent = calcularQuantidade(carrinho);
  document.getElementById("resumo-total").textContent = formatarPreco(calcularTotal(carrinho));
}

function mostrarAvisos(avisos) {
  const caixa = document.getElementById("avisos-carrinho");
  if (!caixa) return;

  caixa.innerHTML = "";
  avisos.forEach((texto) => {
    const paragrafo = document.createElement("p");
    paragrafo.textContent = texto;
    caixa.appendChild(paragrafo);
  });

  caixa.hidden = avisos.length === 0;
}

function bloquearFinalizacao(mensagem) {
  const botao = document.getElementById("btn-finalizar");
  const aviso = document.getElementById("aviso-loja");

  if (botao) {
    botao.removeAttribute("href");
    botao.setAttribute("aria-disabled", "true");
    botao.classList.add("botao--desativado");
  }

  if (aviso) {
    aviso.textContent = mensagem;
    aviso.hidden = false;
  }
}

document.getElementById("btn-limpar")?.addEventListener("click", () => {
  if (confirm("Deseja esvaziar o carrinho?")) {
    salvarCarrinho([]);
    mostrarCarrinho();
  }
});

async function iniciar() {
  try {
    const produtos = await listarProdutos();
    produtos.forEach((produto) => {
      estoque[produto.id] = produto.quantidade;
    });
    mostrarAvisos(ajustarCarrinhoAoEstoque(produtos));
  } catch (erro) {
    // Se não der para conferir o estoque, segue com o que está no carrinho
  }

  try {
    const situacao = situacaoDaLoja(await buscarFuncionamento());
    if (!situacao.aberta) bloquearFinalizacao(situacao.mensagem);
  } catch (erro) {
    // Se não der para conferir, o pedido ainda é conferido na hora do envio
  }

  mostrarCarrinho();
}

iniciar();