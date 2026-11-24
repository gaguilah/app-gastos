import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const locale of ["es-CO", "en-US"]) {
  test.describe(`accesibilidad (${locale})`, () => {
    test.use({ locale });

    test("el login no tiene violaciones de WCAG 2.2 AA", async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", locale.slice(0, 2));
      const r = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(r.violations).toEqual([]);
    });
  });
}
