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
