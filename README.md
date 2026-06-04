# SVG HUD Cleaner

Sistema simples em **HTML, CSS e JavaScript** para corrigir SVGs exportadas do Figma e preparar ícones para uso no MTA:SA e Projetos.

O projeto foi feito para resolver um problema comum: o SVG parecer pequeno dentro do jogo mesmo quando a posição e o tamanho foram copiados corretamente do Figma.

Isso normalmente acontece porque o SVG exportado vem com espaço invisível, filtros, sombras ou `viewBox` maior do que o desenho real.

## Funcionalidades

- Upload de arquivos `.svg`
- Validação de resolução no formato `1920x1080`
- Presets rápidos de resolução
- Prévia da SVG original
- Prévia da SVG corrigida
- Correção de área invisível interna
- Remoção de `defs`, filtros, sombras, máscaras e recortes
- Opção para forçar preenchimento branco nos paths
- Aba opcional para informações do Figma
- Download da SVG corrigida
- Copiar SVG corrigida
- Histórico de salvamentos no canto inferior esquerdo
- Opção para ocultar ou mostrar o histórico
- Salvamentos locais usando `localStorage`

## Estrutura

```txt
svg-hud-cleaner/
├── index.html
├── assets/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
└── README.md
```

## Como usar

1. Baixe ou clone o projeto.
2. Abra o arquivo `index.html` no navegador.
3. Envie uma SVG exportada do Figma.
4. Digite ou selecione a resolução usada.
5. Clique em **Corrigir SVG**.
6. Baixe a SVG corrigida ou copie o código SVG gerado.

## Aba Figma

A aba **Figma** é opcional.

Ela serve para salvar junto da SVG algumas informações copiadas do painel direito do Figma, como:

- Nome/ID
- Parent
- X
- Y
- Largura
- Altura
- Rotação
- Opacidade
- Caminho no resource

Essas informações ficam no histórico para facilitar a organização.

## Por que a SVG fica pequena no MTA?

Quando você exporta uma SVG do Figma, ela pode vir com uma área maior do que o desenho real.

Exemplo:

```xml
<svg width="25" height="26" viewBox="0 0 25 26">
```

Mesmo que o ícone visível ocupe apenas uma parte dessa área, o MTA desenha o SVG inteiro dentro do tamanho informado no `dxDrawSVG`.

Resultado: o ícone aparenta ficar pequeno.

O sistema corrige isso calculando a área visível real e criando um novo `viewBox` mais justo.

## Recomendações para exportar do Figma

Para evitar problemas:

- Exporte somente o **Vector** do ícone.
- Evite exportar `Frame`, `Group` ou componente completo.
- Remova sombra, blur e efeitos antes de exportar.
- Use nomes simples nos arquivos.

Exemplos:

```txt
Discord.svg
Voice.svg
Radinho.svg
Relogio.svg
```

## Histórico

Os salvamentos aparecem no canto inferior esquerdo.

Cada salvamento guarda:

- Nome do arquivo
- Resolução usada
- SVG original
- SVG corrigida
- Informações opcionais do Figma

O histórico fica salvo no navegador usando `localStorage`.

## Rodando o projeto

Não precisa instalar nada.

Basta abrir:

```txt
index.html
```

em qualquer navegador moderno.

## Tecnologias

- HTML
- CSS
- JavaScript 
- localStorage
- DOMParser
- SVG API

## Observação

Este projeto não possui backend e não envia arquivos para nenhum servidor.  
Todo o processamento acontece localmente no navegador.
