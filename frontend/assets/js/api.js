async function enviarPedido(pedido) {
  // Simulação enquanto o back-end não está pronto
  if (!CONFIG.usarBackend) {
    const funcionamento = await buscarFuncionamento();
    if (!situacaoDaLoja(funcionamento).aberta) {
      throw new Error("A loja não está recebendo pedidos neste momento.");
    }

    // A entrega só vale para os bairros cadastrados (Joanópolis)
    const bairro = lerBairrosSimulados().find((b) => b.id === pedido.bairroId);
    if (!bairro) {
      throw new Error("Escolha um bairro da lista para a entrega.");
    }

    const lista = lerProdutosSimulados();

    // Confere se ainda há estoque para tudo
    pedido.itens.forEach((item) => {
      const produto = lista.find((p) => p.id === item.produtoId);
      if (!produto || produto.quantidade < item.quantidade) {
        const nome = produto ? `"${produto.nome}"` : "Um dos produtos";
        throw new Error(`${nome} não tem estoque suficiente. Volte ao carrinho e ajuste a quantidade.`);
      }
    });

    // Monta o registro do pedido, com os preços vindos da lista de produtos
    const itens = pedido.itens.map((item) => {
      const produto = lista.find((p) => p.id === item.produtoId);
      return { produtoId: item.produtoId, nome: produto.nome, preco: produto.preco, quantidade: item.quantidade };
    });

    const arredondar = (valor) => Math.round(valor * 100) / 100;
    const subtotal = arredondar(itens.reduce((soma, item) => soma + item.preco * item.quantidade, 0));
    const taxaEntrega = bairro.taxa;
    const total = arredondar(subtotal + taxaEntrega);

    const pedidos = lerPedidosSimulados();
    const numero = pedidos.length ? Math.max(...pedidos.map((p) => p.numero)) + 1 : 1001;

    pedidos.push({
      numero,
      status: "recebido",
      data: new Date().toISOString(),
      cliente: pedido.cliente,
      endereco: { ...pedido.endereco, bairro: bairro.nome },
      pagamento: pedido.pagamento,
      observacoes: pedido.observacoes,
      itens,
      subtotal,
      taxaEntrega,
      total
    });
    salvarPedidosSimulados(pedidos);

    // Desconta do estoque
    pedido.itens.forEach((item) => {
      lista.find((p) => p.id === item.produtoId).quantidade -= item.quantidade;
    });
    salvarProdutosSimulados(lista);

    return {
      numero,
      previsaoEntrega: `${funcionamento.entregaMin} a ${funcionamento.entregaMax} minutos`,
      taxaEntrega,
      total
    };
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/pedidos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pedido)
  });

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.message || "Não foi possível enviar o pedido.");
  }

  return resposta.json();
}

async function entrarProprietaria(email, senha) {
  // Simulação enquanto o back-end não está pronto: aceita qualquer e-mail e senha preenchidos
  if (!CONFIG.usarBackend) {
    return { token: "token-de-exemplo" };
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha })
  });

  if (!resposta.ok) {
    throw new Error("E-mail ou senha incorretos.");
  }

  return resposta.json();
}

