# Backlog

## 알고리즘 품질

- [x] 재배포 가능한 다국어 HTML corpus와 문자 단위 precision/recall benchmark 구축
  - `packages/core/test/corpus.test.ts`: 영문/한글 11종 합성 페이지, 단어 단위 recall 0.90 / precision 0.80 하한
- [x] Readability 단독 결과와 fallback 조합 결과를 정기적으로 비교
  - corpus가 `getArticle` 종단 경로(Readability 우선 + fallback cascade)를 검증하며
  - `heuristic.test.ts`가 fallback 단독 동작을 검증
- [x] 표, 코드 블록, 이미지 caption이 많은 기사 fixture 추가

## 성능

- [x] 대형 DOM에서 문서 복제와 Readability 실행 시간/메모리 측정
  - `properties.test.ts` 성능 상한: 2000 `<p>`와 400 중첩 `<div>` 각 2초 이내
- [x] 안전한 element 수 상한과 timeout 정책 검토
  - fallback 5만 요소 상한, CLI 5MB 응답 상한과 15초 timeout 적용

## API와 배포

- [ ] title, byline, publishedTime 메타데이터를 별도 opt-in API로 제공할지 검토
- [ ] 기존 CommonJS entry를 유지하는 dual ESM export 검토
- [x] CLI의 HTTP 캐시, 요청 timeout, 비 UTF 계열 charset 감지 정책 검토
  - timeout과 charset 스니핑 적용, HTTP 캐시는 무상태 CLI 범위를 넘어서므로 미적용
