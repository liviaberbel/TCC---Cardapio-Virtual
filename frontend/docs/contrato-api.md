# Contrato da API: Cardápio Virtual (Gordelicias da Lari)

Este documento é o combinado entre o **front-end** (HTML, CSS e JavaScript) e o **back-end** (Laravel).
O front-end já está pronto e funciona hoje com dados simulados. Este contrato descreve **exatamente o que ele envia e o que espera receber** de cada rota.

> Se alguma coisa precisar mudar, combinem entre vocês e **atualizem este arquivo**. Ele é a fonte da verdade para os dois lados.

---

## 1. Regras gerais

| Assunto | Combinado |
|---|---|
| URL base | `http://localhost:8000/api` (no front, fica em `assets/js/config.js`, campo `apiUrl`) |
| Formato | JSON (`Content-Type: application/json`). Exceção: cadastro e edição de produto usam `multipart/form-data`, por causa da foto |
| Autenticação | Rotas marcadas como **logada** exigem o cabeçalho `Authorization: Bearer <token>`. O token vem do login. Rotas **públicas** não exigem nada |
| Erros | Status HTTP adequado e corpo `{ "message": "texto em português" }` |
| Status de erro usados | `401` não autenticado, `404` não encontrado, `422` dado inválido ou regra de negócio, `429` muitas tentativas |
| Dinheiro | **Número** no JSON (`45.9`), nunca texto (`"45.90"`). Atenção: colunas `decimal` do Laravel voltam como texto; usar cast para `float` |
| Datas | ISO 8601 com fuso, no horário de Brasília (`America/Sao_Paulo`). Exemplo: `2026-10-19T15:42:00-03:00` |
| Nomes dos campos | Exatamente como neste documento (camelCase, sem acento) |
| CORS | Liberar `http://localhost:5500` e `http://127.0.0.1:5500` (Live Server), os métodos `GET, POST, PUT, PATCH, DELETE` e o cabeçalho `Authorization`. As **imagens** dos produtos (`/storage/...`) também devem ser servidas com o cabeçalho `Access-Control-Allow-Origin`, para o front conseguir reenquadrar uma foto que já foi enviada |

---

## 2. Valores fixos

**Formas de pagamento** (`pagamento.forma`): `pix`, `debito`, `credito`, `dinheiro`

**Status do pedido** (`status`): `recebido`, `preparo`, `entrega`, `entregue`, `cancelado`

| Status | Texto mostrado na tela | Pode ir para |
|---|---|---|
| `recebido` | Recebido | `preparo` ou `cancelado` |
| `preparo` | Em preparo | `entrega` ou `cancelado` |
| `entrega` | Saiu para entrega | `entregue` ou `cancelado` |
| `entregue` | Entregue | (final) |
| `cancelado` | Cancelado | (final) |

---

## 3. Resumo das rotas

| Método | Rota | Acesso | Para que serve |
|---|---|---|---|
| POST | `/login` | pública | Login da proprietária |
| GET | `/painel` | logada | Números e últimos pedidos do painel |
| GET | `/produtos` | pública | Lista de produtos (cardápio) |
| GET | `/produtos/{id}` | pública | Um produto |
| POST | `/produtos` | logada | Cadastrar produto (com foto) |
| POST | `/produtos/{id}` (com `_method=PUT`) | logada | Editar produto (com foto) |
| PATCH | `/produtos/{id}/quantidade` | logada | Atualizar a quantidade do dia |
| DELETE | `/produtos/{id}` | logada | Excluir produto |
| GET | `/categorias` | logada | Lista de categorias |
| POST | `/categorias` | logada | Criar categoria |
| PUT | `/categorias/{id}` | logada | Renomear categoria |
| DELETE | `/categorias/{id}` | logada | Excluir categoria |
| GET | `/frase-inicial` | pública | Frase de boas-vindas do cardápio |
| PUT | `/frase-inicial` | logada | Proprietária define a frase de boas-vindas |
| GET | `/bairros` | pública | Bairros atendidos e taxa de entrega |
| POST | `/bairros` | logada | Cadastrar bairro |
| PUT | `/bairros/{id}` | logada | Editar bairro (nome e taxa) |
| DELETE | `/bairros/{id}` | logada | Excluir bairro |
| POST | `/pedidos` | pública | Cliente envia um pedido |
| GET | `/pedidos` | logada | Lista de pedidos da proprietária |
| PATCH | `/pedidos/{numero}/status` | logada | Mudar o status de um pedido |
| POST | `/pedidos/consulta` | pública | Cliente acompanha o pedido |
| GET | `/funcionamento` | pública | Funcionamento do dia |
| PUT | `/funcionamento` | logada | Proprietária define o funcionamento do dia |

