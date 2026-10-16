import test from "node:test";
import assert from "node:assert/strict";
import { programs, filterPrograms, calendarFile, event } from "../src/model.js";
test("포스터 시간·명칭·구간 및 분류 필터", () => {
  assert.equal(event.title, "제16회 안산읍성문화예술제");
  assert.equal(programs.find((p) => p.id === "parade").time, "11:00—11:40");
  assert.equal(programs.find((p) => p.id === "concert").time, "14:00—17:00");
  assert.equal(filterPrograms("전체").length, programs.length);
  assert.ok(filterPrograms("공연").every((p) => p.type === "공연"));
  assert.equal(new Set(programs.map((p) => p.id)).size, programs.length);
});
test("캘린더 일정은 한국 11~17시를 UTC로 표현", () => {
  const content = calendarFile();
  assert.ok(content.includes("DTSTART:20261017T020000Z"));
  assert.ok(content.includes("DTEND:20261017T080000Z"));
  assert.ok(content.endsWith("END:VCALENDAR\r\n"));
});
