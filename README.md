# 구독 결제 및 토큰 관리 시스템

사용자의 구독 플랜에 따라 정기결제와 토큰 지급/차감을 관리하는 풀스택 프로젝트입니다.  
이메일·Google OAuth 로그인, 플랜 변경, 결제수단 등록, 정기결제 예약, 웹훅 기반 결제 처리 흐름을 한 프로젝트에서 확인할 수 있습니다.

---

## 시퀀스 다이어그램

```mermaid
sequenceDiagram
    autonumber
    actor User as 사용자
    participant FE as React SPA
    participant API as Express API
    participant Google as Google OAuth
    participant DB as MySQL
    participant PortOne as PortOne

    rect rgb(245, 248, 255)
        Note over User,DB: 1. 로그인 및 구독 상태 조회
        User->>FE: Google 로그인
        FE->>Google: OAuth 인증
        Google-->>FE: access_token 반환
        FE->>API: access_token 전달
        API->>Google: 사용자 이메일 검증
        API->>DB: 사용자/구독 정보 조회 또는 생성
        API-->>FE: 세션과 현재 구독 상태 반환
    end

    rect rgb(250, 250, 240)
        Note over User,PortOne: 2. 결제수단 등록
        User->>FE: 결제수단 등록 요청
        FE->>PortOne: 빌링키 발급 요청
        PortOne-->>FE: billingKey 반환
        FE->>API: billingKey 저장 요청
        API->>PortOne: billingKey 유효성 검증
        API->>DB: 고객 ID와 billingKey 저장
    end

    rect rgb(245, 255, 248)
        Note over User,PortOne: 3. 플랜 변경과 첫 결제
        User->>FE: 플랜 업그레이드/다운그레이드
        FE->>API: 플랜 변경 요청
        API->>DB: 구독 변경 내용 잠금 및 계산
        API->>PortOne: 빌링키로 즉시 결제
        PortOne-->>API: 결제 결과 반환
        API->>DB: 결제 이력, 구독 상태, 토큰 반영
        API->>PortOne: 다음 정기결제 예약
        API->>DB: 예약 결제 정보 저장
        API-->>FE: 최신 구독 상태 반환
    end

    rect rgb(255, 248, 245)
        Note over PortOne,DB: 4. 예약결제 웹훅 처리
        PortOne-->>API: 결제 성공/실패 웹훅
        API->>PortOne: 결제 상세 조회 및 검증
        alt 결제 성공
            API->>DB: 예약 EXECUTED 처리, 결제 이력 저장
            API->>DB: 다음 주기 확정 및 토큰 지급
            API->>PortOne: 다음 정기결제 예약
            API->>DB: 새 예약 정보 저장
        else 결제 실패
            API->>DB: 예약 CANCELLED 처리, 실패 이력 저장
        end
        API-->>PortOne: 처리 결과 응답
    end

    rect rgb(248, 245, 255)
        Note over User,DB: 5. 토큰 기반 기능 사용
        User->>FE: 토큰 차감 기능 실행
        FE->>API: 기능 API 요청
        API->>DB: 플랜 권한 확인 및 토큰 차감
        API-->>FE: 실행 결과 반환
    end
```

---

## ERD

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

---

## 기술 스택

- **프런트엔드**: React 18, TypeScript, webpack, react-router, react-bootstrap, react-toastify
- **백엔드**: Node.js(Express), TypeScript, mysql2, express-session, PortOne Server SDK, axios
- **데이터베이스**: MySQL 8+
- **기타**: dotenv, uuid, lodash/throttle

---

## 외부 API/라이브러리

- **PortOne Browser/Server SDK**: 빌링키 발급, 결제 검증, 정기결제 스케줄링
- **Google OAuth**: 소셜 로그인
- **MySQL Event Scheduler**: 구독 상태 검증 및 무료 플랜 전환 처리
