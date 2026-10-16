import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/gpt_webapp_test/");
});
test("섹션 이동·필터·상세·관심 일정·재접속·캘린더·FAQ", async ({ page }) => {
  await expect(page.locator("h1")).toContainText("안산읍성");
  await page.locator('nav a[href="#program"]').click();
  await page.getByRole("tab", { name: "공연", exact: true }).click();
  await expect(page.locator("#program-grid article")).toHaveCount(3);
  await page.locator("#program-grid [data-detail]").first().click();
  await expect(page.locator("dialog")).toContainText("개막식");
  await page.locator("dialog [data-save]").click();
  await expect(page.locator("#saved-count")).toHaveText("1");
  await page.reload();
  await expect(page.locator("#saved-count")).toHaveText("1");
  await page.locator("#my-schedule").click();
  await expect(page.locator(".saved-list")).toContainText("개막식");
  await page.locator("[data-in-schedule]").click();
  await expect(page.locator(".saved-list")).toContainText(
    "아직 담은 일정이 없습니다",
  );
  await page.locator(".modal-close").click();
  const download = page.waitForEvent("download");
  await page.locator("#calendar").click();
  await expect((await download).suggestedFilename()).toBe(
    "안산읍성문화예술제.ics",
  );
  await page.locator("summary").first().click();
  await expect(page.locator("details").first()).toHaveAttribute("open", "");
  await page.screenshot({ path: "/tmp/festival-desktop.png", fullPage: true });
});
test("모바일 메뉴·필터·모달 닫기·가로 넘침 없음", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#menu-toggle").click();
  await expect(page.locator("nav")).toBeVisible();
  await page.locator('nav a[href="#visit"]').click();
  await expect(page.locator("#menu-toggle")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.getByRole("tab", { name: "재현", exact: true }).click();
  await expect(page.locator("#program-grid article")).toHaveCount(1);
  await page.locator("#program-grid [data-detail]").click();
  await expect(page.locator("dialog")).toContainText("정조대왕");
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/festival-mobile.png", fullPage: true });
});
test("저장 실패 안내", async ({ page }) => {
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw Error("test failure");
    };
  });
  await page.locator("#program-grid [data-save]").first().click();
  await expect(page.locator("#toast")).toContainText("저장하지 못했습니다");
  await expect(page.locator("#saved-count")).toHaveText("0");
});
