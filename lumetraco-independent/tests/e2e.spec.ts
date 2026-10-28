import { test, expect } from "@playwright/test";

async function openExample(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Testar com uma imagem de exemplo/i }).click();
  await expect(page).toHaveURL(/\/editor/);
  await expect(page.getByText("Vetor pronto")).toBeVisible({ timeout: 30000 });
}

test("guia em português e navegação principal", async ({ page }) => {
  await page.goto("/guia");
  await expect(page.getByRole("heading", { name: /Quatro etapas/i })).toBeVisible();
  await expect(page.getByText("Privacidade por padrão.")).toBeVisible();
  await expect(page.getByText("Exporte sem pagar")).toBeVisible();
});

test("vetorização, edição de uma região e exportação SVG", async ({ page }) => {
  await openExample(page);
  await page.getByRole("tab", {name: "Traçado"}).click();
  await page.getByLabel("Quantidade de cores").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Vetor pronto")).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Vetor", exact: true }).click();
  await page.getByRole("tab", { name: "Regiões" }).click();
  await page.locator("#select-region").selectOption("0");
  await page.getByRole("button", {name:"Remover região do vetor"}).click();
  await expect(page.getByRole("button", {name:"Restaurar região"})).toBeVisible();
  await page.getByRole("button", {name:"Desfazer"}).click();
  await expect(page.getByRole("button", {name:"Remover região do vetor"})).toBeVisible();
  await page.getByRole("button", {name:"Corte", exact:true}).click();
  await page.getByRole("button", {name:"Comparar", exact:true}).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar SVG" }).click();
  const dl = await downloadPromise;
  expect(dl.suggestedFilename()).toMatch(/\.svg$/);
});

test("navegação móvel acessível", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("navigation", { name: "Navegação móvel" }).getByRole("link", { name: "Como funciona" }).click();
  await expect(page).toHaveURL(/\/guia/);
});

for (const width of [390, 768, 1440]) {
  test(`capturas da interface ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/guia", "/about"]) {
      await page.goto(route);
      const name = route === "/" ? "home" : route.slice(1);
      await page.screenshot({ path: `docs/screenshots/${name}-${width}.png`, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
      expect(overflow, `Overflow em ${route} a ${width}px`).toBe(false);
    }
    await openExample(page);
    await page.screenshot({ path: `docs/screenshots/editor-${width}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
    expect(overflow, `Overflow no editor a ${width}px`).toBe(false);
  });
}

test.beforeEach(async ({ page }) => {
  page.on("pageerror", error => { throw error; });
  page.on("console", message => { if (message.type() === "error") throw new Error(message.text()); });
});

test("zoom reduz, tamanho real e arraste deslocam a área", async ({ page }) => {
  await openExample(page);
  await page.getByRole("button", { name: "Tamanho real" }).click();
  const canvas = page.locator(".viewer-canvas");
  const full = await canvas.boundingBox();
  await page.getByRole("button", { name: "Reduzir zoom" }).click();
  const small = await canvas.boundingBox();
  expect(small!.width / full!.width).toBeCloseTo(.75, 2);
  for (let i = 0; i < 8; i++) await page.getByRole("button", { name: "Ampliar zoom" }).click();
  await page.getByRole("button", { name: "Arrastar área" }).click();
  const viewport = page.locator(".vector-viewport");
  const before = await viewport.evaluate(e => e.scrollLeft);
  const box = await viewport.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 - 100, box!.y + box!.height / 2, { steps: 5 });
  await page.mouse.up();
  expect(await viewport.evaluate(e => e.scrollLeft)).toBeGreaterThan(before + 50);
  await page.getByRole("button", { name: "Restaurar zoom" }).click();
  const fitted = await canvas.boundingBox();
  expect(fitted!.height).toBeLessThan(box!.height);
});

test("recorte limita início a 99% e gera nova geometria", async ({ page }) => {
  await openExample(page);
  await page.getByRole("button", { name: "Recortar", exact: true }).click();
  await page.getByLabel("Início X (%)").fill("100");
  await expect(page.getByLabel("Início X (%)")).toHaveValue("99");
  await page.getByLabel("Início X (%)").fill("25");
  await page.getByLabel("Largura (%)").fill("50");
  await page.getByRole("button", { name: "Aplicar recorte" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText("Vetor pronto")).toBeVisible();
  await expect(page.locator(".editor-breadcrumb strong")).toContainText("recorte.png");
});

for (const format of ["svg", "png", "pdf", "eps", "dxf"]) {
  test(`exportação ${format}: arquivo real e geometria editada`, async ({ page }) => {
    await openExample(page);
    await page.getByRole("tab", { name: "Regiões" }).click();
    await page.locator("#select-region").selectOption("0");
    await page.getByLabel("Arredondar os cantos desta região").check();
    await page.getByLabel("Formato", { exact: true }).selectOption(format);
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: `Baixar ${format.toUpperCase()}` }).click();
    const download = await pending;
    const output = await download.path();
    const fs = await import("node:fs/promises");
    const data = await fs.readFile(output!);
    const text = data.toString();
    if (format === "svg") { expect(text).toContain(" C "); expect(text).not.toContain("<image"); }
    if (format === "png") expect(data.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    if (format === "pdf") { expect(text).toMatch(/^%PDF-1.4/); expect(text).toContain(" c\n"); }
    if (format === "eps") { expect(text).toMatch(/^%!PS-Adobe/); expect(text).toContain("curveto"); }
    if (format === "dxf") { expect(text).toContain("AcDbPolyline"); expect(text).toMatch(/EOF\n$/); }
  });
}

