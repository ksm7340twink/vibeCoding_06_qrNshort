# LinkTools — QR코드 & URL 단축 웹 애플리케이션 프로젝트 개요 및 기능명세서

---

## 1. 프로젝트 개요 (Overview)

### 1.1 프로젝트 목적
본 프로젝트는 인터넷 사용자가 일상 업무 및 마케팅, 정보 공유 시 빈번하게 사용하는 **'QR코드 생성'**과 **'URL 단축(Shortener)'** 기능을 단일 웹 플랫폼에서 직관적이고 빠르게 이용할 수 있도록 구축한 링크 유틸리티 허브 웹앱입니다.

### 1.2 핵심 가치
- **원스톱 링크 허브 (One-stop Hub)**: 메인 페이지에서 QR코드 생성 도구와 URL 단축 도구로 즉시 이동할 수 있는 직관적인 네비게이션 제공
- **OpenAPI 기반 실시간 단축**: 브라우저 CORS 제약 없는 공용 OpenAPI(`is.gd` / `v.gd` / TinyURL 프록시 백업)를 활용한 안정적인 실시간 링크 단축
- **사용자 경험(UX) 최적화**: 
  - 공백 입력 시 단축 버튼 비활성화로 무효 요청 차단
  - 단축 결과의 읽기 전용 상자 표시 및 원클릭 자동 복사
  - 명확한 '복사하였습니다' 알림창 및 시각적 피드백 제공
- **현대적이고 감각적인 UI**: Glassmorphism, 유동형 배경 오브, Dark/Neon 테마의 반응형 인터페이스

---

## 2. 시스템 구조 및 폴더 아키텍처

```
프로젝트06/
├── index.html            # [메인 허브] QR코드 및 URL단축 선택 랜딩 페이지
├── url2qr/               # [모듈 1] QR 코드 생성 웹앱
│   ├── css/
│   │   └── style.css     # QR 생성기 전용 스타일
│   ├── img/
│   │   └── logo.png      # 서비스 로고
│   ├── js/
│   │   ├── qrcode.min.js # QRCode 생성 엔진 라이브러리
│   │   └── script.js     # QR코드 렌더링 및 JPG 다운로드 로직
│   └── index.html        # QR 생성기 메인 인터페이스
└── urlShort/             # [모듈 2] URL 단축 웹앱
    └── index.html        # URL 단축기 인터페이스 & 비즈니스 로직 (단일 독립 구동)
```

---

## 3. 기능 명세서 (Functional Specification)

### 3.1 메인 허브 ([index.html](file:///c:/Users/SON/바이브코딩/프로젝트06/index.html))

| 항목 | ID/선택자 | 동작 및 상세 사양 |
| :--- | :--- | :--- |
| **QR코드 도구 카드/버튼** | `#btn-qr` (`.tool-card.card-qr`) | 클릭 시 `url2qr/index.html`로 즉시 연결 (페이지 전환) |
| **URL단축 도구 카드/버튼** | `#btn-url` (`.tool-card.card-url`) | 클릭 시 `urlShort/index.html`로 즉시 연결 (페이지 전환) |
| **인터랙티브 기능 카드** | `.tool-card` | 호버 시 3D 틸트/글로우 애니메이션 및 샤인 이펙트 제공 |
| **반응형 레이아웃** | `.page`, `.cards-grid` | 모바일/태블릿/데스크톱 해상도에 맞춘 자동 그리드 적응형 레이아웃 |

---

### 3.2 URL 단축 모듈 ([urlShort/index.html](file:///c:/Users/SON/바이브코딩/프로젝트06/urlShort/index.html))

```mermaid
flowchart TD
    A[사용자 URL 입력] --> B{입력 필드가 비어있는가?}
    B -- 예 --> C['단축하기' 버튼 비활성화 (disabled)]
    B -- 아니오 --> D['단축하기' 버튼 활성화]
    D --> E[사용자가 '단축하기' 클릭 or Enter]
    E --> F[URL 유효성 검사 (http/https)]
    F -- 실패 --> G[오류 메시지 표시]
    F -- 성공 --> H[로딩 스피너 활성화]
    H --> I[OpenAPI 비동기 단축 요청 (is.gd / v.gd / TinyURL)]
    I -- 응답 성공 --> J[읽기 전용 출력상자에 단축 URL 표시]
    I -- 실패 --> K[에러 메시지 표시]
    J --> L[사용자가 '복사' 버튼 클릭]
    L --> M[클립보드 자동 복사 실행]
    M --> N['복사하였습니다' 알림창 및 토스트 팝업 띄움]
```

#### 세부 요구사항 충족 사양

1. **URL 입력창 (`#urlInput`)**:
   - `type="url"`, placeholder, 아이콘 및 실시간 입력 지우기 버튼(`btnClearInput`) 내장
   - 공백 제거(`trim()`) 검증 및 프로토콜 누락 시 자동 `https://` 보정 처리

