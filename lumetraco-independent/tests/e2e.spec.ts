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
