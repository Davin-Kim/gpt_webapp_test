import ExcelJS from "exceljs";
import { errors, id, today, label, validDate } from "./model.js";
const trim = (v) => String(v ?? "").trim();
const num = (v) =>
  typeof v === "number" ? v : Number(trim(v).replace(/[,원\s]/g, ""));
const value = (c) => {
  if (c.isMerged && c.master.address !== c.address) return "";
  const v = c.value;
  if (v && typeof v === "object" && !(v instanceof Date)) {
    if ("formula" in v || "sharedFormula" in v) return v.result ?? "";
    if (v.richText) return v.richText.map((x) => x.text).join("");
    if (v.text) return v.text;
  }
  return v ?? "";
};
function date(v) {
  if (typeof v === "number") {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : "";
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return trim(v)
    .replace(/[./]/g, "-")
    .replace(
      /^(\d{4})-(\d{1,2})-(\d{1,2}).*$/,
      (_, y, m, d) => `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
    );
}
export async function parseExcel(file) {
  if (file.size > 15 * 1024 * 1024)
    throw Error("파일은 15MB 이하로 선택하세요.");
  const buffer = await file.arrayBuffer();
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const input = wb.getWorksheet("입력");
  if (!input)
    throw Error(
      "‘입력’ 시트를 찾을 수 없습니다. 날짜·구분·분류·내용·결제수단·금액·메모 헤더가 필요합니다.",
    );
  const rows = [];
  input.eachRow({ includeEmpty: true }, (r) => {
    const a = [];
    r.eachCell({ includeEmpty: true }, (c, i) => (a[i - 1] = value(c)));
    rows[r.number - 1] = a;
  });
  const hi = rows.findIndex(
    (r) =>
      r?.some((v) => trim(v) === "날짜") && r.some((v) => trim(v) === "금액"),
  );
  if (hi < 0) throw Error("입력 시트의 헤더를 찾을 수 없습니다.");
  const headers = rows[hi].map(trim);
  for (const h of ["날짜", "구분", "분류", "내용", "결제수단", "금액"])
    if (!headers.includes(h)) throw Error(`필수 헤더 ‘${h}’가 없습니다.`);
  const col = (r, k) => r[headers.indexOf(k)];
  const transactions = [],
    bad = [];
  let opening = null,
    openingDate = null;
  rows.forEach((r, i) => {
    if (!r) return;
    if (r.some((v) => /시작\s*잔액|기초\s*잔액|이월\s*잔액/.test(trim(v)))) {
      const amt = col(r, "금액"),
        balance = r[headers.findIndex((v) => /잔액/.test(v))];
      const candidates = r.filter(
        (v) => typeof v === "number" && v !== col(r, "날짜"),
      );
      const candidate =
        typeof amt === "number"
          ? amt
          : typeof balance === "number"
            ? balance
            : candidates.at(-1);
      if (Number.isSafeInteger(candidate)) {
        opening = candidate;
        const rawDate = date(col(r, "날짜"));
        openingDate = validDate(rawDate) ? rawDate : null;
      }
    }
    if (i <= hi) return;
    const type = trim(col(r, "구분"));
    if (!["수입", "지출"].includes(type)) {
      if (
        col(r, "날짜") &&
        col(r, "내용") &&
        col(r, "금액") &&
        !r.some((v) => /잔액/.test(trim(v)))
      )
        bad.push({ row: i + 1, errors: "수입/지출 구분을 확인하세요." });
      return;
    }
    const t = {
      date: date(col(r, "날짜")),
      type,
      category: trim(col(r, "분류")),
      description: trim(col(r, "내용")),
      payment: trim(col(r, "결제수단")),
      amount: num(col(r, "금액")),
      memo: trim(col(r, "메모")),
      sourceRow: i + 1,
    };
    const e = errors(t);
    if (Object.keys(e).length)
      bad.push({ row: i + 1, errors: Object.values(e).join(" ") });
    else transactions.push(t);
  });
  const assets = [],
    warnings = [];
  const sheet = wb.getWorksheet("자산");
  if (sheet) {
    const ar = [];
    sheet.eachRow({ includeEmpty: true }, (r) => {
      const a = [];
      r.eachCell({ includeEmpty: true }, (c, i) => (a[i - 1] = value(c)));
      ar[r.number - 1] = a;
    });
    const h = ar.findIndex((r) =>
      r?.some((v) => /^(자산 이름|자산명|항목)$/.test(trim(v))),
    );
    if (h >= 0) {
      const heads = ar[h].map(trim),
        ni = heads.findIndex((v) => /^(자산 이름|자산명|항목)$/.test(v)),
        ai = heads.findIndex((v) => /현재 금액|금액/.test(v)),
        ti = heads.indexOf("구분"),
        ii = heads.findIndex((v) => /기관|계좌/.test(v)),
        mi = heads.indexOf("메모");
      let lastType = "기타";
      ar.forEach((r, i) => {
        if (i <= h || !r) return;
        const rt = trim(r[ti]);
        if (["예금", "적금", "투자", "현금", "기타"].includes(rt))
          lastType = rt;
        const name = trim(r[ni]);
        if (!name || /합계|총자산/.test(name)) return;
        const av = r[ai],
          amount = av === "" || av === undefined ? null : num(av);
        if (amount !== null && (!Number.isSafeInteger(amount) || amount < 0)) {
          bad.push({
            row: i + 1,
            errors: "자산 시트: 금액이 올바르지 않습니다.",
          });
          return;
        }
        assets.push({
          id: id(),
          type: lastType,
          name,
          institution: trim(r[ii]),
          amount,
          memo: trim(r[mi]),
          updated: today(),
        });
      });
    } else
      warnings.push(
        "자산 시트의 표 헤더를 인식하지 못했습니다. 자산은 자동으로 가져오지 않습니다. 원본 배치를 확인해야 합니다.",
      );
  }
  let formulaCount = 0;
  const validations = [];
  wb.eachSheet((s) =>
    s.eachRow((r) =>
      r.eachCell((c) => {
        if (c.formula) formulaCount++;
        if (c.dataValidation?.type === "list")
          validations.push({
            sheet: s.name,
            cell: c.address,
            formulae: c.dataValidation.formulae,
          });
      }),
    ),
  );
  return {
    hash,
    transactions,
    bad,
    opening,
    openingDate,
    assets,
    warnings,
    sheets: wb.worksheets.map((s) => s.name),
    formulaCount,
    validations,
  };
}
export function applyImport(state, p, mode, opening, openingDate) {
  if (mode === "append" && state.imports.includes(p.hash))
    throw Error(
      "이미 가져온 동일 파일입니다. 복수 거래는 원본 행별로 보존됩니다.",
    );
  const s = structuredClone(state);
  if (mode === "replace") {
    s.transactions = [];
    s.assets = [];
    s.imports = [];
    s.opening = opening;
    s.openingDate = openingDate;
  }
  let order = s.transactions.reduce((n, t) => Math.max(n, t.order), 0);
  for (const t of p.transactions) {
    let c = s.categories.find(
      (c) => c.name === t.category && c.type === t.type,
    );
    if (!c) {
      c = {
        id: id(),
        name: t.category,
        type: t.type,
        active: true,
        saving: t.category === "저축/투자",
      };
      s.categories.push(c);
    }
    let payment = s.payments.find((x) => x.name === t.payment);
    if (!payment) {
      payment = { id: id(), name: t.payment, active: true };
      s.payments.push(payment);
    }
    s.transactions.push({
      ...t,
      id: id(),
      category: c.id,
      payment: payment.id,
      order: ++order,
      source: p.hash,
    });
  }
  s.assets.push(...p.assets);
  s.imports.push(p.hash);
  return s;
}
export async function exportExcel(s) {
  const wb = new ExcelJS.Workbook(),
    input = wb.addWorksheet("입력");
  input.addRows([
    ["날짜", "구분", "분류", "내용", "결제수단", "금액", "메모"],
    [s.openingDate, "시작 잔액", "", "", "", s.opening, ""],
    ...s.transactions.map((t) => [
      t.date,
      t.type,
      label(s.categories, t.category),
      t.description,
      label(s.payments, t.payment),
      t.amount,
      t.memo,
    ]),
  ]);
  const asset = wb.addWorksheet("자산");
  asset.addRows([
    ["구분", "자산 이름", "기관/계좌", "현재 금액", "메모"],
    ...s.assets.map((a) => [a.type, a.name, a.institution, a.amount, a.memo]),
  ]);
  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "MY_MONEY_거래.xlsx";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
