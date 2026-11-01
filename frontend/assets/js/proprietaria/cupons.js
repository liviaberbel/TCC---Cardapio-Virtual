const corpoTabela = document.getElementById("tabela-cupons");
const semCupons = document.getElementById("sem-cupons");
const avisoCupons = document.getElementById("aviso-cupons");
const erroCupons = document.getElementById("erro-cupons");
const formCupom = document.getElementById("form-cupom");
const tituloForm = document.getElementById("titulo-form-cupom");
const campoCodigo = document.getElementById("codigo-cupom");
const campoPercentual = document.getElementById("percentual-cupom");
const campoValidade = document.getElementById("validade-cupom");
const campoLimite = document.getElementById("limite-cupom");
const botaoSalvar = document.getElementById("btn-salvar-cupom");
const botaoCancelar = document.getElementById("btn-cancelar-cupom");

let cupons = [];
let idEmEdicao = null;
let temporizadorAviso;

// Selo de cada situação do cupom: [classe, texto]
const SELOS_CUPOM = {
  ativo: ["selo--disponivel", "Ativo"],
  vencido: ["selo--esgotado", "Vencido"],
  desativado: ["selo--cancelado", "Desativado"],
  esgotado: ["selo--esgotado", "Limite atingido"]
};

function mostrarAviso(texto) {
  erroCupons.hidden = true;
  avisoCupons.textContent = texto;
  avisoCupons.hidden = false;

  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => {
    avisoCupons.hidden = true;
  }, 3000);
}

function mostrarErro(texto) {
  avisoCupons.hidden = true;
  erroCupons.textContent = texto;
  erroCupons.hidden = false;
}

function criarBotaoIcone(icone, rotulo) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "botao-icone";
  botao.setAttribute("aria-label", rotulo);
  botao.title = rotulo;
  botao.innerHTML = `<i class="bi ${icone}"></i>`;
  return botao;
}

/* ---------- Formulário (novo cupom e edição) ---------- */
function sairDaEdicao() {
  idEmEdicao = null;
  formCupom.reset();
  tituloForm.textContent = "Novo cupom";
  botaoSalvar.textContent = "Adicionar";
  botaoCancelar.hidden = true;
}

function iniciarEdicao(cupom) {
  idEmEdicao = cupom.id;
  campoCodigo.value = cupom.codigo;
  campoPercentual.value = cupom.percentual;
  campoValidade.value = cupom.validade.slice(0, 10);
  campoLimite.value = cupom.limiteUsos ?? "";

  tituloForm.textContent = `Editando o cupom ${cupom.codigo}`;
  botaoSalvar.textContent = "Salvar alterações";
  botaoCancelar.hidden = false;

  formCupom.scrollIntoView({ behavior: "smooth", block: "center" });
  campoCodigo.focus();
}

botaoCancelar.addEventListener("click", sairDaEdicao);

formCupom.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const dados = {
    codigo: campoCodigo.value.trim().toUpperCase(),
    percentual: Number.parseInt(campoPercentual.value, 10),
    validade: campoValidade.value,
    limiteUsos: campoLimite.value ? Number.parseInt(campoLimite.value, 10) : null
  };

  try {
    if (idEmEdicao === null) {
      await criarCupom({ ...dados, ativo: true });
      mostrarAviso(`Cupom ${dados.codigo} criado.`);
    } else {
      const atual = cupons.find((c) => c.id === idEmEdicao);
      await atualizarCupom(idEmEdicao, { ...dados, ativo: atual ? atual.ativo : true });
      mostrarAviso(`Cupom ${dados.codigo} atualizado.`);
    }

    sairDaEdicao();
    await carregarCupons();
  } catch (erro) {
    mostrarErro(erro.message);
  }
});

/* ---------- Tabela ---------- */
function criarLinha(cupom) {
  const linha = document.createElement("tr");
  const situacao = situacaoDoCupom(cupom);

  const celulaCodigo = document.createElement("td");
  const codigo = document.createElement("strong");
  codigo.textContent = cupom.codigo;
  celulaCodigo.appendChild(codigo);

  const celulaDesconto = document.createElement("td");
  celulaDesconto.textContent = `${cupom.percentual}%`;

  const celulaValidade = document.createElement("td");
  celulaValidade.textContent = formatarDataCurta(cupom.validade);

  const celulaUsos = document.createElement("td");
  celulaUsos.textContent = cupom.limiteUsos != null
    ? `${cupom.usos} de ${cupom.limiteUsos}`
    : `${cupom.usos}`;

  const celulaSituacao = document.createElement("td");
  const [classeSelo, textoSelo] = SELOS_CUPOM[situacao.estado];
  const selo = document.createElement("span");
  selo.className = `selo ${classeSelo}`;
  selo.textContent = textoSelo;
  celulaSituacao.appendChild(selo);

  const celulaAcoes = document.createElement("td");
  const acoes = document.createElement("div");
  acoes.className = "acoes-linha";

  const botaoEditar = criarBotaoIcone("bi-pencil", "Editar cupom");
  const botaoAlternar = criarBotaoIcone(
    cupom.ativo ? "bi-toggle-on" : "bi-toggle-off",
    cupom.ativo ? "Desativar cupom" : "Ativar cupom"
  );
  const botaoExcluir = criarBotaoIcone("bi-trash3", "Excluir cupom");

  botaoEditar.addEventListener("click", () => iniciarEdicao(cupom));

  botaoAlternar.addEventListener("click", async () => {
    try {
      await atualizarCupom(cupom.id, {
        codigo: cupom.codigo,
        percentual: cupom.percentual,
        validade: cupom.validade.slice(0, 10),
        limiteUsos: cupom.limiteUsos ?? null,
        ativo: !cupom.ativo
      });
      await carregarCupons();
      mostrarAviso(cupom.ativo ? `Cupom ${cupom.codigo} desativado.` : `Cupom ${cupom.codigo} ativado.`);
    } catch (erro) {
      mostrarErro(erro.message);
    }
  });

  botaoExcluir.addEventListener("click", async () => {
    if (!confirm(`Excluir o cupom ${cupom.codigo}? Essa ação não pode ser desfeita.`)) return;

    try {
      await excluirCupom(cupom.id);
      if (idEmEdicao === cupom.id) sairDaEdicao();
      await carregarCupons();
      mostrarAviso(`Cupom ${cupom.codigo} excluído.`);
    } catch (erro) {
      mostrarErro(erro.message);
    }
  });

  acoes.append(botaoEditar, botaoAlternar, botaoExcluir);
  celulaAcoes.appendChild(acoes);

  linha.append(celulaCodigo, celulaDesconto, celulaValidade, celulaUsos, celulaSituacao, celulaAcoes);
  return linha;
}

async function carregarCupons() {
  try {
    cupons = await listarCupons();

    corpoTabela.innerHTML = "";
    semCupons.hidden = cupons.length > 0;

    // Os mais recentes primeiro
    [...cupons]
      .sort((a, b) => b.id - a.id)
      .forEach((cupom) => corpoTabela.appendChild(criarLinha(cupom)));
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

carregarCupons();