# 🧁 Cardápio Virtual — Gordelicias da Lari

Sistema web de cardápio virtual com controle de estoque para a doceria **Gordelicias da Lari**, desenvolvido como Trabalho de Conclusão de Curso (TCC) do curso de Análise e Desenvolvimento de Sistemas (ADS).

> 🚧 **Status:** em desenvolvimento. A fase de documentação (requisitos, regras de negócio e diagramas) está concluída e a implementação é a próxima etapa.

---

## 📌 Sobre o projeto

A Gordelicias da Lari produz doces artesanais e abre o delivery em horários determinados. Hoje, todos os pedidos chegam pelo WhatsApp, o que gera um grande volume de mensagens e consome muito tempo da proprietária no atendimento.

Este projeto propõe um **cardápio virtual** que organiza esse processo: o cliente escolhe os doces disponíveis no dia e faz o pedido pelo site, enquanto a proprietária controla o estoque e gerencia os pedidos em um único lugar.

## 🎯 Objetivo

Reduzir a sobrecarga de atendimento manual e dar mais organização ao delivery, permitindo que a proprietária cadastre a quantidade de doces disponíveis a cada dia, exiba automaticamente quando um item esgota e acompanhe os pedidos recebidos.

## ✨ Funcionalidades

O sistema é dividido em duas áreas:

### Área do cliente
- Visualização do cardápio com os doces disponíveis e seus preços
- Indicação de itens esgotados
- Carrinho de compras
- Finalização do pedido **sem necessidade de criar conta**
- Escolha da forma de pagamento (dinheiro, débito, crédito ou pix), sem processamento de pagamento online
- Acompanhamento do status do pedido

### Área da proprietária
- Login
- Cadastro, edição e exclusão de produtos
- Controle da quantidade de doces disponíveis no dia, com baixa automática de estoque
- Listagem de pedidos
- Aceite ou recusa de pedidos
- Atualização do status do pedido (pedido feito, pedido confirmado, saiu para entrega)

## 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| Front-end | HTML, CSS e JavaScript |
| Back-end | PHP com Laravel |
| Banco de dados | MySQL |

## 🗂️ Modelagem

O sistema foi modelado com diagrama de classes, contendo as seguintes classes:

- `Proprietaria`
- `Produto`
- `Carrinho`
- `ItemPedido`
- `Cliente`
- `Pedido`

e as enumerações `statusProduto`, `statusPedido` e `formaPagamento`.

## 🎨 Identidade visual

A paleta de cores do sistema é baseada na logo da Gordelicias da Lari:

`#f786a3` · `#3ce4e6` · `#5e4d45` · `#f6f5f0` · `#f1b0be` · branco · preto

## 👥 Equipe

| Integrante | Responsabilidade |
|---|---|
| _Nome_ | Front-end |
| _Nome_ | Back-end |
| _Nome_ | Banco de dados |

## 🚀 Como executar

_Instruções de instalação e execução serão adicionadas após o início do desenvolvimento._

## 📄 Licença

Projeto acadêmico desenvolvido para fins educacionais.
