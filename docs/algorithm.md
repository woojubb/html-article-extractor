# Article Extraction Research

## 조사 결과

- **Mozilla Readability**는 Firefox Reader View에 사용되는 DOM 기반 휴리스틱 구현이다. 문서 복제, 후보 점수화, 링크 밀도와 class/id 단서, 후처리를 제공하며 JavaScript에서 동기 실행된다. [공식 구현](https://github.com/mozilla/readability)
- **Boilerpipe**는 WSDM 2010에서 블록의 단어 수와 링크 밀도라는 얕은 특징만으로도 경쟁력 있는 boilerplate 분류가 가능하다고 보고했다. [원 논문](https://www.wsdm-conference.org/2010/proceedings/docs/p441.pdf)
- **CETR**는 HTML 각 줄의 태그 대비 텍스트 비율을 계산하고 히스토그램을 군집화한다. 직렬화 줄바꿈에 영향을 받고 DOM 입력 API와 직접 맞지 않아 채택하지 않았다. [WWW 2010 논문](https://experts.illinois.edu/en/publications/cetr-content-extraction-via-tag-ratios)
- **jusText**는 문단 길이, 링크/불용어 밀도와 인접 블록을 이용한다. 문장 보존에는 유리하지만 언어별 불용어 목록이 필요해 다국어 기본값으로 사용하지 않았다. [공식 구현](https://github.com/miso-belica/justext)
- **Trafilatura**는 여러 추출기의 실제 웹페이지 벤치마크를 제공하고 높은 성능을 보고했다. Python 중심이므로 이 동기 CommonJS 라이브러리의 런타임으로 채택하지 않았다. [ACL 2021 논문](https://aclanthology.org/2021.acl-demo.15/)

## 채택 설계

주 추출기는 유지보수되고 실제 브라우저에 적용된 Readability다. `Document` 또는 `Element`를 독립 문서로 복제해 원본 변경을 막고, `charThreshold: 0`으로 짧은 뉴스도 분석한다. 단일 단어나 빈 결과는 거부한다.

Readability가 실패하거나 결과를 만들지 못하면 다음 fallback 점수를 사용한다.

```text
score = textLength * (1 - linkDensity)
      + 25 * paragraphCount
      + 10 * punctuationCount
      + semantic/class bonuses
      - boilerplate class penalty
```

단어 수·링크 밀도는 Boilerpipe의 결과를, 문단과 DOM 단서는 jusText와 Readability의 접근을 반영한다. 숫자 가중치는 논문을 재현한 값이 아니라 이 프로젝트 fixture에 맞춘 휴리스틱이므로 변경 시 회귀 테스트와 실제 페이지 benchmark가 필요하다.

## 검증 범위

테스트는 기사/사이드바 경쟁, 링크가 많은 블록, 숨김·실행 요소, 한글 본문, 상대 URL, 공백 정규화, 부분 DOM, 입력 불변성을 다룬다. 향후 알고리즘 변경은 고정 HTML corpus에서 precision/recall 또는 문자 단위 F1과 실행 시간을 함께 비교해야 한다.
