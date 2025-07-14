export interface SubscriptionRow {
  id: number; // PK
  user_id: number; // 유저 ID(FK)
  plan_name: "FREE" | "BASIC" | "PRO"; // 요금제 이름
  billing_cycle: "MONTHLY" | "YEARLY"; // 청구 주기
  price_cents: number; // 실제 청구 금액(cent 단위)
  token_grant: number; // 주기별 지급 토큰
  current_period_end: Date; // 현재 결제 주기 종료 시점
  pending_plan_name: "FREE" | "BASIC" | "PRO" | null; // 예약 플랜(다운그레이드 등)
  pending_billing_cycle: "MONTHLY" | "YEARLY" | null; // 예약 주기
  cancel_at_period_end: 0 | 1; // 주기 종료 후 해지 여부
  updated_at: Date; // 마지막 갱신 시간
}

export interface UserRow {
  id: number;
  email: string;
  token_balance: number;
  created_at: Date;
}