---

## 4. Detalhes de cada rota

### 4.1 `POST /login` (pública)

Envio:

```json
{ "email": "lari@exemplo.com", "senha": "123456" }
```

Resposta `200`:

```json
{ "token": "1|abc123..." }
```

Erro (`401` ou `422`): `{ "message": "E-mail ou senha incorretos." }`

> O front envia o campo `senha` (e não `password`). O back-end precisa aceitar esse nome ou combinar a troca com o front.
> O front guarda o token e o envia em todas as rotas "logada".

---

### 4.2 `GET /painel` (logada)

Resposta `200`:

```json
{
  "pedidosHoje": 3,
  "produtosDisponiveis": 6,
  "produtosEsgotados": 1,
  "ultimosPedidos": [
    { "numero": 1042, "cliente": "Maria Souza", "pagamento": "pix", "total": 57.0, "horario": "15:42" }
  ]
}
```

- `pedidosHoje`: pedidos do dia de hoje (recomendado **não** contar os cancelados).
- `produtosDisponiveis`: produtos com `quantidade > 0`. `produtosEsgotados`: produtos com `quantidade = 0`.
- `ultimosPedidos`: no máximo 5, do mais recente para o mais antigo. `cliente` é só o nome. `horario` é um texto `"HH:MM"`.

---

### 4.3 Objeto **Produto** (usado nas rotas de produtos)

| Campo | Tipo | Observação |
|---|---|---|
| `id` | número inteiro | |
| `categoriaId` | número inteiro | Id da categoria do produto (ver 4.17 a 4.20) |
| `categoria` | texto | Nome da categoria (ex.: `"Brownies"`). O cardápio usa este campo |
| `nome` | texto | |
| `descricao` | texto | Pode ser vazio (`""`) |
| `preco` | número | Maior que zero |
| `quantidade` | número inteiro | `0` ou mais. **Zero = esgotado** |
| `pesoGramas` | número inteiro ou `null` | Peso aproximado em gramas (1 a 5000). `null` se não informado |
| `validade` | texto ou `null` | Último dia de validade, no formato `AAAA-MM-DD`. `null` se não informado |
| `imagem` | texto ou `null` | **Endereço completo** da foto (ex.: `http://localhost:8000/storage/produtos/foto.jpg`). `null` se não houver foto |

---

### 4.4 `GET /produtos` (pública)

Resposta `200`: **lista simples** (sem paginação) de objetos Produto, **incluindo os esgotados**.

```json
[
  { "id": 5, "categoria": "Brownies", "nome": "Brownie tradicional", "descricao": "Brownie macio de chocolate.", "preco": 8.0, "quantidade": 20, "imagem": null }
]
```

> No cardápio, as categorias aparecem na ordem em que surgem nesta lista. Mantenham uma ordem estável (por exemplo, por `id`).

### 4.5 `GET /produtos/{id}` (pública)

Resposta `200`: um objeto Produto. Se não existir: `404` com `message`.

---

### 4.6 `POST /produtos` (logada, `multipart/form-data`)

| Campo | Obrigatório | Regra |
|---|---|---|
| `nome` | sim | Texto, até 80 caracteres |
| `categoriaId` | sim | Número inteiro: id de uma categoria já cadastrada (a proprietária escolhe em uma lista; ver 4.17 a 4.20) |
| `descricao` | não | Texto, até 200 caracteres (pode vir vazio) |
| `preco` | sim | Número maior que zero, com ponto decimal (`45.9`) |
| `quantidade` | sim | Inteiro, `0` ou mais |
| `pesoGramas` | não | Inteiro de 1 a 5000 (gramas aproximadas). Vazio (`""`) = sem peso |
| `validade` | não | Data `AAAA-MM-DD`. Vazio (`""`) = sem validade. Em um produto **novo**, não pode ser uma data que já passou |
| `foto` | não | Arquivo JPG, PNG ou WebP, até 5 MB |

Resposta `201`: o objeto Produto criado. Erros de validação: `422` com `message`.

