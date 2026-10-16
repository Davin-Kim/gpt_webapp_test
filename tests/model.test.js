import test from "node:test";
import assert from "node:assert/strict";
import { chapters, lessons } from "../src/content.js";
import {
  searchLessons,
  travelCost,
  nextHole,
  successRate,
  difficulty,
} from "../src/model.js";
test("PDF 43쪽을 근거로 한 5장·24개 노트와 유일한 경로", () => {
  assert.equal(chapters.length, 5);
  assert.equal(lessons.length, 24);
  assert.equal(new Set(lessons.map((l) => l.id)).size, 24);
  for (const l of lessons) {
    assert.ok(l.pages);
    assert.ok(l.blocks.length);
    for (const b of l.blocks)
      assert.ok(
        [
          "paragraph",
          "note",
          "list",
          "steps",
          "table",
          "prompt",
          "widget",
        ].includes(b.type),
      );
  }
});
test("검색은 제목·본문·요청문을 포함하고 빈 검색은 결과 없음", () => {
  assert.equal(searchLessons("안드레이")[0].id, "what-is-vibe");
  assert.equal(searchLessons("1.5초")[0].chapter, "game");
  assert.ok(searchLessons("숙박 한도").some((l) => l.id === "travel-example"));
  assert.equal(searchLessons("보안")[0].id, "security");
  assert.ok(searchLessons("TypeError").some((l) => l.id === "debugging"));
  assert.deepEqual(searchLessons("전혀없는단어12345"), []);
  assert.deepEqual(searchLessons("  "), []);
});
test("교안의 출장비 사례 3개 및 빈칸·한도 경계 검증", () => {
  assert.equal(
    travelCost({ days: 3, nights: 2, transport: 80000, hotel: 70000 }).total,
    280000,
  );
  const over = travelCost({
    days: 2,
    nights: 1,
    transport: 50000,
    hotel: 90000,
  });
  assert.equal(over.total, 160000);
  assert.equal(over.exceeded, true);
  assert.equal(
    travelCost({ days: 1, nights: 0, transport: 30000, hotel: "" }).total,
    50000,
  );
  assert.equal(
    travelCost({ days: 3, nights: 2, transport: 80000, hotel: 70000 }).exceeded,
    false,
  );
  assert.ok(
    Object.keys(
      travelCost({ days: "", nights: "", transport: "", hotel: "" }).errors,
    ).length,
  );
  assert.ok(
    travelCost({ days: 1.5, nights: 0, transport: -1, hotel: "" }).errors.days,
  );
});
test("게임 난이도·중복 구멍 방지·0회 성공률", () => {
  assert.deepEqual(difficulty.normal, { interval: 1000, visible: 800 });
  assert.equal(successRate(0, 0), 0);
  assert.equal(successRate(3, 4), 75);
  for (let previous = 0; previous < 9; previous++)
    for (let i = 0; i < 8; i++) {
      const n = nextHole(previous, () => i / 8);
      assert.ok(n >= 0 && n < 9);
      assert.notEqual(n, previous);
    }
});
