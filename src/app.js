import "./style.css";
import {
  defaults,
  today,
  id,
  errors,
  ordered,
  stats,
  label,
  shiftMonth,
  validateBackup,
  validDate,
} from "./model.js";
import { read, write } from "./storage.js";
const parseExcel = async (...args) =>
  (await import("./excel.js")).parseExcel(...args);
const applyImport = async (...args) =>
  (await import("./excel.js")).applyImport(...args);
const exportExcel = async (...args) =>
  (await import("./excel.js")).exportExcel(...args);
const $ = (s) => document.querySelector(s),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    ),
  money = (v) => Math.round(v).toLocaleString("ko-KR") + "원",
  pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) + "%" : "0%"),
  sum = (a) => a.reduce((n, t) => n + t.amount, 0);
let state,
  view = "대시보드",
  month = today().slice(0, 7),
  annual = false,
  page = 1,
  filters = {
    month: "",
    from: "",
    to: "",
    type: "",
    category: "",
    payment: "",
    search: "",
    sort: "date-desc",
  };
try {
  state = (await read()) ?? defaults();
  month =
    state.transactions
      .map((t) => t.date.slice(0, 7))
      .sort()
      .at(-1) ?? month;
} catch (e) {
  $("#app").innerHTML =
    '<main><h1>저장소를 열 수 없습니다</h1><p>브라우저 저장 권한과 남은 용량을 확인한 후 새로고침해 주세요. 기존 데이터를 덮어쓰지 않았습니다.</p><button onclick="location.reload()">다시 시도</button></main>';
  throw e;
}
async function save(next) {
  const controls = [
    ...document.querySelectorAll("button, input, select, textarea"),
  ].map((el) => [el, el.disabled]);
  controls.forEach(([el]) => (el.disabled = true));
  $("#app").setAttribute("aria-busy", "true");
  try {
    await write(next);
    state = next;
    return true;
  } catch (e) {
    alert(
      "저장 실패: " +
        e.message +
        "\n브라우저 저장 권한·용량을 확인하고 같은 저장 버튼으로 재시도하세요.",
    );
    return false;
  } finally {
    controls.forEach(([el, disabled]) => (el.disabled = disabled));
    $("#app").removeAttribute("aria-busy");
  }
}
function toast(text) {
  $("#notice").textContent = text;
  setTimeout(() => {
    if ($("#notice")) $("#notice").textContent = "";
  }, 4000);
}
function options(list, selected, empty = false) {
  return (
    (empty
      ? '<option value="">전체</option>'
      : '<option value="">선택하세요</option>') +
    list
      .map(
        (c) =>
          `<option value="${esc(c.id)}" ${c.id === selected ? "selected" : ""}>${esc(c.name)}${c.active ? "" : " (비활성)"}</option>`,
      )
      .join("")
  );
}
function cards(items) {
  return `<div class="cards">${items.map(([name, val, note]) => `<section class="card"><span>${name}</span><strong>${val}</strong>${note ? `<small>${note}</small>` : ""}</section>`).join("")}</div>`;
}
function rows(ts) {
  return ts
    .map(
      (t) =>
        `<tr><td>${t.date}</td><td><span class="badge ${t.type === "수입" ? "income" : "expense"}">${t.type}</span></td><td>${esc(label(state.categories, t.category))}</td><td><b>${esc(t.description)}</b><small>${esc(t.memo)}</small></td><td>${esc(label(state.payments, t.payment))}</td><td class="amount ${t.type === "수입" ? "income" : "expense"}">${t.type === "수입" ? "+" : "−"}${money(t.amount)}</td><td class="amount">${money(t.balance)}</td><td><button class="quiet" data-edit="${t.id}">수정</button><button class="quiet" data-delete="${t.id}">삭제</button></td></tr>`,
    )
    .join("");
}
function table(ts) {
  return `<div class="table-scroll"><table><thead><tr><th>날짜</th><th>구분</th><th>분류</th><th>내용 / 메모</th><th>결제수단</th><th>금액</th><th>장부 잔액</th><th>관리</th></tr></thead><tbody>${rows(ts) || '<tr><td colspan="8" class="empty">기록이 없습니다. 기록 추가 또는 엑셀 가져오기로 시작하세요.</td></tr>'}</tbody></table></div>`;
}
function composition(ts, type, total) {
  const groups = new Map();
  for (const t of ts.filter((t) => t.type === type))
    groups.set(t.category, (groups.get(t.category) ?? 0) + t.amount);
  return `<section class="panel"><h3>${type} 분류별 구성</h3>${
    [...groups]
      .sort((a, b) => b[1] - a[1])
      .map(
        ([c, v]) =>
          `<div class="bar-row"><div>${esc(label(state.categories, c))}<b>${money(v)} · ${pct(v, total)}</b></div><div class="track"><i style="width:${total ? (v / total) * 100 : 0}%" class="${type === "수입" ? "green" : "peach"}"></i></div></div>`,
      )
      .join("") || '<p class="muted">해당 기간의 기록이 없습니다.</p>'
  }</section>`;
}
function dashboard() {
  const period = annual ? month.slice(0, 4) : month,
    s = stats(state, period),
    small = s.out.filter((t) => t.amount <= 5000),
    credit = s.out.filter(
      (t) => label(state.payments, t.payment) === "신용카드",
    ),
    gift = s.out.filter((t) =>
      ["경조사", "용돈", "경조사/선물"].includes(
        label(state.categories, t.category),
      ),
    );
  const groups = new Map();
  s.out.forEach((t) =>
    groups.set(t.category, (groups.get(t.category) ?? 0) + t.amount),
  );
  const top = [...groups].sort((a, b) => b[1] - a[1])[0];
  const months = annual
    ? Array.from(
        { length: 12 },
        (_, i) => period + "-" + String(i + 1).padStart(2, "0"),
      )
    : Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
  const trend = months.map((m) => ({ m, ...stats(state, m) })),
    max = Math.max(1, ...trend.flatMap((t) => [t.income, t.expense]));
  return `<div class="period"><div><h1>${period.replace("-", "년 ")}${annual ? "년" : "월"}의 돈 흐름</h1><p class="muted">일상의 기록이 모여, 나의 흐름이 됩니다.</p></div><div class="controls"><button id="prev" aria-label="이전 기간">←</button><input aria-label="분석월" type="month" id="month" value="${month}"><button id="next" aria-label="다음 기간">→</button><button id="annual">${annual ? "월간 보기" : "연간 보기"}</button></div></div>${cards(
    [
      ["총수입", money(s.income), "선택 " + (annual ? "연도" : "월") + " 기준"],
      ["총지출", money(s.expense), "소비 + 저축/투자"],
      [
        "월 수지".replace("월", annual ? "연간" : "월"),
        money(s.net),
        "수입 − 전체 지출",
      ],
    ],
  )}<div class="summary"><span>누적 장부 잔액 <b>${money(s.balance)}</b></span><span>총자산 <b>${money(sum(state.assets.filter((a) => a.amount !== null)))}</b></span><small>장부 잔액은 전체 기록 기준이며 실제 은행 잔액과 다를 수 있습니다. 자산은 별도 관리합니다.</small></div>${cards(
    [
      [
        "수입 대비 잔여율",
        s.ratio === null ? "계산 불가" : s.ratio.toFixed(1) + "%",
      ],
      ["저축/투자", money(s.saving)],
      ["소비 지출", money(s.consumption), "전체 지출에서 저축/투자 제외"],
      ["1회 평균 지출", money(s.average), s.out.length + "건 기준"],
    ],
  )}<div class="insight">${top ? `${esc(label(state.categories, top[0]))} 지출이 ${money(top[1])}으로 전체 지출의 ${pct(top[1], s.expense)}를 차지합니다. 신용카드 비중은 ${pct(sum(credit), s.expense)}입니다.` : "해당 기간의 지출 기록이 없어 분석을 표시하지 않습니다."}</div><div class="grid2">${composition(s.ts, "수입", s.income)}${composition(s.ts, "지출", s.expense)}</div><section class="panel"><h3>${annual ? "연간 월별" : "최근 6개월"} 수입 · 지출 비교</h3><p class="muted">초록: 수입 · 살구: 지출 · 표의 수지: 수입 − 지출</p><div class="trend">${trend.map((t) => `<div class="trend-col"><div class="bars"><i class="green" style="height:${(t.income / max) * 100}%" title="수입 ${money(t.income)}"></i><i class="peach" style="height:${(t.expense / max) * 100}%" title="지출 ${money(t.expense)}"></i></div><small>${t.m}</small></div>`).join("")}</div><div class="table-scroll"><table><thead><tr><th>월</th><th>수입</th><th>지출</th><th>수지</th></tr></thead><tbody>${trend.map((t) => `<tr><td>${t.m}</td><td>${money(t.income)}</td><td>${money(t.expense)}</td><td>${money(t.net)}</td></tr>`).join("")}</tbody></table></div></section>${cards(
    [
      ["신용카드 지출", money(sum(credit)), pct(sum(credit), s.expense)],
      [
        "소액 지출 (5,000원 이하)",
        money(sum(small)),
        small.length + "건 · " + pct(sum(small), s.expense),
      ],
      ["경조사 · 용돈", money(sum(gift))],
      ["전체 지출 건수", s.out.length + "건"],
    ],
  )}<section class="panel"><h3>주차별 지출${annual ? " (연간 각 월의 같은 구간 합계)" : ""}</h3><p class="muted">1~7일 / 8~14일 / 15~21일 / 22~28일 / 29일~말일 기준</p><div class="table-scroll"><table><thead><tr><th>구간</th><th>지출</th><th>건수</th><th>평균</th></tr></thead><tbody>${Array.from(
    { length: 5 },
    (_, i) => {
      const ts = s.out.filter(
        (t) => Math.min(4, Math.floor((Number(t.date.slice(8)) - 1) / 7)) === i,
      );
      return `<tr><td>${i + 1}주차</td><td>${money(sum(ts))}</td><td>${ts.length}건</td><td>${money(ts.length ? sum(ts) / ts.length : 0)}</td></tr>`;
    },
  ).join(
    "",
  )}</tbody></table></div></section><section class="panel"><h3>최근 거래 <small>선택 기간 기준</small></h3>${table(
    ordered(state)
      .filter((t) => t.date.startsWith(period))
      .reverse()
      .slice(0, 5),
  )}</section>`;
}
function transactions() {
  let ts = ordered(state).filter(
    (t) =>
      (!filters.month || t.date.startsWith(filters.month)) &&
      (!filters.from || t.date >= filters.from) &&
      (!filters.to || t.date <= filters.to) &&
      (!filters.type || t.type === filters.type) &&
      (!filters.category || t.category === filters.category) &&
      (!filters.payment || t.payment === filters.payment) &&
      (!filters.search ||
        (t.description + " " + t.memo)
          .toLowerCase()
          .includes(filters.search.toLowerCase())),
  );
  ts.sort((a, b) =>
    filters.sort.startsWith("amount")
      ? (a.amount - b.amount) * (filters.sort.endsWith("asc") ? 1 : -1)
      : (a.date.localeCompare(b.date) || a.order - b.order) *
        (filters.sort.endsWith("asc") ? 1 : -1),
  );
  const pages = Math.max(1, Math.ceil(ts.length / 30));
  page = Math.min(page, pages);
  return `<h1>거래 내역</h1><p class="muted">잔액은 날짜 오름차순 · 같은 날짜는 등록 순서로 계산합니다.</p><section class="panel filters"><label>월<input type="month" data-filter="month" value="${filters.month}"></label><label>시작일<input type="date" data-filter="from" value="${filters.from}"></label><label>종료일<input type="date" data-filter="to" value="${filters.to}"></label><label>구분<select data-filter="type"><option value="">전체</option>${["수입", "지출"].map((t) => `<option ${filters.type === t ? "selected" : ""}>${t}</option>`).join("")}</select></label><label>분류<select data-filter="category">${options(state.categories, filters.category, true)}</select></label><label>결제수단<select data-filter="payment">${options(state.payments, filters.payment, true)}</select></label><label>내용 · 메모 검색<input data-filter="search" value="${esc(filters.search)}" placeholder="검색어"></label><label>정렬<select data-filter="sort">${[
    ["date-desc", "날짜 최신순"],
    ["date-asc", "날짜 오래된순"],
    ["amount-desc", "금액 큰순"],
    ["amount-asc", "금액 작은순"],
  ]
    .map(
      ([v, l]) =>
        `<option value="${v}" ${filters.sort === v ? "selected" : ""}>${l}</option>`,
    )
    .join(
      "",
    )}</select></label><button id="reset">필터 초기화</button></section><section class="panel"><div class="section-head"><span>검색 결과 ${ts.length}건 · 수입 ${money(sum(ts.filter((t) => t.type === "수입")))} / 지출 ${money(sum(ts.filter((t) => t.type === "지출")))}</span><button id="xlsx-export">XLSX 내보내기</button></div>${table(ts.slice((page - 1) * 30, page * 30))}<div class="pagination"><button id="page-prev" ${page === 1 ? "disabled" : ""}>이전</button><span>${page} / ${pages}</span><button id="page-next" ${page === pages ? "disabled" : ""}>다음</button></div></section>`;
}
function assets() {
  return `<div class="section-head"><h1>자산</h1><button id="asset-add">자산 추가</button></div><p class="muted">현재 금액을 직접 업데이트합니다. 거래·장부 잔액과 자동 합산하지 않습니다.</p>${cards([["총자산", money(sum(state.assets.filter((a) => a.amount !== null)))], ...["예금", "적금", "투자", "현금", "기타"].map((type) => [type, money(sum(state.assets.filter((a) => a.type === type && a.amount !== null)))])])}<section class="panel"><div class="table-scroll"><table><thead><tr><th>구분</th><th>이름</th><th>기관/계좌</th><th>현재 금액</th><th>메모</th><th>수정일</th><th>관리</th></tr></thead><tbody>${state.assets.map((a) => `<tr><td>${esc(a.type)}</td><td>${esc(a.name)}</td><td>${esc(a.institution)}</td><td>${a.amount === null ? "미입력" : money(a.amount)}</td><td>${esc(a.memo)}</td><td>${a.updated}</td><td><button data-asset-edit="${a.id}" class="quiet">수정</button><button data-asset-delete="${a.id}" class="quiet">삭제</button></td></tr>`).join("") || '<tr><td colspan="7" class="empty">자산을 추가해 보세요.</td></tr>'}</tbody></table></div></section>`;
}
function settings() {
  return `<h1>설정</h1><section class="panel"><h3>저장 및 백업</h3><p>이 브라우저의 IndexedDB에 자동 저장됩니다. 기기 간 자동 동기화는 지원하지 않습니다. 브라우저 데이터를 지우면 기록이 삭제되므로 정기적으로 백업하세요.</p><div class="controls"><button id="backup">JSON 전체 백업</button><label class="file-button">JSON 복원<input id="restore" type="file" accept=".json"></label><label class="file-button">원본 XLSX 가져오기<input id="import" type="file" accept=".xlsx"></label><button id="xlsx-export">XLSX 거래 내보내기</button></div><p class="muted">파일은 이 기기에서만 읽으며 서버로 전송하지 않습니다. 동일 파일은 SHA-256으로 중복 방지하고 각 원본 행은 보존합니다.</p></section><section class="panel"><h3>최초 시작 잔액</h3><form id="opening-form" class="controls"><label>기준일<input name="openingDate" type="date" required value="${state.openingDate}"></label><label>시작 잔액 (원)<input name="opening" type="number" step="1" required value="${state.opening}"></label><button>저장</button></form><p class="muted">최초 한 번 적용하며 새해에도 초기화하지 않습니다. 기준일 이전 거래는 입력·가져올 수 없습니다.</p></section><div class="grid2"><section class="panel"><h3>분류 관리</h3>${state.categories.map((c) => `<div class="manage"><span>${c.type} · ${esc(c.name)}${c.saving ? " · 저축/투자" : ""}${c.active ? "" : " · 비활성"}</span><button class="quiet" data-rename-category="${c.id}">이름 변경</button><button class="quiet" data-toggle-category="${c.id}">${c.active ? "비활성화" : "활성화"}</button>${c.type === "지출" ? `<button class="quiet" data-saving="${c.id}">${c.saving ? "소비로 분류" : "저축/투자로 분류"}</button>` : ""}</div>`).join("")}<form id="category-add" class="controls"><input name="name" placeholder="새 분류" required maxlength="80"><select name="type"><option>지출</option><option>수입</option></select><button>추가</button></form></section><section class="panel"><h3>결제수단 관리</h3>${state.payments.map((p) => `<div class="manage"><span>${esc(p.name)}${p.active ? "" : " · 비활성"}</span><button class="quiet" data-rename-payment="${p.id}">이름 변경</button><button class="quiet" data-toggle-payment="${p.id}">${p.active ? "비활성화" : "활성화"}</button></div>`).join("")}<form id="payment-add" class="controls"><input name="name" placeholder="새 결제수단" required maxlength="80"><button>추가</button></form><p class="muted">이름 변경은 과거 기록에도 반영됩니다. 비활성 항목의 과거 기록은 보존됩니다.</p></section></div>`;
}
function render() {
  $("#app").innerHTML =
    `<aside><a class="brand" href="#">MY MONEY<span>나의 일상, 나의 돈</span></a><nav>${["대시보드", "거래 내역", "자산", "설정"].map((v) => `<button data-nav="${v}" class="${view === v ? "active" : ""}">${v}</button>`).join("")}</nav><div class="aside-note">작은 기록부터<br>차분하게 쌓아가세요.</div></aside><main><header><span>PERSONAL MONEY JOURNAL</span><button id="add" class="primary">＋ 기록 추가</button></header><div id="notice" role="status"></div>${view === "대시보드" ? dashboard() : view === "거래 내역" ? transactions() : view === "자산" ? assets() : settings()}<footer>MY MONEY · 나만의 브라우저 가계부</footer></main><dialog id="modal"></dialog>`;
  bind();
}
function modal(html) {
  $("#modal").innerHTML =
    `<button class="close" id="close" aria-label="닫기">×</button>${html}`;
  $("#close").onclick = () => $("#modal").close();
  $("#modal").showModal();
}
function field(name, title, input) {
  return `<label>${title}${input}<span class="error" data-error="${name}"></span></label>`;
}
function transactionForm(t) {
  const current = t ?? {
    date: today(),
    type: "지출",
    category: "",
    payment: "",
    description: "",
    amount: "",
    memo: "",
  };
  modal(
    `<h2>${t ? "기록 수정" : "기록 추가"}</h2><form id="transaction-form" novalidate><div class="form-grid">${field("date", "날짜", `<input name="date" type="date" value="${current.date}">`)}${field("type", "구분", `<select name="type"><option ${current.type === "지출" ? "selected" : ""}>지출</option><option ${current.type === "수입" ? "selected" : ""}>수입</option></select>`)}${field("category", "분류", '<select name="category"></select>')}${field(
      "payment",
      "결제수단",
      `<select name="payment">${options(
        state.payments.filter((p) => p.active || p.id === current.payment),
        current.payment,
      )}</select>`,
    )}${field("description", "내용", `<input name="description" maxlength="300" value="${esc(current.description)}">`)}${field("amount", "금액 (원)", `<input name="amount" inputmode="numeric" value="${current.amount === "" ? "" : Number(current.amount).toLocaleString("ko-KR")}">`)}${field("memo", "메모", `<textarea name="memo" maxlength="2000">${esc(current.memo)}</textarea>`)}</div><div class="controls"><button class="primary" type="submit">저장</button>${t ? "" : '<button type="submit" name="continue" value="yes">저장 후 계속 입력</button>'}</div></form>`,
  );
  const f = $("#transaction-form");
  const setCategories = () => {
    f.elements.category.innerHTML = options(
      state.categories.filter(
        (c) =>
          c.type === f.elements.type.value &&
          (c.active || c.id === current.category),
      ),
      current.category,
    );
  };
  setCategories();
  f.elements.type.onchange = setCategories;
  f.elements.amount.onblur = () => {
    const v = f.elements.amount.value.replace(/,/g, "");
    if (/^\d+$/.test(v))
      f.elements.amount.value = Number(v).toLocaleString("ko-KR");
  };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(f));
    data.description = data.description.trim();
    data.amount = Number(data.amount.replace(/,/g, ""));
    const er = errors(data);
    if (data.date < state.openingDate)
      er.date = "최초 기준일 이후 날짜를 입력하세요.";
    document
      .querySelectorAll("[data-error]")
      .forEach((el) => (el.textContent = er[el.dataset.error] ?? ""));
    if (Object.keys(er).length) return;
    const next = structuredClone(state);
    const entry = {
      ...data,
      id: t?.id ?? id(),
      order:
        t?.order ??
        next.transactions.reduce((n, t) => Math.max(n, t.order), 0) + 1,
    };
    if (t)
      next.transactions = next.transactions.map((x) =>
        x.id === t.id ? entry : x,
      );
    else next.transactions.push(entry);
    const keep = e.submitter?.name === "continue";
    e.submitter.disabled = true;
    if (await save(next)) {
      render();
      toast("저장했습니다.");
      if (keep) transactionForm();
    } else e.submitter.disabled = false;
  };
}
function assetForm(a) {
  a ??= { type: "예금", name: "", institution: "", amount: null, memo: "" };
  modal(
    `<h2>자산 ${a.id ? "수정" : "추가"}</h2><form id="asset-form"><div class="form-grid"><label>구분<select name="type">${["예금", "적금", "투자", "현금", "기타"].map((t) => `<option ${a.type === t ? "selected" : ""}>${t}</option>`).join("")}</select></label><label>자산 이름<input name="name" required value="${esc(a.name)}"></label><label>기관/계좌<input name="institution" value="${esc(a.institution)}"></label><label>현재 금액 (비우면 미입력)<input name="amount" type="number" min="0" step="1" value="${a.amount ?? ""}"></label><label>메모<textarea name="memo">${esc(a.memo)}</textarea></label></div><p class="error" id="asset-error"></p><button class="primary">저장</button></form>`,
  );
  $("#asset-form").onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    d.name = d.name.trim();
    d.amount = d.amount === "" ? null : Number(d.amount);
    if (
      !d.name ||
      (d.amount !== null && (!Number.isSafeInteger(d.amount) || d.amount < 0))
    ) {
      $("#asset-error").textContent = "이름과 0 이상의 정수 금액을 확인하세요.";
      return;
    }
    const next = structuredClone(state),
      entry = { ...d, id: a.id ?? id(), updated: today() };
    next.assets = a.id
      ? next.assets.map((x) => (x.id === a.id ? entry : x))
      : [...next.assets, entry];
    if (await save(next)) {
      render();
      toast("자산을 저장했습니다.");
    }
  };
}
function download(data, name) {
  const url = URL.createObjectURL(
    new Blob([data], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function importPreview(file) {
  try {
    const p = await parseExcel(file);
    const dates = p.transactions.map((t) => t.date).sort();
    modal(
      `<h2>엑셀 가져오기 미리보기</h2><p>${esc(file.name)} · ${p.transactions.length}건</p><p>기간 ${dates[0] ?? "없음"} ~ ${dates.at(-1) ?? "없음"}<br>수입 ${money(sum(p.transactions.filter((t) => t.type === "수입")))} · 지출 ${money(sum(p.transactions.filter((t) => t.type === "지출")))}</p><p>시트 ${esc(p.sheets.join(", "))} · 수식 ${p.formulaCount}개 · 자산 ${p.assets.length}개</p><p class="muted">원본 파일은 변경하지 않습니다. 오류 행이 있으면 가져올 수 없습니다. 자산 헤더를 인식하지 못한 원본 배치는 별도 확인이 필요합니다.</p>${p.warnings.map((w) => `<p class="error">${esc(w)}</p>`).join("")}${p.bad.map((e) => `<p class="error">${e.row}행: ${esc(e.errors)}</p>`).join("")}<div class="table-scroll"><table><thead><tr><th>월</th><th>건수</th><th>수입</th><th>지출</th><th>수지</th></tr></thead><tbody>${[
        ...new Set(p.transactions.map((t) => t.date.slice(0, 7))),
      ]
        .sort()
        .map((m) => {
          const ts = p.transactions.filter((t) => t.date.startsWith(m)),
            inc = sum(ts.filter((t) => t.type === "수입")),
            out = sum(ts.filter((t) => t.type === "지출"));
          return `<tr><td>${m}</td><td>${ts.length}</td><td>${money(inc)}</td><td>${money(out)}</td><td>${money(inc - out)}</td></tr>`;
        })
        .join(
          "",
        )}</tbody></table></div><form id="import-form"><label>가져오기 방식<select name="mode"><option value="append">기존 데이터에 추가</option><option value="replace">전체 교체 (거래·자산)</option></select></label><label>전체 교체 / 최초 가져오기 시작 잔액<input name="opening" type="number" step="1" required value="${p.opening ?? state.opening}"></label><label>최초 기준일<input name="openingDate" type="date" required value="${p.openingDate ?? dates[0] ?? state.openingDate}"></label><p class="muted">${p.opening === null ? "시작 잔액을 자동으로 찾지 못했습니다. 원본을 확인하고 직접 입력하세요." : "시작 잔액을 인식했습니다."} 최초 빈 장부에 추가할 때도 이 시작 잔액을 적용합니다.</p><p class="error" id="import-error"></p><button class="primary" ${p.bad.length ? "disabled" : ""}>가져오기 실행</button></form>`,
    );
    $("#import-form").onsubmit = async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      try {
        const opening = Number(f.opening);
        if (!Number.isSafeInteger(opening) || !validDate(f.openingDate))
          throw Error("시작 잔액과 기준일을 확인하세요.");
        const first = !state.transactions.length && !state.imports.length;
        const boundary =
          f.mode === "replace" || first ? f.openingDate : state.openingDate;
        if (p.transactions.some((t) => t.date < boundary))
          throw Error("기준일 이전 거래가 있습니다. 기준일을 확인하세요.");
        if (
          f.mode === "replace" &&
          !confirm(
            "기존 거래와 자산을 모두 교체하시겠습니까? 먼저 JSON 백업을 권장합니다.",
          )
        )
          return;
        let next = await applyImport(state, p, f.mode, opening, f.openingDate);
        if (first) {
          next.opening = opening;
          next.openingDate = f.openingDate;
        }
        if (await save(next)) {
          month =
            state.transactions
              .map((t) => t.date.slice(0, 7))
              .sort()
              .at(-1) ?? month;
          render();
          toast("가져오기를 완료했습니다.");
        }
      } catch (er) {
        $("#import-error").textContent = er.message;
      }
    };
  } catch (e) {
    alert("가져오기 실패: " + e.message);
  }
}
function bind() {
  document.querySelectorAll("[data-nav]").forEach(
    (b) =>
      (b.onclick = () => {
        view = b.dataset.nav;
        render();
      }),
  );
  $(".brand").onclick = (e) => {
    e.preventDefault();
    view = "대시보드";
    render();
  };
  $("#add").onclick = () => transactionForm();
  if ($("#month")) {
    $("#month").onchange = (e) => {
      if (e.target.value) {
        month = e.target.value;
        render();
      }
    };
    $("#prev").onclick = () => {
      month = shiftMonth(month, annual ? -12 : -1);
      render();
    };
    $("#next").onclick = () => {
      month = shiftMonth(month, annual ? 12 : 1);
      render();
    };
    $("#annual").onclick = () => {
      annual = !annual;
      render();
    };
  }
  document
    .querySelectorAll("[data-edit]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          transactionForm(
            state.transactions.find((t) => t.id === b.dataset.edit),
          )),
    );
  document.querySelectorAll("[data-delete]").forEach(
    (b) =>
      (b.onclick = async () => {
        if (
          !confirm("이 거래를 삭제하시겠습니까? 이후 장부 잔액이 재계산됩니다.")
        )
          return;
        const next = structuredClone(state);
        next.transactions = next.transactions.filter(
          (t) => t.id !== b.dataset.delete,
        );
        if (await save(next)) {
          render();
          toast("삭제했습니다.");
        }
      }),
  );
  document.querySelectorAll("[data-filter]").forEach(
    (el) =>
      (el.onchange = () => {
        filters[el.dataset.filter] = el.value;
        page = 1;
        render();
      }),
  );
  if ($("#reset"))
    $("#reset").onclick = () => {
      Object.keys(filters).forEach(
        (k) => (filters[k] = k === "sort" ? "date-desc" : ""),
      );
      page = 1;
      render();
    };
  if ($("#page-prev")) {
    $("#page-prev").onclick = () => {
      page--;
      render();
    };
    $("#page-next").onclick = () => {
      page++;
      render();
    };
  }
  if ($("#asset-add")) $("#asset-add").onclick = () => assetForm();
  document
    .querySelectorAll("[data-asset-edit]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          assetForm(state.assets.find((a) => a.id === b.dataset.assetEdit))),
    );
  document.querySelectorAll("[data-asset-delete]").forEach(
    (b) =>
      (b.onclick = async () => {
        if (confirm("자산을 삭제하시겠습니까?")) {
          const next = structuredClone(state);
          next.assets = next.assets.filter(
            (a) => a.id !== b.dataset.assetDelete,
          );
          if (await save(next)) render();
        }
      }),
  );
  if ($("#xlsx-export"))
    $("#xlsx-export").onclick = async () => {
      try {
        await exportExcel(state);
      } catch (e) {
        alert("내보내기 실패: " + e.message);
      }
    };
  if ($("#backup"))
    $("#backup").onclick = () =>
      download(JSON.stringify(state, null, 2), "MY_MONEY_" + today() + ".json");
  if ($("#restore"))
    $("#restore").onchange = async (e) => {
      try {
        const next = validateBackup(JSON.parse(await e.target.files[0].text()));
        if (
          confirm(
            `거래 ${next.transactions.length}건 · 자산 ${next.assets.length}개의 백업으로 전체 복원하시겠습니까?`,
          ) &&
          (await save(next))
        ) {
          month =
            state.transactions
              .map((t) => t.date.slice(0, 7))
              .sort()
              .at(-1) ?? today().slice(0, 7);
          render();
          toast("복원했습니다.");
        }
      } catch (e) {
        alert("복원 실패: " + e.message);
      }
    };
  if ($("#import"))
    $("#import").onchange = (e) => {
      if (e.target.files[0]) importPreview(e.target.files[0]);
    };
  if ($("#opening-form"))
    $("#opening-form").onsubmit = async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      if (
        !Number.isSafeInteger(Number(f.opening)) ||
        !validDate(f.openingDate) ||
        state.transactions.some((t) => t.date < f.openingDate)
      ) {
        alert("정수 잔액과 모든 거래 이전 기준일을 입력하세요.");
        return;
      }
      if (
        await save({
          ...state,
          opening: Number(f.opening),
          openingDate: f.openingDate,
        })
      ) {
        render();
        toast("시작 잔액을 저장했습니다.");
      }
    };
  for (const [kind, list] of [
    ["category", "categories"],
    ["payment", "payments"],
  ]) {
    document.querySelectorAll(`[data-rename-${kind}]`).forEach(
      (b) =>
        (b.onclick = async () => {
          const key = b.getAttribute(`data-rename-${kind}`),
            item = state[list].find((x) => x.id === key),
            name = prompt("새 이름", item.name)?.trim();
          if (!name) return;
          if (
            state[list].some(
              (x) =>
                x.id !== key &&
                x.name === name &&
                (kind === "payment" || x.type === item.type),
            )
          ) {
            alert("동일한 이름이 이미 있습니다.");
            return;
          }
          const next = structuredClone(state);
          next[list].find((x) => x.id === key).name = name;
          if (await save(next)) render();
        }),
    );
    document.querySelectorAll(`[data-toggle-${kind}]`).forEach(
      (b) =>
        (b.onclick = async () => {
          const next = structuredClone(state),
            item = next[list].find(
              (x) => x.id === b.getAttribute(`data-toggle-${kind}`),
            );
          item.active = !item.active;
          if (await save(next)) render();
        }),
    );
    if ($("#" + kind + "-add"))
      $("#" + kind + "-add").onsubmit = async (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.target));
        d.name = d.name.trim();
        if (
          !d.name ||
          state[list].some(
            (x) =>
              x.name === d.name && (kind === "payment" || x.type === d.type),
          )
        ) {
          alert("빈 이름 또는 중복 이름입니다.");
          return;
        }
        const next = structuredClone(state);
        next[list].push({ ...d, id: id(), active: true, saving: false });
        if (await save(next)) render();
      };
  }
  document.querySelectorAll("[data-saving]").forEach(
    (b) =>
      (b.onclick = async () => {
        const next = structuredClone(state),
          c = next.categories.find((c) => c.id === b.dataset.saving);
        c.saving = !c.saving;
        if (await save(next)) render();
      }),
  );
}
render();
