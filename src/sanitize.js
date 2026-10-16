import DOMPurify from "dompurify";
// Reject external image URLs while DOMPurify still operates in its inert document.
DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
  if (
    node.nodeName === "IMG" &&
    data.attrName === "src" &&
    !/^data:image\/(png|jpe?g|gif|webp|bmp);base64,/i.test(data.attrValue)
  )
    data.keepAttr = false;
});
const allowedStyles = new Set([
  "font-size",
  "font-family",
  "font-weight",
  "font-style",
  "text-decoration",
  "text-decoration-line",
  "text-align",
  "color",
  "background-color",
  "line-height",
  "margin-left",
  "margin-right",
  "margin-top",
  "margin-bottom",
  "padding",
  "padding-left",
  "padding-right",
  "padding-top",
  "padding-bottom",
  "border",
  "border-color",
  "border-width",
  "border-style",
  "width",
  "height",
  "max-width",
  "vertical-align",
  "text-indent",
  "border-collapse",
  "list-style-type",
]);
export function cleanHTML(html) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "div",
      "span",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "strike",
      "sub",
      "sup",
      "br",
      "hr",
      "blockquote",
      "pre",
      "code",
      "ul",
      "ol",
      "li",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "td",
      "th",
      "colgroup",
      "col",
      "img",
      "a",
      "mark",
      "font",
    ],
    ALLOWED_ATTR: [
      "style",
      "colspan",
      "rowspan",
      "width",
      "height",
      "src",
      "alt",
      "href",
      "start",
      "data-page-break",
      "color",
      "face",
      "size",
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["data-page-break"],
  });
  const root = document.createElement("div");
  root.innerHTML = clean;
  root.querySelectorAll("*").forEach((el) => {
    for (const prop of [...el.style])
      if (
        !allowedStyles.has(prop) ||
        /url\s*\(|expression\s*\(|var\s*\(/i.test(
          el.style.getPropertyValue(prop),
        )
      )
        el.style.removeProperty(prop);
    if (el.style.fontSize) {
      const n = parseFloat(el.style.fontSize);
      if (n > 120 || n < 1) el.style.removeProperty("font-size");
    }
    if (
      el.tagName === "IMG" &&
      !/^data:image\/(png|jpe?g|gif|webp|bmp);base64,/i.test(
        el.getAttribute("src") || "",
      )
    )
      el.remove();
    if (el.tagName === "A") {
      const href = el.getAttribute("href") || "";
      if (!/^(https?:|mailto:|tel:)/i.test(href)) el.removeAttribute("href");
      el.setAttribute("rel", "noopener noreferrer");
      el.setAttribute("target", "_blank");
    }
  });
  return root.innerHTML || "<p></p>";
}
