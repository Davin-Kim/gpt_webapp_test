import "./style.css";
import {
  defaultLayout,
  blankHTML,
  sampleHTML,
  mmToPx,
  downloadName,
  validLayout,
} from "./model.js";
import { loadDraft, saveDraft } from "./storage.js";
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
const icons = {
  open: "↥",
  download: "↓",
  eye: "◉",
  edit: "✎",
  print: "⎙",
  search: "⌕",
  pages: "▤",
};
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
  saving = false,
  saveTimer,
  paginationToken = 0,
  editor,
  ready = false,
  sourceHTML = "",
  restoredDraft = null,
  saveError = false,
  contentEpoch = 0,
  loadedSource = 0;
let search = { query: "", index: 0, hits: [] };
document.querySelector("#app").innerHTML =
  `<div class="shell"><header class="app-header"><a class="brand" href="#" aria-label="문서온"><span class="brand-mark">문</span><strong>문서온<span>DOCUMENT STUDIO</span></strong></a><div class="document-title"><input id="doc-name" aria-label="문서 이름" maxlength="100" value="시작 안내"><span id="format-badge">예시</span><span id="save-state">문서 내용은 이 기기에만 보관됩니다</span></div><div class="header-actions"><button id="new-doc" class="text-button">＋ 새 문서</button><button id="open-file" class="soft-button">↥ <span>파일 열기</span></button><div class="dropdown"><button id="download-menu" class="primary">내려받기 <span>⌄</span></button><div id="download-options" class="menu" hidden><button data-export="hwpx">HWPX · 한글 문서</button><button data-export="docx">DOCX · Word 문서</button><button data-export="html">HTML · 웹 문서</button><button data-export="txt">TXT · 텍스트</button><hr><button id="print-menu">인쇄 / PDF 저장</button></div></div><button id="help" class="icon-button" aria-label="도움말">?</button></div></header>
<div class="workspace-toolbar"><div class="mode-switch" role="group" aria-label="작업 모드"><button id="view-mode" aria-pressed="true">◉ 보기</button><button id="edit-mode" aria-pressed="false">✎ 편집</button></div><span class="toolbar-divider"></span><button id="sidebar-toggle" class="tool-button" aria-label="페이지 목록 표시" aria-pressed="true">▤ <span>페이지</span></button><button id="search-toggle" class="tool-button">⌕ <span>찾기</span></button><div class="toolbar-spacer"></div><div class="view-controls"><button id="zoom-out" class="icon-button" aria-label="축소">−</button><select id="zoom" aria-label="보기 배율"><option value="width">너비 맞춤</option><option value="page">한 쪽 맞춤</option>${[25, 50, 75, 90, 100, 125, 150, 200].map((n) => `<option value="${n}">${n}%</option>`).join("")}</select><button id="zoom-in" class="icon-button" aria-label="확대">＋</button><span class="toolbar-divider"></span><div class="layout-switch" role="group" aria-label="쪽 보기"><button data-view="single" aria-pressed="true" title="한 쪽 보기">▯</button><button data-view="spread" aria-pressed="false" title="두 쪽 보기">◫</button><button data-view="grid" aria-pressed="false" title="여러 쪽 모아보기">▦</button></div></div><button id="fullscreen" class="icon-button" aria-label="전체 화면">⛶</button><button id="print" class="icon-button" aria-label="문서 인쇄">⎙</button></div>
<div id="edit-toolbar" hidden><div class="ribbon-line"><div class="tool-group"><button data-command="undo" title="실행 취소 (Ctrl+Z)">↶</button><button data-command="redo" title="다시 실행 (Ctrl+Shift+Z)">↷</button></div><div class="tool-group"><select id="block-style" aria-label="문단 스타일"><option value="p">본문</option><option value="1">제목 1</option><option value="2">제목 2</option><option value="3">제목 3</option><option value="4">제목 4</option></select><select id="font-family" aria-label="글꼴"><option value="Malgun Gothic">맑은 고딕</option><option value="Batang">바탕</option><option value="Gulim">굴림</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option></select><select id="font-size" aria-label="글자 크기">${[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72].map((n) => `<option value="${n}" ${n === 11 ? "selected" : ""}>${n}pt</option>`).join("")}</select></div><div class="tool-group"><button data-command="bold" title="굵게 (Ctrl+B)"><b>B</b></button><button data-command="italic" title="기울임 (Ctrl+I)"><i>I</i></button><button data-command="underline" title="밑줄 (Ctrl+U)"><u>U</u></button><button data-command="strike" title="취소선"><s>S</s></button><button data-command="superscript" title="위 첨자">x²</button><button data-command="subscript" title="아래 첨자">x₂</button><label class="color-control" title="글자색">A<input id="text-color" type="color" value="#273449" aria-label="글자색"></label><label class="color-control highlight" title="형광펜">▰<input id="highlight-color" type="color" value="#fff29b" aria-label="형광펜 색"></label><button data-command="clear" title="서식 지우기">Tx</button></div><div class="tool-group"><button data-align="left" title="왼쪽 정렬">≡</button><button data-align="center" title="가운데 정렬">☷</button><button data-align="right" title="오른쪽 정렬">≡<small>R</small></button><button data-align="justify" title="양쪽 정렬">☰</button></div><div class="tool-group"><button data-command="bulletList" title="글머리 기호">• ≡</button><button data-command="orderedList" title="번호 매기기">1. ≡</button><button data-command="outdent" title="내어쓰기">⇤</button><button data-command="indent" title="들여쓰기">⇥</button><select id="line-height" aria-label="줄 간격"><option value="1.2">줄 1.2</option><option value="1.5" selected>줄 1.5</option><option value="1.8">줄 1.8</option><option value="2">줄 2.0</option></select></div></div><div class="ribbon-line secondary"><div class="tool-group"><button id="insert-table">▦ 표</button><button id="insert-image">▧ 이미지</button><button id="insert-link">↗ 링크</button><button data-command="pageBreak">▤ 쪽 나누기</button><button id="page-settings">⚙ 용지·여백</button><button id="paragraph-settings">¶ 문단 설정</button></div><div class="tool-group table-tools"><button data-table="addRowAfter">행 추가</button><button data-table="addColumnAfter">열 추가</button><button data-table="deleteRow">행 삭제</button><button data-table="deleteColumn">열 삭제</button><button data-table="mergeCells">셀 합치기</button><button data-table="splitCell">셀 나누기</button><button data-table="toggleHeaderRow">제목 행</button><button data-table="deleteTable">표 삭제</button></div><span class="edit-note">연속 본문 편집 · 보기에서 쪽 자동 분할</span></div></div>
<div id="search-bar" hidden><label>찾기 <input id="search-input" placeholder="문서에서 검색" maxlength="200"></label><span id="search-count">0건</span><button id="search-prev" aria-label="이전 검색 결과">↑</button><button id="search-next" aria-label="다음 검색 결과">↓</button><label class="replace-controls">바꾸기 <input id="replace-input" placeholder="바꿀 내용"></label><button id="replace-one" class="replace-controls">바꾸기</button><button id="replace-all" class="replace-controls">모두 바꾸기</button><button id="search-close" aria-label="검색 닫기">×</button></div>
<div id="import-banner" hidden><span id="import-summary"></span><button id="show-warnings">변환 안내</button><button id="dismiss-banner" aria-label="변환 안내 닫기">×</button></div><div id="recovery-banner" hidden><span>이전에 작업하던 문서가 있습니다.</span><button id="restore-draft">이어서 열기</button><button id="dismiss-draft">닫기</button></div><div id="storage-error" role="alert" hidden>임시 저장에 실패했습니다. 브라우저 저장 권한·용량을 확인하세요. <button id="retry-save">다시 저장</button></div>
<div class="workspace-body"><aside id="sidebar"><div class="sidebar-heading"><span>문서 페이지</span><b id="page-total">0</b></div><div id="thumbnails"></div><div class="sidebar-footer"><span class="lock">▣</span> 파일은 서버로 전송되지 않습니다.</div></aside><section id="workspace" aria-label="문서 작업 영역"><div id="loading" hidden role="status"><span class="spinner"></span><strong id="loading-text">문서를 준비하고 있습니다</strong><p>브라우저에서 안전하게 처리 중입니다.</p></div><div class="document-stage"><div id="pages" class="pages single"></div><div id="editor-stage" hidden><div id="editor-paper"><div class="editor-ruler"><span>0</span><span>2</span><span>4</span><span>6</span><span>8</span><span>10</span><span>12</span><span>14</span><span>16</span></div><div id="editor"></div></div></div><div class="document-end">문서 끝 <span>•</span> 문서온</div></div></section></div>
<footer class="statusbar"><span><i class="online-dot"></i> 브라우저 문서 작업실 <b id="mode-label">보기 전용</b></span><div class="page-nav"><button id="prev-page" aria-label="이전 쪽">‹</button><label><input id="page-number" type="number" min="1" value="1" aria-label="이동할 쪽"> / <span id="page-count">0</span> 쪽</label><button id="next-page" aria-label="다음 쪽">›</button></div><span id="word-count"></span><button id="compatibility">지원 범위 안내 ⓘ</button></footer></div>
<input id="file-input" type="file" accept=".hwpx,.docx" hidden><input id="image-input" type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden><dialog id="modal"><button id="modal-close" class="modal-close" aria-label="대화상자 닫기">×</button><div id="modal-content"></div></dialog><div id="toast" role="status"></div>`;
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
function busy(active, text = "문서를 준비하고 있습니다") {
  $("#loading").hidden = !active;
  $("#loading-text").textContent = text;
  $("#open-file").disabled = active;
  $("#new-doc").disabled = active;
  $("#download-menu").disabled = active;
  $("#workspace").setAttribute("aria-busy", String(active));
}
function currentHTML() {
  return editor?.getHTML() || state.html;
}
function touch() {
  contentEpoch++;
  dirty = true;
  state.html = currentHTML();
  state.name = $("#doc-name").value.trim() || "제목 없는 문서";
  $("#save-state").textContent = "변경 사항 저장 대기";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 750);
  if (mode === "view") refreshPages();
  updateStats();
}
async function persist() {
  if (saving) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 500);
    return;
  }
  saving = true;
  const epoch = contentEpoch;
  const snapshot = {
    ...state,
    html: cleanHTML(currentHTML()),
    name: $("#doc-name").value.trim() || "제목 없는 문서",
    updated: Date.now(),
    version: 1,
  };
  try {
    await saveDraft(snapshot);
    if (epoch === contentEpoch) {
      dirty = false;
      saveError = false;
      $("#storage-error").hidden = true;
      $("#save-state").textContent = "이 브라우저에 임시 저장됨";
      state.updated = snapshot.updated;
    }
  } catch {
    saveError = true;
    $("#storage-error").hidden = false;
    $("#save-state").textContent = "임시 저장 실패 · 파일로 내려받으세요";
  } finally {
    saving = false;
  }
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
  clearTimeout(saveTimer);
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
  $("#import-banner").hidden = !state.warnings.length;
  $("#import-summary").textContent = state.warnings.length
    ? "기본 본문을 불러왔습니다. 원본 조판과 달라질 수 있습니다."
    : "";
  $("#recovery-banner").hidden = true;
  contentEpoch++;
  dirty = true;
  await refreshPages();
  if (mode !== nextMode) await switchMode(nextMode);
  else {
    editor.setEditable(mode === "edit");
    applyZoom();
  }
  updateStats();
  await persist();
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
$("#retry-save").onclick = persist;
$("#new-doc").onclick = async () => {
  if (
    dirty &&
    !confirm("아직 임시 저장되지 않은 변경이 있습니다. 새 문서를 여시겠습니까?")
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
    `<div class="modal-icon">▤</div><h2>문서온</h2><p>문서를 열고, 읽고, 쓰는 가벼운 작업실.</p><p class="muted">HWPX · DOCX / 문서는 이 기기에서 처리합니다.</p><button id="load-example" class="primary">안내 문서 열기</button>`,
  );
  $("#load-example").onclick = async () => {
    if (
      dirty &&
      !confirm("저장 대기 중인 변경을 두고 안내 문서를 여시겠습니까?")
    )
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
$("#open-file").onclick = () => $("#file-input").click();
async function readFile(file) {
  if (!file) return;
  if (
    dirty &&
    !confirm(
      "아직 임시 저장되지 않은 변경이 있습니다. 다른 파일을 여시겠습니까?",
    )
  )
    return;
  busy(true, "문서를 불러오고 있습니다");
  try {
    const { importDocument } = await import("./formats.js");
    const doc = await importDocument(file);
    await openState(doc);
    notify("문서를 열었습니다. 원본 파일은 변경하지 않습니다.");
  } catch (e) {
    modal(
      `<div class="modal-icon error">!</div><h2>파일을 열지 못했습니다</h2><p>${esc(e.message)}</p><p class="muted">암호화·손상 문서인지 확인하고 HWPX 또는 DOCX 사본으로 다시 시도하세요. 현재 작업 문서는 유지됩니다.</p>`,
    );
  } finally {
    busy(false);
    $("#file-input").value = "";
  }
}
$("#file-input").onchange = (e) => readFile(e.target.files[0]);
let dragCount = 0;
window.addEventListener("dragover", (e) => {
  if (e.dataTransfer.types.includes("Files")) e.preventDefault();
});
window.addEventListener("drop", (e) => {
  if (e.dataTransfer.files.length) {
    e.preventDefault();
    readFile(e.dataTransfer.files[0]);
  }
});
function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
$("#download-menu").onclick = () =>
  ($("#download-options").hidden = !$("#download-options").hidden);
document.addEventListener("click", (e) => {
  if (!e.target.closest(".dropdown")) $("#download-options").hidden = true;
});
$$("[data-export]").forEach(
  (b) =>
    (b.onclick = () => {
      const type = b.dataset.export;
      $("#download-options").hidden = true;
      if (["hwpx", "docx"].includes(type)) {
        modal(
          `<h2>${type.toUpperCase()} 사본 저장</h2><p>현재 편집 가능한 본문을 새 문서로 변환합니다. 원본의 정밀한 배치·도형·머리말·각주·자동 필드는 그대로 유지되지 않을 수 있습니다.</p><p class="muted">중요한 문서는 저장 후 한글 또는 Word에서 확인하세요. 원본 파일은 변경하지 않습니다.</p><button id="confirm-export" class="primary">변환 사본 내려받기</button>`,
        );
        $("#confirm-export").onclick = () => {
          $("#modal").close();
          exportFile(type);
        };
      } else exportFile(type);
    }),
);
async function exportFile(type) {
  busy(true, `${type.toUpperCase()} 파일을 만들고 있습니다`);
  try {
    state.name = $("#doc-name").value.trim() || "제목 없는 문서";
    let blob;
    const html = cleanHTML(currentHTML());
    if (type === "hwpx" || type === "docx") {
      const F = await import("./formats.js");
      blob = await (type === "hwpx" ? F.exportHwpx : F.exportDocx)(
        html,
        state.name,
        state.layout,
      );
    } else if (type === "txt")
      blob = new Blob(["\uFEFF" + editor.getText()], {
        type: "text/plain;charset=utf-8",
      });
    else {
      const css = await import("./print-css.js");
      blob = new Blob(
        [
          `<!doctype html><html lang="ko"><meta charset="utf-8"><title>${esc(state.name)}</title><style>${css.documentCSS}</style><body class="doc-content">${html}</body></html>`,
        ],
        { type: "text/html;charset=utf-8" },
      );
    }
    download(blob, downloadName(state.name, type));
    notify("문서 사본을 내려받았습니다.");
    persist();
  } catch (e) {
    notify("내려받기 실패: " + e.message);
  } finally {
    busy(false);
  }
}
async function printDocument() {
  busy(true, "인쇄할 페이지를 준비하고 있습니다");
  try {
    await refreshPages();
    const { documentCSS } = await import("./print-css.js");
    const frame = document.createElement("iframe");
    frame.className = "print-frame";
    frame.title = "문서 인쇄";
    document.body.append(frame);
    const d = frame.contentDocument;
    d.open();
    d.write(
      `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc($("#doc-name").value)}</title><style>${documentCSS}@page{size:${state.layout.width}mm ${state.layout.height}mm;margin:0}body{margin:0}.print-page{width:${state.layout.width}mm;height:${state.layout.height}mm;padding:${state.layout.top}mm ${state.layout.right}mm ${state.layout.bottom}mm ${state.layout.left}mm;box-sizing:border-box;break-after:page;overflow:hidden}.print-page:last-child{break-after:auto}</style></head><body>${pages.map((p) => `<section class="print-page doc-content">${p}</section>`).join("")}</body></html>`,
    );
    d.close();
    await Promise.all([...d.images].map((i) => i.decode?.().catch(() => {})));
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 60000);
  } catch (e) {
    notify("인쇄 준비 실패: " + e.message);
  } finally {
    busy(false);
  }
}
$("#print").onclick = printDocument;
$("#print-menu").onclick = () => {
  $("#download-options").hidden = true;
  printDocument();
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
$("#insert-image").onclick = () => $("#image-input").click();
$("#image-input").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    if (
      f.size > 5 * 1024 * 1024 ||
      !["image/png", "image/jpeg", "image/gif", "image/webp"].includes(f.type)
    )
      throw Error("PNG·JPEG·GIF·WebP 이미지 5MB 이하를 선택하세요.");
    const src = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(f);
    });
    editor.chain().focus().setImage({ src, alt: f.name }).run();
  } catch (er) {
    notify(er.message);
  }
  e.target.value = "";
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
const helpContent = `<div class="modal-icon">▤</div><h2>HWPX와 Word, 브라우저에서</h2><p>한글·Word를 별도 설치하지 않고 기본 문서를 읽고 편집합니다. 원본 파일을 직접 수정하지 않으며 내보내기는 새 변환 사본입니다.</p><div class="help-grid"><div><b>지원하는 기능</b><p>HWPX·DOCX 읽기 및 저장, 본문·기본 서식·표·이미지, 문단·목록·링크·쪽 나누기, 인쇄, 검색·바꾸기.</p></div><div><b>원본과 달라질 수 있어요</b><p>정밀한 조판, 글꼴 대체, 다단·복수 구역, 도형·차트·수식·OLE, 머리말·꼬리말·각주, 자동 필드·변경 추적.</p></div></div><p class="muted">페이지는 브라우저 기준으로 다시 나눕니다. 편집은 연속 본문이고 보기에서 용지 크기로 분할됩니다. 구형 .hwp / .doc, 암호화·손상 문서는 지원하지 않습니다. 문서 25MB, 압축 해제 80MB, 1,000쪽 제한.</p><p class="muted">문서는 서버로 전송하지 않습니다. 현재 작업 1개를 이 브라우저 IndexedDB에 임시 저장하며 기기 간 동기화는 없습니다. 여러 탭 동시 편집은 피하고 중요한 문서는 파일로 내려받으세요. 이 앱은 한컴·Microsoft의 공식 제품이 아닙니다.</p>`;
$("#help").onclick = $("#compatibility").onclick = () => modal(helpContent);
$("#show-warnings").onclick = () =>
  modal(
    `<h2>문서 변환 안내</h2><ul class="warning-list">${state.warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul><p class="muted">원본 파일은 변경하지 않았습니다. 새 사본 저장 후 중요한 서식은 한글·Word에서 확인하세요.</p>`,
  );
