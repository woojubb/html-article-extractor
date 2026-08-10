# Contributing

## Setup

Node.js 20 이상과 npm을 사용합니다.

```bash
npm install
npm run validate
```

## Workflow

1. 목적이 드러나는 브랜치를 만듭니다: `fix/link-density` 또는 `feat/metadata`.
2. core API 변경은 `packages/core`, URL/출력 변경은 `packages/cli`에 한정합니다.
3. 버그를 재현하는 최소 HTML fixture와 실패 테스트를 먼저 추가합니다.
4. `npm run validate`와 `npm run build`를 실행합니다.

TypeScript strict mode를 유지합니다. 4스페이스, 작은따옴표, 세미콜론 없음, camelCase 함수명 규칙을 따릅니다. `eslint-disable`로 규칙을 우회하지 마세요.

## Extraction Changes

추출 점수나 노이즈 selector를 바꿀 때는 최소한 다음을 검증합니다.

- 본문 recall이 유지되는가
- navigation, related links, comments가 포함되지 않는가
- 한국어와 영문 fixture가 모두 통과하는가
- 호출자가 제공한 DOM이 변경되지 않는가
- 큰 DOM에서 불필요한 전체 복제가 늘지 않는가

실제 사이트 HTML fixture에는 개인정보와 저작권이 있는 전체 기사를 넣지 말고, 구조를 재현한 최소 합성 HTML을 사용합니다.

## Commits and Pull Requests

기존 이력처럼 짧은 명령형 제목을 사용합니다. 예: `Add link-density regression coverage`. PR에는 변경 이유, 알고리즘 영향, 실행한 검증 명령, 관련 이슈를 적습니다. CLI 출력이 바뀌면 전후 터미널 예시를 포함합니다.
