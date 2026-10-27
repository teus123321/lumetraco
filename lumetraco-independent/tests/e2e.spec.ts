import { test, expect } from "@playwright/test";

test("guia em português e navegação principal", async ({ page }) => {
  await page.goto("/guia");
  await expect(page.getByRole("heading", { name: /Quatro etapas/i })).toBeVisible();
  await expect(page.getByText("Privacidade por padrão.")).toBeVisible();
  await expect(page.getByText("Exporte sem pagar")).toBeVisible();
});

test("exemplo: gera SVG real e permite download", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Testar com uma imagem de exemplo/i }).click();
  await expect(page).toHaveURL(/\/editor/);
  await expect(page.getByText("Pronto para baixar")).toBeVisible({ timeout: 25000 });
  await page.getByLabel("Cores da paleta").focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Pronto para baixar")).toBeVisible({ timeout: 25000 });
  await page.getByRole("button", { name: "Vetor", exact: true }).click();
  await page.getByRole("button", { name: "Comparar", exact: true }).click();
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
  test(`capturas da nova interface ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/guia", "/about"]) {
      await page.goto(route);
      const name = route === "/" ? "home" : route.slice(1);
      await page.screenshot({ path: `docs/screenshots/${name}-${width}.png`, fullPage: true });
      const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
      expect(horizontalOverflow, `Overflow em ${route} a ${width}px`).toBe(false);
    }
  });
}
