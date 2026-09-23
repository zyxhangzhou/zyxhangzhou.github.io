import { expect, test } from "@playwright/test";
import { POSTS, ROUTES } from "../support/routes";

test("@regression 首页壁纸按亮暗主题轮换不同图集", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(ROUTES.home);

  const lightSet = page.locator('.header-cover-set[data-cover-theme="light"]');
  const darkSet = page.locator('.header-cover-set[data-cover-theme="dark"]');

  await expect(lightSet).toBeVisible();
  await expect(darkSet).toBeHidden();
  await expect(lightSet.locator(".cover-item")).toHaveCount(4);
  await expect(darkSet.locator(".cover-item")).toHaveCount(2);
  await expect(lightSet.locator(".cover-item").first()).toHaveCSS("opacity", "1");

  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(darkSet).toBeVisible();
  await expect(lightSet).toBeHidden();
  await expect(darkSet.locator(".cover-item").first()).toHaveCSS("opacity", "1");
});

test("@regression 文章页头图不参与首页壁纸轮换", async ({ page }) => {
  await page.goto(POSTS.helloWorld);

  await expect(page.locator(".header-cover-set")).toHaveCount(0);
  await expect(page.locator("#imgs .single-image")).toBeVisible();
});
