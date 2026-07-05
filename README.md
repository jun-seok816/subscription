# 구독 결제 및 토큰 관리 시스템

사용자의 구독 플랜에 따라 정기결제와 토큰 지급/차감을 관리하는 프로젝트입니다.  
프론트엔드는 React와 TypeScript로 구현하고, 백엔드는 Express와 MySQL로 회원·구독·토큰 상태를 관리했습니다. 로그인은 Google OAuth, 결제수단 등록과 정기결제는 PortOne 결제 API를 연동해 처리했습니다.

---

## 시퀀스 다이어그램

```mermaid
sequenceDiagram
    autonumber
    actor User as 사용자
    participant FE as Front-end<br/>(React)
    participant API as Back-end<br/>(Express)
    participant Google as Social Login<br/>(Google OAuth)
    participant DB as Database<br/>(MySQL)
    participant PortOne as Payment<br/>(PortOne)

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

## 시연 영상



<img width="1152" height="648" alt="download (1)" src="https://github.com/user-attachments/assets/ace48375-985e-4048-a847-d6d1b25d91a3" />


## 시연 사이트

http://221.154.120.167:3002/

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

**프런트엔드**

![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=111111)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=ffffff)
![Webpack](https://img.shields.io/badge/Webpack-8DD6F9?style=for-the-badge&logo=webpack&logoColor=111111)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=reactrouter&logoColor=ffffff)
![React Bootstrap](https://img.shields.io/badge/React_Bootstrap-7952B3?style=for-the-badge&logo=bootstrap&logoColor=ffffff)

**백엔드**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=ffffff)
![Express](https://img.shields.io/badge/Express-111111?style=for-the-badge&logo=express&logoColor=ffffff)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=ffffff)
![Axios](https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=ffffff)
![PortOne](https://img.shields.io/badge/PortOne-111827?style=for-the-badge)

**데이터베이스**

![MySQL](https://img.shields.io/badge/MySQL_8-4479A1?style=for-the-badge&logo=mysql&logoColor=ffffff)

**기타**

![dotenv](https://img.shields.io/badge/dotenv-ECD53F?style=for-the-badge&logo=dotenv&logoColor=111111)
![UUID](https://img.shields.io/badge/UUID-4B5563?style=for-the-badge)
![Lodash](https://img.shields.io/badge/Lodash-3492FF?style=for-the-badge&logo=lodash&logoColor=ffffff)

---

## 외부 연동 및 주요 인프라 기능

- **PortOne Payment Gateway**: 빌링키 발급, 결제 검증, 정기결제 스케줄링
- **소셜 로그인 (Google OAuth)**: Google 계정 기반 로그인
- **MySQL Event Scheduler**: 구독 상태 검증 및 무료 플랜 전환 처리