async function buscarResumoPainel() {
  // Na simulação, os números são calculados a partir dos produtos e pedidos guardados no navegador
  if (!CONFIG.usarBackend) {
    const produtos = lerProdutosSimulados();
    const pedidos = lerPedidosSimulados();
    const hoje = new Date().toDateString();

    return {
      pedidosHoje: pedidos.filter((p) => new Date(p.data).toDateString() === hoje && p.status !== "cancelado").length,
      produtosDisponiveis: produtos.filter((p) => p.quantidade > 0).length,
      produtosEsgotados: produtos.filter((p) => p.quantidade <= 0).length,
      ultimosPedidos: pedidos.slice(-5).reverse().map((p) => ({
        numero: p.numero,
        cliente: p.cliente.nome,
        pagamento: p.pagamento.forma,
        total: p.total,
        horario: new Date(p.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      }))
    };
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/painel`, {
    headers: { Authorization: `Bearer ${tokenProprietaria()}` }
  });

  if (!resposta.ok) {
    throw new Error("Não foi possível carregar o painel.");
  }

  return resposta.json();
}

/* ---------- Produtos ---------- */

// Produtos de exemplo (nomes e preços só para teste).
const produtosIniciais = [
  { id: 1, categoria: "Torta cookie", nome: "Torta cookie Nutella", descricao: "Massa de cookie com recheio cremoso de Nutella.", preco: 20.0, status: "disponivel", imagem: "../assets/img/produtos/torta-cookie-nutella.jpeg" },
  { id: 2, categoria: "Torta cookie", nome: "Torta cookie Kinder Bueno", descricao: "Massa de cookie com recheio de Kinder Bueno.", preco: 20.0, status: "disponivel", imagem: "../assets/img/produtos/torta-cookie-kinder.jpeg" },
  { id: 3, categoria: "Cascão trufado", nome: "Cascão trufado de brigadeiro", descricao: "Casquinha crocante com trufa de brigadeiro.", preco: 9.0, status: "disponivel", imagem: null },
  { id: 4, categoria: "Tortas geladas", nome: "Torta gelada de limão", descricao: "Base crocante com mousse de limão.", preco: 40.0, status: "disponivel", imagem: null },
  { id: 5, categoria: "Brownies", nome: "Brownie tradicional", descricao: "Brownie macio de chocolate.", preco: 8.0, status: "disponivel", imagem: null },
  { id: 6, categoria: "Fondue", nome: "Fondue de chocolate", descricao: "Chocolate quente para mergulhar frutas.", preco: 35.0, status: "disponivel", imagem: null },
  { id: 7, categoria: "Copos da felicidade", nome: "Copo da felicidade de morango", descricao: "Camadas de creme, morango e chocolate.", preco: 14.0, status: "disponivel", imagem: null }
];

const CHAVE_PRODUTOS = "produtosSimulados";

// "Banco de dados" de mentira, guardado no navegador, usado só enquanto não há back-end
function lerProdutosSimulados() {
  try {
    const salvos = JSON.parse(localStorage.getItem(CHAVE_PRODUTOS));
    if (Array.isArray(salvos)) return salvos;
  } catch {
    // se der erro, usa a lista inicial
  }
  return structuredClone(produtosIniciais);
}

function salvarProdutosSimulados(lista) {
  localStorage.setItem(CHAVE_PRODUTOS, JSON.stringify(lista));
}

function cabecalhosProprietaria() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenProprietaria()}`
  };
}

async function listarProdutos() {
  if (!CONFIG.usarBackend) {
    return lerProdutosSimulados();
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/produtos`);
  if (!resposta.ok) {
    throw new Error("Não foi possível carregar os produtos.");
  }
  return resposta.json();
}

async function atualizarQuantidade(id, quantidade) {
  if (!CONFIG.usarBackend) {
    const lista = lerProdutosSimulados();
    const produto = lista.find((p) => p.id === id);
    if (produto) produto.quantidade = quantidade;
    salvarProdutosSimulados(lista);
    return produto;
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/produtos/${id}/quantidade`, {
    method: "PATCH",
    headers: cabecalhosProprietaria(),
    body: JSON.stringify({ quantidade })
  });
  if (!resposta.ok) {
    throw new Error("Não foi possível atualizar a quantidade.");
  }
  return resposta.json();
}

async function excluirProduto(id) {
  if (!CONFIG.usarBackend) {
    salvarProdutosSimulados(lerProdutosSimulados().filter((p) => p.id !== id));
    return;
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/produtos/${id}`, {
    method: "DELETE",
    headers: cabecalhosProprietaria()
  });
  if (!resposta.ok) {
    throw new Error("Não foi possível excluir o produto.");
  }
}

/* ---------- Pedidos (simulação) ---------- */
const CHAVE_PEDIDOS = "pedidosSimulados";

function lerPedidosSimulados() {
  try {
    const salvos = JSON.parse(localStorage.getItem(CHAVE_PEDIDOS));
    if (Array.isArray(salvos)) {
      return salvos.map((pedido) => ({ status: "recebido", ...pedido }));
    }
  } catch {
    // se der erro, começa com a lista vazia
  }
  return [];
}

function salvarPedidosSimulados(lista) {
  localStorage.setItem(CHAVE_PEDIDOS, JSON.stringify(lista));
}

async function buscarProduto(id) {
  if (!CONFIG.usarBackend) {
    const produto = lerProdutosSimulados().find((p) => p.id === id);
    if (!produto) throw new Error("Produto não encontrado.");
    return produto;
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/produtos/${id}`);
  if (!resposta.ok) {
    throw new Error("Produto não encontrado.");
  }
  return resposta.json();
}

// dados: { nome, categoria, descricao, preco, quantidade }
// foto: arquivo escolhido (ou null, para manter a foto atual)
// id: preenchido só quando for edição
async function salvarProduto(dados, foto, id = null) {
  if (!CONFIG.usarBackend) {

        // O formulário envia o id da categoria; na simulação, o produto guarda o nome dela
          const categoria = lerCategoriasSimuladas().find((c) => c.id === dados.categoriaId);
          if (!categoria) throw new Error("Escolha uma categoria.");
          const { categoriaId, ...resto } = dados;
          dados = { ...resto, categoria: categoria.nome };
          const lista = lerProdutosSimulados();
          const imagem = foto ? await reduzirImagem(foto) : undefined;

    if (id) {
      const produto = lista.find((p) => p.id === id);
      if (!produto) throw new Error("Produto não encontrado.");

      Object.assign(produto, dados);
      if (imagem !== undefined) produto.imagem = imagem;

      salvarProdutosSimulados(lista);
      return produto;
    }

    const novoId = lista.length ? Math.max(...lista.map((p) => p.id)) + 1 : 1;
    const novo = { id: novoId, ...dados, imagem: imagem ?? null };
    lista.push(novo);

    salvarProdutosSimulados(lista);
    return novo;
  }



  // Com arquivo, o envio é feito como formulário (FormData), e não como JSON
  const formulario = new FormData();
  Object.entries(dados).forEach(([chave, valor]) => formulario.append(chave, valor ?? ""));
  if (foto) formulario.append("foto", foto);
  if (id) formulario.append("_method", "PUT"); // o Laravel só lê arquivos em PUT por esse caminho

  const resposta = await fetch(id ? `${CONFIG.apiUrl}/produtos/${id}` : `${CONFIG.apiUrl}/produtos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenProprietaria()}` },
    body: formulario
  });

  if (!resposta.ok) {
    throw new Error("Não foi possível salvar o produto.");
  }
  return resposta.json();
}

