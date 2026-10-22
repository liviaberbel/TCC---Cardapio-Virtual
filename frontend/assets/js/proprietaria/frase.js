const formFrase = document.getElementById("form-frase");
const camposFrase = formFrase.elements;
const avisoFrase = document.getElementById("aviso-frase");
const erroFrase = document.getElementById("erro-frase");
const previaTitulo = document.getElementById("previa-titulo");
const previaSubtitulo = document.getElementById("previa-subtitulo");
const notaPrevia = document.getElementById("nota-previa");
const botaoOutroExemplo = document.getElementById("btn-outro-exemplo");
const botaoUsarExemplo = document.getElementById("btn-usar-exemplo");
const areaSugestoes = document.getElementById("sugestoes");
const listaSugestoes = document.getElementById("lista-sugestoes");

let exemploAtual = null;
let temporizadorAviso;

const SUGESTOES = [
  { nome: "Páscoa", titulo: "Feliz Páscoa! 🐰", subtitulo: "Doces artesanais para adoçar a sua Páscoa." },
  { nome: "Dia das Mães", titulo: "Feliz Dia das Mães! 💐", subtitulo: "Surpreenda quem você ama com um doce feito com carinho." },
  { nome: "Festa Junina", titulo: "Hoje é dia de festa junina! 🎉", subtitulo: "Doces para animar o seu arraiá." },
  { nome: "Dia dos Namorados", titulo: "Amor combina com doce! ❤️", subtitulo: "Escolha um mimo para o seu amor." },
  { nome: "Dia das Crianças", titulo: "Feliz Dia das Crianças! 🍬", subtitulo: "Doces para a criançada se encher de alegria." },
  { nome: "Natal", titulo: "Feliz Natal! 🎄", subtitulo: "Sobremesas especiais para a sua ceia e para presentear." }
];

function mostrarAviso(texto) {
  erroFrase.hidden = true;
  avisoFrase.textContent = texto;
  avisoFrase.hidden = false;

  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => {
    avisoFrase.hidden = true;
  }, 3000);
}

function mostrarErro(texto) {
  avisoFrase.hidden = true;
  erroFrase.textContent = texto;
  erroFrase.hidden = false;
}

function modoAtual() {
  return camposFrase.modo.value;
}

function atualizarPrevia(novoSorteio = false) {
  if (modoAtual() === "personalizada") {
    previaTitulo.textContent = camposFrase.titulo.value.trim() || "Sua frase principal aparece aqui";
    previaSubtitulo.textContent = camposFrase.subtitulo.value.trim();
    notaPrevia.textContent = "É assim que o cliente vai ver. Lembre-se de salvar.";
    return;
  }

  if (novoSorteio || !exemploAtual) exemploAtual = escolherFrase(null);
  previaTitulo.textContent = exemploAtual.titulo;
  previaSubtitulo.textContent = exemploAtual.subtitulo;
  notaPrevia.textContent =
    "Esta é só uma amostra: no modo aleatório, o cardápio sorteia uma frase diferente a cada visita. " +
    "Gostou desta? Clique em “Usar esta frase” para fixá-la.";
}

// Os campos de texto só ficam ativos no modo "Minha frase"
function alternarCampos() {
  const personalizada = modoAtual() === "personalizada";

  ["titulo", "subtitulo", "ate"].forEach((nome) => {
    camposFrase[nome].disabled = !personalizada;
  });

  areaSugestoes.hidden = !personalizada;
  botaoOutroExemplo.hidden = personalizada;
  botaoUsarExemplo.hidden = personalizada;
  atualizarPrevia();
}

function montarSugestoes() {
  SUGESTOES.forEach((sugestao) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "chip-sugestao";
    botao.textContent = sugestao.nome;

    botao.addEventListener("click", () => {
      camposFrase.titulo.value = sugestao.titulo;
      camposFrase.subtitulo.value = sugestao.subtitulo;
      atualizarPrevia();
    });

    listaSugestoes.appendChild(botao);
  });
}

async function carregarFrase() {
  let config = null;

  try {
    config = await buscarFrase();
  } catch (erro) {
    // sem dados, começa no modo aleatório
  }

  camposFrase.modo.value = config?.modo || "aleatoria";
  camposFrase.titulo.value = config?.titulo || "";
  camposFrase.subtitulo.value = config?.subtitulo || "";
  camposFrase.ate.value = (config?.ate || "").slice(0, 10);

  alternarCampos();
}

formFrase.addEventListener("change", (evento) => {
  if (evento.target.name === "modo") alternarCampos();
});

["titulo", "subtitulo"].forEach((nome) => {
  camposFrase[nome].addEventListener("input", () => atualizarPrevia());
});

botaoOutroExemplo.addEventListener("click", () => atualizarPrevia(true));

// Copia a frase da amostra para o modo "Minha frase", para a proprietária poder ajustar e salvar
botaoUsarExemplo.addEventListener("click", () => {
  const exemplo = exemploAtual || escolherFrase(null);

  camposFrase.modo.value = "personalizada";
  camposFrase.titulo.value = exemplo.titulo;
  camposFrase.subtitulo.value = exemplo.subtitulo;
  alternarCampos();

  mostrarAviso("Frase copiada para “Minha frase”. Ajuste o texto, se quiser, e clique em Salvar.");
});

formFrase.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  erroFrase.hidden = true;

  const dados = {
    modo: modoAtual(),
    titulo: camposFrase.titulo.value.trim(),
    subtitulo: camposFrase.subtitulo.value.trim(),
    ate: camposFrase.ate.value || null
  };

  if (dados.modo === "personalizada") {
    if (!dados.titulo) {
      mostrarErro("Escreva a frase principal.");
      return;
    }

    if (dados.ate && dados.ate < hojeISO()) {
      mostrarErro("A data final não pode ser uma data que já passou.");
      return;
    }
  }

  try {
    await salvarFrase(dados);
    mostrarAviso(dados.modo === "personalizada"
      ? "Frase salva. Já aparece no cardápio."
      : "Pronto! O cardápio vai sortear uma frase diferente a cada visita.");
  } catch (erro) {
    mostrarErro(erro.message);
  }
});

montarSugestoes();
carregarFrase();