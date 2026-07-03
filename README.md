# 구독/결제 데모 프로젝트

간단한 구독 시나리오를 재현한 풀스택 데모입니다.  
이메일·Google OAuth 로그인, 플랜 변경, 토큰 차감, PortOne 빌링키/정기결제 흐름, 웹훅 처리를 한 프로젝트에서 확인할 수 있습니다.

---

## 기술 스택

- **프런트엔드**: React 18, TypeScript, webpack, react-router, react-bootstrap, react-toastify
- **백엔드**: Node.js(Express), TypeScript, mysql2, express-session, PortOne Server SDK, axios
- **데이터베이스**: MySQL 8+
- **기타**: dotenv, uuid, lodash/throttle

---

## 주요 기능

- 이메일/Google OAuth 기반 로그인 및 세션 관리
- 구독 플랜 업그레이드·다운그레이드, 다음 결제일 변경
- PortOne Billing Key 발급/삭제, 정기 결제 스케줄 생성·취소
- 결제 성공/실패 웹훅 처리 및 토큰 지급
- 플랜별 토큰 차감 기능 호출 UI (react-window 기반 리스트)

---

## 프로젝트 구조

```
subscription/
├── back-end/          # Express + TypeScript API 서버
│   ├── src/
│   │   ├── router/    # login, subscription, payment, webhook 라우터
│   │   ├── middleware/
│   │   ├── all_Types.ts, all_Store.ts
│   │   └── web.ts     # 서버 엔트리포인트
│   ├── dist/          # webpack 번들 산출물
│   └── package.json
├── front-end/         # React SPA
│   ├── src/
│   │   ├── component/Login
│   │   ├── component/Subscription
│   │   └── class/     # 상태/서비스 래퍼
│   └── package.json
├── dump.sql  # DB 스키마 및 샘플 데이터
└── README.md
```

---

## ERD / 아키텍처

### 데이터 모델

```mermaid
erDiagram
    users ||--o{ subscriptions : "1:N"
    users ||--o{ payments : "1:N"
    subscriptions ||--o{ payments : "1:N"
    subscriptions ||--o{ subscription_schedules : "1:N"

    users {
        bigint id PK "사용자 ID"
        varchar email "로그인 이메일"
        int token_balance "보유 토큰"
        TIMESTAMP created_at "가입 일시"
        varchar portone_customer_id UK "PortOne 고객 ID"
        varchar portone_billing_key UK "PortOne 빌링키"
        enum billing_key_status "빌링키 상태"
        varchar card_brand "카드 브랜드"
        char card_last4 "카드 끝 4자리"
        varchar easy_pay_provider "간편결제 제공자"
        TIMESTAMP billing_key_created_at "빌링키 생성일"
        TIMESTAMP billing_key_updated_at "빌링키 수정일"
    }

    subscriptions {
        bigint id PK "구독 ID"
        bigint user_id FK "사용자 ID"
        enum plan_name "현재 플랜"
        enum billing_cycle "결제 주기"
        int price_cents "청구 금액"
        int token_grant "지급 토큰"
        TIMESTAMP current_period_end "현재 주기 종료일"
        enum pending_plan_name "다음 주기 플랜"
        enum pending_billing_cycle "다음 주기 결제 주기"
        tinyint cancel_at_period_end "기간 종료 후 해지 여부"
        TIMESTAMP updated_at "수정 일시"
    }

    payments {
        bigint id PK "결제 이력 ID"
        bigint user_id FK "사용자 ID"
        bigint subscription_id FK "구독 ID"
        varchar payment_id UK "결제 요청 ID"
        varchar portone_tx_id UK "PortOne 거래 ID"
        varchar order_name "주문명"
        int amount_krw "결제 금액"
        char currency "통화"
        tinyint is_success "성공 여부"
        TIMESTAMP paid_at "결제 일시"
        TIMESTAMP created_at "생성 일시"
    }

    subscription_schedules {
        varchar payment_id PK "예약 결제 ID"
        bigint subscription_id FK "구독 ID"
        TIMESTAMP schedule_at "예약 결제일"
        int amount_krw "예약 금액"
        enum status "예약 상태"
        TIMESTAMP created_at "생성 일시"
        TIMESTAMP cancelled_at "취소 일시"
        TIMESTAMP executed_at "실행 일시"
        varchar product_name "플랜명"
    }

```

### 흐름도

```
[React SPA] --axios--> [Express API] --MySQL--
     |                         |
     | PortOne Browser SDK     | PortOne Server SDK (결제 검증/스케줄)
     └------ PortOne ---------┘

Webhooks:
PortOne → /pw/portone → (verify) → DB 업데이트 → 토큰 지급/스케줄링

DB Event Scheduler:
ev_apply_pending_free 이벤트가 정기적으로 `subscriptions` 테이블에서
`cancel_at_period_end = 1` 또는 `pending_plan_name = 'FREE'` 대상자를 조회해
무료 플랜으로 일괄 전환합니다. PortOne 정책상 무료 전환 예약에 대한
웹훅이 제공되지 않아, DB 이벤트로 직접 처리합니다.
```

---


## 주요 기능
- 이메일/Google OAuth 로그인 및 세션 유지
- 구독 플랜 업그레이드,다운그레이드 및 다음 결제일 조정
- PortOne Billing Key 발급/삭제, 정기 결제 스케줄 생성,취소
- 결제 웹훅 처리 후 토큰 지급,차감 흐름

## 외부 API/라이브러리
- PortOne Browser/Server SDK: 빌링키 발급, 결제 검증,스케줄링
- Google OAuth: 소셜 로그인
- MySQL 8+: 구독/결제 데이터 저장 , 이벤트 스케쥴러로 구독 검증,스케줄링

