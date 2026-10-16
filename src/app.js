import "./style.css";
import {
  defaultLayout,
  blankHTML,
  sampleHTML,
  mmToPx,
  validLayout,
} from "./model.js";
import { cleanHTML } from "./sanitize.js";
import { makeEditor } from "./editor.js";
import { paginate } from "./pagination.js";
import { documentCSS } from "./print-css.js";
const sharedStyle = document.createElement("style");
sharedStyle.textContent = documentCSS;
document.head.append(sharedStyle);
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)],
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let state = {
    name: "시작 안내",
    format: "예시",
    html: sampleHTML,
    layout: { ...defaultLayout },
    warnings: [],
    updated: null,
  },
  mode = "view",
  view = "single",
  zoom = 90,
  fit = "width",
  pages = [],
  current = 1,
  dirty = false,
  paginationToken = 0,
  editor,
  ready = false,
  sourceHTML = "",
  contentEpoch = 0,
  loadedSource = 0;
let search = { query: "", index: 0, hits: [] };
document.querySelector("#app").innerHTML =
  `<div class="shell"><header class="app-header"><a class="brand" href="#" aria-label="문서온"><span class="brand-mark">문</span><strong>문서온<span>DOCUMENT STUDIO</span></strong></a><div class="document-title"><input id="doc-name" aria-label="문서 이름" maxlength="100" value="시작 안내"><span id="format-badge">예시</span><span id="save-state">현재 화면에서만 작업 · 새로고침 시 초기화</span></div><div class="header-actions"><button id="new-doc" class="text-button">＋ 새 문서</button><button id="paste-text" class="soft-button">텍스트 붙여넣기</button><button id="copy-text" class="primary">내용 복사</button><button id="help" class="icon-button" aria-label="도움말">?</button></div></header>
<div class="workspace-toolbar"><div class="mode-switch" role="group" aria-label="작업 모드"><button id="view-mode" aria-pressed="true">◉ 보기</button><button id="edit-mode" aria-pressed="false">✎ 편집</button></div><span class="toolbar-divider"></span><button id="sidebar-toggle" class="tool-button" aria-label="페이지 목록 표시" aria-pressed="true">▤ <span>페이지</span></button><button id="search-toggle" class="tool-button">⌕ <span>찾기</span></button><div class="toolbar-spacer"></div><div class="view-controls"><button id="zoom-out" class="icon-button" aria-label="축소">−</button><select id="zoom" aria-label="보기 배율"><option value="width">너비 맞춤</option><option value="page">한 쪽 맞춤</option>${[25, 50, 75, 90, 100, 125, 150, 200].map((n) => `<option value="${n}">${n}%</option>`).join("")}</select><button id="zoom-in" class="icon-button" aria-label="확대">＋</button><span class="toolbar-divider"></span><div class="layout-switch" role="group" aria-label="쪽 보기"><button data-view="single" aria-pressed="true" title="한 쪽 보기">▯</button><button data-view="spread" aria-pressed="false" title="두 쪽 보기">◫</button><button data-view="grid" aria-pressed="false" title="여러 쪽 모아보기">▦</button></div></div><button id="fullscreen" class="icon-button" aria-label="전체 화면">⛶</button></div>
<div id="edit-toolbar" hidden><div class="ribbon-line"><div class="tool-group"><button data-command="undo" title="실행 취소 (Ctrl+Z)">↶</button><button data-command="redo" title="다시 실행 (Ctrl+Shift+Z)">↷</button></div><div class="tool-group"><select id="block-style" aria-label="문단 스타일"><option value="p">본문</option><option value="1">제목 1</option><option value="2">제목 2</option><option value="3">제목 3</option><option value="4">제목 4</option></select><select id="font-family" aria-label="글꼴"><option value="Malgun Gothic">맑은 고딕</option><option value="Batang">바탕</option><option value="Gulim">굴림</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option></select><select id="font-size" aria-label="글자 크기">${[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72].map((n) => `<option value="${n}" ${n === 11 ? "selected" : ""}>${n}pt</option>`).join("")}</select></div><div class="tool-group"><button data-command="bold" title="굵게 (Ctrl+B)"><b>B</b></button><button data-command="italic" title="기울임 (Ctrl+I)"><i>I</i></button><button data-command="underline" title="밑줄 (Ctrl+U)"><u>U</u></button><button data-command="strike" title="취소선"><s>S</s></button><button data-command="superscript" title="위 첨자">x²</button><button data-command="subscript" title="아래 첨자">x₂</button><label class="color-control" title="글자색">A<input id="text-color" type="color" value="#273449" aria-label="글자색"></label><label class="color-control highlight" title="형광펜">▰<input id="highlight-color" type="color" value="#fff29b" aria-label="형광펜 색"></label><button data-command="clear" title="서식 지우기">Tx</button></div><div class="tool-group"><button data-align="left" title="왼쪽 정렬">≡</button><button data-align="center" title="가운데 정렬">☷</button><button data-align="right" title="오른쪽 정렬">≡<small>R</small></button><button data-align="justify" title="양쪽 정렬">☰</button></div><div class="tool-group"><button data-command="bulletList" title="글머리 기호">• ≡</button><button data-command="orderedList" title="번호 매기기">1. ≡</button><button data-command="outdent" title="내어쓰기">⇤</button><button data-command="indent" title="들여쓰기">⇥</button><select id="line-height" aria-label="줄 간격"><option value="1.2">줄 1.2</option><option value="1.5" selected>줄 1.5</option><option value="1.8">줄 1.8</option><option value="2">줄 2.0</option></select></div></div><div class="ribbon-line secondary"><div class="tool-group"><button id="insert-table">▦ 표</button><button id="insert-link">↗ 링크</button><button data-command="pageBreak">▤ 쪽 나누기</button><button id="page-settings">⚙ 용지·여백</button><button id="paragraph-settings">¶ 문단 설정</button></div><div class="tool-group table-tools"><button data-table="addRowAfter">행 추가</button><button data-table="addColumnAfter">열 추가</button><button data-table="deleteRow">행 삭제</button><button data-table="deleteColumn">열 삭제</button><button data-table="mergeCells">셀 합치기</button><button data-table="splitCell">셀 나누기</button><button data-table="toggleHeaderRow">제목 행</button><button data-table="deleteTable">표 삭제</button></div><span class="edit-note">연속 본문 편집 · 보기에서 쪽 자동 분할</span></div></div>
<div id="search-bar" hidden><label>찾기 <input id="search-input" placeholder="문서에서 검색" maxlength="200"></label><span id="search-count">0건</span><button id="search-prev" aria-label="이전 검색 결과">↑</button><button id="search-next" aria-label="다음 검색 결과">↓</button><label class="replace-controls">바꾸기 <input id="replace-input" placeholder="바꿀 내용"></label><button id="replace-one" class="replace-controls">바꾸기</button><button id="replace-all" class="replace-controls">모두 바꾸기</button><button id="search-close" aria-label="검색 닫기">×</button></div>
<div class="session-notice">텍스트 보기·편집 전용 · 자동 저장하지 않습니다. 닫거나 새로고침하기 전에 필요한 내용을 직접 복사하세요.</div>
<div class="workspace-body"><aside id="sidebar"><div class="sidebar-heading"><span>문서 페이지</span><b id="page-total">0</b></div><div id="thumbnails"></div><div class="sidebar-footer"><span class="lock">▣</span> 저장·전송 없이 화면에서만 작업합니다.</div></aside><section id="workspace" aria-label="문서 작업 영역"><div id="loading" hidden role="status"><span class="spinner"></span><strong id="loading-text">문서를 준비하고 있습니다</strong><p>브라우저에서 안전하게 처리 중입니다.</p></div><div class="document-stage"><div id="pages" class="pages single"></div><div id="editor-stage" hidden><div id="editor-paper"><div class="editor-ruler"><span>0</span><span>2</span><span>4</span><span>6</span><span>8</span><span>10</span><span>12</span><span>14</span><span>16</span></div><div id="editor"></div></div></div><div class="document-end">문서 끝 <span>•</span> 문서온</div></div></section></div>
<footer class="statusbar"><span><i class="online-dot"></i> 브라우저 문서 작업실 <b id="mode-label">보기 전용</b></span><div class="page-nav"><button id="prev-page" aria-label="이전 쪽">‹</button><label><input id="page-number" type="number" min="1" value="1" aria-label="이동할 쪽"> / <span id="page-count">0</span> 쪽</label><button id="next-page" aria-label="다음 쪽">›</button></div><span id="word-count"></span><button id="compatibility">지원 범위 안내 ⓘ</button></footer></div>
<dialog id="modal"><button id="modal-close" class="modal-close" aria-label="대화상자 닫기">×</button><div id="modal-content"></div></dialog><div id="toast" role="status"></div>`;
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(
    () => $("#toast").classList.remove("visible"),
    4500,
  );
}
function modal(html) {
  $("#modal-content").innerHTML = html;
  $("#modal").showModal();
}
$("#modal-close").onclick = () => $("#modal").close();
$("#modal").onclick = (e) => {
  if (e.target === $("#modal")) {
    const b = $("#modal").getBoundingClientRect();
    if (
      e.clientX < b.left ||
      e.clientX > b.right ||
      e.clientY < b.top ||
      e.clientY > b.bottom
    )
      $("#modal").close();
  }
};
function currentHTML() {
  return editor?.getHTML() || state.html;
}
function touch() {
  contentEpoch++;
  dirty = true;
  state.html = currentHTML();
  state.name = $("#doc-name").value.trim() || "제목 없는 문서";
  $("#save-state").textContent = "변경됨 · 필요한 내용을 직접 복사하세요";
  if (mode === "view") refreshPages();
  updateStats();
}
function updateStats() {
  const text = editor?.getText() || "";
  $("#word-count").textContent =
    `${text.replace(/\s/g, "").length.toLocaleString()}자 · ${(text.trim() ? text.trim().split(/\s+/).length : 0).toLocaleString()}단어`;
}
function selectionUI() {
  if (!editor || !ready) return;
  $$("[data-command]").forEach((b) =>
    b.classList.toggle("active", editor.isActive(b.dataset.command)),
  );
  $$("[data-align]").forEach((b) =>
    b.classList.toggle(
      "active",
      editor.isActive({ textAlign: b.dataset.align }),
    ),
  );
  $$("[data-table]").forEach((b) => (b.disabled = !editor.isActive("table")));
  const level = editor.getAttributes("heading").level;
  $("#block-style").value = level ? String(level) : "p";
  const size = parseFloat(editor.getAttributes("textStyle").fontSize);
  if (
    size &&
    [...$("#font-size").options].some((o) => Number(o.value) === size)
  )
    $("#font-size").value = String(size);
  const family = editor.getAttributes("textStyle").fontFamily;
  if (family && [...$("#font-family").options].some((o) => o.value === family))
    $("#font-family").value = family;
}
editor = makeEditor(
  $("#editor"),
  state.html,
  () => {
    if (ready) touch();
  },
  selectionUI,
);
editor.setEditable(false);
ready = true;
$("#editor").addEventListener("safe-paste", (e) =>
  editor.chain().focus().insertContent(e.detail).run(),
);
function setPaper() {
  const l = state.layout;
  document.documentElement.style.setProperty(
    "--paper-width",
    mmToPx(l.width) + "px",
  );
  document.documentElement.style.setProperty(
    "--paper-height",
    mmToPx(l.height) + "px",
  );
  for (const key of ["top", "bottom", "left", "right"])
    document.documentElement.style.setProperty(
      "--margin-" + key,
      mmToPx(l[key]) + "px",
    );
  $("#editor-paper").style.width = mmToPx(l.width) + "px";
  $("#editor").style.padding =
    `${mmToPx(l.top)}px ${mmToPx(l.right)}px ${mmToPx(l.bottom)}px ${mmToPx(l.left)}px`;
  $("#editor").style.minHeight = mmToPx(l.height) + "px";
}
function pageHTML(content, i) {
  return `<div class="page-frame" data-page="${i + 1}" id="page-${i + 1}"><div class="paper"><div class="page-content doc-content">${content}</div><div class="page-footer">${i + 1}</div></div><div class="page-caption">${i + 1}쪽</div></div>`;
}
async function refreshPages() {
  const token = ++paginationToken;
  setPaper();
  try {
    const result = await paginate(currentHTML(), state.layout);
    if (token !== paginationToken) return;
    pages = result.pages;
    $("#pages").innerHTML = pages.map(pageHTML).join("");
    $("#thumbnails").innerHTML = pages
      .map(
        (p, i) =>
          `<button class="thumbnail ${i + 1 === current ? "selected" : ""}" data-goto="${i + 1}" aria-label="${i + 1}쪽으로 이동"><div class="thumb-preview"><div class="thumb-paper"><div class="doc-content">${p}</div></div></div><span>${i + 1}</span></button>`,
      )
      .join("");
    $$("[data-goto]").forEach(
      (b) => (b.onclick = () => goPage(Number(b.dataset.goto))),
    );
    $("#page-total").textContent = pages.length;
    $("#page-count").textContent = pages.length;
    $("#page-number").max = pages.length;
    current = Math.min(current, pages.length) || 1;
    applyZoom();
    updatePageUI();
    if (result.scaled)
      notify(
        `분할할 수 없는 큰 표·이미지 ${result.scaled}개를 한 쪽에 맞춰 축소했습니다.`,
      );
    if (search.query) runSearch(false);
  } catch (e) {
    notify("페이지 표시 실패: " + e.message);
  }
}
function computeZoom() {
  const viewport = $("#workspace");
  const width = Math.max(240, viewport.clientWidth - 72),
    height = Math.max(200, viewport.clientHeight - 65),
    w = mmToPx(state.layout.width),
    h = mmToPx(state.layout.height);
  if (fit === "page") return Math.min(width / w, height / h, 1.6) * 100;
  if (fit === "width") {
    const cols =
      mode === "edit"
        ? 1
        : view === "spread"
          ? 2
          : view === "grid"
            ? width < 800
              ? 2
              : 3
            : 1;
    return Math.min(((width - (cols - 1) * 24) / (w * cols)) * 100, 125);
  }
  return zoom;
}
function applyZoom() {
  zoom = Math.max(15, Math.min(250, computeZoom()));
  document.documentElement.style.setProperty("--zoom", zoom / 100);
  const w = mmToPx(state.layout.width),
    h = mmToPx(state.layout.height);
  $$(".page-frame").forEach((el) => {
    el.style.width = (w * zoom) / 100 + "px";
    el.style.height = (h * zoom) / 100 + 25 + "px";
  });
  $("#editor-stage").style.width = (w * zoom) / 100 + "px";
  $("#editor-paper").style.zoom = zoom / 100;
  const tw = $("#sidebar").clientWidth - 52;
  const scale = Math.min(1, tw / w);
  $$(".thumb-preview").forEach((el) => {
    el.style.width = w * scale + "px";
    el.style.height = h * scale + "px";
    el.querySelector(".thumb-paper").style.transform = `scale(${scale})`;
  });
  $("#pages").className = "pages " + view;
  $("#zoom").value = fit || String(Math.round(zoom));
  if (!$("#zoom").value) {
    const opt = document.createElement("option");
    opt.value = String(Math.round(zoom));
    opt.textContent = Math.round(zoom) + "%";
    opt.dataset.temp = "true";
    $("#zoom").append(opt);
    $("#zoom").value = opt.value;
  }
}
function updatePageUI() {
  $("#page-number").value = current;
  $$("[data-goto]").forEach((b) =>
    b.classList.toggle("selected", Number(b.dataset.goto) === current),
  );
  $("#prev-page").disabled = current <= 1;
  $("#next-page").disabled = current >= pages.length;
}
function goPage(n) {
  if (mode === "edit") {
    notify("쪽 탐색은 보기 모드에서 사용할 수 있습니다.");
    return;
  }
  current = Math.max(1, Math.min(pages.length, Number(n) || 1));
  $("#page-" + current)?.scrollIntoView({ behavior: "smooth", block: "start" });
  updatePageUI();
}
async function switchMode(next) {
  if (mode === next) return;
  mode = next;
  editor.setEditable(mode === "edit");
  $("#view-mode").setAttribute("aria-pressed", String(mode === "view"));
  $("#edit-mode").setAttribute("aria-pressed", String(mode === "edit"));
  $("#edit-toolbar").hidden = mode !== "edit";
  $("#pages").hidden = mode === "edit";
  $("#editor-stage").hidden = mode !== "edit";
  document.body.classList.toggle("editing", mode === "edit");
  $("#mode-label").textContent = mode === "edit" ? "편집 중" : "보기 전용";
  $$(".replace-controls").forEach((el) => (el.hidden = mode !== "edit"));
  $$("[data-view]").forEach((b) => (b.disabled = mode === "edit"));
  if (mode === "view") await refreshPages();
  else {
    applyZoom();
    selectionUI();
    editor.commands.focus();
  }
  $("#workspace").scrollTop = 0;
  search.hits = [];
  if (search.query) runSearch();
}
async function openState(doc, nextMode = "view") {
  state = {
    ...doc,
    layout: validLayout(doc.layout) ? doc.layout : { ...defaultLayout },
    warnings: doc.warnings || [],
  };
  ready = false;
  editor.commands.setContent(cleanHTML(doc.html), { emitUpdate: false });
  ready = true;
  current = 1;
  sourceHTML = currentHTML();
  $("#doc-name").value = state.name;
  $("#format-badge").textContent = state.format;
  contentEpoch++;
  dirty = true;
  await refreshPages();
  if (mode !== nextMode) await switchMode(nextMode);
  else {
    editor.setEditable(mode === "edit");
    applyZoom();
  }
  updateStats();
  $("#workspace").scrollTop = 0;
}
$("#view-mode").onclick = () => switchMode("view");
$("#edit-mode").onclick = () => switchMode("edit");
$("#sidebar-toggle").onclick = () => {
  const hidden = $("#sidebar").classList.toggle("collapsed");
  $("#sidebar-toggle").setAttribute("aria-pressed", String(!hidden));
  setTimeout(applyZoom, 0);
};
$("#zoom").onchange = (e) => {
  fit = ["width", "page"].includes(e.target.value) ? e.target.value : null;
  if (!fit) zoom = Number(e.target.value);
  applyZoom();
};
function zoomStep(delta) {
  fit = null;
  zoom = Math.max(25, Math.min(200, Math.round(zoom / 10) * 10 + delta));
  applyZoom();
}
$("#zoom-in").onclick = () => zoomStep(10);
$("#zoom-out").onclick = () => zoomStep(-10);
$$("[data-view]").forEach(
  (b) =>
    (b.onclick = () => {
      view = b.dataset.view;
      fit = "width";
      $$("[data-view]").forEach((x) =>
        x.setAttribute("aria-pressed", String(x === b)),
      );
      applyZoom();
    }),
);
new ResizeObserver(() => applyZoom()).observe($("#workspace"));
$("#prev-page").onclick = () => goPage(current - 1);
$("#next-page").onclick = () => goPage(current + 1);
$("#page-number").onchange = (e) => goPage(Number(e.target.value));
let scrollTimer;
$("#workspace").onscroll = () => {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    if (mode !== "view") return;
    const top = $("#workspace").getBoundingClientRect().top + 40;
    const el = $$(".page-frame").reduce(
      (best, el) =>
        Math.abs(el.getBoundingClientRect().top - top) <
        Math.abs(best?.getBoundingClientRect().top - top ?? Infinity)
          ? el
          : best,
      null,
    );
    if (el) {
      current = Number(el.dataset.page);
      updatePageUI();
    }
  }, 120);
};
$("#fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    notify("이 브라우저에서는 전체 화면을 사용할 수 없습니다.");
  }
};
$("#doc-name").oninput = () => touch();
$("#new-doc").onclick = async () => {
  if (
    dirty &&
    !confirm(
      "내용을 저장하지 않습니다. 필요한 내용을 복사한 후 새 문서를 여시겠습니까?",
    )
  )
    return;
  await openState(
    {
      name: "제목 없는 문서",
      format: "새 문서",
      html: blankHTML,
      layout: { ...defaultLayout },
      warnings: [],
    },
    "edit",
  );
};
$(".brand").onclick = (e) => {
  e.preventDefault();
  modal(
    `<div class="modal-icon">▤</div><h2>문서온</h2><p>문서를 열고, 읽고, 쓰는 가벼운 작업실.</p><p class="muted">파일·저장소 연동 없는 텍스트 보기·편집 모드입니다.</p><button id="load-example" class="primary">안내 문서 열기</button>`,
  );
  $("#load-example").onclick = async () => {
    if (dirty && !confirm("현재 내용을 지우고 안내 문서를 여시겠습니까?"))
      return;
    $("#modal").close();
    await openState({
      name: "시작 안내",
      format: "예시",
      html: sampleHTML,
      layout: { ...defaultLayout },
      warnings: [],
    });
  };
};
$("#paste-text").onclick = () => {
  modal(
    `<h2>텍스트 붙여넣기</h2><p class="muted">직접 텍스트를 붙여넣으세요. 파일은 열거나 전송하지 않습니다. 적용 시 현재 본문을 교체합니다.</p><form id="paste-form"><label>문서 내용<textarea id="paste-content" rows="10" maxlength="500000" required aria-label="붙여넣을 텍스트"></textarea></label><button class="primary">본문에 적용</button></form>`,
  );
  $("#paste-content").focus();
  $("#paste-form").onsubmit = async (e) => {
    e.preventDefault();
    const text = $("#paste-content").value;
    if (!text.trim()) return;
    if (dirty && !confirm("현재 본문을 붙여넣은 내용으로 교체하시겠습니까?"))
      return;
    $("#modal").close();
    await openState({
      name: "붙여넣은 문서",
      format: "텍스트",
      html: text
        .split(/\r?\n/)
        .map((line) => `<p>${esc(line) || "<br>"}</p>`)
        .join(""),
      layout: { ...defaultLayout },
      warnings: [],
    });
    notify("텍스트를 표시했습니다. 닫으면 내용이 초기화됩니다.");
  };
};
$("#copy-text").onclick = () => {
  modal(
    `<h2>내용 복사</h2><p>아래 내용을 선택한 뒤 <strong>Ctrl+C</strong> (Mac: ⌘C)로 직접 복사하세요. 클립보드 접근 권한을 요청하지 않습니다.</p><textarea id="copy-content" rows="12" readonly aria-label="복사할 문서 내용"></textarea><p class="muted">일반 텍스트를 복사합니다. 서식을 포함하려면 편집 본문에서 직접 선택해 복사하세요.</p><button id="select-copy" class="primary">전체 선택</button>`,
  );
  $("#copy-content").value = editor.getText();
  $("#copy-content").select();
  $("#select-copy").onclick = () => $("#copy-content").select();
};
const commands = {
  undo: (c) => c.undo(),
  redo: (c) => c.redo(),
  bold: (c) => c.toggleBold(),
  italic: (c) => c.toggleItalic(),
  underline: (c) => c.toggleUnderline(),
  strike: (c) => c.toggleStrike(),
  bulletList: (c) => c.toggleBulletList(),
  orderedList: (c) => c.toggleOrderedList(),
  clear: (c) => c.unsetAllMarks().clearNodes(),
  pageBreak: (c) =>
    c.insertContent([{ type: "pageBreak" }, { type: "paragraph" }]),
  indent: (c) =>
    c.updateAttributes(editor.isActive("heading") ? "heading" : "paragraph", {
      indent: Math.min(
        240,
        (editor.getAttributes(
          editor.isActive("heading") ? "heading" : "paragraph",
        ).indent || 0) + 24,
      ),
    }),
  outdent: (c) =>
    c.updateAttributes(editor.isActive("heading") ? "heading" : "paragraph", {
      indent: Math.max(
        0,
        (editor.getAttributes(
          editor.isActive("heading") ? "heading" : "paragraph",
        ).indent || 0) - 24,
      ),
    }),
  superscript: (c) => c.toggleSuperscript(),
  subscript: (c) => c.toggleSubscript(),
};
$$("[data-command]").forEach(
  (b) =>
    (b.onclick = () => {
      const key = b.dataset.command;
      const chain = editor.chain().focus();
      commands[key]?.(chain).run();
      selectionUI();
    }),
);
$$("[data-align]").forEach(
  (b) =>
    (b.onclick = () =>
      editor.chain().focus().setTextAlign(b.dataset.align).run()),
);
$$("[data-table]").forEach(
  (b) =>
    (b.onclick = () => {
      const chain = editor.chain().focus();
      if (!chain[b.dataset.table]().run())
        notify(
          "셀을 선택한 뒤 다시 시도하세요. 병합은 인접한 여러 셀을 선택해야 합니다.",
        );
    }),
);
$("#block-style").onchange = (e) => {
  const c = editor.chain().focus();
  if (e.target.value === "p") c.setParagraph().run();
  else c.setHeading({ level: Number(e.target.value) }).run();
};
$("#font-family").onchange = (e) =>
  editor.chain().focus().setFontFamily(e.target.value).run();
