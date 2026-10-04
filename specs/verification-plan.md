# 검증 계획: 확실한 라이브러리 출시를 위한 검증 방법과 시나리오

## 배경

`getArticle(dom) -> {html, text}` 계약을 지키는 extraction 라이브러리를 출시하려면
합성 fixture 수준을 넘는 검증이 필요하다. 기존 테스트 16건은 모두 통과하지만,
사전 프로브에서 실제 실패 5건을 확인했다.

- H1: heuristic이 `<body>` 직속 `<p>`만 있는 평면 문서에서 `null` 반환
- H2: heuristic이 `display:none` / `visibility:hidden` 인라인 스타일 텍스트 유출
- H3: heuristic 출력의 상대 URL 미해결 (`../reports/f.html` 그대로 반환)
- H4: heuristic이 `<header>` 홍보 문구와 `news-comments` 같은 변형 댓글 섹션 유출
- C1: CLI가 `<meta charset>`을 무시하고 헤더 charset에만 의존 (EUC-KR 오판독 가능)
- C2: CLI에 응답 크기 상한과 요청 timeout이 없음 (대형 페이지 DoS 가능)

## 목표

- 위 실패를 모두 수정하고 회귀 테스트로 고정
- 문자/단어 단위 F1 기반 corpus 검증과 속성(property) 검증을 상시 실행
- 알고리즘 변경마다 근거(논문/벤치마크)를 `docs/algorithm.md`에 기록
- `npm run validate` + `npm run build` 전부 통과한 릴리스 가능 상태 달성

## 비목표

- 신경망 기반 추출기(BoilerNet, Web2Text) 도입: 동기·무의존성 계약과 맞지 않고,
  Bevendorff 등(2023) 대규모 비교에서 복잡한 페이지에 휴리스틱이 우세했으므로 채택하지 않음
- title/byline/publishedTime 메타데이터 API: 별도 opt-in 검토 항목으로 유지
- ESM dual export: CommonJS 계약을 깨지 않는 범위에서만 추후 검토

## 설계

### 적용한 알고리즘 근거

1. Trafilatura cascade (Barbaresi ACL 2021, Bevendorff 등 2023):
   정밀한 규칙 1차 + Readability/jusText 계열 fallback 구조.
   평균 F1 0.883~0.937로 단일 추출기 중 최상위, Readability는 중앙값 0.970으로
   가장 예측 가능. 현재 Readability 주 추출기 + fallback 구조가 이미 이 방향이므로 유지.
2. Boilerpipe 얕은 특징 (Kohlschütter 등 WSDM 2010):
   단어 수, 링크 밀도만으로 경쟁력 있는 분류 가능.
   CleanEval 재검증에서 `linkDensity <= 0.35` 단순 규칙이 유효했으므로
   링크 밀도 하드 게이트와 리스트(nav) 패널티를 fallback에 추가.
3. jusText 인접 블록 문맥 (Pomikalek): 고립된 고득점 블록이 아니라
   문단 군집을 본문으로 판단. 댓글/사이드바 변형 제거와 부모-자식 타이트닝으로 반영.
4. Boilerpipe + HTML 트리 필터 (Computación y Sistemas 2018):
   조상 노드 기준 단락 그룹화로 정밀도 15% 이상, F1 약 5% 개선.
   댓글/사이드바/관련링크 서브트리 선제거와 태그 패널티로 반영.
5. CETR 직접 채택은 제외: 직렬화 줄바꿈 의존이라 DOM 입력 API와 맞지 않음(기존 결정 유지).

### 변경 범위

- `packages/core/src/utils/dom.ts`: 노이즈 selector 확장, 숨김 스타일 제거,
  상대 URL 해결, lazy-image 승격
- `packages/core/src/extractors/heuristic.ts`: 루트 후보 포함, `p` 후보 추가,
  태그/리스트/링크밀도 패널티, 요소 수 상한
- `packages/cli/src/cli.ts`: meta charset 스니핑, 5MB 상한, 15초 timeout
- `packages/core/test/`: corpus fixture 10종 + `corpus.test.ts` + `properties.test.ts`
- `packages/cli/test/robustness.test.ts`
- `docs/algorithm.md`, `CHANGELOG.md`

## 테스트 계획

### Corpus 시나리오 (단어 F1: recall >= 0.90, precision >= 0.80)

- [ ] C-01 뉴스 기사 + 헤더/사이드바/댓글 (영문)
- [ ] C-02 링크 밀도 높은 사이드바 vs 짧은 본문
- [ ] C-03 한글 기사 (조사/어미, 라틴 구두점 없음)
- [ ] C-04 표/코드/figure-caption 포함 기술 기사
- [ ] C-05 여러 `<div>`에 분절된 기사 + 변형 댓글 클래스
- [ ] C-06 `<body>` 직속 `<p>` 평면 문서
- [ ] C-07 숨김 스타일(`display:none`, `visibility:hidden`) promo
- [ ] C-08 상대 URL(`../reports/f.html`) 해결
- [ ] C-09 테이블 위주 페이지에서 본문 단락 선택 (오탐 방지)
- [ ] C-10 빈/단일단어/스크립트뿐인 페이지의 빈 결과 계약

### 속성 시나리오

- [ ] P-01 입력 DOM 불변 (호출 전후 `innerHTML` 동일)
- [ ] P-02 결정성 (같은 입력 2회 호출 결과 동일)
- [ ] P-03 출력에 `<script>`/숨김 텍스트 없음
- [ ] P-04 성능 상한 (2000 `<p>` 2초 이내, 400 중첩 `<div>` 2초 이내)
- [ ] P-05 `Document`/`Element`/무효 입력 계약

### CLI 시나리오

- [ ] L-01 meta charset 스니핑 (헤더에 charset이 없어도 한글 복원)
- [ ] L-02 5MB 초과 응답 거부
- [ ] L-03 timeout 초과 시 에러 (AbortSignal)
- [ ] L-04 404/잘못된 프로토콜/복수 URL 거부 (기존 유지)

## 알려진 제한

- 자바스크립트 렌더링 페이지(예: Arc Fusion 기반 조선일보)는 원시 HTML의 DOM
  텍스트가 0자라 DOM 추출기로 본문을 얻을 수 없다. 단, 기사 전문이 원시 HTML에
  전혀 없는 것은 아니다. Arc 전용 ANS JSON(`content_elements`의 `type:text`
  블록) 안에 들어있다. Googlebot에도 동일한 셸이 제공되며(바이트수 동일 확인),
  구글은 JS를 실행해서 읽으므로 "SEO됨"과 "DOM에 없음"은 모순이 아니다.
  사이트 전용 JSON 파싱은 core에 넣지 않는다. 스키마 변형에 취약하고 조용한
  오추출 위험이 있으며, Trafilatura/Readability 계열도 동일하게 렌더링을
  요구하기 때문이다. 실제 Chrome 렌더링 후에는 같은 라이브러리가 정상
  추출함을 확인했다(1380자). jsdom 스크립트 실행은 보안상 비활성화하므로,
  데모는 이런 페이지를 감지해 JSON-LD 메타데이터(제목/설명, 본문 아님)를
  참고용으로 보여준다.

- [x] H1~H4, C1~C2 수정 완료
- [x] corpus + 속성 + CLI 테스트 전부 통과 (40건)
- [x] `npm run validate` 통과
- [x] `npm run build` 통과
- [x] `docs/algorithm.md` 근거 업데이트
