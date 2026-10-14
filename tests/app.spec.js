import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";
async function begin(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await page.locator("[name=openingDate]").fill("2026-01-01");
  await page.locator("[name=opening]").fill("100");
  await page.locator("#opening-form button").click();
  await expect(page.locator("#notice")).toContainText("저장");
}
async function add(
  page,
  {
    date = "2026-12-31",
    amount = "1,000",
    type = "수입",
    description = "브라우저 테스트",
  } = {},
) {
  await page.locator("#add").click();
  await page.locator("[name=date]").fill(date);
  await page.locator("#modal [name=type]").selectOption(type);
  await page
    .locator("[name=category]")
    .selectOption({ label: type === "수입" ? "급여" : "식비" });
  await page.locator("[name=payment]").selectOption({ label: "현금" });
  await page.locator("[name=description]").fill(description);
  await page.locator("[name=amount]").fill(amount);
  await page.locator("#transaction-form button").first().click();
  await expect(page.locator("#modal")).not.toBeVisible();
}
test("거래 CRUD·과거 수정·월 전환·연간 집계·새로고침·백업 복원", async ({
  page,
}) => {
  await begin(page);
  await add(page);
  await add(page, { date: "2027-01-01", amount: "300", type: "지출" });
  await page.getByRole("button", { name: "대시보드", exact: true }).click();
  await page.locator("#month").fill("2027-01");
  await expect(page.locator(".summary")).toContainText("800원");
  await expect(
    page.locator(".cards").filter({ hasText: "계산 불가" }),
  ).toContainText("계산 불가");
  await page.locator("#prev").click();
  await expect(page.locator("h1")).toContainText("2026년 12월");
  await page.locator("#next").click();
  await expect(page.locator("h1")).toContainText("2027년 01월");
  await page.locator("#annual").click();
  await expect(page.locator("h1")).toContainText("2027년");
  await expect(page.locator(".cards").first()).toContainText("-300원");
  await page.getByRole("button", { name: "거래 내역", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.locator("[data-edit]").nth(1).click();
  await page.locator("[name=amount]").fill("2000");
  await page.locator("#transaction-form button").click();
  await expect(page.locator("tbody")).toContainText("1,800원");
  await page.reload();
  await page.getByRole("button", { name: "거래 내역", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByRole("button", { name: "설정", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.locator("#backup").click();
  const file = await (await download).path();
  await page.getByRole("button", { name: "거래 내역", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.locator("[data-delete]").first().click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "설정", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.locator("#restore").setInputFiles(file);
  await expect(page.locator("#notice")).toContainText("복원");
  await page.getByRole("button", { name: "거래 내역", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
});
test("필수값·잘못된 금액, 계속 입력, 자산 미입력 CRUD, 모바일", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await begin(page);
  await page.locator("#add").click();
  await page.locator("[name=amount]").fill("-1");
  await page.locator("#transaction-form button").first().click();
  await expect(page.locator("[data-error=amount]")).toContainText("양의 정수");
  await expect(page.locator("[data-error=description]")).toContainText("필수");
  await page.locator("[name=date]").fill("2027-01-01");
  await page.locator("[name=category]").selectOption({ label: "식비" });
  await page.locator("[name=payment]").selectOption({ label: "현금" });
  await page.locator("[name=description]").fill("계속 입력 테스트");
  await page.locator("[name=amount]").fill("500");
  await page.getByRole("button", { name: "저장 후 계속 입력" }).click();
  await expect(page.locator("#modal")).toBeVisible();
  await expect(page.locator("[name=description]")).toHaveValue("");
  await page.locator("#close").click();
  await page.getByRole("button", { name: "자산", exact: true }).click();
  await page.locator("#asset-add").click();
  await page.locator("[name=name]").fill("테스트 예금");
  await page.locator("#asset-form button").click();
  await expect(page.locator("tbody")).toContainText("미입력");
  await page.locator("[data-asset-edit]").click();
  await page.locator("[name=amount]").fill("10000");
  await page.locator("#asset-form button").click();
  await expect(page.locator("tbody")).toContainText("10,000원");
  page.once("dialog", (d) => d.accept());
  await page.locator("[data-asset-delete]").click();
  await expect(page.locator("tbody")).not.toContainText("테스트 예금");
  await page.getByRole("button", { name: "대시보드", exact: true }).click();
  await page.locator("#month").fill("2029-02");
  await expect(page.locator(".insight")).toContainText(
    "분석을 표시하지 않습니다",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/my-money-mobile.png", fullPage: true });
});
test("XLSX 미리보기·동일 정상 복수 거래·중복 가져오기·내보내기 재가져오기", async ({
  page,
}) => {
  await begin(page);
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("입력").addRows([
    ["날짜", "구분", "분류", "내용", "결제수단", "금액", "메모"],
    ["2026-01-01", "시작 잔액", "", "", "", 100, ""],
    ["2026-12-31", "수입", "급여", "테스트 전용", "현금", 1000, ""],
    ["2027-01-01", "지출", "식비", "같은 거래", "현금", 300, ""],
    ["2027-01-01", "지출", "식비", "같은 거래", "현금", 300, ""],
  ]);
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const file = {
    name: "test-only.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer,
  };
  await page.locator("#import").setInputFiles(file);
  await expect(page.locator("#modal")).toContainText("3건");
  await page.locator("#import-form button").click();
  await expect(page.locator("#notice")).toContainText("완료");
  await page.locator("#import").setInputFiles(file);
  await page.locator("#import-form button").click();
  await expect(page.locator("#import-error")).toContainText("동일 파일");
  await page.locator("#close").click();
  const download = page.waitForEvent("download");
  await page.locator("#xlsx-export").click();
  const out = await (await download).path();
  await page.locator("#import").setInputFiles(out);
  await expect(page.locator("#modal")).toContainText("3건");
  await expect(page.locator("#modal [name=opening]")).toHaveValue("100");
  await page.locator("[name=mode]").selectOption("replace");
  page.once("dialog", (d) => d.accept());
  await page.locator("#import-form button").click();
  await page.getByRole("button", { name: "대시보드", exact: true }).click();
  await expect(page.locator(".summary")).toContainText("500원");
});
test("저장 실패는 성공 표시 없이 재시도 가능", async ({ page }) => {
  await begin(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    window.realPut = original;
    IDBObjectStore.prototype.put = function () {
      throw new DOMException("테스트 저장 실패", "QuotaExceededError");
    };
  });
  await page.locator("#add").click();
  await page.locator("[name=category]").selectOption({ label: "식비" });
  await page.locator("[name=payment]").selectOption({ label: "현금" });
  await page.locator("[name=description]").fill("저장 실패");
  await page.locator("[name=amount]").fill("100");
  const dialog = page.waitForEvent("dialog");
  await page.locator("#transaction-form button").first().click();
  const d = await dialog;
  expect(d.message()).toContain("저장 실패");
  await d.accept();
  await expect(page.locator("#modal")).toBeVisible();
  await page.evaluate(() => (IDBObjectStore.prototype.put = window.realPut));
  await page.locator("#transaction-form button").first().click();
  await expect(page.locator("#modal")).not.toBeVisible();
});

test("사용자 원본 파일의 브라우저 가져오기와 정확한 월·자산 결과", async ({
  page,
}) => {
  test.skip(!process.env.ORIGINAL_XLSX, "실제 원본 경로가 제공되지 않음");
  await page.goto("/");
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await page.locator("#import").setInputFiles(process.env.ORIGINAL_XLSX);
  await expect(page.locator("#modal")).toContainText("39건");
  await expect(page.locator("#modal [name=opening]")).toHaveValue("85382");
  await page.locator("#import-form button").click();
  await expect(page.locator("#notice")).toContainText("완료");
  await page.getByRole("button", { name: "대시보드", exact: true }).click();
  await expect(page.locator("#month")).toHaveValue("2026-10");
  await expect(page.locator(".cards").first()).toContainText("500,440원");
  await expect(page.locator(".summary")).toContainText("450,260원");
  await page.locator("#month").fill("2026-09");
  await expect(page.locator(".cards").first()).toContainText("1,788,611원");
  await expect(page.locator(".cards").first()).toContainText("923,293원");
  await expect(page.locator(".cards").first()).toContainText("865,318원");
  await page.screenshot({ path: "/tmp/my-money-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "거래 내역", exact: true }).click();
  await page.locator("[data-filter=month]").fill("2026-09");
  await expect(page.locator(".section-head")).toContainText("31건");
  await page.locator("[data-filter=sort]").selectOption("amount-asc");
  await expect(page.locator(".section-head")).toContainText("31건");
  await page.getByRole("button", { name: "자산", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await expect(page.getByText("미입력", { exact: true })).toHaveCount(6);
});

test("브라우저 프로세스 종료 후 재실행해도 IndexedDB 유지", async () => {
  const { chromium } = await import("@playwright/test");
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = await mkdtemp(join(tmpdir(), "my-money-persistence-"));
  let context;
  try {
    context = await chromium.launchPersistentContext(dir, {
      baseURL: "http://127.0.0.1:5173",
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
    let page = await context.newPage();
    await page.goto("http://127.0.0.1:5173");
    await begin(page);
    await add(page);
    await context.close();
    context = await chromium.launchPersistentContext(dir, {
      baseURL: "http://127.0.0.1:5173",
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
    page = await context.newPage();
    await page.goto("http://127.0.0.1:5173");
    await page.getByRole("button", { name: "거래 내역", exact: true }).click();
    await expect(page.locator("tbody")).toContainText("브라우저 테스트");
    await expect(page.locator("tbody")).toContainText("1,100원");
  } finally {
    await context?.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("분류·결제수단 설정 변경 및 필터·검색, 비활성 과거 기록 보존", async ({
  page,
}) => {
  await begin(page);
  await add(page, { type: "지출", description: "검색 가능한 메모 거래" });
  await page.getByRole("button", { name: "설정", exact: true }).click();
  page.once("dialog", (d) => d.accept("생활 식비"));
  await page.locator("[data-rename-category]").nth(5).click();
  await expect(
    page.locator(".manage").filter({ hasText: "생활 식비" }),
  ).toContainText("생활 식비");
  await page.locator("[data-toggle-category]").nth(5).click();
  await expect(page.locator("[data-toggle-category]").nth(5)).toHaveText(
    "활성화",
  );
  await page.locator("#payment-add [name=name]").fill("새 결제수단");
  await page.locator("#payment-add button").click();
  await expect(page.locator(".manage").last()).toContainText("새 결제수단");
  await page.locator("#category-add [name=name]").fill("새 분류");
  await page.locator("#category-add button").click();
  await expect(
    page.locator(".manage").filter({ hasText: "새 분류" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "거래 내역", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("생활 식비");
  await page.locator("[data-filter=search]").fill("검색 가능한");
  await page.locator("[data-filter=search]").press("Tab");
  await expect(page.locator(".section-head")).toContainText("1건");
  await page.locator("[data-filter=type]").selectOption("수입");
  await expect(page.locator(".section-head")).toContainText("0건");
  await page.locator("#reset").click();
  await expect(page.locator(".section-head")).toContainText("1건");
});
