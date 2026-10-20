const CHAVE_SESSAO = "sessaoProprietaria";

function estaLogada() {
  return sessionStorage.getItem(CHAVE_SESSAO) !== null;
}

// Chame no começo de cada página interna: quem não entrou volta para o login
function exigirLogin() {
  if (!estaLogada()) {
    window.location.replace("login.html");
  }
}

function sair() {
  sessionStorage.removeItem(CHAVE_SESSAO);
  window.location.href = "login.html";
}

function tokenProprietaria() {
  return sessionStorage.getItem(CHAVE_SESSAO);
}

/* ---------- Tela de login (só roda na página de login) ---------- */
const formLogin = document.getElementById("form-login");

if (formLogin) {
  const botaoEntrar = document.getElementById("btn-entrar");
  const mensagemErro = document.getElementById("erro-login");
  const campoSenha = document.getElementById("senha");
  const botaoVerSenha = document.getElementById("btn-ver-senha");

  // Quem já entrou não precisa ver o login de novo
  if (estaLogada()) {
    window.location.replace("painel.html");
  }

  botaoVerSenha.addEventListener("click", () => {
    const mostrando = campoSenha.type === "text";
    campoSenha.type = mostrando ? "password" : "text";
    botaoVerSenha.innerHTML = `<i class="bi ${mostrando ? "bi-eye" : "bi-eye-slash"}"></i>`;
    botaoVerSenha.setAttribute("aria-label", mostrando ? "Mostrar senha" : "Ocultar senha");
  });

  formLogin.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    mensagemErro.hidden = true;
    botaoEntrar.disabled = true;
    botaoEntrar.textContent = "Entrando...";

    try {
      const dados = new FormData(formLogin);
      const resposta = await entrarProprietaria(dados.get("email").trim(), dados.get("senha"));

      sessionStorage.setItem(CHAVE_SESSAO, resposta.token);
      window.location.href = "painel.html";
    } catch (erro) {
      mensagemErro.textContent = erro instanceof TypeError
        ? "Não foi possível conectar ao servidor. Tente novamente."
        : erro.message;
      mensagemErro.hidden = false;
      botaoEntrar.disabled = false;
      botaoEntrar.textContent = "Entrar";
    }
  });
}
