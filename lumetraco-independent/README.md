# LumeTraço — estúdio independente de vetorização

Uma aplicação gratuita para uso pessoal que converte imagens raster em caminhos vetoriais. **Identidade visual e interface próprias**, em português, com processamento local. Não depende de nenhum serviço comercial de vetorização.

> **Importante:** nome provisório. Antes de usar o nome publicamente como marca, faça pesquisa de anterioridade no INPI e avalie disponibilidade de domínio e repositório. Este código não oferece garantia jurídica ou ausência de conflito marcário.

## Funcionalidades

- Upload via arquivo, arrastar/soltar ou colar com `Ctrl+V` (PNG, JPG, GIF, BMP e WebP; limite de 30 MB).
- Quantização de cores por k-means e extração de contornos no navegador via Web Worker.
- Editor com comparação antes/depois, zoom, fundos, paleta, detalhe e suavização.
- Exportação gratuita SVG, PNG, PDF, EPS e DXF (DXF somente contornos).
- Conteúdo e navegação em português: início, guia, sobre e editor.
- Sem conta, pagamentos, anúncios, API remota ou banco de dados.

## Executar

Requisitos: Node.js 20+ (recomendado 22) e npm.

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

## Verificações

```bash
npm run typecheck
npm run build
npm run test:engine
npx playwright install chromium
npm run test:e2e
```

Os testes E2E salvam capturas de 390, 768 e 1440 px em `docs/screenshots/`, ao executar a aplicação local.

## Arquitetura

```text
src/app/page.tsx               Página inicial (nova identidade)
src/app/guia/page.tsx          Guia original de quatro etapas
src/app/about/page.tsx         Tecnologia e limitações
src/app/editor/page.tsx        Editor vetorial
src/app/pricing/page.tsx       Redirecionamento legado para /guia
src/components/               Navegação e upload
src/lib/                      Engine e exportadores
public/vector-worker.js        Processamento sem rede
public/demo-art.png            Imagem de demonstração
```

## Limitações

Este não é um motor de inteligência artificial. Os contornos são estimados por processamento clássico; resultados com textos, fotos complexas, gradientes e transparências podem perder qualidade. GIF utiliza somente o primeiro quadro. A transparência parcial é simplificada. O SVG contém caminhos reais, mas o motor não faz edição individual de nós.

Este projeto é independente e não utiliza código, logos, imagens ou acesso privado de outras plataformas. A página de preços da implementação anterior foi removida para evitar reproduzir uma oferta comercial que não existe aqui. Consulte [`docs/RELATORIO-FINAL.md`](docs/RELATORIO-FINAL.md) sobre o nível de validação de execução.

Nenhuma licença open source foi escolhida ainda: **não adicione uma licença sem definir os termos desejados** antes de publicar.


### Identidade visual e ícones

Os arquivos `src/app/favicon.ico`, `src/app/icon.svg` e `src/app/apple-icon.png` fornecem o favicon e o ícone para dispositivos. Em desenvolvimento, após adicionar os arquivos, atualize `http://localhost:3000` com Ctrl+F5 para substituir o ícone antigo armazenado em cache.
