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
├── Dump20250821 (1).sql  # DB 스키마 및 샘플 데이터
└── README.md
```

---

## 실행 방법

### 1. MySQL 초기화

```bash
mysql -u root -p
CREATE DATABASE subscription CHARACTER SET utf8mb4;
EXIT;

mysql -u root -p subscription < "Dump20250821 (1).sql"
```

트리거가 포함되어 있어 사용자 행 생성 시 자동으로 기본 구독 레코드가 생성됩니다.

### 2. 백엔드

```bash
cd back-end
npm install
cp .env.example .env   # 없으면 직접 생성
# .env 에 DB/PortOne 환경 변수 입력

npm run start          # ts-node + nodemon (http://localhost:3002)
```

### 3. 프런트엔드

```bash
cd front-end
npm install
npm run build
```

---

## ERD / 아키텍처

### 데이터 모델

```
users (id PK)
 ├─ email
 ├─ token_balance
 ├─ portone_customer_id
 ├─ portone_billing_key
 ├─ billing_key_status
 └─ card_brand / card_last4 ...

subscriptions (id PK)
 ├─ user_id FK → users.id
 ├─ plan_name / billing_cycle
 ├─ price_cents / token_grant
 ├─ current_period_end
 ├─ pending_plan_name / pending_billing_cycle
 └─ cancel_at_period_end

subscription_schedules (payment_id PK)
 ├─ subscription_id FK → subscriptions.id
 ├─ schedule_at / executed_at / cancelled_at
 ├─ amount_krw
 └─ status / product_name

payments (payment_id UNIQUE)
 ├─ user_id FK → users.id
 ├─ subscription_id FK → subscriptions.id
 ├─ amount_krw / currency
 ├─ order_name / is_success
 └─ paid_at / created_at
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
