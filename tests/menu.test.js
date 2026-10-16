import test from "node:test";
import assert from "node:assert/strict";
import { defaultMenus, addMenu, chooseMenu } from "../src/model.js";
test("기본 10개 메뉴, 추가 및 중복·빈값 검사", () => {
  assert.equal(defaultMenus.length, 10);
  assert.equal(addMenu(defaultMenus, "  라면  ").at(-1), "라면");
  assert.throws(() => addMenu(defaultMenus, " "));
  assert.throws(() => addMenu(defaultMenus, "김치찌개"));
  assert.throws(() => addMenu(defaultMenus, "가".repeat(41)));
});
test("모든 후보 선택 가능, 연속 반복 방지, 1개·0개 처리", () => {
  for (let i = 0; i < 10; i++)
    assert.equal(
      chooseMenu(defaultMenus, "", { getRandomValues: (a) => (a[0] = i) }),
      defaultMenus[i],
    );
  assert.notEqual(
    chooseMenu(defaultMenus, "김치찌개", {
      getRandomValues: (a) => (a[0] = 0),
    }),
    "김치찌개",
  );
  assert.equal(chooseMenu(["라면"], "라면"), "라면");
  assert.equal(chooseMenu([]), null);
});
test("난수 나머지 편향 제거를 위한 재추출", () => {
  let n = 0;
  const result = chooseMenu(defaultMenus, "", {
    getRandomValues: (a) => (a[0] = n++ === 0 ? 4294967295 : 2),
  });
  assert.equal(n, 2);
  assert.equal(result, defaultMenus[2]);
});
