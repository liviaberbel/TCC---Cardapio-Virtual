// Todas as páginas internas carregam este arquivo: quem não entrou volta para o login
exigirLogin();

const itensMenu = [
  { id: "painel", texto: "Painel", icone: "bi-grid", link: "painel.html" },
  { id: "produtos", texto: "Produtos", icone: "bi-box-seam", link: "produtos.html" },
  { id: "categorias", texto: "Categorias", icone: "bi-tags", link: "categorias.html" },
  { id: "frase", texto: "Frase inicial", icone: "bi-chat-quote", link: "frase.html" },
  { id: "pedidos", texto: "Pedidos", icone: "bi-receipt", link: "pedidos.html" }
];

function montarMenu() {
  const menu = document.getElementById("menu-lateral");
  const paginaAtual = document.body.dataset.pagina;

  const links = itensMenu.map((item) => `
    <a href="${item.link}" class="menu-lateral__link ${item.id === paginaAtual ? "menu-lateral__link--ativo" : ""}">
      <i class="bi ${item.icone}"></i><span>${item.texto}</span>
    </a>`).join("");

  menu.innerHTML = `
    <a href="painel.html" class="menu-lateral__logo">
      <img src="../assets/img/logo/logo.png" alt="Gordelicias da Lari">
    </a>
    <nav class="menu-lateral__links">${links}</nav>
    <div class="menu-lateral__rodape">
      <a href="../cliente/index.html" target="_blank" rel="noopener" class="menu-lateral__link">
        <i class="bi bi-shop"></i><span>Ver cardápio</span>
      </a>
      <button type="button" id="btn-sair" class="menu-lateral__link">
        <i class="bi bi-box-arrow-left"></i><span>Sair</span>
      </button>
    </div>`;

  document.getElementById("btn-sair").addEventListener("click", sair);
}

montarMenu();