async function listarPedidos() {
  // Na simulação, devolve os pedidos guardados no navegador, do mais recente para o mais antigo
  if (!CONFIG.usarBackend) {
    return lerPedidosSimulados().slice().reverse();
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/pedidos`, {
    headers: { Authorization: `Bearer ${tokenProprietaria()}` }
  });

  if (!resposta.ok) {
    throw new Error("Não foi possível carregar os pedidos.");
  }

  return resposta.json();
}

// Usado pela proprietária: avança o pedido para a próxima etapa ou cancela
async function atualizarStatusPedido(numero, status) {
  if (!CONFIG.usarBackend) {
    const pedidos = lerPedidosSimulados();
    const pedido = pedidos.find((p) => p.numero === numero);
    if (!pedido) throw new Error("Pedido não encontrado.");

    const atual = STATUS_PEDIDO[pedido.status];
    const permitido = atual && atual.proximo && (status === atual.proximo || status === "cancelado");
    if (!permitido) throw new Error("Esse pedido não pode mais mudar para esse status.");

    // Cancelar devolve os produtos ao estoque
    if (status === "cancelado") {
      const produtos = lerProdutosSimulados();
      pedido.itens.forEach((item) => {
        const produto = produtos.find((p) => p.id === item.produtoId || p.nome === item.nome);
        if (produto) produto.quantidade += item.quantidade;
      });
      salvarProdutosSimulados(produtos);
    }

    pedido.status = status;
    salvarPedidosSimulados(pedidos);
    return pedido;
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/pedidos/${numero}/status`, {
    method: "PATCH",
    headers: cabecalhosProprietaria(),
    body: JSON.stringify({ status })
  });

  if (!resposta.ok) {
    throw new Error("Não foi possível atualizar o status do pedido.");
  }
  return resposta.json();
}

