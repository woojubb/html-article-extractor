# html-article-extractor

웹페이지 DOM에서 기사 본문 HTML과 정규화된 텍스트를 추출하는 TypeScript 모노레포입니다. 라이브러리는 기존 CommonJS API를 유지하고, URL 요청은 별도 CLI 패키지가 담당합니다.

## 패키지

| 경로 | 패키지 | 책임 |
| --- | --- | --- |
| `packages/core` | `html-article-extractor` | DOM을 동기 분석해 `{html, text}` 반환 |
| `packages/cli` | `@html-article-extractor/cli` | URL 요청, 문자 디코딩, 터미널 출력 |

Node.js 20 이상이 필요합니다.

## 라이브러리 사용

```bash
npm install html-article-extractor jsdom
```

```javascript
const { JSDOM } = require('jsdom')
const getArticle = require('html-article-extractor')

const document = new JSDOM(html, { url: pageUrl }).window.document
const article = getArticle(document)

console.log(article.html)
console.log(article.text)
```

입력은 `Document` 또는 `Element`입니다. 반환값은 항상 `{html: string, text: string}`이며 본문을 찾지 못하면 두 값이 빈 문자열입니다. 분석 전 DOM을 복제하므로 호출자의 DOM을 변경하지 않습니다.

## CLI 사용

```bash
npx @html-article-extractor/cli --text https://example.com/article
npx @html-article-extractor/cli --html https://example.com/article
npx @html-article-extractor/cli --json https://example.com/article
```

CLI는 HTTP(S) URL만 허용하고 Node 내장 `fetch`와 `TextDecoder`를 사용합니다.

## 추출 방식

1. Firefox Reader View 기반의 `@mozilla/readability`로 복제된 문서를 분석합니다.
2. 결과가 없으면 텍스트 길이, 링크 밀도, 문단 수, 구두점, 의미 태그를 조합한 경량 fallback이 후보를 평가합니다.
3. 블록 경계와 공백을 정규화해 HTML과 텍스트를 반환합니다.

알고리즘 조사, 선택 근거, 점수식은 [docs/algorithm.md](docs/algorithm.md)에 정리했습니다.

> 추출 결과는 HTML sanitizer가 아닙니다. 신뢰할 수 없는 HTML을 브라우저에 삽입하기 전 DOMPurify 같은 전용 sanitizer를 적용하세요.

## 개발

```bash
npm install
npm run build       # 두 workspace TypeScript 빌드
npm test            # core와 CLI의 node:test 실행
npm run lint        # TypeScript ESLint 검사
npm run typecheck   # project references 타입 검사
npm run validate    # lint + typecheck + test
```

기여 절차는 [CONTRIBUTING.md](CONTRIBUTING.md), 구조는 [docs/architecture.md](docs/architecture.md)를 참고하세요.

## 라이선스

MIT
