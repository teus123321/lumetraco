# LumeTraço x referência — matriz de verificação independente

Verificação documental em 27/10/2026. Referência: https://vectorizer.ai/ e https://vectorizer.ai/api/outputOptions. **Não foi realizada inspeção do backend proprietário ou de dados privados.**

| Capacidade observável/documentada | LumeTraço v2 | Limite concreto |
|---|---|---|
| Upload PNG/JPG/GIF/BMP/WebP, arrastar e soltar, colar | Implementado | GIF apenas primeiro frame; imagem local até 30 MB |
| Pré-recorte | Implementado | Coordenadas percentuais e novo PNG local |
| Progresso/cancelamento | Parcial | Indicador e cancelamento automático entre operações de vetorização; não há barra de progresso percentual |
| Comparação original/vetor, zoom e fundos | Implementado | Painel com divisor e rolamento; zoom limitado a 400% |
| Alterar quantidade de cores | Implementado | Quantização RGB k-means, não autoestimativa avançada |
| Recolorir cores da paleta | Implementado | Ajuste via seletor de cores, atualização imediata |
| Mesclar/dividir cores de origem | Parcial | Recoloração pode fundir cores visualmente; não refaz a segmentação de forma localizada |
| Selecionar regiões individualmente | Implementado | Segmentação do próprio motor, limitada por resolução de análise |
| Recolorir/remover/restaurar uma região | Implementado | Não possui ferramenta livre de edição de nós |
| Remoção automática de fundo | Parcial | Heurística de maior cor; pode escolher a cor errada |
| Cantos arredondados vs. agudos | Parcial | Curvas quadráticas aproximadas em SVG e PNG; sem detecção semântica de cantos |
| Detecção de círculos, elipses, retângulos e estrelas | Não implementado | Requer motor geométrico adicional, p.ex. biblioteca open source ou algoritmos próprios |
| Modelagem subpixel e arestas partilhadas | Não implementado | Motor atual traça regiões quantizadas |
| Simetria e otimização geométrica do original | Não implementado | Propriedade de sistema de pesquisa, não reproduzida |
| SVG, PDF, EPS, DXF, PNG | Implementado | SVG editável por regiões; DXF contornos; PDF/EPS com caminho linear |
| Perfis Arte/Corte/Gravação | Implementado | Controle de preenchimento/traçado/espessura; menos opções que referência |
| Edição avançada de curvas, agrupamentos e versões de formato | Não implementado | Necessita novos modelos de geometria e exportadores |
| Voltar ao editor após atualizar | Implementado | IndexedDB local; depende de permissões e espaço do navegador |
| Registro e pagamento | Não implementado | Não fazem parte do escopo gratuito |

## Qualidade do vetor

O LumeTraço v2 usa **k-means RGB + extração de contornos com simplificação** em um Web Worker. O SVG contém elementos `path`, não incorpora uma imagem bitmap disfarçada. Isso não implica equivalência de qualidade com a referência, que documenta modelos próprios de aprendizado de máquina, geometria subpixel, ajuste paramétrico e topologia compartilhada.

Para aumentar a fidelidade geométrica de maneira legal e auditável, a próxima etapa técnica é avaliar motores abertos como **VTracer (MIT)** e **ImageTracerJS (Unlicense)** sobre um conjunto de **imagens próprias ou licenciadas**, comparando forma, número de nós e erro visual — sem usar saídas proprietárias como dados de treinamento.

## Validação e critérios de aceitação

- [x] Testes de motor e serializador (14 aprovados).
- [x] Transpilação sintática dos módulos TS/TSX (19 arquivos, sem erros sintáticos).
- [ ] `npm run build` com dependências completas.
- [ ] Teste interativo de paleta, edição, recorte e download no navegador real.
- [ ] Playwright 390px/768px/1440px com Vercel e referência no mesmo navegador.
- [ ] Aferição quantitativa da qualidade do SVG sobre imagens de teste próprias.
- [ ] Validação de conteúdo dos arquivos PDF, EPS, DXF em softwares externos.

A diferença entre «reproduzido» e «verificado» é intencional: implementação codificada não é garantia de êxito em todas as imagens, navegadores e fluxos.