// Usado pelo cliente: só devolve os dados se o número e o telefone baterem
async function consultarPedido(numero, telefone) {
  const soDigitos = (texto) => String(texto).replace(/\D/g, "");

  if (!CONFIG.usarBackend) {
    const pedido = lerPedidosSimulados().find(
      (p) => p.numero === numero && soDigitos(p.cliente.telefone) === soDigitos(telefone)
    );
    if (!pedido) throw new Error("Não encontramos um pedido com esse número e telefone.");

    // O cliente só vê o que precisa: nada de endereço ou dados de outras pessoas
    return {
      numero: pedido.numero,
      data: pedido.data,
      status: pedido.status,
      total: pedido.total,
      taxaEntrega: pedido.taxaEntrega,
      itens: pedido.itens
    };
  }

  // POST (e não GET), para o telefone não ficar no endereço da página
  const resposta = await fetch(`${CONFIG.apiUrl}/pedidos/consulta`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ numero, telefone })
  });

  if (resposta.status === 404) {
    throw new Error("Não encontramos um pedido com esse número e telefone.");
  }
  if (!resposta.ok) {
    throw new Error("Não foi possível consultar o pedido.");
  }
  return resposta.json();
}

/* ---------- Funcionamento do dia ---------- */
const CHAVE_FUNCIONAMENTO = "funcionamentoSimulado";

async function buscarFuncionamento() {
  if (!CONFIG.usarBackend) {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_FUNCIONAMENTO));
    } catch {
      return null;
    }
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/funcionamento`);
  if (!resposta.ok) {
    throw new Error("Não foi possível carregar o horário de funcionamento.");
  }
  return resposta.json();
}

// dados: { aberta, abertura, fechamento, entregaMin, entregaMax }
async function salvarFuncionamento(dados) {
  if (!CONFIG.usarBackend) {
    const registro = { ...dados, data: hojeISO() };
    localStorage.setItem(CHAVE_FUNCIONAMENTO, JSON.stringify(registro));
    return registro;
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/funcionamento`, {
    method: "PUT",
    headers: cabecalhosProprietaria(),
    body: JSON.stringify(dados)
  });
  if (!resposta.ok) {
    throw new Error("Não foi possível salvar o funcionamento.");
  }
  return resposta.json();
}

/* ---------- Categorias ---------- */
const CHAVE_CATEGORIAS = "categoriasSimuladas";

function proximoId(lista) {
  return lista.length ? Math.max(...lista.map((item) => item.id)) + 1 : 1;
}

function salvarCategoriasSimuladas(lista) {
  localStorage.setItem(CHAVE_CATEGORIAS, JSON.stringify(lista));
}

// Na simulação, a lista é completada com as categorias dos produtos que já existem
function lerCategoriasSimuladas() {
  let categorias = [];

  try {
    const salvas = JSON.parse(localStorage.getItem(CHAVE_CATEGORIAS));
    if (Array.isArray(salvas)) categorias = salvas;
  } catch {
    // começa com a lista vazia
  }

  let mudou = false;
  lerProdutosSimulados().forEach((produto) => {
    const existe = categorias.some(
      (c) => normalizarTexto(c.nome) === normalizarTexto(produto.categoria)
    );
    if (!existe) {
      categorias.push({ id: proximoId(categorias), nome: produto.categoria });
      mudou = true;
    }
  });

  if (mudou) salvarCategoriasSimuladas(categorias);
  return categorias;
}

function contarProdutosDaCategoria(nome) {
  return lerProdutosSimulados().filter(
    (produto) => normalizarTexto(produto.categoria) === normalizarTexto(nome)
  ).length;
}

async function mensagemDeErro(resposta, padrao) {
  const corpo = await resposta.json().catch(() => ({}));
  return corpo.message || padrao;
}

async function listarCategorias() {
  if (!CONFIG.usarBackend) {
    return lerCategoriasSimuladas().map((categoria) => ({
      ...categoria,
      totalProdutos: contarProdutosDaCategoria(categoria.nome)
    }));
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/categorias`, { headers: cabecalhosProprietaria() });
  if (!resposta.ok) {
    throw new Error(await mensagemDeErro(resposta, "Não foi possível carregar as categorias."));
  }
  return resposta.json();
}

async function criarCategoria(nome) {
  if (!CONFIG.usarBackend) {
    const categorias = lerCategoriasSimuladas();
    const nomeLimpo = nome.trim();

    if (!nomeLimpo || nomeLimpo.length > 40) {
      throw new Error("O nome deve ter de 1 a 40 caracteres.");
    }
    if (categorias.some((c) => normalizarTexto(c.nome) === normalizarTexto(nomeLimpo))) {
      throw new Error("Já existe uma categoria com esse nome.");
    }

    const nova = { id: proximoId(categorias), nome: nomeLimpo };
    categorias.push(nova);
    salvarCategoriasSimuladas(categorias);
    return { ...nova, totalProdutos: 0 };
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/categorias`, {
    method: "POST",
    headers: cabecalhosProprietaria(),
    body: JSON.stringify({ nome })
  });
  if (!resposta.ok) {
    throw new Error(await mensagemDeErro(resposta, "Não foi possível criar a categoria."));
  }
  return resposta.json();
}

