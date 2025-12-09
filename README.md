# 구독/결제 데모 프로젝트

이메일·Google OAuth 로그인과 구독 플랜 변경, PortOne 빌링키/정기결제 흐름을 한 번에 확인할 수 있는 풀스택 샘플입니다.

## 폴더 구조
- `front-end` : React + TypeScript SPA (로그인·플랜 변경 UI)
- `back-end` : Express + TypeScript API 서버, PortOne/DB 연동
- `Dump20250821 (1).sql` : MySQL 스키마 및 샘플 데이터

## 빠른 시작
1) DB 준비  
```bash
mysql -u root -p -e "CREATE DATABASE subscription CHARACTER SET utf8mb4;"
mysql -u root -p subscription < "Dump20250821 (1).sql"
```
2) 백엔드  
```bash
cd back-end
npm install            # npm version 20.19.5
npm run start          # http://localhost:3002
```
3) 프런트엔드  
```bash
cd front-end
npm install
npm run build
```

## 주요 기능
- 이메일/Google OAuth 로그인 및 세션 유지
- 구독 플랜 업그레이드,다운그레이드 및 다음 결제일 조정
- PortOne Billing Key 발급/삭제, 정기 결제 스케줄 생성,취소
- 결제 웹훅 처리 후 토큰 지급,차감 흐름

## 외부 API/라이브러리
- PortOne Browser/Server SDK: 빌링키 발급, 결제 검증,스케줄링
- Google OAuth: 소셜 로그인
- MySQL 8+: 구독/결제 데이터 저장 , 이벤트 스케쥴러로 구독 검증,스케줄링
