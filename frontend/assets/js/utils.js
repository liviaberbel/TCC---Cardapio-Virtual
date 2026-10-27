const formatarPreco = (valor) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function lerCarrinho() {
  try {
    return JSON.parse(localStorage.getItem("carrinho")) || [];
  } catch {
    return [];
  }
}

function salvarCarrinho(carrinho) {
  localStorage.setItem("carrinho", JSON.stringify(carrinho));
}

function calcularQuantidade(carrinho) {
  return carrinho.reduce((soma, item) => soma + item.quantidade, 0);
}

function calcularTotal(carrinho) {
  return carrinho.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
}

// Ajusta o carrinho ao estoque atual e devolve a lista de avisos para o cliente
function ajustarCarrinhoAoEstoque(produtos) {
  const avisos = [];
  const ajustado = [];

  lerCarrinho().forEach((item) => {
    const produto = produtos.find((p) => p.id === item.id);
    const disponivel = produto ? produto.quantidade : 0;

    if (disponivel <= 0) {
      avisos.push(`"${item.nome}" não está mais disponível e saiu do carrinho.`);
    } else if (item.quantidade > disponivel) {
      avisos.push(`"${item.nome}": só restam ${disponivel}, então a quantidade foi ajustada.`);
      ajustado.push({ ...item, quantidade: disponivel });
    } else {
      ajustado.push(item);
    }
  });

  salvarCarrinho(ajustado);
  return avisos;
}

// Reduz a imagem (largura máxima de 800 px) e devolve um texto que o <img> consegue exibir.
// Usado só na simulação, para não lotar o armazenamento do navegador.
function reduzirImagem(arquivo, larguraMaxima = 800) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Não foi possível ler a imagem."));

    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("O arquivo escolhido não é uma imagem válida."));

      img.onload = () => {
        const escala = Math.min(1, larguraMaxima / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);

        const contexto = canvas.getContext("2d");
        contexto.fillStyle = "#ffffff"; // fundo branco para imagens PNG com transparência
        contexto.fillRect(0, 0, canvas.width, canvas.height);
        contexto.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };

      img.src = leitor.result;
    };

    leitor.readAsDataURL(arquivo);
  });
}

