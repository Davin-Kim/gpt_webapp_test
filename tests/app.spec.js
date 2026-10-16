import { test, expect } from "@playwright/test";
import { hwpxFixture, docxFixture } from "./fixtures.js";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
let hwpx, word;
test.beforeAll(async () => {
  hwpx = await hwpxFixture();
  word = await docxFixture();
});
test.beforeEach(async ({ page }) => {
  await page.goto("/gpt_webapp_test/");
  await expect(page.locator("#pages .paper").first()).toBeVisible();
});
async function openFile(page, name, buffer) {
  const handler = (dialog) => dialog.accept();
  page.on("dialog", handler);
  try {
    await page
      .locator("#file-input")
      .setInputFiles({ name, mimeType: "application/octet-stream", buffer });
    await expect(page.locator("#format-badge")).toHaveText(
      name.endsWith("docx") ? "DOCX" : "HWPX",
    );
    await expect(page.locator("#doc-name")).toHaveValue(
      name.replace(/\.(hwpx|docx)$/, ""),
    );
    await expect(page.locator("#loading")).not.toBeVisible();
  } finally {
    page.off("dialog", handler);
  }
}
async function edit(page) {
  await page.locator("#edit-mode").click();
  await expect(page.locator("#edit-toolbar")).toBeVisible();
}
async function downloadDoc(page, type) {
  await page.locator("#download-menu").click();
  const download = page.waitForEvent("download");
  await page.locator(`[data-export=${type}]`).click();
  if (type === "hwpx" || type === "docx")
    await page.locator("#confirm-export").click();
  const file = await download;
  return readFile(await (await file).path());
}
test("보기 전용·쪽 이동·배율·두 쪽·여러 쪽·검색·모바일", async ({ page }) => {
  await expect(page.locator("#edit-toolbar")).not.toBeVisible();
  await expect(page.locator("#pages .paper")).toHaveCount(2);
  await page.locator("#zoom").selectOption("50");
  await expect(page.locator("#zoom")).toHaveValue("50");
  await page.locator("[data-view=spread]").click();
  await expect(page.locator("#pages")).toHaveClass(/spread/);
  await page.locator("[data-view=grid]").click();
  await expect(page.locator("#pages")).toHaveClass(/grid/);
  await page.locator("[data-view=single]").click();
  await page.locator("#next-page").click();
  await expect(page.locator("#page-number")).toHaveValue("2");
  await page.locator("#search-toggle").click();
  await page.locator("#search-input").fill("문서");
  await expect(page.locator("#search-count")).not.toHaveText("0건");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#sidebar-toggle").click();
  await page.locator("#zoom").selectOption("width");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/doc-studio-mobile.png", fullPage: true });
});
test("HWPX 실제 파일 가져오기·표·이미지·편집·HWPX/DOCX 저장 후 재열기", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openFile(page, "검증.hwpx", hwpx);
  await expect(page.locator("#pages")).toContainText("HWPX 가져오기 검증");
  await expect(page.locator("#pages table").first()).toContainText("표 왼쪽");
  await expect(page.locator("#pages img").first()).toBeVisible();
  await edit(page);
  await page.locator("#editor .tiptap").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("수정한 문서 내용");
  await expect(page.locator("#editor")).toContainText("수정한 문서 내용");
  const out = await downloadDoc(page, "hwpx");
  const zip = await JSZip.loadAsync(out);
  expect(await zip.file("mimetype").async("string")).toContain("hwp");
  const section = await zip.file("Contents/section0.xml").async("string");
  expect(section).toContain("수정한 문서 내용");
  await openFile(page, "저장본.hwpx", out);
  await expect(page.locator("#pages")).toContainText("수정한 문서 내용");
  const docx = await downloadDoc(page, "docx");
  const wz = await JSZip.loadAsync(docx);
  expect(await wz.file("word/document.xml").async("string")).toContain(
    "수정한 문서 내용",
  );
  await openFile(page, "저장본.docx", docx);
  await expect(page.locator("#pages")).toContainText("수정한 문서 내용");
  await expect(page.locator("#pages table").first()).toContainText("표 오른쪽");
  expect(errors).toEqual([]);
});
test("Word 파일·쪽 나누기·HWPX 변환", async ({ page }) => {
  await openFile(page, "Word.docx", word);
  await expect(page.locator("#pages")).toContainText("Word 호환성 검증");
  await expect(page.locator("#pages table")).toContainText("DOCX 표 셀 1");
  await expect(page.locator("#pages img")).toBeVisible();
  await expect(page.locator("#pages .paper")).toHaveCount(2);
  const out = await downloadDoc(page, "hwpx");
  await openFile(page, "Word변환.hwpx", out);
  await expect(page.locator("#pages")).toContainText("명시적 두 번째 쪽");
});
test("새 문서·서식·표 편집·검색 바꾸기·실행취소·임시저장 복구", async ({
  page,
}) => {
  await page.locator("#new-doc").click();
  await page.locator("#editor .tiptap").fill("편집할 문장");
  await page.keyboard.press("Control+a");
  await page.locator("[data-command=bold]").click();
  await expect(page.locator("#editor strong")).toContainText("편집할 문장");
  await page.locator("#text-color").fill("#cc2233");
  await page.locator("#font-size").selectOption("18");
  await page.locator("#font-family").selectOption("Batang");
  await page.locator("[data-align=center]").click();
  await page.locator("[data-command=superscript]").click();
  await expect(page.locator("#editor sup")).toContainText("편집할 문장");
  await page.locator("[data-command=superscript]").click();
  await page.locator("#editor .tiptap").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.locator("#insert-table").click();
  await page.locator("#table-form button").click();
  await expect(page.locator("#editor table")).toBeVisible();
  await page.locator("#editor td").first().click();
  await page.keyboard.type("표 내용");
  await page.locator("[data-table=addRowAfter]").click();
  await expect(page.locator("#editor tr")).toHaveCount(4);
  await page.locator("#search-toggle").click();
  await page.locator("#search-input").fill("문장");
  await page.locator("#replace-input").fill("기록");
  await page.locator("#replace-all").click();
  await expect(page.locator("#editor")).toContainText("편집할 기록");
  await page.locator("#search-close").click();
  await page.locator("[data-command=undo]").click();
  await expect(page.locator("#editor")).toContainText("편집할 문장");
  await expect(page.locator("#save-state")).toHaveText(
    "이 브라우저에 임시 저장됨",
  );
  await page.reload();
  await expect(page.locator("#recovery-banner")).toBeVisible();
  await page.locator("#restore-draft").click();
  await expect(page.locator("#pages")).toContainText("편집할 문장");
});
test("긴 본문 자동 페이지 분할·용지설정·쪽 나눔", async ({ page }) => {
  await page.locator("#new-doc").click();
  await page
    .locator("#editor .tiptap")
    .fill("한 문단의 매우 긴 본문입니다. ".repeat(900));
  await page.locator("#view-mode").click();
  expect(await page.locator("#pages .paper").count()).toBeGreaterThan(2);
  const text = await page
    .locator(".page-content")
    .evaluateAll((els) => els.map((el) => el.textContent).join(""));
  expect((text.match(/매우 긴 본문/g) || []).length).toBe(900);
  await edit(page);
  await page.locator("#page-settings").click();
  await page.locator("#page-form [name=orientation]").selectOption("landscape");
  await page.locator("#page-form button").click();
  await page.locator("#view-mode").click();
  const size = await page
    .locator(".paper")
    .first()
    .evaluate((el) => ({ w: el.offsetWidth, h: el.offsetHeight }));
  expect(size.w).toBeGreaterThan(size.h);
});
test("잘못된 파일·악성 HTML 제거·저장 실패·텍스트 다운로드", async ({
  page,
}) => {
  await page.locator("#file-input").setInputFiles({
    name: "오류.hwpx",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("not a zip"),
  });
  await expect(page.locator("dialog")).toContainText("파일을 열지 못했습니다");
  await page.locator("#modal-close").click();
  await expect(page.locator("#pages")).toContainText("문서, 더 가볍게 열다");
  const result = await page.evaluate(async () => {
    const { cleanHTML } = await import("/gpt_webapp_test/src/sanitize.js");
    return cleanHTML(
      '<p style="position:fixed;color:red;background-image:url(https://evil.test)">본문</p><script>alert(1)</script><img src="https://evil.test/t.png"><a href="javascript:alert(1)">링크</a>',
    );
  });
  expect(result).not.toContain("script");
  expect(result).not.toContain("evil.test");
  expect(result).not.toContain("position");
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = () => {
      throw Error("테스트 저장 실패");
    };
  });
  await page.locator("#new-doc").click();
  await page.locator("#editor .tiptap").fill("저장 실패에도 남은 본문");
  await expect(page.locator("#storage-error")).toBeVisible();
  await expect(page.locator("#save-state")).not.toContainText("임시 저장됨");
  const txt = await downloadDoc(page, "txt");
  expect(txt.toString("utf8")).toContain("저장 실패에도 남은 본문");
});