async function renomearCategoria(id, nome) {
  if (!CONFIG.usarBackend) {
    const categorias = lerCategoriasSimuladas();
    const categoria = categorias.find((c) => c.id === id);
    if (!categoria) throw new Error("Categoria não encontrada.");

    const nomeLimpo = nome.trim();
    if (!nomeLimpo || nomeLimpo.length > 40) {
      throw new Error("O nome deve ter de 1 a 40 caracteres.");
    }
    if (categorias.some((c) => c.id !== id && normalizarTexto(c.nome) === normalizarTexto(nomeLimpo))) {
      throw new Error("Já existe uma categoria com esse nome.");
    }

    // Na simulação o produto guarda o nome da categoria, então os produtos também são atualizados
    const nomeAntigo = categoria.nome;
    const produtos = lerProdutosSimulados();
    produtos.forEach((produto) => {
      if (normalizarTexto(produto.categoria) === normalizarTexto(nomeAntigo)) {
        produto.categoria = nomeLimpo;
      }
    });

    categoria.nome = nomeLimpo;
    salvarCategoriasSimuladas(categorias);
    salvarProdutosSimulados(produtos);
    return { ...categoria, totalProdutos: contarProdutosDaCategoria(nomeLimpo) };
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/categorias/${id}`, {
    method: "PUT",
    headers: cabecalhosProprietaria(),
    body: JSON.stringify({ nome })
  });
  if (!resposta.ok) {
    throw new Error(await mensagemDeErro(resposta, "Não foi possível renomear a categoria."));
  }
  return resposta.json();
}

async function excluirCategoria(id) {
  if (!CONFIG.usarBackend) {
    const categorias = lerCategoriasSimuladas();
    const categoria = categorias.find((c) => c.id === id);
    if (!categoria) throw new Error("Categoria não encontrada.");

    const total = contarProdutosDaCategoria(categoria.nome);
    if (total > 0) {
      throw new Error(`Esta categoria tem ${total} produto(s). Mude esses produtos de categoria antes de excluir.`);
    }

    salvarCategoriasSimuladas(categorias.filter((c) => c.id !== id));
    return;
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/categorias/${id}`, {
    method: "DELETE",
    headers: cabecalhosProprietaria()
  });
  if (!resposta.ok) {
    throw new Error(await mensagemDeErro(resposta, "Não foi possível excluir a categoria."));
  }
}

/* ---------- Frase inicial do cardápio ---------- */
const CHAVE_FRASE = "fraseSimulada";

async function buscarFrase() {
  if (!CONFIG.usarBackend) {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_FRASE));
    } catch {
      return null;
    }
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/frase-inicial`);
  if (!resposta.ok) {
    throw new Error("Não foi possível carregar a frase inicial.");
  }
  return resposta.json();
}

// dados: { modo, titulo, subtitulo, ate }
async function salvarFrase(dados) {
  if (!CONFIG.usarBackend) {
    localStorage.setItem(CHAVE_FRASE, JSON.stringify(dados));
    return dados;
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/frase-inicial`, {
    method: "PUT",
    headers: cabecalhosProprietaria(),
    body: JSON.stringify(dados)
  });
  if (!resposta.ok) {
    throw new Error(await mensagemDeErro(resposta, "Não foi possível salvar a frase inicial."));
  }
  return resposta.json();
}

/* ---------- Bairros e taxa de entrega ---------- */
const CHAVE_BAIRROS = "bairrosSimulados";

// Bairro de exemplo, só para a simulação. A proprietária pode editar ou excluir.
const bairrosIniciais = [{ id: 1, nome: "Centro", taxa: 5.0 }];

function lerBairrosSimulados() {
  try {
    const salvos = JSON.parse(localStorage.getItem(CHAVE_BAIRROS));
    if (Array.isArray(salvos)) return salvos;
  } catch {
    // se der erro, usa a lista inicial
  }
  return structuredClone(bairrosIniciais);
}

function salvarBairrosSimulados(lista) {
  localStorage.setItem(CHAVE_BAIRROS, JSON.stringify(lista));
}