test("histórico inclui estilo e sobrevive à navegação interna", async ({ page }) => {
  await openExample(page);
  await page.getByRole("tab", { name: "Regiões" }).click();
  await page.locator("#select-region").selectOption("0");
  await page.getByRole("button", { name: "Remover região do vetor" }).click();
  await page.getByRole("button", { name: "Corte", exact: true }).click();
  await page.getByRole("button", { name: "Desfazer", exact: true }).click();
  await expect(page.getByLabel("Estilo de desenho")).toHaveValue("fill");
  await page.getByRole("button", { name: "Refazer", exact: true }).click();
  await expect(page.getByLabel("Estilo de desenho")).toHaveValue("stroke");
  await page.getByRole("link", { name: "LumeTraço, página inicial" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goBack();
  await expect(page.getByText("Vetor pronto")).toBeVisible();
  await expect(page.getByLabel("Estilo de desenho")).toHaveValue("stroke");
  await page.getByRole("tab", { name: "Regiões" }).click();
  await page.locator("#select-region").selectOption("0");
  await expect(page.getByRole("button", { name: "Restaurar região", exact: true })).toBeVisible();
});

test("cancelamento encerra worker e permite retomar", async ({ page }) => {
  await page.route("**/vector-worker.js", async route => {
    await route.fulfill({ contentType: "application/javascript", body: "self.onmessage = () => {};" });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Testar com uma imagem de exemplo/i }).click();
  await page.getByRole("button", { name: "Cancelar processamento" }).click();
  await expect(page.getByRole("button", { name: "Retomar processamento" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Baixar SVG" })).toBeDisabled();
  await page.unroute("**/vector-worker.js");
  await page.getByRole("button", { name: "Retomar processamento" }).click();
  await expect(page.getByText("Vetor pronto")).toBeVisible({ timeout: 30000 });
});

test("projeto mantém estilo, regiões e histórico após recarregar", async ({page})=>{
 await openExample(page);
 await page.getByRole("tab",{name:"Regiões"}).click();await page.locator("#select-region").selectOption("0");
 await page.getByRole("button",{name:"Remover região do vetor"}).click();await page.getByRole("button",{name:"Corte",exact:true}).click();
 await expect(page.getByText("Projeto salvo neste navegador")).toBeVisible();await page.reload();
 await expect(page.getByText("Vetor pronto")).toBeVisible();await expect(page.getByLabel("Estilo de desenho")).toHaveValue("stroke");
 await page.getByRole("tab",{name:"Regiões"}).click();await page.locator("#select-region").selectOption("0");await expect(page.getByRole("button",{name:"Restaurar região",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Desfazer",exact:true}).click();await expect(page.getByLabel("Estilo de desenho")).toHaveValue("fill");
});
test("unir regiões altera geometria e pode ser desfeito",async({page})=>{
 await openExample(page);const before=await page.locator(".status-detail").innerText();
 await page.getByRole("tab",{name:"Regiões"}).click();
 for(const index of ['0','1']){await page.locator("#select-region").selectOption(index);await page.getByLabel("Incluir na união").check();}
 await page.getByRole("button",{name:"Unir 2 regiões"}).click();await expect(page.locator(".status-detail")).not.toHaveText(before);
 await page.getByRole("button",{name:"Desfazer",exact:true}).click();await expect(page.locator(".status-detail")).toHaveText(before);
});
test("desfazer restaura parâmetros e recorte",async({page})=>{
 await openExample(page);const before=await page.locator(".status-detail").innerText();
 await page.getByRole("tab",{name:"Traçado"}).click();await page.getByLabel("Quantidade de cores").focus();await page.keyboard.press("ArrowRight");await expect(page.getByText("Vetor pronto")).toBeVisible();
 await page.getByRole("button",{name:"Desfazer",exact:true}).click();await expect(page.getByLabel("Quantidade de cores")).toHaveValue("10");await expect(page.locator(".status-detail")).toHaveText(before);
 await page.getByRole("button",{name:"Recortar",exact:true}).click();await page.getByLabel("Largura (%)").fill("50");await page.getByRole("button",{name:"Aplicar recorte"}).click();await expect(page.getByText("Vetor pronto")).toBeVisible();
 await page.getByRole("button",{name:"Desfazer",exact:true}).click();await expect(page.locator(".editor-breadcrumb strong")).not.toContainText("recorte");await expect(page.locator(".status-detail")).toHaveText(before);
});
