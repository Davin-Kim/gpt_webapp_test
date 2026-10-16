import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/gpt_webapp_test/");
});
test("메뉴 10개·추첨·연속 변경·추가·삭제·새로고침 저장", async ({ page }) => {
  await expect(page.locator("#menu-list li")).toHaveCount(10);
  await page.locator("#pick").click();
  await expect(page.locator("#pick")).toBeEnabled();
  const first = await page.locator("#result").textContent();
  await expect(page.locator("#menu-list")).toContainText(first);
  await page.locator("#pick").click();
  await expect(page.locator("#pick")).toBeEnabled();
  await expect(page.locator("#result")).not.toHaveText(first);
  await page.locator("#menu-input").fill("떡볶이");
  await page.locator("#add-form button").click();
  await expect(page.locator("#menu-list li")).toHaveCount(11);
  await page.getByRole("button", { name: "떡볶이 삭제", exact: true }).click();
  await expect(page.locator("#menu-list li")).toHaveCount(10);
  await page.locator("#menu-input").fill("라면");
  await page.locator("#menu-input").press("Enter");
  await page.reload();
  await expect(page.locator("#menu-list li")).toHaveCount(11);
  await expect(page.locator("#menu-list")).toContainText("라면");
});
test("빈값·중복, 전체 삭제·빈 목록 유지·1개 추첨·모바일", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#add-form button").click();
  await expect(page.locator("#form-error")).toContainText("입력");
  await page.locator("#menu-input").fill("김치찌개");
  await page.locator("#add-form button").click();
  await expect(page.locator("#form-error")).toContainText("이미");
  for (let i = 0; i < 10; i++) await page.locator(".delete").first().click();
  await expect(page.locator("#pick")).toBeDisabled();
  await page.reload();
  await expect(page.locator("#menu-list li")).toHaveCount(0);
  await page.locator("#menu-input").fill("나만의 메뉴");
  await page.locator("#add-form button").click();
  await page.locator("#pick").click();
  await expect(page.locator("#result")).toHaveText("나만의 메뉴");
  await expect(page.locator("#pick")).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/lunch-mobile.png", fullPage: true });
});
test("저장 실패 시 메뉴를 변경하거나 성공 처리하지 않음", async ({ page }) => {
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw Error("테스트 저장 실패");
    };
  });
  await page.locator("#menu-input").fill("저장 실패 메뉴");
  await page.locator("#add-form button").click();
  await expect(page.locator("#storage-error")).toContainText(
    "저장하지 못했어요",
  );
  await expect(page.locator("#menu-list li")).toHaveCount(10);
  await expect(page.locator("#menu-input")).toHaveValue("저장 실패 메뉴");
});
