import { mmToPx } from "./model.js";
function point(root, offset) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (offset <= node.textContent.length) return [node, offset];
    offset -= node.textContent.length;
  }
  return [root, root.childNodes.length];
}
function fragment(el, start, end) {
  const r = document.createRange(),
    [a, x] = point(el, start),
    [b, y] = point(el, end);
  r.setStart(a, x);
  r.setEnd(b, y);
  const copy = el.cloneNode(false);
  copy.append(r.cloneContents());
  return copy;
}
export async function paginate(html, layout) {
  const measure = document.createElement("div");
  measure.className = "doc-content measure";
  measure.style.width =
    mmToPx(layout.width - layout.left - layout.right) + "px";
  document.body.append(measure);
  const height = mmToPx(layout.height - layout.top - layout.bottom),
    source = document.createElement("div");
  source.innerHTML = html;
  await Promise.all(
    [...source.querySelectorAll("img")].map((img) =>
      img.decode?.().catch(() => {}),
    ),
  );
  let queue = [...source.children].map((n) => n.cloneNode(true)),
    pages = [],
    scaled = 0;
  const fits = () => measure.scrollHeight <= height + 1;
  const finish = () => {
    pages.push(measure.innerHTML || "<p></p>");
    measure.innerHTML = "";
  };
  try {
    while (queue.length) {
      if (pages.length >= 1000)
        throw Error(
          "문서가 1,000쪽을 초과합니다. 작은 문서로 나누어 열어 주세요.",
        );
      const el = queue.shift();
      if (el.hasAttribute("data-page-break")) {
        finish();
        continue;
      }
      measure.append(el);
      if (fits()) continue;
      el.remove();
      const length = el.textContent.length;
      if (
        /^(P|H[1-6]|BLOCKQUOTE|PRE)$/.test(el.tagName) &&
        length > 1 &&
        !el.querySelector("img,table")
      ) {
        let low = 0,
          high = length;
        while (low < high) {
          const mid = Math.ceil((low + high) / 2),
            part = fragment(el, 0, mid);
          measure.append(part);
          const good = fits();
          part.remove();
          if (good) low = mid;
          else high = mid - 1;
        }
        if (low > 0) {
          const before = fragment(el, 0, low),
            after = fragment(el, low, length);
          measure.append(before);
          finish();
          if (after.textContent) queue.unshift(after);
          continue;
        }
      }
      if (measure.children.length) {
        finish();
        queue.unshift(el);
        continue;
      }
      if (["UL", "OL"].includes(el.tagName) && el.children.length > 1) {
        const items = [...el.children];
        let count = 0;
        const part = el.cloneNode(false);
        measure.append(part);
        while (items.length) {
          const item = items.shift();
          part.append(item);
          if (!fits()) {
            item.remove();
            items.unshift(item);
            break;
          }
          count++;
        }
        if (count) {
          finish();
          const rest = el.cloneNode(false);
          if (el.tagName === "OL")
            rest.setAttribute(
              "start",
              Number(el.getAttribute("start") || 1) + count,
            );
          rest.append(...items);
          queue.unshift(rest);
          continue;
        }
        part.remove();
      }
      if (
        el.tagName === "TABLE" &&
        !el.querySelector('[rowspan]:not([rowspan="1"])') &&
        el.rows.length > 1
      ) {
        const rows = [...el.rows],
          part = el.cloneNode(false),
          tbody = document.createElement("tbody");
        part.append(tbody);
        measure.append(part);
        let count = 0;
        while (rows.length) {
          const row = rows.shift();
          tbody.append(row);
          if (!fits()) {
            row.remove();
            rows.unshift(row);
            break;
          }
          count++;
        }
        if (count) {
          finish();
          const rest = el.cloneNode(false),
            body = document.createElement("tbody");
          body.append(...rows);
          rest.append(body);
          queue.unshift(rest);
          continue;
        }
        part.remove();
      }
      // An indivisible table row / image / merged table is scaled as a unit, never clipped.
      measure.append(el);
      const scale = Math.min(1, height / measure.scrollHeight);
      if (scale < 1) {
        const wrapper = document.createElement("div");
        wrapper.className = "scaled-block";
        wrapper.style.height = height + "px";
        wrapper.style.position = "relative";
        el.style.transform = `scale(${scale})`;
        el.style.transformOrigin = "top left";
        el.style.width = 100 / scale + "%";
        wrapper.append(el);
        measure.append(wrapper);
        scaled++;
      }
      finish();
    }
    if (measure.children.length || !pages.length) finish();
    return { pages, scaled };
  } finally {
    measure.remove();
  }
}
