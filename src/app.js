import "./style.css";
import { event, programs, filterPrograms, calendarFile } from "./model.js";
import { art } from "./art.js";
const $ = (s) => document.querySelector(s);
let filter = "전체";
let favorites = [];
try {
  const value = JSON.parse(
    localStorage.getItem("ansan-festival.saved") || "[]",
  );
  if (Array.isArray(value))
    favorites = value.filter((id) => programs.some((p) => p.id === id));
} catch {}
const icons = { 재현: "旌", 공연: "樂", "참여·체험": "藝" };
document.querySelector("#app").innerHTML = `
<a class="skip" href="#main">본문으로 바로가기</a><div class="demo-bar">문화행사 홈페이지 디자인 시연 <span>· 포스터 기반 정보 + 일부 가상 구성</span></div>
<header><a class="logo" href="#home" aria-label="안산읍성문화예술제 처음으로"><span class="seal">安<br>山</span><span>안산읍성<br><b>문화예술제</b></span></a><nav aria-label="주 메뉴"><a href="#about">축제 소개</a><a href="#program">프로그램</a><a href="#artists">출연진</a><a href="#visit">오시는 길</a><a href="#notice">관람 안내</a></nav><button class="header-cta" id="my-schedule">나의 축제 일정 <span id="saved-count">${favorites.length}</span></button><button id="menu-toggle" aria-expanded="false" aria-label="메뉴 열기">☰</button></header>
<main id="main"><section class="hero" id="home"><div class="hero-ghost" aria-hidden="true">正</div><div class="hero-copy"><div class="edition"><span>THE 16TH</span> ANSAN EUPSEONG CULTURE & ARTS FESTIVAL</div><p class="hero-kicker">시간을 넘어, 지금 우리 곁으로</p><h1>안산읍성<br>문화<span class="serif">예술</span>제<span class="title-dot">.</span></h1><p class="hero-desc">왕의 발걸음이 머문 곳,<br>우리의 가을이 시작됩니다.</p><div class="hero-meta"><strong>2026. 10. 17<span>토</span></strong><p>11:00 — 17:00 <i></i> 안산읍성 일원</p></div><a href="#program" class="button red">축제 프로그램 살펴보기 <span>↗</span></a></div><div class="hero-visual">${art}<div class="vertical-copy">정조대왕 능행차 공동재현</div></div><div class="hero-bottom"><span>전통의 멋, 오늘의 흥. 안산에서 만나는 특별한 하루</span><a href="#about">SCROLL TO EXPLORE ↓</a></div></section>
<section class="quick-info" aria-label="행사 핵심 정보"><div><small>WHEN · 일시</small><strong>10월 17일 토요일</strong><span>2026 · 11:00 ~ 17:00</span></div><div><small>WHERE · 장소</small><strong>안산읍성 일원</strong><span>능행차 구간 · 안산초교 ~ 안산읍성</span></div><div><small>WITH · 함께하는 곳</small><strong>안산시 · 안산문화원</strong><span>주최 안산시 · 주관 안산문화원</span></div><a href="#visit" class="quick-arrow" aria-label="오시는 길 확인">↗</a></section>
<section id="about" class="section about"><div class="section-label"><span>01</span> ABOUT THE FESTIVAL</div><div class="about-grid"><div><h2>오래된 성곽에<br>새로운 <em>이야기</em>가 피어나다.</h2><div class="small-seal" aria-hidden="true">온고<br>지신</div></div><div class="about-text"><p class="lead">경기도 기념물 제127호,<br>안산읍성 및 관아지에서 만나는 역사.</p><p>안산시가 주최하고 안산문화원이 주관하는 안산읍성문화예술제. 과거 안산의 행정과 지역사회의 흔적을 간직한 안산읍성과 관아지를 무대로, 조선 왕실의 의례와 행렬 문화를 시민 곁에 되살립니다. 정조대왕 능행차 공동재현부터 가을빛 버스킹과 천년안산 음악회까지. 우리 곁의 문화유산을 오늘의 즐거움으로 만나보세요.</p><p>어린이부터 성인까지 함께하는 문화체험, 자신만의 시선으로 지역의 풍경과 문화유산을 표현하는 ‘다함께 수암마을 그리기’. 가을의 한가운데에서 오래 기억할 하루를 만들어갑니다.</p><a href="https://weekly.hankooki.com/news/articleViewAmp.html?idxno=7189067" target="_blank" rel="noopener noreferrer" class="text-link">관련 기사 원문 보기 ↗</a></div></div><div class="feature-strip"><article><span>01 / HISTORY</span><h3>왕의 길을 걷다</h3><p>정조대왕 능행차 공동재현</p></article><article><span>02 / MUSIC</span><h3>가을의 흥을 나누다</h3><p>천년안산 음악회 · 가을빛 버스킹</p></article><article><span>03 / TOGETHER</span><h3>우리의 문화를 잇다</h3><p>문화체험 한마당 · 수암마을 그리기</p></article></div></section>
<section id="program" class="section program"><div class="section-label"><span>02</span> FESTIVAL PROGRAM</div><div class="section-heading"><div><h2>취향대로 만나는<br><em>축제의 순간들</em></h2><p>2026년 10월 17일, 하루를 가득 채울 이야기.</p></div><button id="calendar" class="button outline">행사 일정 저장 ↓</button></div><div class="program-toolbar"><div class="tabs" role="tablist" aria-label="프로그램 종류">${["전체", "재현", "공연", "참여·체험"].map((t, i) => `<button role="tab" aria-selected="${!i}" data-filter="${t}">${t}</button>`).join("")}</div><span>마음에 드는 프로그램의 ＋를 눌러 담아보세요.</span></div><div id="program-grid" class="program-grid" role="tabpanel"></div><p class="source-note">일시·프로그램명은 제공 포스터 기준입니다. 상세 소개와 행사장 내 위치 안내 일부는 시연용 구성입니다.</p></section>
<section class="parade-banner"><span class="banner-character" aria-hidden="true">行</span><div><span class="eyebrow">THE HIGHLIGHT</span><h2>그날의 행렬이,<br>오늘의 축제가 되다.</h2><p>정조대왕 능행차 공동재현<br>11:00 ~ 11:40 · 안산초교 → 안산읍성</p><button class="button cream" data-detail="parade">능행차 자세히 보기 ↗</button></div><div class="procession" aria-hidden="true">${Array.from({ length: 5 }, (_, i) => `<div class="guard g${i}"><i></i><b></b><span></span><em></em></div>`).join("")}</div></section>
<section id="artists" class="section artists"><div class="section-label"><span>03</span> ON STAGE</div><div class="section-heading"><div><h2>가을을 물들이는 <em>목소리</em></h2><p>천년안산 음악회와 함께하는 포스터 속 출연진.</p></div><span class="artist-time">14:00 — 17:00 <b>천년안산 음악회</b></span></div><div class="artist-grid">${["청춘소년단", "권민정", "문초희", "김재혁", "오혜빈", "김보민"].map((name, i) => `<article class="artist a${i}"><div class="artist-graphic" aria-hidden="true"><span>${["樂", "聲", "歌", "律", "韻", "和"][i]}</span><i></i><b>ON STAGE / 0${i + 1}</b></div><h3>${name}</h3><p>초대 출연진</p></article>`).join("")}</div><p class="source-note">출연진은 포스터 표기 기준이며 개별 출연 순서는 안내되지 않았습니다. 인물 사진 대신 전통 글자를 활용한 그래픽을 사용했습니다.</p></section>
<section id="visit" class="section visit"><div class="section-label"><span>04</span> PLAN YOUR VISIT</div><div class="visit-grid"><div><h2>가을 나들이,<br><em>안산읍성</em>으로 오세요.</h2><p class="visit-intro">행사의 시작부터 마지막 여운까지,<br>여유롭게 머물다 가세요.</p><dl><div><dt>행사 장소</dt><dd>안산읍성 일원</dd></div><div><dt>능행차 구간</dt><dd>안산초교 → 안산읍성</dd></div><div><dt>운영 시간</dt><dd>2026. 10. 17. (토) 11:00 ~ 17:00</dd></div></dl><p class="source-note">대중교통 노선·주차·통제 정보는 제공 자료에 없어 확정 안내하지 않습니다. 방문 전 실제 공지를 확인하세요.</p><a class="button dark" target="_blank" rel="noopener noreferrer" href="https://map.kakao.com/?q=${encodeURIComponent("안산읍성")}">지도에서 위치 찾기 ↗</a></div><div class="map-card"><div class="map-caption">ANSAN EUPSEONG <span>도식 · 실제 축척 아님</span></div><svg viewBox="0 0 530 400" role="img" aria-label="안산초교에서 안산읍성으로 이어지는 능행차 구간 개념도"><rect width="530" height="400" fill="#e8e7db"/><path d="M300-20Q170 80 345 175T410 440" stroke="#c8d2bc" stroke-width="125" fill="none"/><path d="M-20 260L570 110M120-30L240 430M-20 340L570 280" stroke="#faf6ed" stroke-width="23" fill="none"/><path d="M165 287L230 266L285 189L354 163" stroke="#d94c3d" stroke-width="4" stroke-dasharray="7 7" fill="none"/><circle cx="165" cy="287" r="8" fill="#42649c"/><rect x="85" y="306" width="120" height="37" rx="4" fill="#fff9f0"/><text x="145" y="331" text-anchor="middle" font-size="15" fill="#36352e">안산초교 · 출발</text><circle cx="354" cy="163" r="21" fill="#cf3d32"/><path d="M343 169H366M345 160H364M350 154H359" stroke="#fff5e9" stroke-width="3"/><rect x="299" y="106" width="115" height="32" rx="4" fill="#fff9f0"/><text x="356" y="128" text-anchor="middle" font-size="15" fill="#36352e">안산읍성 · 도착</text><text x="40" y="50" font-size="13" fill="#85897d">N ↑</text></svg><div class="map-bottom"><span><i></i> 능행차 진행 방향</span><small>이동 동선의 이해를 돕기 위한 시연용 도식입니다.</small></div></div></div></section>
<section id="notice" class="section notice"><div class="section-label"><span>05</span> FESTIVAL GUIDE</div><div class="notice-grid"><div><h2>함께 즐기는 축제,<br><em>미리 알아두세요.</em></h2><p>기분 좋은 하루를 위한 작은 안내.</p><span class="demo-label">아래 관람 안내는 시연용 가상 구성입니다.</span></div><div class="faq">${[
  [
    "관람료와 사전 예약이 필요한가요?",
    "이 시연 사이트는 자유 관람형 행사로 구성했습니다. 실제 관람료와 예약 여부는 제공 자료에 없으며, 본 사이트에서 예약이나 결제를 받지 않습니다.",
  ],
  [
    "아이와 함께 참여할 수 있나요?",
    "문화체험 한마당과 다함께 수암마을 그리기를 가족이 함께 즐기는 프로그램으로 소개합니다. 실제 참여 연령, 재료비와 접수 방법은 별도 확인이 필요합니다.",
  ],
  [
    "우천 시에도 진행하나요?",
    "기상 상황에 따른 운영 방침은 제공 자료에 없습니다. 실제 방문 전 주최 측 최신 공지를 확인하는 안내로 구성했습니다.",
  ],
  [
    "나의 축제 일정은 어떻게 사용하나요?",
    "프로그램 카드의 ＋ 버튼을 누르면 이 브라우저에 관심 일정이 저장됩니다. 상단의 ‘나의 축제 일정’에서 모아보거나 삭제할 수 있습니다. 예약이나 참가 신청 기능은 아닙니다.",
  ],
]
  .map(
    ([q, a]) =>
      `<details><summary>${q}<span>＋</span></summary><p>${a}</p></details>`,
  )
  .join("")}</div></div></section>
<section class="closing"><span>2026. 10. 17. SAT</span><h2>우리의 가을이 만나는 곳,<br>안산읍성문화예술제.</h2><a href="#home">처음으로 돌아가기 ↑</a></section></main><footer><div class="footer-brand">안산읍성문화예술제 <span>제16회</span></div><p>주최 · 안산시　 주관 · 안산문화원</p><div class="footer-bottom"><p>AI 디자인 시연 사이트 · 실제 공식 홈페이지가 아닙니다.<br>자료: 주간한국 장지원 기자 기사(사용자 제공 본문) · 행사 포스터.<br>프로그램 상세 소개·관람 안내·동선 도식에는 시연용 가상 내용이 포함되어 있습니다.</p><span>© 2026 FESTIVAL DESIGN DEMO</span></div></footer><dialog id="modal"><button class="modal-close" aria-label="닫기">×</button><div id="modal-content"></div></dialog><div id="toast" role="status"></div>`;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 3000);
}
function showModal(content) {
  $("#modal-content").innerHTML = content;
  $("#modal").showModal();
  bindCards($("#modal"));
}
function programCard(p) {
  return `<article class="program-card"><div class="program-card-head"><span class="type-tag">${p.type}</span><button class="save ${favorites.includes(p.id) ? "selected" : ""}" data-save="${p.id}" aria-label="${p.title} ${favorites.includes(p.id) ? "일정에서 삭제" : "일정에 담기"}" aria-pressed="${favorites.includes(p.id)}">${favorites.includes(p.id) ? "✓" : "＋"}</button></div><span class="card-symbol" aria-hidden="true">${icons[p.type]}</span><div class="card-content"><time>${p.time}</time><h3>${p.title}</h3><p>${p.place}</p><button class="detail" data-detail="${p.id}">프로그램 자세히 <span>↗</span></button></div></article>`;
}
function renderPrograms() {
  $("#program-grid").innerHTML = filterPrograms(filter)
    .map(programCard)
    .join("");
  bindCards($("#program-grid"));
  $("#saved-count").textContent = favorites.length;
}
function schedule() {
  showModal(
    `<span class="eyebrow">MY FESTIVAL</span><h2>나의 축제 일정</h2><p class="modal-intro">관심 프로그램 모아보기 · 참가 예약이 아닙니다.</p><div class="saved-list">${
      programs
        .filter((p) => favorites.includes(p.id))
        .map(
          (p) =>
            `<article><time>${p.time}</time><h3>${p.title}</h3><p>${p.place}</p><button data-save="${p.id}" data-in-schedule="true">일정에서 삭제</button></article>`,
        )
        .join("") ||
      '<p class="no-saved">아직 담은 일정이 없습니다.<br>프로그램의 ＋ 버튼으로 나만의 축제를 만들어보세요.</p>'
    }</div>`,
  );
}
function bindCards(root) {
  root.querySelectorAll("[data-detail]").forEach(
    (b) =>
      (b.onclick = () => {
        const p = programs.find((p) => p.id === b.dataset.detail);
        showModal(
          `<span class="eyebrow">${p.type} · ${p.tag}</span><h2>${p.title}</h2><div class="modal-meta">10월 17일 (토) ${p.time}<br>${p.place}</div><p class="modal-description">${p.description}</p><p class="source-note">시간·명칭: 포스터 기준 / 상세 소개: 시연용 작성</p><button class="button red" data-save="${p.id}">${favorites.includes(p.id) ? "관심 일정에서 삭제" : "나의 일정에 담기 ＋"}</button>`,
        );
      }),
  );
  root.querySelectorAll("[data-save]").forEach(
    (b) =>
      (b.onclick = () => {
        const key = b.dataset.save,
          next = favorites.includes(key)
            ? favorites.filter((x) => x !== key)
            : [...favorites, key];
        try {
          localStorage.setItem("ansan-festival.saved", JSON.stringify(next));
          favorites = next;
          renderPrograms();
          if ($("#modal").open) {
            $("#modal").close();
            if (b.dataset.inSchedule) schedule();
          }
          toast(
            next.includes(key)
              ? "나의 축제 일정에 담았습니다."
              : "관심 일정에서 삭제했습니다.",
          );
        } catch {
          toast(
            "저장하지 못했습니다. 브라우저 저장 권한과 용량을 확인하고 다시 시도하세요.",
          );
        }
      }),
  );
}
renderPrograms();
bindCards($(".parade-banner"));
$(".modal-close").onclick = () => $("#modal").close();
$("#modal").onclick = (e) => {
  if (e.target === $("#modal")) {
    const r = $("#modal").getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      $("#modal").close();
  }
};
$("#my-schedule").onclick = schedule;
document.querySelectorAll("[data-filter]").forEach(
  (b) =>
    (b.onclick = () => {
      filter = b.dataset.filter;
      document
        .querySelectorAll("[data-filter]")
        .forEach((t) => t.setAttribute("aria-selected", String(t === b)));
      renderPrograms();
    }),
);
$("#menu-toggle").onclick = () => {
  const open = $("#menu-toggle").getAttribute("aria-expanded") !== "true";
  $("#menu-toggle").setAttribute("aria-expanded", String(open));
  $("#menu-toggle").setAttribute(
    "aria-label",
    open ? "메뉴 닫기" : "메뉴 열기",
  );
  $("nav").classList.toggle("open", open);
};
document.querySelectorAll("nav a").forEach(
  (a) =>
    (a.onclick = () => {
      $("nav").classList.remove("open");
      $("#menu-toggle").setAttribute("aria-expanded", "false");
      $("#menu-toggle").setAttribute("aria-label", "메뉴 열기");
    }),
);
$("#calendar").onclick = () => {
  const url = URL.createObjectURL(
    new Blob([calendarFile()], { type: "text/calendar;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "안산읍성문화예술제.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("캘린더에서 열 수 있는 행사 일정을 저장했습니다.");
};
const tabs = [...document.querySelectorAll("[role=tab]")];
tabs.forEach(
  (t, i) =>
    (t.onkeydown = (e) => {
      let j;
      if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
      if (e.key === "ArrowLeft") j = (i + tabs.length - 1) % tabs.length;
      if (j !== undefined) {
        e.preventDefault();
        tabs[j].focus();
        tabs[j].click();
      }
    }),
);
