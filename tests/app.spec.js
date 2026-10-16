import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const fail = () => {
      throw Error("File, storage and API access disabled");
    };
    for (const key of ["localStorage", "sessionStorage", "indexedDB"])
      Object.defineProperty(window, key, { get: fail });
    window.fetch = fail;
    window.FileReader = fail;
    window.showOpenFilePicker = fail;
    window.showSaveFilePicker = fail;
  });
  await page.goto("/gpt_webapp_test/");
});
test("poster information, filtering, details and complete timetable", async ({
  page,
}) => {
  await expect(page.locator("h1")).toContainText("안산읍성");
  await expect(page.locator(".program-card")).toHaveCount(8);
  await expect(page.locator(".artist")).toHaveCount(6);
  await page.getByRole("tab", { name: "공연", exact: true }).click();
  await expect(page.locator(".program-card")).toHaveCount(3);
  await page
    .locator(".program-card")
    .first()
    .getByRole("button", { name: /프로그램 자세히/ })
    .click();
  await expect(page.locator("dialog")).toBeVisible();
  await expect(page.locator("dialog h2")).toHaveText("개막식");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.locator("#calendar").click();
  await expect(page.locator("dialog .saved-list article")).toHaveCount(8);
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).not.toBeVisible();
});
test("interest list works without persistence or file APIs", async ({
  page,
}) => {
  await page
    .getByRole("button", {
      name: "정조대왕 능행차 공동재현 일정에 담기",
      exact: true,
    })
    .click();
  await expect(page.locator("#saved-count")).toHaveText("1");
  await page.locator("#my-schedule").click();
  await expect(page.locator("dialog .saved-list article")).toHaveCount(1);
  await page
    .getByRole("button", { name: "일정에서 삭제", exact: true })
    .click();
  await expect(page.locator("dialog .saved-list article")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator("#saved-count")).toHaveText("0");
  await expect(page.locator("input[type=file],a[download],iframe")).toHaveCount(
    0,
  );
});
test("mobile menu, FAQ and layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "메뉴 열기" }).click();
  await page.locator("nav").getByRole("link", { name: "관람 안내" }).click();
  await expect(page.locator("#menu-toggle")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.locator("summary").first().click();
  await expect(page.locator("details").first()).toHaveAttribute("open", "");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "/tmp/ansan-mobile.png", fullPage: true });
});
