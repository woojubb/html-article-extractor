# Changelog

## [Unreleased]

### Added

- npm workspaces 기반 `packages/core`, `packages/cli` 구조
- strict TypeScript 빌드와 declaration output
- Mozilla Readability 기반 주 추출기
- 텍스트 길이, 링크 밀도, 문단, 구두점, 의미 태그 기반 fallback
- URL fetch와 JSON/text/HTML 출력을 제공하는 CLI
- 한글, 링크 밀도, 부분 DOM, 입력 불변성, CLI 오류 회귀 테스트
- 알고리즘 연구와 아키텍처 문서

### Changed

- 기존 CommonJS `getArticle(dom) -> {html, text}` 계약을 유지하면서 내부 구현을 TypeScript로 전환
- 테스트/CI 지원 Node.js를 20, 22, 24로 갱신
- 예제 크롤러를 별도 실행 패키지로 교체

### Removed

- 전역 상태를 사용하는 2019년 자체 점수 구현과 `Info` 구조체
- `request`, `lodash`, native 문자 인코딩 모듈 등 오래된 예제 의존성

## [1.0.14] - 2019-01-03

- DeepSource 비교 연산자 수정
- 패키지 버전 업데이트
