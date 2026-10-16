import "./style.css";
import { defaultMenus, addMenu, chooseMenu } from "./model.js";
import { loadMenus, saveMenus } from "./storage.js";
const escape = (value) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let menus = [...defaultMenus],
  selected = "",
  busy = false;
let storageError = "";
try {
  menus = loadMenus() ?? menus;
} catch {
  storageError =
    "저장된 메뉴를 불러오지 못했어요. 브라우저 저장 권한을 확인해 주세요. 기본 메뉴로 표시합니다.";
}
document.querySelector("#app").innerHTML = `
<header class="topbar"><a href="./" class="brand"><span class="brand-icon">🍴</span> 오늘 뭐 먹지?</a><span class="top-note">점심 고민은 가볍게</span></header>
<main><div class="intro"><span class="eyebrow">LUNCH BREAK, LESS THINKING</span><h1>고민은 그만,<br>오늘의 점심을 골라봐요<span class="orange">.</span></h1><p>먹고 싶은 메뉴를 모아두고, 선택은 운에 맡겨요.</p></div>
<section class="picker" aria-labelledby="picker-title"><div class="picker-top"><span id="picker-title">오늘의 메뉴</span><span class="counter"></span></div><div class="plate" aria-hidden="true"><span id="dish">🍽️</span></div><div class="result" role="status" aria-live="polite"><h2 id="result">어떤 메뉴가 나올까요?</h2><p id="result-caption">아래 버튼을 눌러 점심 메뉴를 뽑아보세요.</p></div><button id="pick" class="pick-button">메뉴 골라주기 <span aria-hidden="true">↗</span></button><p class="picker-note">한 번 더 뽑으면 방금 나온 메뉴는 잠깐 쉬어가요.</p></section>
<section class="menu-section" aria-labelledby="menus-title"><div class="section-heading"><div><span class="eyebrow">MY LUNCH LIST</span><h2 id="menus-title">나의 메뉴 목록 <span id="count"></span></h2></div><span class="saved-note">이 브라우저에 저장돼요</span></div><form id="add-form" novalidate><label for="menu-input" class="sr-only">추가할 메뉴 이름</label><input id="menu-input" name="menu" placeholder="먹고 싶은 메뉴를 추가해 보세요" maxlength="40" autocomplete="off" aria-describedby="form-error"><button type="submit">＋ 추가</button></form><p class="error" id="form-error" role="alert"></p><p class="error" id="storage-error" role="alert"></p><ul id="menu-list"></ul><p id="empty" hidden>아직 메뉴가 없어요. 첫 메뉴를 추가해 주세요.</p><p id="action-status" role="status" class="action-status"></p></section></main><footer>잘 먹고, 좋은 오후 보내세요. <span>☀</span></footer>`;
const $ = (s) => document.querySelector(s);
$("#storage-error").textContent = storageError;
function refresh() {
  $("#menu-list").innerHTML = menus
    .map(
      (name, index) =>
        `<li><span class="menu-number">${String(index + 1).padStart(2, "0")}</span><span class="menu-name">${escape(name)}</span><button class="delete" data-index="${index}" aria-label="${escape(name)} 삭제" title="메뉴 삭제">×</button></li>`,
    )
    .join("");
  $("#count").textContent = menus.length;
  $(".counter").textContent = `${menus.length}개의 선택지`;
  $("#empty").hidden = menus.length !== 0;
  $("#pick").disabled = !menus.length || busy;
  if (!menus.length) {
    $("#result").textContent = "메뉴를 추가해 주세요";
    $("#result-caption").textContent =
      "나의 메뉴 목록에 한 가지 이상 등록하면 시작할 수 있어요.";
  } else if (!selected) {
    $("#result").textContent = "어떤 메뉴가 나올까요?";
    $("#result-caption").textContent =
      "아래 버튼을 눌러 점심 메뉴를 뽑아보세요.";
    $("#dish").textContent = "🍽️";
  }
  $("#menu-list")
    .querySelectorAll("button")
    .forEach(
      (button) =>
        (button.onclick = () => {
          const index = Number(button.dataset.index),
            name = menus[index];
          if (!commit(menus.filter((_, i) => i !== index))) return;
          if (selected === name) selected = "";
          refresh();
          $("#action-status").textContent = `${name} 메뉴를 삭제했어요.`;
          const next = $("#menu-list").querySelectorAll("button");
          if (next.length) next[Math.min(index, next.length - 1)].focus();
          else $("#menu-input").focus();
        }),
    );
}
function commit(next) {
  try {
    saveMenus(next);
    menus = next;
    $("#storage-error").textContent = "";
    return true;
  } catch {
    $("#storage-error").textContent =
      "저장하지 못했어요. 브라우저 저장 권한·용량을 확인한 뒤 다시 시도해 주세요. 메뉴는 변경하지 않았어요.";
    return false;
  }
}
$("#add-form").onsubmit = (event) => {
  event.preventDefault();
  $("#form-error").textContent = "";
  $("#menu-input").removeAttribute("aria-invalid");
  try {
    const next = addMenu(menus, $("#menu-input").value);
    if (!commit(next)) return;
    refresh();
    $("#action-status").textContent = `${next.at(-1)} 메뉴를 추가했어요.`;
    $("#menu-input").value = "";
    $("#menu-input").focus();
  } catch (error) {
    $("#form-error").textContent = error.message;
    $("#menu-input").setAttribute("aria-invalid", "true");
    $("#menu-input").focus();
  }
};
$("#pick").onclick = async () => {
  if (busy || !menus.length) return;
  busy = true;
  $("#pick").disabled = true;
  $("#menu-list")
    .querySelectorAll("button")
    .forEach((button) => (button.disabled = true));
  $("#add-form")
    .querySelectorAll("input,button")
    .forEach((control) => (control.disabled = true));
  $("#result").textContent = "오늘의 점심은…";
  $("#result-caption").textContent = "맛있는 선택을 고르는 중이에요";
  $(".plate").classList.add("picking");
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let i = 0;
    const timer = setInterval(() => {
      $("#result").textContent = menus[i++ % menus.length];
    }, 85);
    await new Promise((resolve) => setTimeout(resolve, 650));
    clearInterval(timer);
  }
  selected = chooseMenu(menus, selected);
  $("#result").textContent = selected;
  $("#result-caption").textContent =
    menus.length > 1
      ? "오늘은 이 메뉴 어때요? 마음이 바뀌면 한 번 더!"
      : "하나뿐인 메뉴가 당첨됐어요. 다른 메뉴도 추가해 보세요.";
  $("#dish").textContent = "😋";
  $(".plate").classList.remove("picking");
  $("#pick").innerHTML = '한 번 더 골라주기 <span aria-hidden="true">↻</span>';
  busy = false;
  $("#pick").disabled = false;
  $("#menu-list")
    .querySelectorAll("button")
    .forEach((button) => (button.disabled = false));
  $("#add-form")
    .querySelectorAll("input,button")
    .forEach((control) => (control.disabled = false));
};
refresh();
