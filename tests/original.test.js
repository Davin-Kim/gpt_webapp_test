import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import { parseExcel, applyImport } from "../src/excel.js";
import { defaults, stats, label } from "../src/model.js";
test(
  "사용자 원본 XLSX: 39건·모든 필드 보존·기준 합계·6개 미입력 자산·원본 불변",
  { skip: !process.env.ORIGINAL_XLSX },
  async () => {
    const file = process.env.ORIGINAL_XLSX,
      bytes = await readFile(file),
      hash = createHash("sha256").update(bytes).digest("hex");
    const p = await parseExcel({
      arrayBuffer: async () => bytes,
      size: bytes.length,
    });
    assert.equal(p.transactions.length, 39);
    assert.equal(p.opening, 85382);
    assert.equal(p.bad.length, 0);
    assert.equal(p.warnings.length, 0);
    assert.equal(p.assets.length, 6);
    assert.ok(p.assets.every((a) => a.amount === null));
    const s = applyImport(
      defaults(),
      p,
      "replace",
      p.opening,
      p.transactions.map((t) => t.date).sort()[0],
    );
    const sep = stats(s, "2026-09"),
      oct = stats(s, "2026-10");
    assert.deepEqual(
      [sep.ts.length, sep.income, sep.expense, sep.net],
      [31, 1788611, 923293, 865318],
    );
    assert.deepEqual(
      [oct.ts.length, oct.income, oct.expense, oct.net],
      [8, 0, 500440, -500440],
    );
    assert.equal(oct.balance, 450260);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes);
    const sheet = wb.getWorksheet("입력");
    for (const t of s.transactions) {
      const row = sheet.getRow(t.sourceRow);
      assert.equal(t.date, row.getCell(1).value.toISOString().slice(0, 10));
      assert.equal(t.type, row.getCell(2).value);
      assert.equal(label(s.categories, t.category), row.getCell(3).value);
      assert.equal(t.description, row.getCell(4).value);
      assert.equal(label(s.payments, t.payment), row.getCell(5).value);
      assert.equal(t.amount, row.getCell(6).value);
      assert.equal(t.memo, String(row.getCell(8).value ?? ""));
    }
    assert.equal(
      createHash("sha256")
        .update(await readFile(file))
        .digest("hex"),
      hash,
    );
    console.log(
      "원본 기준: 39건 / 9월 31건 1,788,611 - 923,293 = 865,318 / 10월 8건 0 - 500,440 = -500,440 / 잔액 450,260 검증",
    );
  },
);
