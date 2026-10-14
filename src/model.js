export const today = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const id = () => crypto.randomUUID();
export const defaults = () => ({
  version: 1,
  opening: 0,
  openingDate: today(),
  transactions: [],
  assets: [],
  imports: [],
  categories: [
    ...["급여", "부수입", "이자/배당", "환급/반환", "기타"].map((name) => ({
      id: id(),
      name,
      type: "수입",
      active: true,
      saving: false,
    })),
    ...[
      "식비",
      "교통",
      "쇼핑",
      "생활",
      "여가",
      "고정비",
      "저축/투자",
      "경조사",
      "용돈",
      "가족",
      "경조사/선물",
      "기타",
    ].map((name) => ({
      id: id(),
      name,
      type: "지출",
      active: true,
      saving: name === "저축/투자",
    })),
  ],
  payments: [
    "체크카드",
    "신용카드",
    "현금",
    "계좌이체",
    "자동이체",
    "기타",
  ].map((name) => ({ id: id(), name, active: true })),
});
export function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
export function errors(t) {
  const e = {};
  if (!validDate(t.date || "")) e.date = "올바른 날짜를 입력하세요.";
  for (const k of ["type", "category", "description", "payment"])
    if (!t[k]) e[k] = "필수 항목입니다.";
  if (!Number.isSafeInteger(t.amount) || t.amount <= 0)
    e.amount = "양의 정수를 입력하세요.";
  if (!["수입", "지출"].includes(t.type))
    e.type = "수입 또는 지출을 선택하세요.";
  return e;
}
export function ordered(s) {
  let b = s.opening;
  return [...s.transactions]
    .sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order)
    .map((t) => ({
      ...t,
      balance: (b += t.type === "수입" ? t.amount : -t.amount),
    }));
}
export const shiftMonth = (m, n) => {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};
export function stats(s, p) {
  const ts = s.transactions.filter((t) => t.date.startsWith(p)),
    income = ts
      .filter((t) => t.type === "수입")
      .reduce((a, t) => a + t.amount, 0),
    out = ts.filter((t) => t.type === "지출"),
    expense = out.reduce((a, t) => a + t.amount, 0);
  const saving = out
    .filter((t) => s.categories.find((c) => c.id === t.category)?.saving)
    .reduce((a, t) => a + t.amount, 0);
  return {
    ts,
    out,
    income,
    expense,
    net: income - expense,
    saving,
    consumption: expense - saving,
    ratio: income ? ((income - expense) / income) * 100 : null,
    average: out.length ? expense / out.length : 0,
    balance: ordered(s).at(-1)?.balance ?? s.opening,
  };
}
export const label = (list, key) => list.find((x) => x.id === key)?.name ?? key;
export function validateBackup(s) {
  if (
    s?.version !== 1 ||
    !Array.isArray(s.transactions) ||
    !Array.isArray(s.assets) ||
    !Array.isArray(s.categories) ||
    !Array.isArray(s.payments) ||
    !Array.isArray(s.imports) ||
    !Number.isSafeInteger(s.opening) ||
    !validDate(s.openingDate)
  )
    throw Error("지원하지 않는 백업 형식입니다.");
  for (const [items, kind] of [
    [s.categories, "분류"],
    [s.payments, "결제수단"],
  ]) {
    const keys = new Set();
    for (const item of items) {
      if (
        !item ||
        typeof item.id !== "string" ||
        keys.has(item.id) ||
        typeof item.name !== "string" ||
        !item.name.trim() ||
        typeof item.active !== "boolean" ||
        (kind === "분류" &&
          (!["수입", "지출"].includes(item.type) ||
            typeof item.saving !== "boolean"))
      )
        throw Error(`백업 ${kind} 설정이 잘못되었습니다.`);
      keys.add(item.id);
    }
  }
  if (s.imports.some((hash) => typeof hash !== "string"))
    throw Error("백업 가져오기 이력이 잘못되었습니다.");
  const ids = new Set();
  for (const t of s.transactions) {
    if (
      Object.keys(errors(t)).length ||
      !t.id ||
      ids.has(t.id) ||
      !Number.isSafeInteger(t.order) ||
      t.order < 1 ||
      t.date < s.openingDate ||
      !s.categories.some((c) => c.id === t.category && c.type === t.type) ||
      !s.payments.some((p) => p.id === t.payment) ||
      typeof t.description !== "string" ||
      typeof t.memo !== "string"
    )
      throw Error("백업 거래 데이터가 잘못되었습니다.");
    ids.add(t.id);
  }
  for (const a of s.assets)
    if (
      !a.id ||
      !a.name ||
      typeof a.name !== "string" ||
      typeof a.institution !== "string" ||
      typeof a.memo !== "string" ||
      !validDate(a.updated) ||
      !["예금", "적금", "투자", "현금", "기타"].includes(a.type) ||
      (a.amount !== null && (!Number.isSafeInteger(a.amount) || a.amount < 0))
    )
      throw Error("백업 자산 데이터가 잘못되었습니다.");
  return s;
}
