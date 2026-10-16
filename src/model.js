export const blankHTML = "<p></p>";
export const sampleHTML = `<h1 style="text-align:center">문서, 더 가볍게 열다.</h1><p style="text-align:center;color:#64748b">브라우저에서 읽고, 수정하고, 다시 저장하세요.</p><p></p><h2>설치 없는 나의 문서 작업실</h2><p>문서온은 HWPX와 Word(DOCX) 문서를 브라우저에서 확인하고 편집하는 도구입니다. 이 문서는 기능을 살펴보기 위한 <strong>예시 문서</strong>이며, 사용자의 실제 파일이 아닙니다.</p><h3>이렇게 시작해 보세요</h3><ol><li><p>왼쪽 위 <strong>파일 열기</strong>로 HWPX 또는 DOCX를 선택하세요.</p></li><li><p><strong>보기</strong> 모드에서 확대하거나 여러 페이지를 살펴보세요.</p></li><li><p><strong>편집</strong> 모드에서 글자·문단·표·그림을 수정하세요.</p></li></ol><h3>읽기와 쓰기에 필요한 것들</h3><table><tbody><tr><th><p>문서 보기</p></th><th><p>문서 편집</p></th></tr><tr><td><p>쪽 이동 · 배율 · 두 쪽 / 모아보기</p></td><td><p>제목 · 글꼴 · 색상 · 정렬 · 목록</p></td></tr><tr><td><p>전체 화면 · 찾기 · 인쇄</p></td><td><p>표 · 이미지 · 링크 · 쪽 나누기</p></td></tr></tbody></table><p></p><blockquote><p>문서 내용은 서버로 전송하지 않습니다. 작업 중인 문서는 이 브라우저에 임시 저장되며, 파일 저장으로 별도 사본을 내려받을 수 있습니다.</p></blockquote><p>※ 원본의 복잡한 조판과 일부 개체는 달라질 수 있습니다. 중요한 문서는 내려받은 사본을 한글 또는 Word에서도 확인하세요.</p><div data-page-break="true"></div><h2>함께 쓰는 문서</h2><p>HWPX를 열어 DOCX로, DOCX를 열어 HWPX로 저장할 수 있습니다. 문서를 새로 만들 때에도 원하는 형식을 고를 수 있습니다.</p><h3>회의록 예시</h3><p><strong>회의 주제</strong>　브라우저 문서 작업 환경 검토</p><p><strong>참석자</strong>　기획팀 · 디자인팀 · 개발팀</p><table><tbody><tr><th><p>항목</p></th><th><p>논의 내용</p></th><th><p>상태</p></th></tr><tr><td><p>문서 열기</p></td><td><p>HWPX와 DOCX의 기본 내용 확인</p></td><td><p>확인</p></td></tr><tr><td><p>후속 작업</p></td><td><p>서식 편집 후 사본 내려받기</p></td><td><p>예정</p></td></tr></tbody></table><p></p><p>상단의 ‘편집’ 버튼을 눌러 이 문장을 바꿔보세요.</p>`;
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
export function downloadName(name, extension) {
  const stem = String(name || "제목 없는 문서")
    .replace(/\.(hwpx|docx|html)$/i, "")
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, "_")
    .slice(0, 100);
  return `${stem}.${extension}`;
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