$("#dismiss-banner").onclick = () => ($("#import-banner").hidden = true);
$("#dismiss-draft").onclick = () => ($("#recovery-banner").hidden = true);
$("#restore-draft").onclick = async () => {
  if (restoredDraft) {
    busy(true, "이전 작업을 불러옵니다");
    try {
      await openState(restoredDraft);
    } finally {
      busy(false);
    }
  }
};
window.addEventListener("beforeunload", (e) => {
  if (dirty || saving || saveError) {
    e.preventDefault();
    e.returnValue = "";
  }
});
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    exportFile("docx");
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
    e.preventDefault();
    $("#file-input").click();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
    e.preventDefault();
    $("#search-bar").hidden = false;
    $$(".replace-controls").forEach((el) => (el.hidden = mode !== "edit"));
    $("#search-input").focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
    e.preventDefault();
    printDocument();
  }
});
try {
  restoredDraft = await loadDraft();
  if (
    restoredDraft?.version === 1 &&
    typeof restoredDraft.html === "string" &&
    validLayout(restoredDraft.layout)
  ) {
    $("#recovery-banner").hidden = false;
    $("#recovery-banner span").textContent =
      `이전 작업: ${restoredDraft.name || "제목 없는 문서"} · 이어서 열 수 있습니다.`;
  } else restoredDraft = null;
} catch {
  $("#save-state").textContent =
    "임시 저장소에 접근할 수 없습니다. 파일 저장을 이용하세요.";
}
if (window.innerWidth <= 760) {
  $("#sidebar").classList.add("collapsed");
  $("#sidebar-toggle").setAttribute("aria-pressed", "false");
}
setPaper();
await refreshPages();
updateStats();
selectionUI();
$("#zoom").value = "width";
