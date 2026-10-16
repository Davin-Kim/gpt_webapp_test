import JSZip from "jszip";
import { cleanHTML } from "./sanitize.js";
import { defaultLayout, validLayout } from "./model.js";
const LIMIT = 25 * 1024 * 1024;
const local = (root, name) => [...root.getElementsByTagNameNS("*", name)];
const xml = (text) => {
  if (/<!DOCTYPE|<!ENTITY/i.test(text))
    throw Error("외부 엔터티를 포함한 문서는 열 수 없습니다.");
  const d = new DOMParser().parseFromString(text, "application/xml");
  if (d.getElementsByTagName("parsererror").length)
    throw Error("문서 XML이 손상되었습니다.");
  return d;
};
const attr = (node, key) =>
  node?.getAttribute(key) ?? node?.getAttribute("w:" + key);
export async function checkedZip(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const files = Object.values(zip.files);
  if (files.length > 4096) throw Error("파일 내부 항목이 너무 많습니다.");
  const total = files.reduce((s, f) => s + (f._data?.uncompressedSize || 0), 0);
  if (total > 80 * 1024 * 1024)
    throw Error("압축 해제 크기가 80MB를 초과합니다.");
  return zip;
}
function getLayout(xmlDoc, format) {
  const l = { ...defaultLayout };
  if (format === "HWPX") {
    const p = local(xmlDoc, "pagePr")[0],
      m = local(xmlDoc, "margin")[0];
    if (p) {
      l.width = (Number(attr(p, "width")) * 25.4) / 7200;
      l.height = (Number(attr(p, "height")) * 25.4) / 7200;
      if (attr(p, "landscape") === "NARROWLY")
        [l.width, l.height] = [l.height, l.width];
    }
    if (m)
      for (const k of ["top", "bottom", "left", "right"])
        if (attr(m, k) !== null) l[k] = (Number(attr(m, k)) * 25.4) / 7200;
  } else {
    const p = local(xmlDoc, "pgSz")[0],
      m = local(xmlDoc, "pgMar")[0];
    if (p) {
      l.width = (Number(attr(p, "w")) * 25.4) / 1440;
      l.height = (Number(attr(p, "h")) * 25.4) / 1440;
    }
    if (m)
      for (const k of ["top", "bottom", "left", "right"])
        if (attr(m, k) !== null) l[k] = (Number(attr(m, k)) * 25.4) / 1440;
  }
  return validLayout(l) ? l : { ...defaultLayout };
}
function markBreaks(html, docs, format) {
  const root = document.createElement("div");
  root.innerHTML = html;
  let index = 0;
  for (const d of docs) {
    const paras = local(d, "p").filter((p) =>
      format === "HWPX"
        ? p.parentElement?.localName === "sec"
        : p.parentElement?.localName === "body",
    );
    for (const p of paras) {
      const blocks = [...root.children].filter(
        (n) => n.tagName !== "TABLE" && !n.hasAttribute("data-page-break"),
      );
      const target = blocks[index++];
      if (!target) continue;
      const before =
        format === "HWPX"
          ? attr(p, "pageBreak") === "1"
          : local(p, "pageBreakBefore").length > 0;
      const after =
        format === "DOCX" &&
        local(p, "br").some((n) => attr(n, "type") === "page");
      if (before) {
        const b = document.createElement("div");
        b.dataset.pageBreak = "true";
        target.before(b);
      }
      if (after) {
        const b = document.createElement("div");
        b.dataset.pageBreak = "true";
        target.after(b);
      }
    }
  }
  return root.innerHTML;
}
function imageSizes(html, docs, format) {
  const root = document.createElement("div");
  root.innerHTML = html;
  const images = [...root.querySelectorAll("img")];
  const originals = docs.flatMap((d) =>
    local(d, format === "HWPX" ? "pic" : "drawing"),
  );
  if (images.length === originals.length)
    originals.forEach((node, i) => {
      const size =
        local(node, format === "HWPX" ? "curSz" : "extent")[0] ||
        local(node, "sz")[0];
      if (!size) return;
      const w =
        Number(attr(size, format === "HWPX" ? "width" : "cx")) /
        (format === "HWPX" ? 75 : 9525);
      const h =
        Number(attr(size, format === "HWPX" ? "height" : "cy")) /
        (format === "HWPX" ? 75 : 9525);
      if (w > 0 && h > 0) {
        images[i].setAttribute("width", String(Math.round(w)));
        images[i].setAttribute("height", String(Math.round(h)));
      }
    });
  return root.innerHTML;
}
function enhanceWordStyles(html, d) {
  const root = document.createElement("div");
  root.innerHTML = html;
  const converted = [...root.querySelectorAll("p,h1,h2,h3,h4,h5,h6")];
  const source = local(d, "p").filter((p) => !p.closest("drawing"));
  const point = (el, n) => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let t;
    while ((t = w.nextNode())) {
      if (n <= t.textContent.length) return [t, n];
      n -= t.textContent.length;
    }
    return [el, el.childNodes.length];
  };
  source.forEach((p, index) => {
    const target = converted[index];
    if (!target) return;
    const props = [...p.children].find((n) => n.localName === "pPr");
    if (props) {
      const align = local(props, "jc")[0],
        spacing = local(props, "spacing")[0],
        indent = local(props, "ind")[0];
      if (align)
        target.style.textAlign =
          {
            both: "justify",
            distribute: "justify",
            start: "left",
            end: "right",
          }[attr(align, "val")] || attr(align, "val");
      if (spacing) {
        if (attr(spacing, "before"))
          target.style.marginTop = Number(attr(spacing, "before")) / 20 + "pt";
        if (attr(spacing, "after"))
          target.style.marginBottom =
            Number(attr(spacing, "after")) / 20 + "pt";
        if (
          attr(spacing, "line") &&
          (!attr(spacing, "lineRule") || attr(spacing, "lineRule") === "auto")
        )
          target.style.lineHeight = String(Number(attr(spacing, "line")) / 240);
      }
      if (indent) {
        if (attr(indent, "left"))
          target.style.marginLeft = Number(attr(indent, "left")) / 15 + "px";
        if (attr(indent, "firstLine"))
          target.style.textIndent =
            Number(attr(indent, "firstLine")) / 15 + "px";
        if (attr(indent, "hanging"))
          target.style.textIndent =
            -Number(attr(indent, "hanging")) / 15 + "px";
      }
    }
    const raw = local(p, "t")
      .map((t) => t.textContent)
      .join("");
    if (raw !== target.textContent) return;
    let offset = 0;
    const parts = [];
    for (const r of local(p, "r")) {
      const value = local(r, "t")
        .map((t) => t.textContent)
        .join("");
      if (value) {
        parts.push({ r, from: offset, to: offset + value.length });
        offset += value.length;
      }
    }
    for (const { r, from, to } of parts.reverse()) {
      const rp = [...r.children].find((n) => n.localName === "rPr");
      if (!rp) continue;
      const span = document.createElement("span"),
        font = local(rp, "rFonts")[0],
        size = local(rp, "sz")[0],
        color = local(rp, "color")[0],
        highlight = local(rp, "highlight")[0],
        shd = local(rp, "shd")[0];
      if (font)
        span.style.fontFamily =
          attr(font, "eastAsia") || attr(font, "ascii") || "";
      if (size) span.style.fontSize = Number(attr(size, "val")) / 2 + "pt";
      if (color && /^[0-9a-f]{6}$/i.test(attr(color, "val")))
        span.style.color = "#" + attr(color, "val");
      if (highlight) span.style.backgroundColor = attr(highlight, "val");
      if (shd && /^[0-9a-f]{6}$/i.test(attr(shd, "fill")))
        span.style.backgroundColor = "#" + attr(shd, "fill");
      for (const [tag, prop, val] of [
        ["b", "fontWeight", "bold"],
        ["i", "fontStyle", "italic"],
        ["u", "textDecoration", "underline"],
        ["strike", "textDecoration", "line-through"],
      ]) {
        const el = local(rp, tag)[0];
        if (el && !["0", "false", "none"].includes(attr(el, "val")))
          span.style[prop] = val;
      }
      const [a, x] = point(target, from),
        [b, y] = point(target, to),
        range = document.createRange();
      range.setStart(a, x);
      range.setEnd(b, y);
      span.append(range.extractContents());
      range.insertNode(span);
    }
  });
  return root.innerHTML;
}
export async function importDocument(file) {
  if (!file || file.size > LIMIT)
    throw Error("문서 파일은 25MB 이하로 선택해 주세요.");
  const ext = file.name.split(".").at(-1).toLowerCase();
  if (!["hwpx", "docx"].includes(ext))
    throw Error(
      "HWPX 또는 DOCX 파일을 선택하세요. 구형 HWP·DOC는 한글·Word에서 새 형식으로 저장해 주세요.",
    );
  const buffer = await file.arrayBuffer(),
    zip = await checkedZip(buffer);
  let html,
    layout,
    warnings = [];
  const docs = [];
  if (ext === "hwpx") {
    if (
      !zip.file("Contents/header.xml") ||
      !Object.keys(zip.files).some((n) =>
        /^Contents\/section\d+\.xml$/i.test(n),
      )
    )
      throw Error("유효한 HWPX 패키지가 아닙니다.");
    for (const name of Object.keys(zip.files)
      .filter((n) => /^Contents\/section\d+\.xml$/i.test(n))
      .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0])))
      docs.push(xml(await zip.file(name).async("string")));
    const { HwpxReader } = await import("hwp-convert");
    const reader = new HwpxReader();
    await reader.loadFromArrayBuffer(buffer);
    html = await reader.extractHtml({
      embedImages: true,
      renderStyles: true,
      renderTables: true,
      renderImages: true,
    });
    layout = getLayout(docs[0], "HWPX");
    if (docs.length > 1)
      warnings.push("여러 구역은 첫 구역의 용지 설정으로 합쳐 표시합니다.");
    const unsupported = [
      "header",
      "footer",
      "footNote",
      "endNote",
      "shape",
      "rect",
      "ellipse",
      "chart",
      "ole",
      "equation",
      "textart",
      "drawText",
    ];
    const found = unsupported.filter((name) =>
      docs.some((d) => local(d, name).length),
    );
    if (found.length)
      warnings.push(
        "머리말·꼬리말·각주·도형·수식 등 일부 개체가 감지되었습니다. 위치나 내용이 생략되거나 본문으로 펼쳐질 수 있습니다.",
      );
  } else {
    const entry = zip.file("word/document.xml");
    if (!entry) throw Error("유효한 DOCX 패키지가 아닙니다.");
    const d = xml(await entry.async("string"));
    docs.push(d);
    layout = getLayout(d, "DOCX");
    const mammoth = await import("mammoth/mammoth.browser");
    const result = await mammoth.convertToHtml(
      { arrayBuffer: buffer },
      {
        ignoreEmptyParagraphs: false,
        convertImage: mammoth.images.imgElement(async (image) => ({
          src:
            "data:" +
            image.contentType +
            ";base64," +
            (await image.read("base64")),
        })),
      },
    );
    html = enhanceWordStyles(result.value, d);
    if (result.messages.length)
      warnings.push("Word 변환 과정에서 일부 문서 요소가 생략되었습니다.");
    if (
      Object.keys(zip.files).some((n) =>
        /^word\/(header|footer|footnotes|endnotes)/.test(n),
      ) ||
      local(d, "drawing").length ||
      local(d, "fldSimple").length
    )
      warnings.push(
        "머리말·꼬리말·각주·부동 개체·자동 필드는 원본과 다르게 표시되거나 제외될 수 있습니다.",
      );
    if (local(d, "sectPr").length > 1)
      warnings.push("여러 구역은 첫 구역 용지 설정으로 통합합니다.");
    warnings.push(
      "DOCX는 의미 중심으로 불러옵니다. 사용자 지정 글꼴·스타일·탭·정밀 여백 일부가 기본 서식으로 바뀔 수 있습니다.",
    );
  }
  html = markBreaks(
    cleanHTML(
      imageSizes(cleanHTML(html), docs, ext === "hwpx" ? "HWPX" : "DOCX"),
    ),
    docs,
    ext === "hwpx" ? "HWPX" : "DOCX",
  );
  if (!html.replace(/<[^>]*>/g, "").trim() && !/<img|<table/i.test(html))
    warnings.push(
      "읽을 수 있는 본문이 없습니다. 개체만 있거나 지원되지 않는 문서인지 확인하세요.",
    );
  warnings.push(
    "페이지는 브라우저 글꼴과 용지 크기에 따라 다시 나눕니다. 원본의 쪽수·줄바꿈과 다를 수 있으며, 저장은 변환된 새 사본입니다.",
  );
  return {
    name: file.name.replace(/\.(hwpx|docx)$/i, ""),
    format: ext.toUpperCase(),
    html,
    layout,
    warnings,
  };
}
export async function exportHwpx(html, name, layout) {
  const { htmlToHwpx } = await import("hwp-convert");
  const root = document.createElement("div");
  root.innerHTML = html;
  const marker = "MUNSEOON_BREAK_" + crypto.randomUUID();
  root.querySelectorAll("[data-page-break]").forEach((node) => {
    const p = document.createElement("p");
    p.textContent = marker;
    node.replaceWith(p);
  });
  const width = Math.min(layout.width, layout.height),
    height = Math.max(layout.width, layout.height);
  const bytes = await htmlToHwpx(root.innerHTML, {
    title: name,
    creator: "문서온",
    page: {
      size: { width, height, unit: "mm" },
      orientation: layout.width > layout.height ? "landscape" : "portrait",
      margins: {
        left: layout.left,
        right: layout.right,
        top: layout.top,
        bottom: layout.bottom,
        header: 0,
        footer: 0,
      },
    },
  });
  // The converter does not map CSS page-break-before; write native HWPX breaks.
  const zip = await JSZip.loadAsync(bytes);
  for (const name of Object.keys(zip.files).filter((n) =>
    /^Contents\/section\d+\.xml$/i.test(n),
  )) {
    const d = xml(await zip.file(name).async("string"));
    for (const p of local(d, "p").filter((p) => p.textContent === marker)) {
      let next = p.nextElementSibling;
      if (!next) {
        next = p.cloneNode(true);
        local(next, "t").forEach((t) => (t.textContent = ""));
        p.after(next);
      }
      next.setAttribute("pageBreak", "1");
      p.remove();
    }
    zip.file(name, new XMLSerializer().serializeToString(d));
  }
  zip.file(
    "Preview/PrvText.txt",
    ((await zip.file("Preview/PrvText.txt")?.async("string")) || "")
      .split(marker)
      .join(""),
  );
  zip.file("mimetype", "application/hwp+zip", { compression: "STORE" });
  const result = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
  });
  return new Blob([result], { type: "application/hwp+zip" });
}
export async function exportDocx(html, name, layout) {
  const D = await import("docx");
  const root = document.createElement("div");
  root.innerHTML = html;
  const pxToTwip = (v) => Math.round(v * 15),
    mm = (v) => Math.round((v * 1440) / 25.4);
  let serial = 0;
  const numbering = [];
  const imageRun = async (el) => {
    const src = el.getAttribute("src") || "";
    if (!/^data:image\//.test(src)) return null;
    const bytes = Uint8Array.from(atob(src.split(",")[1]), (c) =>
      c.charCodeAt(0),
    );
    let type = src.match(/^data:image\/([^;]+)/)[1].replace("jpeg", "jpg");
    let image = new Image();
    image.src = src;
    await image.decode();
    let width =
      Number(el.getAttribute("width")) ||
      parseFloat(el.style.width) ||
      Math.min(
        image.naturalWidth,
        ((layout.width - layout.left - layout.right) * 96) / 25.4,
      );
    let height =
      Number(el.getAttribute("height")) ||
      parseFloat(el.style.height) ||
      (width * image.naturalHeight) / image.naturalWidth;
    let data = bytes;
    if (!["png", "jpg", "gif", "bmp"].includes(type)) {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d").drawImage(image, 0, 0);
      data = Uint8Array.from(
        atob(canvas.toDataURL("image/png").split(",")[1]),
        (c) => c.charCodeAt(0),
      );
      type = "png";
    }
    const maxWidth = ((layout.width - layout.left - layout.right) * 96) / 25.4;
    if (width > maxWidth) {
      height *= maxWidth / width;
      width = maxWidth;
    }
    return new D.ImageRun({
      data,
      type,
      transformation: {
        width: Math.max(1, Math.round(width)),
        height: Math.max(1, Math.round(height)),
      },
    });
  };
  const runs = async (el, style = {}) => {
    if (el.nodeType === 3)
      return [new D.TextRun({ ...style, text: el.textContent })];
    if (el.nodeType !== 1) return [];
    const tag = el.tagName,
      s = { ...style };
    if (["STRONG", "B"].includes(tag) || Number(el.style.fontWeight) >= 600)
      s.bold = true;
    if (["EM", "I"].includes(tag) || el.style.fontStyle === "italic")
      s.italics = true;
    if (tag === "U" || el.style.textDecoration.includes("underline"))
      s.underline = {};
    if (["S", "STRIKE"].includes(tag)) s.strike = true;
    if (tag === "SUB") s.subScript = true;
    if (tag === "SUP") s.superScript = true;
    const font = el.style.fontFamily;
    if (font) s.font = font.replace(/['"]/g, "").split(",")[0];
    const size = parseFloat(el.style.fontSize);
    if (size)
      s.size = Math.round(size * (el.style.fontSize.endsWith("px") ? 1.5 : 2));
    if (el.style.color) {
      const color = el.style.color;
      const nums = color.match(/\d+/g);
      s.color = color.startsWith("#")
        ? color.slice(1)
        : nums
            ?.slice(0, 3)
            .map((n) => (+n).toString(16).padStart(2, "0"))
            .join("");
    }
    if (tag === "MARK") s.highlight = "yellow";
    if (tag === "BR") return [new D.TextRun({ break: 1 })];
    if (tag === "IMG") {
      const r = await imageRun(el);
      return r ? [r] : [];
    }
    const parts = [];
    for (const c of el.childNodes) parts.push(...(await runs(c, s)));
    if (tag === "A" && /^https?:/.test(el.getAttribute("href") || ""))
      return [
        new D.ExternalHyperlink({
          children: parts,
          link: el.getAttribute("href"),
        }),
      ];
    return parts;
  };
  const paragraph = async (el, options = {}) => {
    const level = /^H[1-6]$/.test(el.tagName) ? Number(el.tagName[1]) : null;
    const align = el.style?.textAlign;
    const indent = parseFloat(el.style?.marginLeft) || 0;
    const lh = el.style?.lineHeight;
    return new D.Paragraph({
      children: await runs(el),
      heading: level ? D.HeadingLevel["HEADING_" + level] : undefined,
      alignment: {
        left: D.AlignmentType.LEFT,
        right: D.AlignmentType.RIGHT,
        center: D.AlignmentType.CENTER,
        justify: D.AlignmentType.JUSTIFIED,
      }[align],
      spacing: {
        after: 120,
        line: lh && Number(lh) ? Math.round(Number(lh) * 240) : undefined,
      },
      indent: indent ? { left: pxToTwip(indent) } : undefined,
      ...options,
    });
  };
  const blocks = async (parent) => {
    const out = [];
    for (const el of parent.children) {
      if (el.hasAttribute("data-page-break"))
        out.push(new D.Paragraph({ children: [new D.PageBreak()] }));
      else if (el.tagName === "TABLE") {
        const rows = [];
        const spans = new Map();
        for (const tr of el.rows) {
          const cells = [];
          let col = 0;
          for (const cell of tr.cells) {
            while (spans.get(col) > 0) {
              cells.push(
                new D.TableCell({
                  verticalMerge: D.VerticalMergeType.CONTINUE,
                  children: [new D.Paragraph("")],
                }),
              );
              spans.set(col, spans.get(col) - 1);
              col++;
            }
            const rowSpan = Number(cell.rowSpan) || 1,
              colSpan = Number(cell.colSpan) || 1;
            cells.push(
              new D.TableCell({
                children: (await blocks(cell)).length
                  ? await blocks(cell)
                  : [await paragraph(cell)],
                columnSpan: colSpan,
                verticalMerge:
                  rowSpan > 1 ? D.VerticalMergeType.RESTART : undefined,
                shading: cell.tagName === "TH" ? { fill: "EEF2F7" } : undefined,
              }),
            );
            if (rowSpan > 1) spans.set(col, rowSpan - 1);
            col += colSpan;
          }
          while (spans.get(col) > 0) {
            cells.push(
              new D.TableCell({
                verticalMerge: D.VerticalMergeType.CONTINUE,
                children: [new D.Paragraph("")],
              }),
            );
            spans.set(col, spans.get(col) - 1);
            col++;
          }
          rows.push(new D.TableRow({ children: cells }));
        }
        out.push(
          new D.Table({
            rows,
            width: { size: 100, type: D.WidthType.PERCENTAGE },
          }),
        );
      } else if (["UL", "OL"].includes(el.tagName)) {
        const ref = "list" + serial++;
        numbering.push({
          reference: ref,
          levels: [
            {
              level: 0,
              format:
                el.tagName === "OL"
                  ? D.LevelFormat.DECIMAL
                  : D.LevelFormat.BULLET,
              text: el.tagName === "OL" ? "%1." : "•",
              alignment: D.AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 260 } } },
            },
          ],
        });
        for (const li of el.children)
          out.push(
            await paragraph(li, { numbering: { reference: ref, level: 0 } }),
          );
      } else if (
        ["DIV", "SECTION", "BLOCKQUOTE"].includes(el.tagName) &&
        [...el.children].some((c) =>
          /^(P|H[1-6]|TABLE|UL|OL|DIV)$/.test(c.tagName),
        )
      )
        out.push(...(await blocks(el)));
      else out.push(await paragraph(el));
    }
    return out;
  };
  const children = await blocks(root);
  const doc = new D.Document({
    title: name,
    creator: "문서온",
    numbering: { config: numbering },
    styles: {
      default: {
        document: {
          run: { font: "맑은 고딕", size: 22 },
          paragraph: { spacing: { line: 360 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: mm(layout.width),
              height: mm(layout.height),
              orientation:
                layout.width > layout.height
                  ? D.PageOrientation.LANDSCAPE
                  : D.PageOrientation.PORTRAIT,
            },
            margin: {
              top: mm(layout.top),
              bottom: mm(layout.bottom),
              left: mm(layout.left),
              right: mm(layout.right),
            },
          },
        },
        children: children.length ? children : [new D.Paragraph("")],
      },
    ],
  });
  return D.Packer.toBlob(doc);
}
