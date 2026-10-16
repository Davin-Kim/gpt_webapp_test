import test from "node:test";
import assert from "node:assert/strict";
import {
  validLayout,
  defaultLayout,
  mmToPx,
  textStats,
  sampleHTML,
} from "../src/model.js";
test("용지 설정의 유효 범위와 여백 검증", () => {
  assert.ok(validLayout(defaultLayout));
  assert.equal(validLayout({ ...defaultLayout, left: 200 }), false);
  assert.equal(validLayout({ ...defaultLayout, width: NaN }), false);
  assert.equal(validLayout({ ...defaultLayout, width: 0 }), false);
  assert.ok(Math.abs(mmToPx(210) - 793.7008) < 0.01);
});
test("텍스트 보기 통계와 샘플 안내", () => {
  assert.deepEqual(textStats("<p>문서 테스트</p>"), {
    characters: 5,
    words: 2,
  });
  assert.ok(sampleHTML.includes("자동 저장하지"));
});
