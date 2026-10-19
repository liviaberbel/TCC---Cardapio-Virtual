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