### 4.7 `POST /produtos/{id}` com `_method=PUT` (logada, `multipart/form-data`)

Mesmos campos da rota anterior. O front envia `_method=PUT` junto com o formulário (jeito do Laravel para receber arquivos em atualização).
**Se `foto` não for enviada, a foto atual é mantida.**

Resposta `200`: o objeto Produto atualizado.

### 4.8 `PATCH /produtos/{id}/quantidade` (logada)

Envio:

```json
{ "quantidade": 12 }
```

Resposta `200`: o objeto Produto atualizado. `quantidade` deve ser inteiro `0` ou mais.

### 4.9 `DELETE /produtos/{id}` (logada)

Resposta `200` ou `204` (o front só confere se deu certo).
> Excluir um produto **não pode quebrar os pedidos antigos** (ver regra 9 na seção 5).

---

### 4.10 `POST /pedidos` (pública)

Envio:

```json
{
  "cliente": { "nome": "Maria Souza", "telefone": "(11) 91234-5678" },
  "endereco": {
    "cep": "12345678",
    "rua": "Rua das Flores",
    "numero": "123",
    "complemento": "",
    "referencia": ""
  },
  "bairroId": 1,
  "pagamento": { "forma": "dinheiro", "troco": "R$ 100,00" },
  "observacoes": "",
  "itens": [
    { "produtoId": 5, "quantidade": 2 },
    { "produtoId": 3, "quantidade": 1 }
  ]
}
```

Observações sobre os campos:

- `telefone` chega **com máscara**. O back-end deve guardar/comparar só os dígitos.
- `endereco.numero` é **texto** (aceita "S/N"). `complemento` e `referencia` podem ser `""`.
- `endereco.cep` é **opcional**: 8 dígitos, sem máscara (ou `""` se não informado). A busca do endereço pelo CEP (serviços públicos ViaCEP e BrasilAPI) e a conferência de que o CEP é de Joanópolis são feitas pelo front, que preenche a rua. O back-end só guarda o valor (e pode validar que tem 8 dígitos).
- `pagamento.troco` é texto livre e só tem valor quando `forma` é `dinheiro`; nos outros casos vem `""`.
- `itens` leva **somente o `produtoId` e a `quantidade`**. O front **não envia preços**: quem calcula é o back-end.
- `bairroId` é o id de um bairro cadastrado (ver 4.23). O front **não envia o nome do bairro nem a taxa**: o back-end busca o bairro, grava o nome dele em `endereco.bairro` e calcula a taxa. Não existe campo de cidade: a entrega é só em Joanópolis.

Resposta `201`:

```json
{ "numero": 1042, "previsaoEntrega": "40 a 60 minutos", "taxaEntrega": 5.0, "total": 21.0 }
```

Erros `422` (o front mostra o `message` para o cliente, então escrevam em português claro):

```json
{ "message": "A loja não está recebendo pedidos neste momento." }
{ "message": "\"Brownie tradicional\" não tem estoque suficiente. Volte ao carrinho e ajuste a quantidade." }
```

---

### 4.11 Objeto **Pedido** (usado em `GET /pedidos` e no `PATCH` de status)

```json
{
  "numero": 1042,
  "data": "2026-10-19T15:42:00-03:00",
  "status": "recebido",
  "cliente": { "nome": "Maria Souza", "telefone": "(11) 91234-5678" },
  "endereco": { "cep": "12345678", "rua": "Rua das Flores", "numero": "123", "bairro": "Centro", "complemento": "", "referencia": "" },
  "pagamento": { "forma": "dinheiro", "troco": "R$ 100,00" },
  "observacoes": "",
  "itens": [
    { "nome": "Brownie tradicional", "preco": 8.0, "quantidade": 2 }
  ],
  "subtotal": 16.0,
  "taxaEntrega": 5.0,
  "total": 21.0
}
```

- `itens[].nome` e `itens[].preco` são **os valores do momento do pedido** (não devem mudar se o produto for editado depois).
- `subtotal` é a soma de `preco * quantidade` dos itens. `taxaEntrega` é a taxa do bairro **no momento do pedido** (não muda se a taxa for editada depois; `0` = entrega grátis). `total` = `subtotal` + `taxaEntrega`.
- `endereco.bairro` é o **nome** do bairro, guardado no momento do pedido.

### 4.12 `GET /pedidos` (logada)

