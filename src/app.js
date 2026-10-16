import "./style.css";
import { chapters, lessons, completionChecks } from "./content.js";
import { searchLessons, searchableText } from "./model.js";
import { renderWidget, bindWidgets } from "./widgets.js";
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
const completed = new Set();
let cleanup = () => {},
  activeLesson = null,
  searchIndex = -1,
  currentResults = [];
const practices = lessons.filter((l) =>
  /실습|정리표|계산기|게임 만들기|체크리스트/.test(l.title),
);
document.querySelector("#app").innerHTML =
  `<a class="skip" href="#main">본문으로 바로가기</a><header class="site-header"><a class="brand" href="#/"><span class="brand-icon">v<span>.</span></span><div>바이브코딩 노트<small>말로 시작하는 나의 첫 웹앱</small></div></a><nav aria-label="상단 메뉴"><a href="#/" data-top="home">전체 목차</a><a href="#/practice" data-top="practice">실습 모아보기</a></nav><div class="header-search"><span class="search-symbol" aria-hidden="true">⌕</span><label class="sr-only" for="site-search">학습 내용 검색</label><input id="site-search" type="search" placeholder="궁금한 내용을 검색하세요" autocomplete="off" aria-expanded="false" aria-controls="search-results"><kbd>Ctrl K</kbd><div id="search-results" hidden></div></div><button id="menu-toggle" aria-label="학습 메뉴 열기" aria-expanded="false">☰</button></header><div class="site-layout"><aside id="sidebar"><div class="sidebar-label">LEARNING GUIDE <span>기초 과정</span></div><a class="nav-home" href="#/">▦ <span>전체 학습 목차</span><b>24</b></a><div id="chapter-nav"></div><div class="session-progress"><div><strong>나의 학습 여정</strong><span id="progress-numbers">0 / 24</span></div><div class="progress-track"><i id="progress-fill"></i></div><p>완료 표시는 이 탭에서만 유지돼요.</p></div><a class="sidebar-security" href="#/learn/security"><span>▣</span><div>시작 전 보안 수칙<small>민감한 정보는 넣지 않아요</small></div><span>↗</span></a><div class="sidebar-source">원문 강사 · 박상향<br>43쪽 교안을 웹 학습용으로 재구성</div></aside><main id="main" tabindex="-1"></main></div><dialog id="prompt-dialog"><button id="close-prompt" aria-label="요청문 닫기">×</button><span class="eyebrow">PROMPT NOTE</span><h2 id="prompt-title"></h2><p>아래 문장을 선택하고 Ctrl+C / ⌘C로 직접 복사하세요.</p><textarea id="prompt-text" readonly rows="14" aria-label="선택할 요청문"></textarea><button id="select-prompt" class="button primary">요청문 전체 선택</button><span class="small-note">외부 AI를 호출하거나 클립보드 권한을 요청하지 않습니다.</span></dialog>`;
