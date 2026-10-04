# Article Extraction Research

## 조사 결과

- **Mozilla Readability**는 Firefox Reader View에 사용되는 DOM 기반 휴리스틱 구현이다. 문서 복제, 후보 점수화, 링크 밀도와 class/id 단서, 후처리를 제공하며 JavaScript에서 동기 실행된다. [공식 구현](https://github.com/mozilla/readability)
- **Boilerpipe**는 WSDM 2010에서 블록의 단어 수와 링크 밀도라는 얕은 특징만으로도 경쟁력 있는 boilerplate 분류가 가능하다고 보고했다. CleanEval 재검증에서는 `linkDensity <= 0.35` 단순 규칙이 유효했다. [원 논문](https://www.wsdm-conference.org/2010/proceedings/docs/p441.pdf)
- **CETR**는 HTML 각 줄의 태그 대비 텍스트 비율을 계산하고 히스토그램을 군집화한다. 직렬화 줄바꿈에 영향을 받고 DOM 입력 API와 직접 맞지 않아 채택하지 않았다. [WWW 2010 논문](https://experts.illinois.edu/en/publications/cetr-content-extraction-via-tag-ratios)
- **jusText**는 문단 길이, 링크/불용어 밀도와 인접 블록을 이용한다. 문장 보존에는 유리하지만 언어별 불용어 목록이 필요해 다국어 기본값으로 사용하지 않았다. 인접 블록 문맥이라는 아이디어만 차용했다. [공식 구현](https://github.com/miso-belica/justext)
- **Trafilatura**는 여러 추출기의 실제 웹페이지 벤치마크를 제공하고 높은 성능을 보고했다. Python 중심이므로 이 동기 CommonJS 라이브러리의 런타임으로 채택하지 않았다. cascade(정밀 규칙 1차 + Readability/jusText fallback) 구조는 본 프로젝트의 설계 근거로 삼았다. [ACL 2021 논문](https://aclanthology.org/2021.acl-demo.15/)
- **대규모 비교 연구**(Bevendorff 등, SIGIR 2023: 8개 데이터셋, 14개 추출기)는 단일 최강자가 없고 Trafilatura가 평균 F1 최상위, Readability가 중앙값 0.970으로 가장 예측 가능하며, 복잡한 페이지에서는 휴리스틱이 신경망보다 우세하고 앙상블이 개별 추출기를 앞선다고 보고했다. [논문 PDF](https://downloads.webis.de/publications/papers/bevendorff_2023c.pdf)
- **Boilerpipe + HTML 트리 필터**(Computación y Sistemas 2018)는 조상 노드 기준 단락 그룹화로 정밀도 15% 이상, F1 약 5% 개선을 보고했다. 댓글/사이드바 서브트리 선제거의 근거다. [원 논문](https://www.scielo.org.mx/pdf/cys/v22n2/1405-5546-cys-22-02-483.pdf)
- **BoilerNet**(WWW 2020 LSTM), **Web2Text**(ECIR 2018 HMM+CNN), **Dragnet** 같은 학습 기반은 학습 데이터 부족, 무거운 런타임(TensorFlow/JVM), 복잡한 페이지에서의 열세를 이유로 채택하지 않았다. 동기·무의존성 core 계약과도 맞지 않는다.

## 채택 설계

주 추출기는 유지보수되고 실제 브라우저에 적용된 Readability다. `Document` 또는 `Element`를 독립 문서로 복제해 원본 변경을 막고, `charThreshold: 0`으로 짧은 뉴스도 분석한다. 단일 단어나 빈 결과는 거부한다. Readability 파싱 전에 댓글형 서브트리(`class`/`id`에 comment 포함)를 먼저 제거한다. Readability가 형제 노드를 본문에 합치는 과정에서 댓글 섹션이 딸려오는 실제 유출을 확인했기 때문이다. class는 후처리 단계에서 지워지므로 결과 HTML이 아니라 입력 복제본에서 제거해야 한다.

Readability가 실패하거나 결과를 만들지 못하면 다음 fallback 점수를 사용한다.

```text
score = textLength * (1 - linkDensity)
      + 25 * paragraphCount
      + 10 * punctuationCount
      + semantic/tag bonuses and penalties
      + positive/negative class hints
      x link-density gate (0.6x above 0.35, 0.25x above 0.5)
      x list gate (0.4x when li-dominant)
```

단어 수·링크 밀도는 Boilerpipe의 결과를, 문단과 DOM 단서는 jusText와 Readability의 접근을 반영한다. 링크 밀도 게이트의 0.35 기준은 Boilerpipe의 CleanEval 재검증 규칙에서 가져왔고, 0.5 초과 강감쇠와 리스트(nav) 게이트는 링크 팜·메뉴형 `div`가 크기 단조 점수(`textLength` 비례)에서 본문을 이기는 실패를 막기 위한 것이다. `header`/`footer` 태그 패널티와 article/main 밖 chrome `header`/`footer` 제거는 페이지 크롬이 본문 후보에 합쳐지는 실패를 막는다. 접근성용 시각숨김 라벨(`VisuallyHidden`, `sr-only`, `screen-reader`) 제거는 BBC식 내비게이션의 숨김 검색 라벨이 본문에 딸려오던 실제 유출을 막는다. 숫자 가중치는 논문을 재현한 값이 아니라 이 프로젝트 fixture에 맞춘 휴리스틱이므로 변경 시 회귀 테스트와 실제 페이지 benchmark가 필요하다.

fallback 출력의 상대 URL은 소스 문서 `baseURI` 기준으로 절대화하고(Readability의 `_fixRelativeUris`와 동등), `src`가 비어 있는 lazy-image에는 `data-src` 계열을 승격한다(Readability의 `_fixLazyImages`와 동등). 후보에는 항상 복제 루트 자체를 포함해 `<body>` 직속 `<p>` 같은 평면 문서를 처리하고, 5만 요소 초과 입력에서는 2차 경로가 즉시 포기해 2차식 순회 폭증을 막는다.

## 검증 범위

테스트는 기사/사이드바 경쟁, 링크가 많은 블록, 숨김·실행 요소, 한글 본문, 상대 URL, 공백 정규화, 부분 DOM, 입력 불변성을 다룬다. `test/corpus.test.ts`는 9종 합성 페이지에 단어 단위 recall 0.90 / precision 0.80 하한과 boilerplate 배제·HTML 보존 단언을 적용하고, `test/properties.test.ts`는 불변성·결정성·무스크립트·성능 상한(2000 `<p>`와 400 중첩 `<div>` 각 2초)을 검증한다. CLI는 meta charset 스니핑(EUC-KR 바이트 포함), 5MB 상한, 15초 timeout을 `test/robustness.test.ts`에서 검증한다. 향후 알고리즘 변경은 고정 HTML corpus에서 precision/recall 또는 문자 단위 F1과 실행 시간을 함께 비교해야 한다.