Resposta `200`: lista simples de objetos Pedido, **do mais recente para o mais antigo** (o front mostra na ordem recebida).

### 4.13 `PATCH /pedidos/{numero}/status` (logada)

`{numero}` é o **número do pedido** (o mesmo mostrado ao cliente), e não um id interno.

Envio:

```json
{ "status": "preparo" }
```

Resposta `200`: o objeto Pedido atualizado.
Erro `422` quando a mudança não é permitida (ver tabela da seção 2): `{ "message": "Esse pedido não pode mais mudar para esse status." }`

---

### 4.14 `POST /pedidos/consulta` (pública)

O cliente acompanha o pedido informando número e telefone. É `POST` para o telefone não aparecer no endereço da página.

Envio:

```json
{ "numero": 1042, "telefone": "(11) 91234-5678" }
```

Resposta `200` (**só o necessário, sem endereço e sem telefone**):

```json
{
  "numero": 1042,
  "data": "2026-10-19T15:42:00-03:00",
  "status": "preparo",
  "total": 21.0,
  "taxaEntrega": 5.0,
  "itens": [ { "nome": "Brownie tradicional", "preco": 8.0, "quantidade": 2 } ]
}
```

- O telefone é comparado **só pelos dígitos**.
- Se o número não existir **ou** o telefone não bater, responder o **mesmo** `404`: `{ "message": "Não encontramos um pedido com esse número e telefone." }` (assim ninguém descobre quais números existem).
- Limitar tentativas (ex.: 10 por minuto por IP), respondendo `429`.

---

### 4.15 `GET /funcionamento` (pública)

Devolve o **último funcionamento salvo**, mesmo que seja de um dia anterior (o front usa os valores antigos como sugestão no formulário e compara a `data` com o dia de hoje).

Resposta `200`:

```json
{
  "data": "2026-10-19",
  "aberta": true,
  "abertura": "14:00",
  "fechamento": "22:00",
  "entregaMin": 40,
  "entregaMax": 60
}
```

Se nunca foi salvo nenhum, responder `200` com o corpo `null`.

### 4.16 `PUT /funcionamento` (logada)

A proprietária define o funcionamento **de hoje**. O front **não envia a data**: o back-end usa a data de hoje (horário de Brasília) e grava ou substitui o registro do dia.

Envio:

```json
{
  "aberta": true,
  "abertura": "14:00",
  "fechamento": "22:00",
  "entregaMin": 40,
  "entregaMax": 60
}
```

Validações:

- Se `aberta` for `true`: `fechamento` deve ser depois de `abertura` e `entregaMax` não pode ser menor que `entregaMin`.
- Se `aberta` for `false`: os horários continuam sendo enviados (servem de sugestão para o dia seguinte) e `entregaMin` / `entregaMax` podem vir `null`.
- Horários no formato `"HH:MM"`. O horário de fechamento é sempre no mesmo dia (não passa da meia-noite).

Resposta `200`: o objeto completo, já com `data`.

---

### 4.17 Objeto **Categoria** e `GET /categorias` (logada)

| Campo | Tipo | Observação |
|---|---|---|
| `id` | número inteiro | |
| `nome` | texto | De 1 a 40 caracteres. Único (sem diferenciar maiúsculas, minúsculas e acentos) |
| `totalProdutos` | número inteiro | Quantos produtos pertencem à categoria. O front usa para mostrar a contagem e para bloquear a exclusão |

Resposta `200`: lista simples, na ordem de criação:

```json
[
  { "id": 1, "nome": "Brownies", "totalProdutos": 4 },
  { "id": 2, "nome": "Páscoa", "totalProdutos": 0 }
]
```

### 4.18 `POST /categorias` (logada)

Envio:

```json
{ "nome": "Páscoa" }
```

Resposta `201`: o objeto Categoria criado (com `totalProdutos` igual a `0`).
Erro `422` se já existir uma categoria com esse nome: `{ "message": "Já existe uma categoria com esse nome." }`

### 4.19 `PUT /categorias/{id}` (logada)

Envio:

```json
{ "nome": "Brownies e blondies" }
```

Resposta `200`: o objeto Categoria atualizado. Mesmas validações da criação.
Os produtos continuam ligados à categoria e passam a mostrar o novo nome.

### 4.20 `DELETE /categorias/{id}` (logada)

Resposta `200` ou `204`.
Erro `422` se ainda houver produtos nela (o front mostra o `message`):

