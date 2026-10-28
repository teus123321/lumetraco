> Atualização integrada: [motor/editor e comparação funcional](docs/EVOLUCAO-2026-10-27.md) · [validação](docs/VALIDACAO-2026-10-27.md). Os relatórios anteriores descrevem versões anteriores.

# LumeTraço — estúdio independente de vetorização

Uma aplicação gratuita para uso pessoal que converte imagens raster em caminhos vetoriais. **Identidade visual e interface próprias**, em português, com processamento local. Não depende de nenhum serviço comercial de vetorização.

> **Importante:** nome provisório. Antes de usar o nome publicamente como marca, faça pesquisa de anterioridade no INPI e avalie disponibilidade de domínio e repositório. Este código não oferece garantia jurídica ou ausência de conflito marcário.

## Funcionalidades

- Upload via arquivo, arrastar/soltar ou colar com `Ctrl+V` (PNG, JPG, GIF, BMP e WebP; limite de 30 MB).
- Quantização de cores por k-means e extração de contornos no navegador via Web Worker.
- Editor com comparação antes/depois, zoom, fundos, paleta, detalhe e suavização.
- Exportação gratuita SVG, PNG, PDF, EPS e DXF (DXF somente contornos).
- Conteúdo e navegação em português: início, guia, sobre e editor.
- Sem conta, pagamentos, anúncios, API remota ou banco de dados no servidor. O último arquivo pode ser mantido localmente no IndexedDB do navegador para recuperar o editor após atualizar a página.

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

A suíte atual inclui 14 testes para o motor e ferramentas de edição. Os testes E2E salvam capturas de 390, 768 e 1440 px em `docs/screenshots/`, ao executar a aplicação local.

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


## Editor v2 — ferramentas independentes (27/10/2026)

- Painel **Paleta**: recolorir tons inteiros, remover cores e remover fundo provável.
- Painel **Regiões**: clicar diretamente nas formas vetoriais para selecionar, recolorir, arredondar cantos SVG e ocultar/restaurar formas específicas.
- Histórico: desfazer e refazer edições com botões ou Ctrl+Z / Ctrl+Shift+Z.
- Pré-recorte por coordenadas, com atualização do arquivo local.
- Perfis de exportação: Arte, Corte e Gravação; preenchimento ou contornos.
- Cores, detalhes de contorno, suavização e resolução de análise.

**Não é um clone integral do Vectorizer.AI:** não utiliza IA proprietária nem reproduz a reconstrução de primitivas, correção subpixel ou edição avançada de nós. O arredondamento de cantos em SVG e PNG usa aproximação simples; EPS/PDF/DXF usam os contornos lineares subjacentes.

Para executar o build completo, instale dependências com `npm install` e rode `npm run build`. A versão v2 passou nos testes isolados do motor e serializador SVG, mas a compilação Next.js e os fluxos E2E não puderam ser executados aqui.
