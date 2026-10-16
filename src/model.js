export const blankHTML = "<p></p>";
export const sampleHTML = `<h1 style="text-align:center">텍스트를 더 편하게 읽고 쓰세요.</h1><p style="text-align:center;color:#64748b">파일·드라이브 연동 없이 사용하는 문서 작업실</p><p></p><h2>텍스트 붙여넣기로 시작하세요</h2><p>상단의 <strong>텍스트 붙여넣기</strong>를 누르고 내용을 입력하면 페이지 형태로 읽을 수 있습니다. <strong>보기</strong>에서는 문서를 크게 살펴보고, <strong>편집</strong>에서는 문장과 서식을 수정하세요.</p><h3>현재 제공하는 기능</h3><table><tbody><tr><th><p>보기</p></th><th><p>편집</p></th></tr><tr><td><p>확대·축소 / 두 쪽·모아보기 / 검색</p></td><td><p>글자·문단 서식 / 표 / 쪽 나누기</p></td></tr></tbody></table><blockquote><p>내용은 자동 저장하지 않습니다. 새로고침하거나 닫기 전에 필요한 내용을 직접 복사하세요.</p></blockquote><p>파일 열기, 업로드, 다운로드, 드라이브 연결, 브라우저 저장은 제공하지 않습니다. HWPX·DOCX 파일을 직접 열거나 저장할 수 없습니다.</p><div data-page-break="true"></div><h2>간단한 회의 메모</h2><p><strong>주제</strong>　텍스트 기반 작업 환경 검토</p><p><strong>내용</strong>　필요한 내용을 붙여넣고 편집해 보세요.</p><ul><li><p>본문을 선택해 글자 크기와 색상을 바꿀 수 있습니다.</p></li><li><p>표에 내용을 적거나 행과 열을 추가할 수 있습니다.</p></li></ul><p>‘내용 복사’는 복사할 텍스트를 보여줍니다. Ctrl+C 또는 ⌘C로 직접 복사하세요.</p>`;
export const defaultLayout = {
  width: 210,
  height: 297,
  top: 20,
  bottom: 20,
  left: 22,
  right: 22,
};
export const mmToPx = (mm) => (mm * 96) / 25.4;
export function validLayout(l) {
  return (
    l &&
    ["width", "height", "top", "bottom", "left", "right"].every(
      (k) => Number.isFinite(l[k]) && l[k] >= 0,
    ) &&
    l.width >= 80 &&
    l.width <= 500 &&
    l.height >= 80 &&
    l.height <= 700 &&
    l.left + l.right < l.width - 30 &&
    l.top + l.bottom < l.height - 30
  );
}
export function textStats(html) {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
  return {
    characters: text.replace(/\s/g, "").length,
    words: text ? text.split(/\s+/).length : 0,
  };
}
