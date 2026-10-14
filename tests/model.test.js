import test from "node:test";
import assert from "node:assert/strict";
import {
  defaults,
  ordered,
  stats,
  shiftMonth,
  errors,
  validateBackup,
  validDate,
  id,
} from "../src/model.js";
import { applyImport, parseExcel } from "../src/excel.js";
import ExcelJS from "exceljs";
import "fake-indexeddb/auto";
import { read, write } from "../src/storage.js";
const base = () => {
  const s = defaults();
  s.opening = 100;
  s.openingDate = "2026-01-01";
  return s;
};
const tx = (s, date, type, amount, order = 1) => ({
  id: id(),
  date,
  type,
  amount,
  order,
  description: "테스트 전용",
  memo: "",
  category: s.categories.find((c) => c.type === type).id,
  payment: s.payments[0].id,
});
test("과거 거래 추가·수정·삭제 / 안정적인 잔액 순서", () => {
  const s = base();
  s.transactions = [
    tx(s, "2026-10-01", "지출", 20, 2),
    tx(s, "2026-09-01", "수입", 80, 1),
  ];
  assert.deepEqual(
    ordered(s).map((t) => t.balance),
    [180, 160],
  );
  s.transactions[1].amount = 100;
  assert.equal(ordered(s).at(-1).balance, 180);
  s.transactions.push(tx(s, "2026-09-01", "지출", 30, 3));
  assert.deepEqual(
    ordered(s).map((t) => t.balance),
    [200, 170, 150],
  );
  s.transactions = s.transactions.filter((t) => t.amount !== 100);
  assert.equal(ordered(s).at(-1).balance, 50);
  assert.equal(stats(s, "2026-10").balance, 50);
});
test("12월 → 다음 해 1월, 연간 합계 및 시작 잔액 1회", () => {
  const s = base();
  s.transactions = [
    tx(s, "2026-12-31", "수입", 1000),
    tx(s, "2027-01-01", "지출", 300, 2),
  ];
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2027-01", -1), "2026-12");
  assert.equal(stats(s, "2026").net, 1000);
  assert.equal(stats(s, "2027").net, -300);
  assert.equal(stats(s, "2027-01").balance, 800);
});
test("수입 0, 빈 월, 소비와 저축 분리", () => {
  const s = base();
  let x = stats(s, "2028-01");
  assert.equal(x.ratio, null);
  assert.equal(x.average, 0);
  s.transactions = [
    {
      ...tx(s, "2028-02-01", "지출", 500),
      category: s.categories.find((c) => c.saving).id,
    },
  ];
  x = stats(s, "2028-02");
  assert.equal(x.saving, 500);
  assert.equal(x.consumption, 0);
  assert.equal(x.ratio, null);
  assert.equal(x.average, 500);
});
test("금액·날짜 유효성, 백업 형식 검사", () => {
  const s = base();
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2026-99-01"), false);
  assert.ok(errors(tx(s, "2026-01-01", "지출", -1)).amount);
  assert.ok(errors(tx(s, "2026-01-01", "지출", 1.1)).amount);
  assert.throws(() => validateBackup({ version: 1 }));
  assert.equal(validateBackup(s), s);
});
test("IndexedDB 쓰기 후 재읽기 및 백업 복원", async () => {
  const s = base();
  s.transactions.push(tx(s, "2027-01-01", "수입", 1234));
  await write(s);
  assert.deepEqual(await read(), s);
  const backup = validateBackup(JSON.parse(JSON.stringify(s)));
  await write(defaults());
  await write(backup);
  assert.equal((await read()).transactions[0].amount, 1234);
});
test("XLSX 실제 파서: 잔액수식·빈행 제외 / 같은 정상 거래 2건 보존 / 자산 미입력 / 중복 파일 차단", async () => {
  const wb = new ExcelJS.Workbook(),
    ws = wb.addWorksheet("입력");
  ws.addRows([
    ["날짜", "구분", "분류", "내용", "결제수단", "금액", "메모", "잔액"],
    ["2026-01-01", "시작 잔액", "", "", "", 100, ""],
    ["2026-12-01", "지출", "식비", "테스트 전용", "현금", 10, "메모"],
    ["2026-12-01", "지출", "식비", "테스트 전용", "현금", 10, "메모"],
    ["", "", "", "", "", "", "", { formula: "H3-F4", result: 80 }],
  ]);
  const a = wb.addWorksheet("자산");
  a.addRows([
    ["구분", "자산 이름", "기관/계좌", "현재 금액", "메모"],
    ["예금", "빈 금액", "은행", null, ""],
  ]);
  const buffer = await wb.xlsx.writeBuffer(),
    p = await parseExcel({
      arrayBuffer: async () => buffer,
      size: buffer.byteLength,
    });
  assert.equal(p.transactions.length, 2);
  assert.equal(p.opening, 100);
  assert.equal(p.assets[0].amount, null);
  assert.equal(p.formulaCount, 1);
  const s = applyImport(base(), p, "append", 100, "2026-01-01");
  assert.equal(s.transactions.length, 2);
  assert.throws(
    () => applyImport(s, p, "append", 100, "2026-01-01"),
    /동일 파일/,
  );
  const replaced = applyImport(s, p, "replace", 100, "2026-01-01");
  assert.equal(replaced.transactions.length, 2);
});
test("XLSX 오류 행은 거래로 수용하지 않음", async () => {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("입력").addRows([
    ["날짜", "구분", "분류", "내용", "결제수단", "금액", "메모"],
    ["2026-02-30", "지출", "식비", "오류", "현금", -1, ""],
  ]);
  const b = await wb.xlsx.writeBuffer(),
    p = await parseExcel({ arrayBuffer: async () => b });
  assert.equal(p.transactions.length, 0);
  assert.equal(p.bad.length, 1);
});
