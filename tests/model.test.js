import test from "node:test";
import assert from "node:assert/strict";
import { event, programs, filterPrograms } from "../src/model.js";
test("poster date and eight complete programs", () => {
  assert.equal(event.date, "2026. 10. 17. 토요일");
  assert.equal(programs.length, 8);
  assert.equal(new Set(programs.map((p) => p.id)).size, 8);
  for (const p of programs) {
    assert.ok(p.start < p.end);
    assert.ok(p.description);
  }
  assert.equal(programs.find((p) => p.id === "parade").time, "11:00—11:40");
  assert.equal(programs.find((p) => p.id === "concert").time, "14:00—17:00");
});
test("all category filters retain their programs", () => {
  assert.equal(filterPrograms("전체").length, 8);
  assert.equal(filterPrograms("공연").length, 3);
  assert.equal(filterPrograms("재현").length, 1);
  assert.equal(filterPrograms("참여·체험").length, 4);
});
