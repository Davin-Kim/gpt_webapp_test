import { Editor, Node, Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import { cleanHTML } from "./sanitize.js";
const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML: () => [{ tag: "div[data-page-break]" }],
  renderHTML: () => [
    "div",
    { "data-page-break": "true", class: "page-break" },
    "쪽 나누기",
  ],
});
const ParagraphSpace = Extension.create({
  name: "paragraphSpace",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) => parseFloat(el.style.marginLeft) || 0,
            renderHTML: (a) =>
              a.indent ? { style: `margin-left:${a.indent}px` } : {},
          },
          backgroundColor: {
            default: null,
            parseHTML: (el) => el.style.backgroundColor || null,
            renderHTML: (a) =>
              a.backgroundColor
                ? { style: `background-color:${a.backgroundColor}` }
                : {},
          },
          spaceAfter: {
            default: null,
            parseHTML: (el) => el.style.marginBottom || null,
            renderHTML: (a) =>
              a.spaceAfter ? { style: `margin-bottom:${a.spaceAfter}` } : {},
          },
          spaceBefore: {
            default: null,
            parseHTML: (el) => el.style.marginTop || null,
            renderHTML: (a) =>
              a.spaceBefore ? { style: `margin-top:${a.spaceBefore}` } : {},
          },
          firstLine: {
            default: null,
            parseHTML: (el) => el.style.textIndent || null,
            renderHTML: (a) =>
              a.firstLine ? { style: `text-indent:${a.firstLine}` } : {},
          },
        },
      },
    ];
  },
});
export function makeEditor(element, html, onUpdate, onSelection) {
  return new Editor({
    element,
    content: html,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: {
          openOnClick: false,
          protocols: ["https", "http", "mailto", "tel"],
        },
      }),
      TextStyleKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TableKit.configure({ table: { resizable: true } }),
      Image.configure({
        allowBase64: true,
        resize: {
          enabled: true,
          directions: ["bottom-right", "bottom-left"],
          alwaysPreserveAspectRatio: true,
        },
      }),
      Highlight.configure({ multicolor: true }),
      PageBreak,
      ParagraphSpace,
      Superscript,
      Subscript,
    ],
    editorProps: {
      attributes: {
        class: "doc-content",
        spellcheck: "false",
        "aria-label": "문서 본문 편집기",
      },
      handlePaste(view, event) {
        const html = event.clipboardData?.getData("text/html");
        if (html) {
          event.preventDefault();
          view.dom.dispatchEvent(
            new CustomEvent("safe-paste", { detail: cleanHTML(html) }),
          );
          return true;
        }
        return false;
      },
    },
    onUpdate: () => onUpdate(),
    onSelectionUpdate: () => onSelection(),
    onTransaction: () => onSelection(),
  });
}