// Confere nome e taxa e devolve o nome já sem espaços sobrando
function validarBairro(nome, taxa) {
  const nomeLimpo = String(nome).trim();

  if (!nomeLimpo || nomeLimpo.length > 60) {
    throw new Error("O nome do bairro deve ter de 1 a 60 caracteres.");
  }
  if (typeof taxa !== "number" || Number.isNaN(taxa) || taxa < 0 || taxa > 999) {
    throw new Error("Informe uma taxa válida (zero ou mais).");
  }
  return nomeLimpo;
}

async function listarBairros() {
  if (!CONFIG.usarBackend) {
    return lerBairrosSimulados();
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/bairros`);
  if (!resposta.ok) {
    throw new Error("Não foi possível carregar os bairros.");
  }
  return resposta.json();
}

async function criarBairro(nome, taxa) {
  if (!CONFIG.usarBackend) {
    const bairros = lerBairrosSimulados();
    const nomeLimpo = validarBairro(nome, taxa);

    if (bairros.some((b) => normalizarTexto(b.nome) === normalizarTexto(nomeLimpo))) {
      throw new Error("Já existe um bairro com esse nome.");
    }

    const novo = { id: proximoId(bairros), nome: nomeLimpo, taxa };
    bairros.push(novo);
    salvarBairrosSimulados(bairros);
    return novo;
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/bairros`, {
    method: "POST",
    headers: cabecalhosProprietaria(),
    body: JSON.stringify({ nome, taxa })
  });
  if (!resposta.ok) {
    throw new Error(await mensagemDeErro(resposta, "Não foi possível cadastrar o bairro."));
  }
  return resposta.json();
}

async function atualizarBairro(id, nome, taxa) {
  if (!CONFIG.usarBackend) {
    const bairros = lerBairrosSimulados();
    const bairro = bairros.find((b) => b.id === id);
    if (!bairro) throw new Error("Bairro não encontrado.");

    const nomeLimpo = validarBairro(nome, taxa);
    if (bairros.some((b) => b.id !== id && normalizarTexto(b.nome) === normalizarTexto(nomeLimpo))) {
      throw new Error("Já existe um bairro com esse nome.");
    }

    bairro.nome = nomeLimpo;
    bairro.taxa = taxa;
    salvarBairrosSimulados(bairros);
    return bairro;
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/bairros/${id}`, {
    method: "PUT",
    headers: cabecalhosProprietaria(),
    body: JSON.stringify({ nome, taxa })
  });
  if (!resposta.ok) {
    throw new Error(await mensagemDeErro(resposta, "Não foi possível atualizar o bairro."));
  }
  return resposta.json();
}

async function excluirBairro(id) {
  if (!CONFIG.usarBackend) {
    salvarBairrosSimulados(lerBairrosSimulados().filter((b) => b.id !== id));
    return;
  }

  const resposta = await fetch(`${CONFIG.apiUrl}/bairros/${id}`, {
    method: "DELETE",
    headers: cabecalhosProprietaria()
  });
  if (!resposta.ok) {
    throw new Error(await mensagemDeErro(resposta, "Não foi possível excluir o bairro."));
  }
}

/* ---------- Consulta de CEP (serviços públicos e gratuitos) ---------- */
// Devolve { rua, bairro, cidade, uf }, ou null se o CEP não existir.
// Lança erro se nenhum dos serviços responder. Serve tanto na simulação quanto com o back-end.
async function consultarCep(cep) {
  const digitos = String(cep).replace(/\D/g, "");
  if (digitos.length !== 8) throw new Error("CEP inválido.");

  // 1) ViaCEP
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
    if (resposta.ok) {
      const dados = await resposta.json();
      if (dados.erro) return null;

      return {
        rua: dados.logradouro || "",
        bairro: dados.bairro || "",
        cidade: dados.localidade || "",
        uf: dados.uf || ""
      };
    }
  } catch (erro) {
    // tenta o serviço reserva
  }

  // 2) BrasilAPI (reserva)
  const resposta = await fetch(`https://brasilapi.com.br/api/cep/v1/${digitos}`);
  if (resposta.status === 404) return null;
  if (!resposta.ok) throw new Error("Não foi possível consultar o CEP.");

  const dados = await resposta.json();
  return {
    rua: dados.street || "",
    bairro: dados.neighborhood || "",
    cidade: dados.city || "",
    uf: dados.state || ""
  };
}