// Deixa o texto em minúsculas e sem acentos, para comparar buscas
function normalizarTexto(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Diz se o produto combina com o que foi digitado na busca
function produtoCombinaComBusca(produto, termo) {
  const busca = normalizarTexto(termo);
  if (!busca) return true;

  const texto = normalizarTexto(`${produto.nome} ${produto.descricao || ""} ${produto.categoria}`);
  return busca.split(/\s+/).every((palavra) => texto.includes(palavra));
}

const STATUS_PEDIDO = {
  recebido:  { texto: "Recebido", proximo: "preparo" },
  preparo:   { texto: "Em preparo", proximo: "entrega" },
  entrega:   { texto: "Saiu para entrega", proximo: "entregue" },
  entregue:  { texto: "Entregue", proximo: null },
  cancelado: { texto: "Cancelado", proximo: null }
};

function criarSeloStatus(status) {
  const selo = document.createElement("span");
  selo.className = `selo selo--${status}`;
  selo.textContent = (STATUS_PEDIDO[status] || { texto: status }).texto;
  return selo;
}

function formatarDataHora(dataIso) {
  return new Date(dataIso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatarTelefone(valor) {
  const n = valor.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

// Data de hoje no formato AAAA-MM-DD, pelo relógio do aparelho
function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function minutosDoDia(horario) {
  const [horas, minutos] = horario.split(":").map(Number);
  return horas * 60 + minutos;
}

// Diz se a loja está recebendo pedidos agora.
// funcionamento: { data, aberta, abertura, fechamento, entregaMin, entregaMax } ou null
function situacaoDaLoja(funcionamento) {
  if (!funcionamento || funcionamento.data !== hojeISO()) {
    return { aberta: false, estado: "nao-definido", mensagem: "Os pedidos de hoje ainda não foram liberados." };
  }

  if (!funcionamento.aberta) {
    return { aberta: false, estado: "fechada", mensagem: "Hoje a loja não vai funcionar." };
  }

  const agora = new Date();
  const minutos = agora.getHours() * 60 + agora.getMinutes();

  if (minutos < minutosDoDia(funcionamento.abertura)) {
    return { aberta: false, estado: "antes", mensagem: `Ainda não abrimos. Pedidos a partir das ${funcionamento.abertura}.` };
  }

  if (minutos >= minutosDoDia(funcionamento.fechamento)) {
    return { aberta: false, estado: "depois", mensagem: `Pedidos encerrados por hoje (fechamos às ${funcionamento.fechamento}).` };
  }

  return { aberta: true, estado: "aberta", mensagem: `Aberto agora · pedidos até as ${funcionamento.fechamento}` };
}

function formatarDataCurta(dataIso) {
  const [ano, mes, dia] = dataIso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

// validade: "AAAA-MM-DD" ou vazio. Devolve { estado, texto } ou null (sem validade)
function situacaoDaValidade(validade) {
  if (!validade) return null;

  const data = validade.slice(0, 10);
  const hoje = hojeISO();

  if (data < hoje) return { estado: "vencido", texto: `Vencido em ${formatarDataCurta(data)}` };
  if (data === hoje) return { estado: "hoje", texto: "Vence hoje" };
  return { estado: "ok", texto: `Válido até ${formatarDataCurta(data)}` };
}

/* ---------- Frase inicial do cardápio ---------- */
function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

// Frases prontas. Para incluir uma nova, copie uma linha e mude os textos.
function frasesAleatorias() {
  const s = saudacao();

  return [
    { titulo: `${s}, docinho!`, subtitulo: "Escolha seus doces favoritos e faça seu pedido pelo site." },
    { titulo: "O que vai adoçar o seu dia?", subtitulo: "Dê uma olhada no cardápio e escolha com calma." },
    { titulo: "Bateu aquela vontade de doce?", subtitulo: "Aqui tem de tudo um pouco, feito de forma artesanal." },
    { titulo: `${s}! Que tal um docinho?`, subtitulo: "O cardápio de hoje está logo aqui embaixo." },
    { titulo: "Seu momento doce começa aqui.", subtitulo: "Escolha, peça e receba em casa." },
    { titulo: "Hoje tem doce, sim!", subtitulo: "Confira as delícias artesanais do cardápio." },
    { titulo: "Doce é sempre uma boa ideia.", subtitulo: "Escolha o seu favorito e faça o pedido em poucos cliques." },
    { titulo: `${s}! Vamos adoçar o seu dia?`, subtitulo: "Monte o seu pedido com calma, a gente cuida do resto." },
    { titulo: "Sobremesa chegando!", subtitulo: "Escolha o que mais combina com você hoje." },
    { titulo: "Fome de doce? Chegou ao lugar certo!", subtitulo: "Os queridinhos estão logo aqui embaixo." }
  ];
}

// config: { modo, titulo, subtitulo, ate } ou null. Devolve a frase que deve aparecer agora.
function escolherFrase(config) {
  const personalizada =
    config &&
    config.modo === "personalizada" &&
    config.titulo &&
    (!config.ate || config.ate.slice(0, 10) >= hojeISO());

  if (personalizada) {
    return { titulo: config.titulo, subtitulo: config.subtitulo || "" };
  }

  const opcoes = frasesAleatorias();
  return opcoes[Math.floor(Math.random() * opcoes.length)];
}

/* ---------- Atualização automática ---------- */
const ultimosDados = new Map();

// Devolve true se os dados são diferentes da última vez que foram vistos com essa chave
function dadosMudaram(chave, dados) {
  const atual = JSON.stringify(dados);
  if (ultimosDados.get(chave) === atual) return false;

  ultimosDados.set(chave, atual);
  return true;
}

// Executa `funcao` de tempos em tempos, só com a aba visível, e também quando a pessoa volta para a aba.
// pausarSe: função que devolve true quando não é hora de atualizar (ex.: a pessoa está digitando)
function atualizarPeriodicamente(funcao, segundos, { pausarSe = () => false } = {}) {
  let executando = false;

  async function executar() {
    if (executando || document.hidden || pausarSe()) return;

    executando = true;
    try {
      await funcao();
    } catch (erro) {
      // ignora: tenta de novo na próxima vez
    } finally {
      executando = false;
    }
  }

  setInterval(executar, segundos * 1000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) executar();
  });
}

function formatarCep(valor) {
  const numeros = valor.replace(/\D/g, "").slice(0, 8);
  return numeros.length > 5 ? `${numeros.slice(0, 5)}-${numeros.slice(5)}` : numeros;
}