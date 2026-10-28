# Validação da evolução integrada

- Instalação: `npm ci --no-audit --no-fund` concluída.
- TypeScript: `npm run typecheck`.
- Lint: `npm run lint`, sem erros/avisos ao final.
- Produção: `npm run build`, todas as rotas compiladas.
- Motor/editor/exportadores: **21/21 aprovados**, testes com `npm run test:engine`.
- Navegador: **15/15 testes aprovados em 25,3 s**, suíte Playwright em Chromium, contra `next start`; larguras 390/768/1440, detecção de overflow, falhas JavaScript, exportação de cinco formatos, recorte, região, histórico, zoom, arraste e cancelamento.
- Inspeção independente: PyMuPDF abriu PDF com caminho vetorial e furo transparente; Ghostscript renderizou EPS com furo transparente; ezdxf abriu DXF com duas polilinhas, zero erros e zero correções de auditoria.
- Inspeção visual: screenshots mobile/desktop do editor e mosaico original/anterior/novo do benchmark.

O download convencional do Chromium do Playwright retornou arquivo inválido neste ambiente. Foi usado Chromium 153 distribuído pelo pacote npm `@sparticuz/chromium`, extraído somente para o ambiente temporário de teste. Essa dependência não faz parte do produto ou do lockfile. Configuração admite `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; instalações normais podem usar `npx playwright install chromium`.

Executar os E2E de produção: primeiro `npm run build`, depois `E2E_PRODUCTION=1 npm run test:e2e`.

Resultados de deployment e commit: conferir status GitHub/Vercel do commit desta entrega; nenhum sucesso de deployment é presumido pelo build local.
