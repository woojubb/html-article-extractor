# 기사 본문 추출 데모

뉴스 기사 URL을 입력하면 `html-article-extractor`로 본문을 추출해 보여주는
로컬 예제입니다. 서버가 직접 페이지를 가져오므로 브라우저 CORS 제한이 없습니다.

```bash
npm install
npm run build
node examples/article-demo/server.cjs
```

브라우저에서 `http://127.0.0.1:8975`를 열고 URL을 입력하거나 업체별
프리셋 버튼(BBC News, Naver News, The Guardian 각 3건)을 누르면 됩니다.
프리셋 링크는 `links.json`에서 교체할 수 있습니다.

## 자바스크립트 렌더링 페이지

원시 HTML의 DOM 텍스트가 거의 없는 페이지(예: Arc Fusion 기반 조선일보)는
추출할 수 없고 그 취지를 메시지로 안내한다. 기사 전문이 Arc 전용 JSON 안에
들어있는 경우도 있으나 사이트 종속 파싱은 하지 않는다. JSON-LD의 제목/설명은
참고용(본문 아님)으로 표시한다. 이런 페이지는 브라우저 렌더링 후 추출한다.
검증됨: headless Chrome 렌더링 DOM에 `getArticle` 적용 시 1380자 정상 추출.