2. **단축하기 버튼 비활성화 (`#btnShorten:disabled`)**:
   - **초기 로드 상태**: 버튼이 비활성화(`disabled=true`)되어 무효한 요청 방지
   - **실시간 상태 동기화**: `input`, `keyup`, `paste`, `change` 이벤트를 감지하여 입력 필드가 비어있으면 즉시 비활성화, 텍스트가 존재하면 즉시 활성화

3. **OpenAPI 비동기 단축 요청 & 읽기 전용 출력상자 (`#resultOutput`)**:
   - **OpenAPI 1순위**: `https://da.gd/s?url=...` (CORS 공식 헤더 `*` 완벽 지원, 0.3초 초고속 Caddy 엔진)
   - **OpenAPI 2순위 (JSONP)**: `https://is.gd/create.php?format=json&callback=...` (브라우저 CORS 제약을 원천 우회하는 JSONP 방식)
   - **OpenAPI 3순위 (JSONP)**: `https://v.gd/create.php?format=json&callback=...` (is.gd 자매 서비스 JSONP 백업)
   - **OpenAPI 4순위**: `https://is.gd/create.php?format=json` 직접 Fetch
   - **OpenAPI 5순위**: `https://clck.ru/--?url=...` (Yandex 글로벌 CORS API)
   - **출력 상자**: `readonly` 속성이 부여된 읽기 전용 상자로, 사용자가 임의로 값을 수정할 수 없으며 단축 결과가 표시됨

4. **'복사' 버튼 및 '복사하였습니다' 알림창 (`#btnCopy`)**:
   - **클립보드 자동 저장**: `document.execCommand('copy')` 및 `navigator.clipboard`를 결합하여 단축 URL을 즉각 클립보드에 안전하게 복사
   - **단독 모달 알림창 팝업 (`#alertModal`)**: 거슬리는 브라우저 기본 경고창 대신, 화면 중앙에 초록색 체크 아이콘과 **"복사하였습니다"** 타이틀, [확인] 닫기 버튼으로 구성된 **세련된 글래스모피즘 알림창 팝업 단독 표출** (확인 버튼, ESC, Enter, 배경 클릭으로 닫기 지원)
   - **버튼 시각 피드백**: 복사 즉시 버튼 라벨이 '완료!'로 전환되며 하단 보조 토스트 병행 노출

---

### 3.3 QR코드 생성 모듈 ([url2qr/index.html](file:///c:/Users/SON/바이브코딩/프로젝트06/url2qr/index.html))

| 항목 | 상세 사양 |
| :--- | :--- |
| **QR 코드 실시간 렌더링** | QRCode.js 엔진을 기반으로 고화질 QR코드 캔버스 즉시 렌더링 |
| **JPG 원클릭 다운로드** | 생성된 QR코드를 마우스 클릭 시 고화질 JPG 이미지 파일로 로컬 저장 |
| **반응형 인터랙티브 배경** | 마우스 커서 스포트라이트와 부드러운 앰비언트 오라 효과 |

---

## 4. 인터페이스 및 사용자 인터랙션 명세 (UI/UX)

| 단계 | 사용자 액션 | 시스템 반응 및 피드백 |
| :---: | :--- | :--- |
| **1** | 루트 페이지 접속 | 네온 글래스모피즘 허브 화면 표출, QR코드 / URL단축 버튼 노출 |
| **2** | 'QR코드' 버튼 클릭 | `url2qr/index.html` 페이지로 이동 |
| **3** | 'URL단축' 버튼 클릭 | `urlShort/index.html` 페이지로 이동 |
| **4** | URL 입력 필드 입력 전 | '단축하기' 버튼 회색 반투명 비활성화 (`cursor: not-allowed`) |
| **5** | URL 입력 필드 텍스트 입력 | '단축하기' 버튼 청록색 활성화 및 호버 효과 적용 |
| **6** | '단축하기' 버튼 클릭 | 로딩 스피너 작동 -> 단축 완료 후 읽기 전용 상자에 단축 링크 자동 입력 및 포커스 |
| **7** | '복사' 버튼 클릭 | 클립보드에 링크 저장 -> **'복사하였습니다' 알림창** 및 토스트 표시 |

---

## 5. 비기능 및 보안/안정성 명세

- **CORS 이슈 사전 차단**: 브라우저 단독 실행(`file://` 및 웹 서버) 환경에서 CORS 오류가 발생하지 않도록 검증된 OpenAPI(`is.gd`, `v.gd`) 채택
- **무중단 다중 계층 Fallback**: 특정 공용 API의 트래픽 폭주 또는 장애 발생 시 백업 API로 즉각 자동 전환
- **보안 및 입력 정규화**: `javascript:` 또는 비정상 스킴의 악의적 입력을 방지하기 위해 `http:`, `https:` 프로토콜 유효성 엄격 검증
- **독립 구동성**: 프론트엔드 정적 파일(HTML, CSS, JS)만으로 외부 서버나 복잡한 빌드 과정 없이 즉시 실행 가능