function nav() {
  const chapter = activeLesson?.chapter || location.hash.split("/")[2];
  $("#chapter-nav").innerHTML = chapters
    .map(
      (ch) =>
        `<div class="nav-chapter ${chapter === ch.id ? "expanded" : ""}"><a href="#/chapter/${ch.id}" class="nav-chapter-title ${chapter === ch.id ? "current" : ""}"><span>${ch.number}</span><b>${ch.short}</b><small>⌄</small></a>${chapter === ch.id ? `<div class="nav-lessons">${ch.lessons.map((l) => `<a href="#/learn/${l.id}" class="${activeLesson?.id === l.id ? "current" : ""}"><i>${completed.has(l.id) ? "✓" : "·"}</i>${l.title}</a>`).join("")}</div>` : ""}</div>`,
    )
    .join("");
  $("#progress-numbers").textContent = `${completed.size} / ${lessons.length}`;
  $("#progress-fill").style.width =
    (completed.size / lessons.length) * 100 + "%";
  $$("[data-top]").forEach((a) =>
    a.classList.toggle(
      "active",
      a.dataset.top === "practice"
        ? location.hash.startsWith("#/practice")
        : !location.hash || location.hash === "#/",
    ),
  );
}
function footer() {
  return `<footer class="footer"><div><b>바이브코딩 노트</b><span>생성형 AI 바이브 코딩 기초 · 학습용 재구성</span></div><p>원문 강사 박상향 · PDF 43쪽 기반<br>파일 업로드·다운로드·자동 저장 없이 동작합니다.</p></footer>`;
}
function chapterCard(ch) {
  return `<section class="chapter-card ${ch.color}" id="chapter-${ch.id}"><div class="chapter-card-head"><div class="chapter-icon">${ch.icon}</div><span>CHAPTER ${ch.number}</span><small>원문 ${ch.range}쪽</small></div><a href="#/chapter/${ch.id}" class="chapter-heading"><h2>${ch.short}</h2><span>↗</span></a><p>${ch.description}</p><div class="chapter-links">${ch.lessons.map((l, i) => `<a href="#/learn/${l.id}"><span class="lesson-number">${ch.number}.${String(i + 1).padStart(2, "0")}</span><span>${l.title}</span><i>${completed.has(l.id) ? "✓" : "→"}</i></a>`).join("")}</div><div class="chapter-card-footer"><span>${ch.lessons.length}개의 학습 노트</span><a href="#/learn/${ch.lessons[0].id}">이 장 시작하기 →</a></div></section>`;
}
function home() {
  return `<div class="home-content"><div class="breadcrumb">학습 가이드 <span>/</span> 전체 목차</div><section class="hero"><div class="hero-copy"><span class="pill"><i></i> 코딩이 처음이어도 괜찮아요</span><h1>말로 시작하는<br><em>나의 첫 웹앱.</em></h1><p>아이디어를 설명하고, AI와 함께 만들고, 직접 확인하기.<br>필요한 내용을 골라 읽으며 작은 도구 하나를 완성해 보세요.</p><div class="hero-actions"><a href="#/learn/what-is-vibe" class="button primary">처음부터 시작하기 <span>↗</span></a><a href="#/practice" class="hero-secondary">실습 먼저 살펴보기 →</a></div><div class="hero-meta"><span><b>5</b>개 챕터</span><span><b>24</b>개 학습 노트</span><span><b>43</b>쪽 교안 기반</span></div></div><div class="hero-visual" aria-hidden="true"><div class="visual-orbit orbit1"></div><div class="visual-orbit orbit2"></div><span class="visual-spark">✳</span><div class="floating-label">아이디어가 있다면, 시작할 준비 끝!</div><div class="chat-note"><span>나의 아이디어</span><p>내 업무에 필요한<br>작은 웹앱을 만들어 줘.</p><i>↗</i></div><div class="mini-app"><div class="mini-app-top"><span>•••</span><b>나의 첫 웹앱</b><i>↗</i></div><div class="mini-app-body"><div class="mini-line w1"></div><div class="mini-input"></div><div class="mini-input short"></div><div class="mini-button">아이디어를 화면으로 ✦</div><div class="mini-done">✓ &nbsp; 조금씩 고치며 완성해요</div></div></div><div class="floating-chip">✦ 설명 → 실행 → 확인</div></div></section><div class="learning-note"><span>✦</span><p><strong>정답 순서는 하나가 아니에요.</strong> 처음이라면 1장부터, 필요한 내용이 있다면 목차나 검색으로 바로 이동하세요.</p></div><section class="curriculum"><div class="section-title"><div><span class="eyebrow">YOUR LEARNING MAP</span><h2>어떤 것부터 알아볼까요?</h2></div><span>목차를 누르면 바로 읽을 수 있어요</span></div><div class="chapter-grid">${chapters.map(chapterCard).join("")}</div></section><section class="quick-path"><div><span class="eyebrow">QUICK START</span><h2>지금 필요한 내용부터.</h2><p>막히는 순간 바로 꺼내 볼 수 있는 노트들.</p></div><div>${[
    ["prompt-template", "✎", "요청문 템플릿", "괄호를 채워 시작하기"],
    ["debugging", "↻", "오류가 생겼다면", "본 그대로 알리고 고치기"],
    ["security", "▣", "안전하게 활용하기", "업무 시작 전 보안 수칙"],
  ]
    .map(
      ([id, icon, t, d]) =>
        `<a href="#/learn/${id}"><span>${icon}</span><div><h3>${t}</h3><p>${d}</p></div><i>↗</i></a>`,
    )
    .join("")}</div></section>${footer()}</div>`;
}
function chapterPage(id) {
  const ch = chapters.find((c) => c.id === id);
  if (!ch) return notFound();
  return `<div class="index-content"><div class="breadcrumb"><a href="#/">전체 목차</a><span>/</span> ${ch.number}장</div><div class="index-hero ${ch.color}"><span class="eyebrow">CHAPTER ${ch.number} · 원문 ${ch.range}쪽</span><h1>${ch.title}</h1><p>${ch.description}</p><a class="button primary" href="#/learn/${ch.lessons[0].id}">첫 노트 읽기 →</a></div><div class="chapter-lessons">${ch.lessons.map((l, i) => `<a href="#/learn/${l.id}"><span class="index-number">${String(i + 1).padStart(2, "0")}</span><div><h2>${l.title}</h2><p>${l.summary}</p><small>원문 ${l.pages}쪽</small></div><span>${completed.has(l.id) ? "✓" : "↗"}</span></a>`).join("")}</div>${footer()}</div>`;
}
function practicePage() {
  return `<div class="index-content"><div class="breadcrumb"><a href="#/">전체 목차</a><span>/</span> 실습 모아보기</div><div class="index-hero peach"><span class="eyebrow">LEARN BY DOING</span><h1>직접 해보면,<br>조금 더 쉬워져요.</h1><p>첫 요청부터 정리표, 계산 확인, 게임 만들기까지.</p></div><div class="chapter-lessons">${practices.map((l, i) => `<a href="#/learn/${l.id}"><span class="index-number">${String(i + 1).padStart(2, "0")}</span><div><small>${l.chapterNumber}장 · 원문 ${l.pages}쪽</small><h2>${l.title}</h2><p>${l.summary}</p></div><span>↗</span></a>`).join("")}</div>${footer()}</div>`;
}
function renderBlock(b, index) {
  if (b.type === "paragraph") return `<p class="article-p">${esc(b.text)}</p>`;
  if (b.type === "note")
    return `<aside class="callout ${b.extra ? "supplement" : ""}"><span>${b.extra ? "＋" : "✦"}</span><div><strong>${esc(b.title)}</strong><p>${esc(b.text)}</p></div></aside>`;
  if (b.type === "list" || b.type === "steps")
    return `<section class="content-block"><h2>${esc(b.title)}</h2><div class="${b.type === "steps" ? "step-list" : "concept-list"}">${b.items.map(([t, d], i) => `<div><span>${b.type === "steps" ? String(i + 1).padStart(2, "0") : "✓"}</span><div><h3>${esc(t)}</h3><p>${esc(d)}</p></div></div>`).join("")}</div></section>`;
  if (b.type === "table")
    return `<section class="content-block"><h2>${esc(b.title)}</h2><div class="table-wrap"><table><thead><tr>${b.headers.map((x) => `<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${b.rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;
  if (b.type === "prompt")
    return `<section class="prompt-block"><div><span>✎ ${esc(b.title)}</span><button data-prompt="${index}">요청문 선택 ↗</button></div><pre>${esc(b.text)}</pre></section>`;
  if (b.type === "widget") return renderWidget(b.kind);
  return "";
}
function lessonPage(l) {
  const at = lessons.findIndex((x) => x.id === l.id),
    prev = lessons[at - 1],
    next = lessons[at + 1];
  return `<div class="lesson-layout"><article class="lesson-article"><div class="breadcrumb"><a href="#/">전체 목차</a><span>/</span><a href="#/chapter/${l.chapter}">${l.chapterNumber}장</a><span>/</span> ${String(l.position).padStart(2, "0")}</div><header class="lesson-header"><span class="pill ${l.color}">CHAPTER ${l.chapterNumber} · ${esc(l.chapterTitle)}</span><h1>${esc(l.title)}</h1><p>${esc(l.summary)}</p><div class="lesson-meta"><span>원문 ${l.pages}쪽</span><span>강사 박상향 교안 재구성</span></div></header><div class="article-content">${l.blocks.map(renderBlock).join("")}</div><div class="completion-box"><div><b>이 노트, 이해하셨나요?</b><p>완료를 표시하고 다음 내용으로 이어가세요.</p></div><button id="complete-lesson" class="button ${completed.has(l.id) ? "completed" : "primary"}">${completed.has(l.id) ? "✓ 학습 완료" : "학습 완료로 표시"}</button></div><div class="lesson-pagination">${prev ? `<a href="#/learn/${prev.id}"><small>← 이전 노트</small><strong>${esc(prev.title)}</strong></a>` : "<div></div>"}${next ? `<a href="#/learn/${next.id}"><small>다음 노트 →</small><strong>${esc(next.title)}</strong></a>` : '<a href="#/"><small>전체 과정을 살펴봤어요</small><strong>목차로 돌아가기 →</strong></a>'}</div>${footer()}</article><aside class="lesson-right"><span>이 노트의 핵심</span><ul>${l.tags
    .slice(0, 5)
    .map((t) => `<li>${esc(t)}</li>`)
    .join(
      "",
    )}</ul><div class="source-label">PDF ${l.pages}쪽 기반<p>원문을 읽기 쉽게 재구성했습니다. 추가한 설명은 ‘보충’으로 구분합니다.</p></div><a href="#/learn/security">업무에 쓰기 전 보안 수칙 ↗</a></aside></div>`;
}
function notFound() {
  return `<div class="not-found"><span>404</span><h1>찾으시는 학습 노트가 없어요.</h1><p>전체 목차에서 내용을 다시 골라주세요.</p><a href="#/" class="button primary">전체 목차로 돌아가기</a></div>`;
}
function render() {
  cleanup();
  cleanup = () => {};
  activeLesson = null;
  let route;
  try {
    route = (location.hash || "#/")
      .slice(1)
      .split("/")
      .filter(Boolean)
      .map(decodeURIComponent);
  } catch {
    route = ["invalid"];
  }
  if (route[0] === "learn") {
    activeLesson = lessons.find((l) => l.id === route[1]);
    $("#main").innerHTML = activeLesson ? lessonPage(activeLesson) : notFound();
  } else if (route[0] === "chapter")
    $("#main").innerHTML = chapterPage(route[1]);
  else if (route[0] === "practice") $("#main").innerHTML = practicePage();
  else $("#main").innerHTML = route.length ? notFound() : home();
  nav();
  cleanup = bindWidgets($("#main"));
  $$("[data-prompt]").forEach(
    (b) =>
      (b.onclick = () => {
        const block = activeLesson.blocks[Number(b.dataset.prompt)];
        $("#prompt-title").textContent = block.title;
        $("#prompt-text").value = block.text;
        $("#prompt-dialog").showModal();
        $("#prompt-text").select();
      }),
  );
  if ($("#complete-lesson"))
    $("#complete-lesson").onclick = () => {
      if (completed.has(activeLesson.id)) completed.delete(activeLesson.id);
      else completed.add(activeLesson.id);
      nav();
      $("#complete-lesson").className =
        "button " + (completed.has(activeLesson.id) ? "completed" : "primary");
      $("#complete-lesson").textContent = completed.has(activeLesson.id)
        ? "✓ 학습 완료"
        : "학습 완료로 표시";
    };
  $("#sidebar").classList.remove("mobile-open");
  $("#menu-toggle").setAttribute("aria-expanded", "false");
  $("#menu-toggle").setAttribute("aria-label", "학습 메뉴 열기");
  document.title = activeLesson
    ? activeLesson.title + " · 바이브코딩 노트"
    : "생성형 AI 바이브코딩 기초 · 바이브코딩 노트";
  window.scrollTo({ top: 0, behavior: "instant" });
  $("#main").scrollTop = 0;
}
function snippet(l, q) {
  const blocks = l.blocks
    .map(
      (b) =>
        b.text ||
        b.title ||
        b.items?.flat().join(" ") ||
        b.rows?.flat().join(" ") ||
        "",
    )
    .join(" ");
  const word = q.trim().split(/\s+/)[0] || "";
  const at = blocks.toLocaleLowerCase().indexOf(word.toLocaleLowerCase());
  const text =
    at >= 0 ? blocks.slice(Math.max(0, at - 28), at + 95) : l.summary;
  const pos = text.toLocaleLowerCase().indexOf(word.toLocaleLowerCase());
  return pos >= 0
    ? esc(text.slice(0, pos)) +
        `<mark>${esc(text.slice(pos, pos + word.length))}</mark>` +
        esc(text.slice(pos + word.length))
    : esc(text);
}
function closeSearch() {
  $("#search-results").hidden = true;
  $("#site-search").setAttribute("aria-expanded", "false");
  searchIndex = -1;
}
function search() {
  const q = $("#site-search").value.trim();
  if (!q) {
    closeSearch();
    return;
  }
  currentResults = searchLessons(q);
  searchIndex = -1;
  $("#search-results").innerHTML =
    `<div class="search-heading"><span>검색 결과 <b>${currentResults.length}</b></span><button id="clear-search">닫기 ×</button></div>${currentResults.length ? `<div class="search-items">${currentResults.map((l, i) => `<a href="#/learn/${l.id}" data-result="${i}"><span>${l.chapterNumber}장 · 원문 ${l.pages}쪽</span><h3>${esc(l.title)}</h3><p>${snippet(l, q)}</p></a>`).join("")}</div>` : `<div class="no-results"><strong>검색 결과가 없습니다.</strong><p>‘프롬프트’, ‘출장비’, ‘보안’처럼 다른 단어로 찾아보세요.</p></div>`}<div class="search-hint">↑ ↓ 이동 <span>Enter 열기 · Esc 닫기</span></div>`;
  $("#search-results").hidden = false;
  $("#site-search").setAttribute("aria-expanded", "true");
  $("#clear-search").onclick = closeSearch;
  $$("[data-result]").forEach((a) => (a.onclick = closeSearch));
}
$("#site-search").oninput = search;
$("#site-search").onfocus = () => {
  if ($("#site-search").value.trim()) search();
};
$("#site-search").onkeydown = (e) => {
  const items = $$("[data-result]");
  if (e.key === "Escape") {
    closeSearch();
    return;
  }
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (!items.length) return;
    searchIndex =
      e.key === "ArrowDown"
        ? (searchIndex + 1) % items.length
        : (searchIndex + items.length - 1) % items.length;
    items.forEach((a, i) => a.classList.toggle("focused", i === searchIndex));
    items[searchIndex].scrollIntoView({ block: "nearest" });
  }
  if (e.key === "Enter" && items.length) {
    e.preventDefault();
    location.hash = items[Math.max(0, searchIndex)].getAttribute("href");
    closeSearch();
    $("#site-search").blur();
  }
};
document.addEventListener("click", (e) => {
  if (!e.target.closest(".header-search")) closeSearch();
});
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    $("#site-search").focus();
    $("#site-search").select();
  }
});
$("#menu-toggle").onclick = () => {
  const open = $("#sidebar").classList.toggle("mobile-open");
  $("#menu-toggle").setAttribute("aria-expanded", String(open));
  $("#menu-toggle").setAttribute(
    "aria-label",
    open ? "학습 메뉴 닫기" : "학습 메뉴 열기",
  );
};
$("#close-prompt").onclick = () => $("#prompt-dialog").close();
$("#select-prompt").onclick = () => $("#prompt-text").select();
$("#prompt-dialog").onclick = (e) => {
  if (e.target === $("#prompt-dialog")) {
    const b = $("#prompt-dialog").getBoundingClientRect();
    if (
      e.clientX < b.left ||
      e.clientX > b.right ||
      e.clientY < b.top ||
      e.clientY > b.bottom
    )
      $("#prompt-dialog").close();
  }
};
window.addEventListener("hashchange", render);
render();
