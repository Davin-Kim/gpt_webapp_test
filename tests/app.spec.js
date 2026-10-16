import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const fail = () => {
      throw Error("이 앱은 저장소/파일 API를 사용하면 안 됩니다");
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
  await expect(page.locator("h1")).toBeVisible();
});
test("홈 목차·24개 노트 연결·챕터 이동·완료 표시·이전 다음·직접 주소", async ({
  page,
}) => {
  await expect(page.locator(".chapter-card")).toHaveCount(5);
  await expect(page.locator(".chapter-links>a")).toHaveCount(24);
  await page.locator('.chapter-links a[href="#/learn/security"]').click();
  await expect(page.locator("h1")).toContainText("보안");
  await expect(page.locator(".lesson-meta")).toContainText("9쪽");
  await page.locator("#complete-lesson").click();
  await expect(page.locator("#progress-numbers")).toHaveText("1 / 24");
  await page.locator(".lesson-pagination a").last().click();
  await expect(page.locator("h1")).toHaveText("작은 업무 도구부터 찾기");
  await page.goBack();
  await expect(page.locator("h1")).toContainText("보안");
  await expect(page.locator("#complete-lesson")).toContainText("학습 완료");
  await page.locator(".brand").click();
  await page.locator('.chapter-heading[href="#/chapter/build"]').click();
  await expect(page.locator("h1")).toHaveText("AI와 대화하며 웹앱 만들기");
  await page.goto("/gpt_webapp_test/#/learn/prompt-template");
  await expect(page.locator("h1")).toHaveText("따라 쓰는 요청문 템플릿");
});
test("우상단 제목·본문 검색, 결과 없음, 키보드 이동, 검색 닫기", async ({
  page,
}) => {
  await page.locator("#site-search").fill("안드레이");
  await expect(page.locator("[data-result]")).toHaveCount(1);
  await page.locator("#site-search").press("ArrowDown");
  await page.locator("#site-search").press("Enter");
  await expect(page.locator("h1")).toHaveText("바이브 코딩이란?");
  await expect(page.locator("#search-results")).not.toBeVisible();
  await page.keyboard.press("Control+k");
  await page.locator("#site-search").fill("1.5초");
  await expect(page.locator("[data-result]")).not.toHaveCount(0);
  await page.locator("[data-result]").first().click();
  await expect(page.locator(".article-content")).toContainText("1.5초");
  await page.locator("#site-search").fill("없는검색결과999");
  await expect(page.locator(".no-results")).toContainText(
    "검색 결과가 없습니다",
  );
  await page.locator("#site-search").press("Escape");
  await expect(page.locator("#search-results")).not.toBeVisible();
});
test("요청문 선택·정리표 작성·HTML 이스케이프·세션 유지", async ({ page }) => {
  await page.goto("/gpt_webapp_test/#/learn/prompt-template");
  await page.locator("[data-prompt]").click();
  await expect(page.locator("#prompt-text")).toHaveValue(
    /입력: \[넣을 항목들\]/,
  );
  await page.locator("#select-prompt").click();
  expect(
    await page
      .locator("#prompt-text")
      .evaluate((el) => el.selectionEnd - el.selectionStart),
  ).toBeGreaterThan(30);
  await page.locator("#close-prompt").click();
  await page.goto("/gpt_webapp_test/#/learn/worksheet");
  for (const [name, value] of Object.entries({
    name: "<script>예시 앱</script>",
    audience: "가상의 사용자",
    inputs: "일수",
    process: "더하기",
    outputs: "합계",
    screen: "큰 글씨",
  }))
    await page.locator(`[name=${name}]`).fill(value);
  await page.locator("#worksheet-form button").click();
  await expect(page.locator("#generated-prompt")).toHaveValue(
    /<script>예시 앱<\/script>/,
  );
  await page.locator("#select-generated").click();
  expect(
    await page
      .locator("#generated-prompt")
      .evaluate((el) => el.selectionEnd - el.selectionStart),
  ).toBeGreaterThan(30);
  await page.locator(".brand").click();
  await page.locator('.chapter-links a[href="#/learn/worksheet"]').click();
  await expect(page.locator("[name=name]")).toHaveValue(
    "<script>예시 앱</script>",
  );
});
test("출장비 체험·원문 기대값·한도 초과·0박·빈칸 처리", async ({ page }) => {
  await page.goto("/gpt_webapp_test/#/learn/travel-example");
  await page
    .locator("#travel-form [type=submit], #travel-form button")
    .first()
    .click();
  await expect(page.locator(".travel-total")).toContainText("280,000원");
  await page.locator("[name=days]").fill("2");
  await page.locator("[name=nights]").fill("1");
  await page.locator("[name=transport]").fill("50000");
  await page.locator("[name=hotel]").fill("90000");
  await page.locator("#travel-form button").first().click();
  await expect(page.locator(".travel-total")).toContainText("160,000원");
  await expect(page.locator(".exceeded")).toBeVisible();
  await page.locator("[name=days]").fill("1");
  await page.locator("[name=nights]").fill("0");
  await page.locator("[name=transport]").fill("30000");
  await page.locator("[name=hotel]").fill("");
  await page.locator("#travel-form button").first().click();
  await expect(page.locator(".travel-total")).toContainText("50,000원");
  await page.locator("[type=reset]").click();
  await page.locator("#travel-form button").first().click();
  await expect(page.locator("[data-error=days]")).toContainText("정수");
  await expect(page.locator("#travel-result")).not.toBeVisible();
});
test("게임 중복 득점 방지·30초 종료·재시작·경로 이동 시 타이머 정리", async ({
  page,
}) => {
  await page.goto("/gpt_webapp_test/#/learn/game-roadmap");
  await page.clock.install();
  await page.locator("#game-start").click();
  await expect(page.locator("#game-level")).toBeDisabled();
  const active = page.locator(".hole.up");
  const index = await active.getAttribute("data-hole");
  await active.click();
  await expect(page.locator("#game-score")).toHaveText("1");
  await page.locator(`[data-hole="${index}"]`).click();
  await expect(page.locator("#game-score")).toHaveText("1");
  await expect(page.locator("#game-clicks")).toHaveText("2");
  await expect(page.locator("#game-rate")).toHaveText("50%");
  await page.clock.fastForward(30000);
  await expect(page.locator("#game-time")).toHaveText("0초");
  await expect(page.locator("#game-message")).toContainText("종료");
  await expect(page.locator("#game-level")).toBeEnabled();
  await page.locator("#game-start").click();
  await expect(page.locator("#game-score")).toHaveText("0");
  await page.locator(".brand").click();
  await page.clock.fastForward(40000);
  await expect(page.locator("h1")).toContainText("나의 첫 웹앱");
});
test("체크리스트·모바일 메뉴·검색·가로 넘침·파일 기능 없음", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#menu-toggle").click();
  await expect(page.locator("#sidebar")).toBeVisible();
  await page.locator('#sidebar a[href="#/chapter/refine"]').click();
  await expect(page.locator("#menu-toggle")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page
    .locator('.chapter-lessons a[href="#/learn/finish-checklist"]')
    .click();
  await page.locator('[data-check="0"]').check();
  await expect(page.locator("#checklist-score")).toHaveText("1 / 7");
  await page.locator("#site-search").fill("보안");
  await expect(page.locator("#search-results")).toBeVisible();
  await page.locator("#site-search").press("Escape");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator("input[type=file],[download]")).toHaveCount(0);
  await page.locator(".brand").click();
  await page.screenshot({ path: "/tmp/vibe-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.screenshot({ path: "/tmp/vibe-desktop.png", fullPage: true });
});
