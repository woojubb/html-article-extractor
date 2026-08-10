# Backlog

## 알고리즘 품질

- [ ] 재배포 가능한 다국어 HTML corpus와 문자 단위 precision/recall benchmark 구축
- [ ] Readability 단독 결과와 fallback 조합 결과를 정기적으로 비교
- [ ] 표, 코드 블록, 이미지 caption이 많은 기사 fixture 추가

## 성능

- [ ] 대형 DOM에서 문서 복제와 Readability 실행 시간/메모리 측정
- [ ] 안전한 element 수 상한과 timeout 정책 검토

## API와 배포

- [ ] title, byline, publishedTime 메타데이터를 별도 opt-in API로 제공할지 검토
- [ ] 기존 CommonJS entry를 유지하는 dual ESM export 검토
- [ ] CLI의 HTTP 캐시, 요청 timeout, 비 UTF 계열 charset 감지 정책 검토