```json
{ "message": "Esta categoria tem 3 produto(s). Mude esses produtos de categoria antes de excluir." }
```

---

### 4.21 `GET /frase-inicial` (pública)

Devolve a configuração da frase que aparece no topo do cardápio do cliente.

Resposta `200`:

```json
{
  "modo": "personalizada",
  "titulo": "Feliz Páscoa!",
  "subtitulo": "Doces artesanais para adoçar a sua Páscoa.",
  "ate": "2027-04-10"
}
```

| Campo | Tipo | Observação |
|---|---|---|
| `modo` | texto | `"aleatoria"` (o front sorteia uma frase pronta a cada visita) ou `"personalizada"` (mostra a frase da proprietária) |
| `titulo` | texto | Frase principal. Até 60 caracteres. Só é usada no modo `personalizada`, mas deve ser guardada mesmo no modo `aleatoria` |
| `subtitulo` | texto | Frase de apoio. Até 120 caracteres. Pode ser `""` |
| `ate` | texto ou `null` | Último dia (`AAAA-MM-DD`) em que a frase personalizada é exibida. Depois dessa data o front volta às frases aleatórias sozinho. `null` = sem data final |

Se nunca foi salva, responder `200` com o corpo `null` (o front usa as frases aleatórias).

> As frases aleatórias ficam no próprio front. O back-end só guarda a escolha da proprietária.

### 4.22 `PUT /frase-inicial` (logada)

Envio: o mesmo objeto da rota anterior.

```json
{ "modo": "personalizada", "titulo": "Feliz Páscoa!", "subtitulo": "Doces artesanais para adoçar a sua Páscoa.", "ate": "2027-04-10" }
```

Validações: `modo` deve ser `aleatoria` ou `personalizada`. No modo `personalizada`, `titulo` é obrigatório (1 a 60 caracteres), `subtitulo` tem no máximo 120 e `ate`, se informado, não pode ser uma data que já passou.

Resposta `200`: o objeto salvo.

---

### 4.23 Objeto **Bairro** e `GET /bairros` (pública)

| Campo | Tipo | Observação |
|---|---|---|
| `id` | número inteiro | |
| `nome` | texto | De 1 a 60 caracteres. Único (sem diferenciar maiúsculas, minúsculas e acentos) |
| `taxa` | número | Taxa de entrega em reais. `0` ou mais. **`0` = entrega grátis** |

Resposta `200`: lista simples, em qualquer ordem (o front ordena pelo nome). É pública, porque o cliente escolhe o bairro na finalização do pedido.

```json
[
  { "id": 1, "nome": "Centro", "taxa": 5.0 },
  { "id": 2, "nome": "Jardim das Flores", "taxa": 0.0 }
]
```

### 4.24 `POST /bairros` (logada)

Envio:

```json
{ "nome": "Centro", "taxa": 5.0 }
```

Resposta `201`: o objeto Bairro criado.
Erro `422` se já existir um bairro com esse nome: `{ "message": "Já existe um bairro com esse nome." }`

### 4.25 `PUT /bairros/{id}` (logada)

Envio: `{ "nome": "Centro", "taxa": 6.0 }`. Resposta `200`: o objeto Bairro atualizado. Mesmas validações da criação.
Os pedidos antigos **não mudam**: continuam com o nome e a taxa do momento em que foram feitos.

### 4.26 `DELETE /bairros/{id}` (logada)

Resposta `200` ou `204`. Os pedidos antigos continuam mostrando o nome do bairro e a taxa do momento.

---

## 5. Regras de negócio que o back-end precisa garantir

O front faz validações só para ajudar o usuário. **Quem garante as regras de verdade é o back-end**, porque as telas podem ser contornadas.

