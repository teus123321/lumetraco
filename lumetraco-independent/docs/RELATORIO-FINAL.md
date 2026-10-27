# Relatório da versão com identidade própria — LumeTraço

Data: 27/10/2026.

## Alterações visuais e de identidade

- Nome provisório LumeTraço, marca tipográfica e símbolo próprios.
- Nova paleta verde-floresta, creme, lima e pêssego.
- Página inicial em estilo estúdio editorial: herói assimétrico, ilustração SVG geométrica criada para o projeto, painel de upload embutido e mosaico de recursos.
- Toda a navegação e interface principal em português.
- Página de preços de terceiros removida. `/pricing` agora redireciona para `/guia`, uma página de instruções próprias.
- Editor reestilizado mantendo funcionalidades de processamento e exportação.
- Documentação de referência e screenshots estáticos da interface anterior retirados do pacote.

## Motor preservado

Processamento local, upload por clique/arrastar/colar, k-means, contornos, comparação original/vetor, ajustes, visualização e exportação SVG, PNG, PDF, EPS, DXF.

## Verificação

- Execute `npm run test:engine` para testar o motor em Node sem acesso a serviços remotos.
- Execute `npm install`, `npm run typecheck`, `npm run build` e `npm run test:e2e` para validar React, layout e navegador.
- **Não afirmar fidelidade visual ou ausência de erros no navegador sem executar tais testes.**

## Limites e precauções

- O novo nome ainda não foi formalmente validado quanto a marcas; recomenda-se consulta à base do INPI.
- A nova interface foi criada para ser claramente diferente da página comercial que motivou o experimento, mas não há garantia jurídica automática.
- Qualidade de vetor inferior à IA especializada em muitos casos, e limitações de resolução de processamento (220/340/460 px), GIF de primeiro quadro e DXF só de contornos.
- Imagens não são enviadas a servidores; memória de sessão é descartada ao recarregar.
- Código-fonte não incorpora IA privada, credenciais, APIs protegidas ou dados de terceiros.

## Prévia visual da nova identidade

Foi construída uma **fixture estática HTML/CSS** em `scripts/new-identity-preview.py` para conferir a direção visual antes de instalar o Next.js. Capturas em `docs/preview-estatico/home-{390,768,1440}.png`; sem overflow horizontal nos três tamanhos. Estas **não são capturas da aplicação React**; a execução completa e os testes E2E seguem pendentes.

Verificações locais realizadas: `node --test tests/engine.test.cjs` (**7 de 7 aprovados**) e `node scripts/verify-syntax.cjs` (**14 arquivos TS/TSX sem erros de sintaxe na transpilação**). Isso não equivale à validação de tipos, build ou navegador.
