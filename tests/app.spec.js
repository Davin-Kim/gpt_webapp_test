import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const fail = () => {
      throw Error("파일/저장소 접근은 허용되지 않습니다");
    };
    Object.defineProperty(window, "indexedDB", { get: fail });
    Object.defineProperty(window, "localStorage", { get: fail });
    Object.defineProperty(window, "sessionStorage", { get: fail });
    window.showOpenFilePicker = fail;
    window.showSaveFilePicker = fail;
    window.FileReader = fail;
    window.fetch = fail;
  });
  await page.goto("/gpt_webapp_test/");
  await expect(page.locator("#pages .paper").first()).toBeVisible();
});
test("파일/저장소 API 없이 실행, 업로드·다운로드 UI 없음", async ({ page }) => {
  await expect(page.locator("input[type=file]")).toHaveCount(0);
  await expect(
    page.locator("#open-file,#download-menu,#insert-image"),
  ).toHaveCount(0);
  await expect(page.locator("#edit-toolbar")).not.toBeVisible();
  await expect(page.locator("#pages .paper")).toHaveCount(2);
  await expect(page.locator(".session-notice")).toContainText(
    "자동 저장하지 않습니다",
  );
  await page.locator("#zoom").selectOption("75");
  await page.locator("[data-view=spread]").click();
  await expect(page.locator("#pages")).toHaveClass(/spread/);
  await page.locator("#next-page").click();
  await expect(page.locator("#page-number")).toHaveValue("2");
});
test("텍스트 붙여넣기·편집·서식·복사용 텍스트·새로고침 초기화", async ({
  page,
}) => {
  await page.locator("#paste-text").click();
  await page.locator("#paste-content").fill("첫 번째 문장\n두 번째 문장");
  await page.locator("#paste-form button").click();
  await expect(page.locator("#pages")).toContainText("첫 번째 문장");
  await page.locator("#edit-mode").click();
  await page.locator("#editor .tiptap").fill("편집한 본문");
  await page.keyboard.press("Control+a");
  await page.locator("[data-command=bold]").click();
  await expect(page.locator("#editor strong")).toContainText("편집한 본문");
  await page.locator("#copy-text").click();
  await expect(page.locator("#copy-content")).toHaveValue("편집한 본문");
  await page.locator("#select-copy").click();
  expect(
    await page
      .locator("#copy-content")
      .evaluate((el) => el.selectionEnd - el.selectionStart),
  ).toBe(6);
  await page.locator("#modal-close").click();
  page.on("dialog", (d) => d.accept());
  await page.reload();
  await expect(page.locator("#pages")).not.toContainText("편집한 본문");
  await expect(page.locator("#pages")).toContainText("텍스트를 더 편하게");
});
test("표·검색 바꾸기·보기 전환·모바일", async ({ page }) => {
  await page.locator("#new-doc").click();
  await page.locator("#editor .tiptap").fill("테스트 문장");
  await page.locator("#search-toggle").click();
  await page.locator("#search-input").fill("문장");
  await page.locator("#replace-input").fill("내용");
  await page.locator("#replace-all").click();
  await expect(page.locator("#editor")).toContainText("테스트 내용");
  await page.locator("#search-close").click();
  await page.locator("#editor .tiptap").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.locator("#insert-table").click();
  await page.locator("#table-form button").click();
  await expect(page.locator("#editor table")).toBeVisible();
  await page.locator("#view-mode").click();
  await expect(page.locator("#edit-toolbar")).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#sidebar-toggle").click();
  await page.locator("#zoom").selectOption("width");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
