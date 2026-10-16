import test from "node:test";
import assert from "node:assert/strict";
import {
  validLayout,
  defaultLayout,
  downloadName,
  mmToPx,
} from "../src/model.js";
test("용지 설정의 유효 범위와 여백 검증", () => {
  assert.ok(validLayout(defaultLayout));
  assert.equal(validLayout({ ...defaultLayout, left: 200 }), false);
  assert.equal(validLayout({ ...defaultLayout, width: NaN }), false);
  assert.equal(validLayout({ ...defaultLayout, width: 0 }), false);
  assert.ok(Math.abs(mmToPx(210) - 793.7008) < 0.01);
});
test("내보낼 파일명은 경로문자와 원래 확장자를 정리", () => {
  assert.equal(downloadName("회의록.docx", "hwpx"), "회의록.hwpx");
  assert.equal(downloadName("a/b:c", "docx"), "a_b_c.docx");
  assert.equal(downloadName("", "docx"), "제목 없는 문서.docx");
});