test("수동 쪽 나누기의 HWPX native 저장·재열기·이미지 크기", async ({
  page,
}) => {
  await page.locator("#new-doc").click();
  await page.locator("#editor .tiptap").fill("첫 번째 수동 페이지");
  await page.keyboard.press("Control+End");
  await page.locator("[data-command=pageBreak]").click();
  await page.keyboard.type("두 번째 수동 페이지");
  await page.locator("#view-mode").click();
  await expect(page.locator("#pages .paper")).toHaveCount(2);
  const output = await downloadDoc(page, "hwpx");
  expect(output.readUInt16LE(8)).toBe(0);
  const zip = await JSZip.loadAsync(output);
  expect(await zip.file("Contents/section0.xml").async("string")).toMatch(
    /pageBreak="1"/,
  );
  await openFile(page, "쪽나눔.hwpx", output);
  await expect(page.locator("#pages .paper")).toHaveCount(2);
  await expect(page.locator("#pages")).toContainText("두 번째 수동 페이지");
  await openFile(page, "이미지.docx", word);
  await expect(page.locator("#pages img").first()).toHaveAttribute(
    "width",
    "40",
  );
});

test("Word 내보내기·재가져오기에서 글자 크기·글꼴·색·정렬 보존", async ({
  page,
}) => {
  await page.locator("#new-doc").click();
  await page.locator("#editor .tiptap").fill("글자 서식 검증");
  await page.keyboard.press("Control+a");
  await page.locator("#font-size").selectOption("18");
  await page.locator("#font-family").selectOption("Arial");
  await page.locator("#text-color").fill("#cc2233");
  await page.locator("[data-align=center]").click();
  const out = await downloadDoc(page, "docx");
  const z = await JSZip.loadAsync(out);
  const xml = await z.file("word/document.xml").async("string");
  expect(xml).toContain('w:val="36"');
  expect(xml).toContain("cc2233");
  await openFile(page, "글자서식.docx", out);
  const styles = await page.locator(".page-content").first().innerHTML();
  expect(styles).toContain("18pt");
  expect(styles).toContain("Arial");
  expect(styles).toContain("text-align: center");
  expect(styles).toContain("rgb(204, 34, 51)");
});