1. **Preço calculado no servidor.** Ignorar qualquer preço vindo do cliente; usar o preço do banco.
2. **Estoque.** Ao receber um pedido, conferir a quantidade de cada item e descontar do estoque **na mesma transação** (para dois clientes não comprarem a última unidade ao mesmo tempo).
3. **Cancelamento devolve o estoque.** Ao mudar um pedido para `cancelado`, somar de volta as quantidades aos produtos.
4. **Horário de funcionamento.** Só aceitar pedido se existir funcionamento **de hoje**, com `aberta = true` e a hora atual do servidor entre `abertura` (inclusive) e `fechamento` (exclusive). Sem funcionamento definido para o dia, o pedido é recusado.
5. **Mudança de status.** Só permitir as transições da tabela da seção 2. Pedido `entregue` ou `cancelado` não muda mais.
6. **Numeração.** O `numero` do pedido é sequencial e é o que o cliente enxerga.
7. **Dados pessoais protegidos.** Telefone e endereço só aparecem para a proprietária logada. A consulta pública nunca devolve esses dados.
8. **Telefone.** Guardar e comparar só os dígitos.
9. **Excluir produto sem quebrar o histórico.** Os itens de um pedido guardam `nome` e `preco` próprios, e o produto pode ser "desativado" (exclusão lógica) em vez de apagado de vez.
10. **Validar tudo de novo.** Tipo e tamanho da imagem, campos obrigatórios, números válidos.
11. **Limite de tentativas** no login e na consulta de pedido.
12. **Categorias.** Todo produto pertence a exatamente uma categoria. Não é permitido excluir uma categoria que ainda tenha produtos, e dois nomes iguais (ignorando maiúsculas e acentos) não podem existir.
13. **Entrega só em Joanópolis, por bairro cadastrado.** O pedido precisa de um `bairroId` válido; se não existir, recusar com `422` e mensagem clara. A taxa vem do cadastro do bairro (nunca do front) e `total = subtotal + taxaEntrega`.

---

## 6. Pontos para o grupo decidir

- **`senha` ou `password`?** O front usa `senha`. Mais simples o back-end aceitar `senha`, mas dá para trocar no front.
- **Categorias:** decidido que são uma tabela própria (`Categoria`), criada e gerenciada pela proprietária (ver 4.17 a 4.20). O produto devolve `categoriaId` e também o nome em `categoria`, que é o que o cardápio mostra. A ordem das seções no cardápio segue a ordem dos produtos; se a proprietária quiser controlar essa ordem, precisaria de um campo de ordem na categoria (ideia para depois).
- **Notificação ao cliente** quando o status muda: hoje ele precisa abrir a página (ela atualiza sozinha a cada 30 segundos). Notificar por WhatsApp ou e-mail pode entrar como trabalho futuro.
- **Paginação** de pedidos e produtos: hoje as duas listas são devolvidas inteiras. Se o volume crescer, combinar paginação e avisar o front.

---

## 7. Histórico de mudanças

| Versão | O que mudou |
|---|---|
| 1 | Primeira versão: login, painel, produtos, pedidos, status, consulta do cliente e funcionamento do dia |
| 2 | Categorias criadas pela proprietária: novas rotas `GET/POST /categorias`, `PUT/DELETE /categorias/{id}`. O cadastro e a edição de produto passam a enviar `categoriaId` (em vez do nome da categoria em texto), e o produto devolve `categoriaId` e `categoria` |
| 3 | Produto ganha `pesoGramas` (peso aproximado) e `validade` (último dia de validade). Ambos opcionais e enviados no cadastro e na edição; vazio (`""`) limpa o valor. O aviso de produtos vencidos no painel da proprietária é calculado pelo front a partir de `validade` (produto vencido continua no cardápio; não some sozinho) |
| 4 | Edição de foto no front: a proprietária enquadra a foto (arrastar e zoom) antes de salvar. A rota de produtos não muda, mas a `foto` enviada passa a ser sempre um **JPEG de 800×600 (proporção 4:3)**, já recortado pelo front. As imagens devem ter CORS liberado (ver seção 1) para o front reenquadrar uma foto que já existe |
| 5 | Frase inicial do cardápio: novas rotas `GET /frase-inicial` (pública) e `PUT /frase-inicial` (logada), para guardar o modo (frases aleatórias ou frase da proprietária), o título, o subtítulo e a data final opcional |
| 6 | Taxa de entrega por bairro (entrega só em Joanópolis): novas rotas `GET/POST /bairros` e `PUT/DELETE /bairros/{id}`. O `POST /pedidos` passa a receber `bairroId` (e não mais o nome do bairro em `endereco.bairro`) e devolve `taxaEntrega` e `total`. O pedido ganha `subtotal` e `taxaEntrega`, e a consulta do cliente devolve `taxaEntrega` |
| 7 | CEP opcional no endereço do pedido (`endereco.cep`, 8 dígitos sem máscara), usado pelo front para preencher a rua automaticamente. Não há rota nova |
