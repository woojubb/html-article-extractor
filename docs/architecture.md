# Architecture

## Workspace Boundaries

`packages/core`는 네트워크나 특정 DOM 구현을 소유하지 않는다. 호출자가 제공한 표준 `Document` 또는 `Element`를 동기 분석하며, 배포 결과는 CommonJS와 TypeScript 선언 파일이다.

`packages/cli`는 URL 검증, HTTP 요청, 문자 디코딩과 jsdom 생성을 담당한다. core의 공개 API만 소비하므로 크롤링 정책 변경이 라이브러리 설치 크기나 추출 계약에 영향을 주지 않는다.

## Core Pipeline

1. `index.ts`가 입력을 검증하고 추출기를 조정한다.
2. `extractors/readability.ts`가 복제 문서에서 Mozilla Readability를 실행한다.
3. `extractors/heuristic.ts`가 실패 시 텍스트/링크 밀도 기반 후보 점수를 계산한다.
4. `utils/dom.ts`가 복제, 노이즈 제거, 상대 URL 해결, lazy-image 승격, 댓글/보일러플레이트 제거, 링크 밀도 컨테이너 제거, 블록 경계 기반 텍스트 정규화를 제공한다.
5. 모든 경로는 `ArticleResult` 또는 `null`을 반환하고 public entry point가 빈 결과 계약을 보장한다.

Readability가 입력 DOM을 변경하므로 복제는 필수다. 부분 Element 입력은 별도 HTML 문서로 옮겨 sibling 탐색을 막고 원본 `baseURI`는 `<base>`로 보존한다.

## Build and Tests

루트 `tsconfig.json`은 두 패키지를 project reference로 연결한다. 각 패키지는 `dist/`에 CommonJS와 `.d.ts`를 생성하며 빌드 산출물은 커밋하지 않는다. 테스트는 `tsx` loader와 `node:test`를 사용해 TypeScript 소스를 직접 실행한다.
