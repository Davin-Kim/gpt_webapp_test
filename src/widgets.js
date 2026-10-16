import { completionChecks } from "./content.js";
import { travelCost, difficulty, successRate, nextHole } from "./model.js";
const memory = { worksheet: {}, checks: new Set() };
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function renderWidget(kind) {
  if (kind === "worksheet")
    return `<section class="workshop"><div class="workshop-label">직접 작성해 보기 <span>저장·전송하지 않습니다</span></div><form id="worksheet-form"><div class="worksheet-grid">${[
      ["name", "웹앱 이름", "예: 출장비 정산 계산기"],
      ["audience", "누가 쓰나요?", "예: 출장을 다녀온 직원"],
      ["inputs", "입력 · 넣을 것", "출장 일수, 숙박 일수, 교통비, 1박 숙박비"],
      ["process", "처리 · 계산 규칙", "일비 2만 원/일, 숙박비 1박 최대 7만 원"],
      ["outputs", "결과 · 보여줄 것", "항목별 금액, 총액, 한도 초과 경고"],
      ["screen", "화면 · 원하는 배치", "입력칸은 위, 결과는 아래. 큰 글씨로."],
    ]
      .map(
        ([key, label, placeholder]) =>
          `<label>${label}<textarea name="${key}" rows="2" placeholder="${placeholder}" required maxlength="1000">${esc(memory.worksheet[key] || "")}</textarea></label>`,
      )
      .join(
        "",
      )}</div><button class="button primary">내 요청문 정리하기 ↗</button></form><div id="worksheet-result" hidden><label for="generated-prompt">완성된 요청문 초안</label><textarea id="generated-prompt" readonly rows="12"></textarea><p class="small-note">직접 선택하고 Ctrl+C / ⌘C로 복사하세요. 외부 AI에 자동 전달되지 않습니다.</p><button class="button secondary" id="select-generated">요청문 전체 선택</button></div></section>`;
  if (kind === "wireframe")
    return `<div class="wireframe" aria-label="출장비 계산기 화면 배치 예시"><span class="sketch-label">화면 구상 예시</span><div class="sketch-window"><div class="sketch-top">•••</div><h3>출장비 정산 계산기</h3><div class="sketch-fields"><span>출장 일수</span><span>숙박 일수</span><span>교통비</span><span>1박 숙박비</span></div><div class="sketch-button">계산하기</div><div class="sketch-result">총액 · 항목별 금액 · 한도 초과 안내</div></div><p>입력은 위에, 결과는 아래에.<br>기능이 보이면 충분한 스케치예요.</p></div>`;
  if (kind === "calculator")
    return `<section class="workshop calculator"><div class="workshop-label">계산 과정을 직접 확인해요 <span>실습용 · 실제 지급 규정 아님</span></div><form id="travel-form" novalidate><div class="worksheet-grid">${[
      ["days", "출장 일수", "3"],
      ["nights", "숙박 일수", "2"],
      ["transport", "왕복 교통비 (원)", "80000"],
      ["hotel", "1박 숙박비 (원)", "70000"],
    ]
      .map(
        ([key, label, value]) =>
          `<label>${label}<input type="number" name="${key}" value="${value}" min="${key === "days" ? 1 : 0}" step="1" inputmode="numeric"><span class="field-error" data-error="${key}"></span></label>`,
      )
      .join(
        "",
      )}</div><div class="calculator-actions"><button class="button primary">예시 금액 계산하기</button><button class="button secondary" type="reset">입력 초기화</button></div></form><div id="travel-result" class="travel-result" aria-live="polite" hidden></div></section>`;
  if (kind === "checklist")
    return `<div class="checklist"><div class="checklist-count"><strong>완성 전 마지막 확인</strong><span id="checklist-score">${memory.checks.size} / ${completionChecks.length}</span></div>${completionChecks.map((text, i) => `<label><input type="checkbox" data-check="${i}" ${memory.checks.has(i) ? "checked" : ""}><span>${text}</span></label>`).join("")}</div>`;
  if (kind === "game")
    return `<section class="game-demo"><div class="workshop-label">요청문이 만드는 동작, 직접 체험하기 <span>웹페이지에서 추가한 학습용 예시</span></div><div class="game-top"><div><strong>두더지 잡기</strong><p>잡으면 +1점 · 빗나가도 감점 없음 · 30초</p></div><label>난이도<select id="game-level"><option value="easy">쉬움</option><option value="normal" selected>보통</option><option value="hard">어려움</option></select></label></div><div class="game-stats"><span>점수 <b id="game-score">0</b></span><span>남은 시간 <b id="game-time">30초</b></span><span>성공률 <b id="game-rate">0%</b></span><span>전체 클릭 <b id="game-clicks">0</b></span></div><div class="time-track"><i id="time-progress" style="width:100%"></i></div><div class="game-board" role="group" aria-label="3×3 두더지 게임판">${Array.from({ length: 9 }, (_, i) => `<button class="hole" data-hole="${i}" aria-label="${i + 1}번 구멍" disabled><span class="mole" aria-hidden="true"><i class="mole-eyes"></i><i class="mole-nose"></i></span><span class="hole-ground"></span><span class="hit-label" aria-hidden="true"></span></button>`).join("")}</div><div class="game-controls"><button class="button primary" id="game-start">시작하기</button><button class="button secondary" id="game-stop" disabled>멈추기</button><p id="game-message" role="status">시작하기를 누르면 두더지가 나타납니다.</p></div></section>`;
  return "";
}
export function bindWidgets(root) {
  const $ = (s) => root.querySelector(s);
  let cleanup = () => {};
  if ($("#worksheet-form")) {
    const form = $("#worksheet-form");
    form.oninput = () =>
      (memory.worksheet = Object.fromEntries(new FormData(form)));
    form.onsubmit = (e) => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(form));
      if (Object.values(v).some((x) => !x.trim())) {
        form.reportValidity();
        return;
      }
      memory.worksheet = v;
      $("#generated-prompt").value =
        `${v.name}를 위한 웹앱을 만들어 줘.\n사용자: ${v.audience}\n\n입력: ${v.inputs}\n처리: ${v.process}\n결과: ${v.outputs}\n화면: ${v.screen}\n\n모든 글자는 한국어로, 한 화면에서 쓸 수 있게 만들어 줘.`;
      $("#worksheet-result").hidden = false;
      $("#worksheet-result").scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    };
    $("#select-generated").onclick = () => $("#generated-prompt").select();
  }
  if ($("#travel-form")) {
    const form = $("#travel-form");
    form.onsubmit = (e) => {
      e.preventDefault();
      const result = travelCost(Object.fromEntries(new FormData(form)));
      root.querySelectorAll("[data-error]").forEach((el) => {
        el.textContent = result.errors[el.dataset.error] || "";
        form.elements[el.dataset.error].setAttribute(
          "aria-invalid",
          String(Boolean(result.errors[el.dataset.error])),
        );
      });
      if (Object.keys(result.errors).length) {
        $("#travel-result").hidden = true;
        form.elements[Object.keys(result.errors)[0]].focus();
        return;
      }
      const money = (n) => n.toLocaleString("ko-KR") + "원";
      $("#travel-result").innerHTML =
        `<div><span>일비</span><b>${money(result.daily)}</b></div><div><span>숙박비 인정액</span><b>${money(result.lodging)}</b></div><div><span>교통비</span><b>${money(result.transport)}</b></div><div class="travel-total"><span>총액</span><strong>${money(result.total)}</strong></div>${result.exceeded ? '<p class="exceeded">1박 숙박비가 70,000원을 초과해 한도까지만 계산했습니다.</p>' : ""}`;
      $("#travel-result").hidden = false;
    };
    form.onreset = () => {
      setTimeout(() => {
        [...form.elements]
          .filter((el) => el.tagName === "INPUT")
          .forEach((el) => {
            el.value = "";
            el.removeAttribute("aria-invalid");
          });
        root
          .querySelectorAll("[data-error]")
          .forEach((el) => (el.textContent = ""));
        $("#travel-result").hidden = true;
      }, 0);
    };
  }
  root.querySelectorAll("[data-check]").forEach(
    (input) =>
      (input.onchange = () => {
        const n = Number(input.dataset.check);
        if (input.checked) memory.checks.add(n);
        else memory.checks.delete(n);
        $("#checklist-score").textContent =
          `${memory.checks.size} / ${completionChecks.length}`;
      }),
  );
  if ($("#game-start")) {
    let running = false,
      hit = 0,
      clicks = 0,
      active = -1,
      previous = -1,
      remaining = 30,
      deadline = 0,
      spawnTimer,
      hideTimer,
      tickTimer,
      feedbackTimers = [];
    const paint = () => {
      $("#game-score").textContent = hit;
      $("#game-clicks").textContent = clicks;
      $("#game-rate").textContent = successRate(hit, clicks) + "%";
      $("#game-time").textContent = remaining + "초";
      $("#time-progress").style.width = (remaining / 30) * 100 + "%";
    };
    const hide = () => {
      if (active >= 0)
        root.querySelector(`[data-hole="${active}"]`)?.classList.remove("up");
      active = -1;
    };
    const clear = () => {
      clearInterval(spawnTimer);
      clearInterval(tickTimer);
      clearTimeout(hideTimer);
      feedbackTimers.forEach(clearTimeout);
      feedbackTimers = [];
    };
    const stop = (announce = true) => {
      if (!running) return;
      running = false;
      clear();
      hide();
      $("#game-level").disabled = false;
      $("#game-start").disabled = false;
      $("#game-start").textContent = "다시 시작";
      $("#game-stop").disabled = true;
      root.querySelectorAll("[data-hole]").forEach((b) => (b.disabled = true));
      if (announce)
        $("#game-message").textContent =
          `종료! ${hit}점 · 맞힌 횟수 ${hit} · 클릭 ${clicks}회 · 성공률 ${successRate(hit, clicks)}%`;
    };
    const spawn = () => {
      if (!running) return;
      hide();
      active = nextHole(previous);
      previous = active;
      root.querySelector(`[data-hole="${active}"]`).classList.add("up");
      hideTimer = setTimeout(hide, difficulty[$("#game-level").value].visible);
    };
    $("#game-start").onclick = () => {
      clear();
      running = true;
      hit = 0;
      clicks = 0;
      remaining = 30;
      deadline = Date.now() + 30000;
      active = -1;
      previous = -1;
      root.querySelectorAll("[data-hole]").forEach((b) => {
        b.disabled = false;
        b.classList.remove("success", "miss", "up");
      });
      $("#game-level").disabled = true;
      $("#game-start").disabled = true;
      $("#game-stop").disabled = false;
      $("#game-message").textContent = "나타난 두더지를 눌러보세요!";
      paint();
      spawn();
      spawnTimer = setInterval(
        spawn,
        difficulty[$("#game-level").value].interval,
      );
      tickTimer = setInterval(() => {
        remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        paint();
        if (remaining <= 0) stop();
      }, 1000);
    };
    $("#game-stop").onclick = () => stop();
    root.querySelectorAll("[data-hole]").forEach(
      (b) =>
        (b.onclick = () => {
          if (!running) return;
          clicks++;
          const success = Number(b.dataset.hole) === active;
          if (success) {
            hit++;
            clearTimeout(hideTimer);
            hide();
          }
          b.classList.remove("success", "miss");
          b.classList.add(success ? "success" : "miss");
          b.querySelector(".hit-label").textContent = success ? "+1" : "빗나감";
          paint();
          feedbackTimers.push(
            setTimeout(() => b.classList.remove("success", "miss"), 350),
          );
        }),
    );
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    cleanup = () => {
      clear();
      running = false;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }
  return cleanup;
}