$("#font-size").onchange = (e) =>
  editor
    .chain()
    .focus()
    .setFontSize(e.target.value + "pt")
    .run();
$("#line-height").onchange = (e) =>
  editor.chain().focus().setLineHeight(e.target.value).run();
$("#text-color").oninput = (e) =>
  editor.chain().focus().setColor(e.target.value).run();
$("#highlight-color").oninput = (e) =>
  editor.chain().focus().setHighlight({ color: e.target.value }).run();
$("#insert-table").onclick = () => {
  modal(
    `<h2>표 넣기</h2><form id="table-form"><div class="form-row"><label>행<input name="rows" type="number" min="1" max="30" value="3" required></label><label>열<input name="cols" type="number" min="1" max="12" value="3" required></label></div><label class="checkbox"><input name="header" type="checkbox" checked> 첫 행을 제목 행으로</label><button class="primary">표 삽입</button></form>`,
  );
  $("#table-form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const rows = Number(f.get("rows")),
      cols = Number(f.get("cols"));
    if (
      !Number.isInteger(rows) ||
      !Number.isInteger(cols) ||
      rows < 1 ||
      rows > 30 ||
      cols < 1 ||
      cols > 12
    )
      return;
    $("#modal").close();
    editor
      .chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: f.has("header") })
      .run();
  };
};
$("#insert-link").onclick = () => {
  modal(
    `<h2>링크 넣기</h2><form id="link-form"><label>주소<input name="href" type="url" placeholder="https://example.com" value="${esc(editor.getAttributes("link").href || "")}" required></label><p class="muted">선택한 텍스트에 링크를 적용합니다. 선택이 없으면 주소를 삽입합니다.</p><div class="actions"><button class="primary">적용</button><button type="button" id="unlink">링크 제거</button></div></form>`,
  );
  $("#link-form").onsubmit = (e) => {
    e.preventDefault();
    const href = new FormData(e.target).get("href");
    if (!/^https?:\/\//i.test(href)) {
      notify("http 또는 https 주소를 입력하세요.");
      return;
    }
    $("#modal").close();
    if (editor.state.selection.empty)
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: href,
          marks: [{ type: "link", attrs: { href } }],
        })
        .run();
    else editor.chain().focus().setLink({ href }).run();
  };
  $("#unlink").onclick = () => {
    $("#modal").close();
    editor.chain().focus().unsetLink().run();
  };
};
$("#paragraph-settings").onclick = () => {
  const attrs = editor.getAttributes(
    editor.isActive("heading") ? "heading" : "paragraph",
  );
  modal(
    `<h2>문단 설정</h2><form id="paragraph-form"><div class="form-row"><label>문단 앞 간격 (pt)<input name="before" type="number" min="0" max="100" value="${parseFloat(attrs.spaceBefore) || 0}"></label><label>문단 뒤 간격 (pt)<input name="after" type="number" min="0" max="100" value="${parseFloat(attrs.spaceAfter) || 0}"></label></div><label>첫 줄 들여쓰기 (px)<input name="first" type="number" min="-100" max="200" value="${parseFloat(attrs.firstLine) || 0}"></label><button class="primary">현재 문단에 적용</button></form>`,
  );
  $("#paragraph-form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    $("#modal").close();
    editor
      .chain()
      .focus()
      .updateAttributes(editor.isActive("heading") ? "heading" : "paragraph", {
        spaceBefore: f.get("before") + "pt",
        spaceAfter: f.get("after") + "pt",
        firstLine: f.get("first") + "px",
      })
      .run();
  };
};
$("#page-settings").onclick = () => {
  const l = state.layout;
  modal(
    `<h2>용지·여백</h2><form id="page-form"><div class="form-row"><label>용지<select name="size"><option value="A4">A4 · 210 × 297mm</option><option value="A3">A3 · 297 × 420mm</option><option value="A5">A5 · 148 × 210mm</option><option value="Letter">Letter · 216 × 279mm</option><option value="custom">현재 크기 유지</option></select></label><label>방향<select name="orientation"><option value="portrait">세로</option><option value="landscape" ${l.width > l.height ? "selected" : ""}>가로</option></select></label></div><p class="muted">현재 용지 ${l.width.toFixed(1)} × ${l.height.toFixed(1)} mm</p><div class="form-grid">${["top", "bottom", "left", "right"].map((k, i) => `<label>${["위", "아래", "왼쪽", "오른쪽"][i]} 여백 (mm)<input name="${k}" type="number" min="0" max="80" step="1" value="${Math.round(l[k])}" required></label>`).join("")}</div><p id="layout-error" class="error"></p><button class="primary">적용</button></form>`,
  );
  $("#page-form [name=size]").value = "custom";
  $("#page-form").onsubmit = (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target)),
      sizes = {
        A4: [210, 297],
        A3: [297, 420],
        A5: [148, 210],
        Letter: [216, 279],
      };
    let [w, h] = sizes[f.size] || [
      Math.min(l.width, l.height),
      Math.max(l.width, l.height),
    ];
    if (f.orientation === "landscape") [w, h] = [h, w];
    const next = {
      width: w,
      height: h,
      ...Object.fromEntries(
        ["top", "bottom", "left", "right"].map((k) => [k, Number(f[k])]),
      ),
    };
    if (!validLayout(next)) {
      $("#layout-error").textContent =
        "본문 공간이 너무 작습니다. 여백을 줄여 주세요.";
      return;
    }
    state.layout = next;
    $("#modal").close();
    setPaper();
    touch();
    applyZoom();
    refreshPages();
  };
};
function runSearch(scroll = true) {
  search.query = $("#search-input").value;
  search.hits = [];
  $$(".search-hit").forEach((m) =>
    m.replaceWith(document.createTextNode(m.textContent)),
  );
  $$(".page-content").forEach((root) => root.normalize());
  if (!search.query) {
    $("#search-count").textContent = "0건";
    return;
  }
  if (mode === "view") {
    for (const root of $$(".page-content")) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      let node;
      while ((node = walker.nextNode())) nodes.push(node);
      for (const t of nodes) {
        const value = t.textContent,
          parts = document.createDocumentFragment();
        let start = 0,
          at;
        while (
          (at = value
            .toLocaleLowerCase()
            .indexOf(search.query.toLocaleLowerCase(), start)) !== -1
        ) {
          parts.append(value.slice(start, at));
          const mark = document.createElement("mark");
          mark.className = "search-hit";
          mark.textContent = value.slice(at, at + search.query.length);
          parts.append(mark);
          search.hits.push(mark);
          start = at + search.query.length;
        }
        if (start) {
          parts.append(value.slice(start));
          t.replaceWith(parts);
        }
      }
    }
  } else {
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText) return;
      let at = 0;
      while (
        (at = node.text
          .toLocaleLowerCase()
          .indexOf(search.query.toLocaleLowerCase(), at)) !== -1
      ) {
        search.hits.push({
          from: pos + at,
          to: pos + at + search.query.length,
        });
        at += search.query.length;
      }
    });
  }
  search.index = Math.min(search.index, Math.max(0, search.hits.length - 1));
  $("#search-count").textContent = search.hits.length
    ? `${search.index + 1} / ${search.hits.length}건`
    : "0건";
  if (scroll) showSearch();
}
function showSearch() {
  if (!search.hits.length) return;
  const hit = search.hits[search.index];
  if (mode === "view") {
    $$(".search-hit").forEach((m) => m.classList.remove("current"));
    hit.classList.add("current");
    hit.scrollIntoView({ block: "center", behavior: "smooth" });
  } else editor.chain().setTextSelection(hit).scrollIntoView().run();
  $("#search-count").textContent =
    `${search.index + 1} / ${search.hits.length}건`;
}
$("#search-toggle").onclick = () => {
  $("#search-bar").hidden = !$("#search-bar").hidden;
  $$(".replace-controls").forEach((el) => (el.hidden = mode !== "edit"));
  if (!$("#search-bar").hidden) $("#search-input").focus();
};
$("#search-close").onclick = () => {
  $("#search-bar").hidden = true;
  $("#search-input").value = "";
  runSearch();
};
$("#search-input").oninput = () => {
  search.index = 0;
  runSearch();
};
$("#search-next").onclick = () => {
  if (search.hits.length) {
    search.index = (search.index + 1) % search.hits.length;
    showSearch();
  }
};
$("#search-prev").onclick = () => {
  if (search.hits.length) {
    search.index = (search.index + search.hits.length - 1) % search.hits.length;
    showSearch();
  }
};
$("#replace-one").onclick = () => {
  if (mode !== "edit") return;
  runSearch(false);
  const hit = search.hits[search.index];
  if (hit)
    editor
      .chain()
      .focus()
      .command(({ tr, dispatch }) => {
        if (dispatch)
          tr.insertText($("#replace-input").value, hit.from, hit.to);
        return true;
      })
      .run();
  runSearch();
};
$("#replace-all").onclick = () => {
  if (mode !== "edit") return;
  runSearch(false);
  const text = $("#replace-input").value,
    tr = editor.state.tr;
  for (const hit of [...search.hits].reverse())
    tr.insertText(text, hit.from, hit.to);
  editor.view.dispatch(tr);
  runSearch();
};
const helpContent = `<div class="modal-icon">▤</div><h2>텍스트 보기·편집 모드</h2><p>보안 환경을 고려해 파일 열기·업로드·다운로드·드라이브 연동·브라우저 저장 기능을 제거했습니다. 문서 파일 자체는 열 수 없습니다.</p><p>텍스트를 직접 붙여넣어 페이지로 보고, 글자·문단·표 서식을 편집할 수 있습니다. HWPX/DOCX 파일 파싱과 변환 라이브러리도 포함하지 않습니다.</p><p class="muted">작업 내용은 현재 탭의 메모리에만 존재하며 새로고침·탭 종료 시 사라집니다. 필요한 내용은 직접 선택해 복사하세요. 외부 저장소와 클립보드 API를 사용하지 않습니다.</p><p class="muted">기관에서 GitHub Pages 주소 자체를 차단한다면 기능을 제거해도 접속되지 않을 수 있습니다. 해당 기관에서 허용한 환경에서 사용하세요.</p>`;
$("#help").onclick = $("#compatibility").onclick = () => modal(helpContent);
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
    e.preventDefault();
    $("#search-bar").hidden = false;
    $$(".replace-controls").forEach((el) => (el.hidden = mode !== "edit"));
    $("#search-input").focus();
  }
});
if (window.innerWidth <= 760) {
  $("#sidebar").classList.add("collapsed");
  $("#sidebar-toggle").setAttribute("aria-pressed", "false");
}
setPaper();
await refreshPages();
updateStats();
selectionUI();
$("#zoom").value = "width";
