# 오늘 뭐 먹지?

점심 메뉴 랜덤 뽑기 앱입니다. 기본 메뉴 10개로 시작하며 메뉴를 직접 추가·삭제할 수 있습니다. 버튼을 누르면 메뉴가 빠르게 바뀐 후 결과를 크게 표시합니다. 연속으로 뽑을 때는 직전 결과를 제외한 나머지 메뉴 중 무작위로 선택합니다. 메뉴가 하나면 해당 메뉴를 선택하며, 없으면 추첨 버튼을 비활성화합니다.

## 실행 및 검증

Node.js 22 이상 (검증: 24).

```sh
npm ci
npm run dev
npm test
npm run test:e2e
npm run build
```

개발 경로는 `/gpt_webapp_test/`입니다. 브라우저 테스트는 `/usr/bin/chromium`을 사용하며 `CHROMIUM_PATH`로 변경할 수 있습니다.

메뉴 목록은 이 브라우저의 localStorage에 저장됩니다. 새로고침해도 유지되며 전체 삭제한 빈 목록도 보존됩니다. 저장 실패는 오류로 표시하고 변경을 적용하지 않습니다. 로그인이나 기기 간 동기화는 없습니다. 기존 MY MONEY 화면·코드·의존성은 제거했으며 기존 브라우저 가계부 DB는 삭제하거나 읽지 않습니다.

## 배포

GitHub Pages 주소: https://davin-kim.github.io/gpt_webapp_test/

main 반영 시 GitHub Actions가 테스트·빌드하고 dist만 배포합니다. GitHub Settings → Pages → Source는 GitHub Actions로 설정합니다. Vite base는 저장소 이름에 맞춘 `/gpt_webapp_test/`입니다. 개인 파일은 소스나 정적 빌드에 넣지 않습니다.

계산 로직: src/model.js / 저장 어댑터: src/storage.js / 화면: src/app.js / 스타일: src/style.css.
