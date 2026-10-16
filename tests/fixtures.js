import { htmlToHwpx } from "hwp-convert";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  PageBreak,
  ImageRun,
} from "docx";
export const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNioAAAAASUVORK5CYII=",
  "base64",
);
export async function hwpxFixture() {
  const html = `<h1>HWPX 가져오기 검증</h1><p><strong>서식 있는 원본</strong>과 한글 텍스트입니다.</p><table><tr><td>표 왼쪽</td><td>표 오른쪽</td></tr><tr><td>자료 A</td><td>자료 B</td></tr></table><p><img src="data:image/png;base64,${png.toString("base64")}" width="50" height="50"></p><p>가져오기 끝</p>`;
  return Buffer.from(
    await htmlToHwpx(html, {
      title: "기능 검증용 문서",
      page: {
        size: "A4",
        orientation: "portrait",
        margins: { top: 20, bottom: 20, left: 22, right: 22 },
      },
    }),
  );
}
export async function docxFixture() {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "Word 호환성 검증", bold: true, size: 36 }),
            ],
          }),
          new Paragraph("한국어 본문과 영문 document 테스트"),
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("DOCX 표 셀 1")] }),
                  new TableCell({ children: [new Paragraph("DOCX 표 셀 2")] }),
                ],
              }),
            ],
          }),
          new Paragraph({
            children: [
              new ImageRun({
                data: png,
                type: "png",
                transformation: { width: 40, height: 40 },
              }),
            ],
          }),
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph("명시적 두 번째 쪽"),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
