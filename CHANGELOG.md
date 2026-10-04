# Changelog

## [Unreleased]

## [1.2.0] - 2026-10-04

`html-article-extractor` core release with verification hardening.

### Added

- 단어 단위 recall/precision 하한을 적용하는 11종 extraction corpus 테스트
- 입력 불변성, 결정성, 무스크립트, 성능 상한을 검증하는 속성 테스트
- `specs/verification-plan.md` 검증 방법과 시나리오 문서

### Fixed

- fallback이 `<body>` 직속 `<p>` 평면 문서를 빈 결과로 버리던 문제
- fallback 출력에 `display:none`/`visibility:hidden` 텍스트가 유출되던 문제
- fallback 출력의 상대 URL과 lazy-image(`data-src`) 미해결 문제
- Readability 형제 병합으로 딸려오던 댓글 섹션 유출 문제
- 적은 수의 링크로 이뤄진 랭킹/관련 섹션이 형제 병합으로 유출되던 문제
- article/main 밖 chrome `header`/`footer`가 본문에 합쳐지던 문제
- 링크 팜과 리스트형 메뉴 `div`가 크기 비례 점수로 본문을 이기던 문제
- 텍스트 노드 등 비 Document/Element 입력이 비정상 결과를 내던 문제

## [@html-article-extractor/cli 1.1.0] - 2026-10-04

### Added

- CLI meta charset 스니핑, 5MB 응답 상한, 15초 요청 timeout과 강건성 테스트

### Fixed

- 헤더 charset이 없을 때 `<meta charset>`을 무시하던 CLI 디코딩 문제

## Pre-release work

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
