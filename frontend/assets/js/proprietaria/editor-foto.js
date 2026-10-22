const areaEditor = document.getElementById("editor-foto");
const quadro = document.getElementById("quadro-foto");
const imagemEditor = document.getElementById("imagem-editor");
const controleZoom = document.getElementById("zoom-foto");

// Tamanho da foto que será enviada (proporção 4:3, a mesma dos cards do cardápio)
const LARGURA_SAIDA = 800;
const ALTURA_SAIDA = 600;

// cx e cy: ponto da foto que fica no centro da moldura (de 0 a 1). zoom: de 1 a 3
const estadoEditor = { ativo: false, nw: 0, nh: 0, cx: 0.5, cy: 0.5, zoom: 1 };
let arrasto = null;

function medirQuadro() {
  const largura = quadro.clientWidth;
  const altura = quadro.clientHeight;
  const base = Math.max(largura / estadoEditor.nw, altura / estadoEditor.nh); // a foto sempre cobre a moldura
  return { largura, altura, escala: base * estadoEditor.zoom };
}

function desenhar() {
  const { largura, altura, escala } = medirQuadro();
  const larguraImg = estadoEditor.nw * escala;
  const alturaImg = estadoEditor.nh * escala;

  let x = largura / 2 - estadoEditor.cx * larguraImg;
  let y = altura / 2 - estadoEditor.cy * alturaImg;

  // Não deixa aparecer espaço vazio nas bordas
  x = Math.min(0, Math.max(largura - larguraImg, x));
  y = Math.min(0, Math.max(altura - alturaImg, y));

  estadoEditor.cx = (largura / 2 - x) / larguraImg;
  estadoEditor.cy = (altura / 2 - y) / alturaImg;

  imagemEditor.style.width = `${larguraImg}px`;
  imagemEditor.style.height = `${alturaImg}px`;
  imagemEditor.style.transform = `translate(${x}px, ${y}px)`;
}

function abrirEditorFoto(origem) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.crossOrigin = "anonymous";

    imagem.onload = () => {
      imagemEditor.crossOrigin = "anonymous";
      imagemEditor.src = origem;

      estadoEditor.nw = imagem.naturalWidth;
      estadoEditor.nh = imagem.naturalHeight;
      estadoEditor.cx = 0.5;
      estadoEditor.cy = 0.5;
      estadoEditor.zoom = 1;
      controleZoom.value = 1;
      estadoEditor.ativo = true;

      areaEditor.hidden = false; // precisa estar visível para medir a moldura
      desenhar();
      resolve();
    };

    imagem.onerror = () => reject(new Error("Não foi possível abrir a foto para edição."));
    imagem.src = origem;
  });
}

function fecharEditorFoto() {
  estadoEditor.ativo = false;
  areaEditor.hidden = true;
  imagemEditor.removeAttribute("src");
}

function editorFotoAtivo() {
  return estadoEditor.ativo;
}

// Gera a foto recortada (JPEG 800x600) com o que está dentro da moldura
function exportarFotoEditada() {
  return new Promise((resolve, reject) => {
    const { largura, altura, escala } = medirQuadro();
    const x = largura / 2 - estadoEditor.cx * estadoEditor.nw * escala;
    const y = altura / 2 - estadoEditor.cy * estadoEditor.nh * escala;

    const canvas = document.createElement("canvas");
    canvas.width = LARGURA_SAIDA;
    canvas.height = ALTURA_SAIDA;

    const contexto = canvas.getContext("2d");
    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, canvas.width, canvas.height);
    contexto.drawImage(
      imagemEditor,
      -x / escala, -y / escala, largura / escala, altura / escala,
      0, 0, canvas.width, canvas.height
    );

    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Não foi possível gerar a foto."));
        return;
      }
      resolve(new File([blob], "foto-produto.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.85);
  });
}

/* ---------- Controles ---------- */
quadro.addEventListener("pointerdown", (evento) => {
  if (!estadoEditor.ativo) return;
  quadro.setPointerCapture(evento.pointerId);
  arrasto = { x: evento.clientX, y: evento.clientY, cx: estadoEditor.cx, cy: estadoEditor.cy };
  quadro.classList.add("editor-foto__quadro--arrastando");
});

quadro.addEventListener("pointermove", (evento) => {
  if (!arrasto) return;
  const { escala } = medirQuadro();
  estadoEditor.cx = arrasto.cx - (evento.clientX - arrasto.x) / (estadoEditor.nw * escala);
  estadoEditor.cy = arrasto.cy - (evento.clientY - arrasto.y) / (estadoEditor.nh * escala);
  desenhar();
});

function terminarArrasto() {
  arrasto = null;
  quadro.classList.remove("editor-foto__quadro--arrastando");
}

quadro.addEventListener("pointerup", terminarArrasto);
quadro.addEventListener("pointercancel", terminarArrasto);

// Setas do teclado também movem a foto
quadro.addEventListener("keydown", (evento) => {
  const passo = 0.03;
  const movimentos = {
    ArrowLeft: [-passo, 0],
    ArrowRight: [passo, 0],
    ArrowUp: [0, -passo],
    ArrowDown: [0, passo]
  };
  const movimento = movimentos[evento.key];
  if (!movimento || !estadoEditor.ativo) return;

  evento.preventDefault();
  estadoEditor.cx += movimento[0] / estadoEditor.zoom;
  estadoEditor.cy += movimento[1] / estadoEditor.zoom;
  desenhar();
});

controleZoom.addEventListener("input", () => {
  estadoEditor.zoom = Number(controleZoom.value);
  desenhar();
});

document.getElementById("btn-centralizar").addEventListener("click", () => {
  estadoEditor.cx = 0.5;
  estadoEditor.cy = 0.5;
  estadoEditor.zoom = 1;
  controleZoom.value = 1;
  desenhar();
});

window.addEventListener("resize", () => {
  if (estadoEditor.ativo) desenhar();
});