export interface SubscriptionRow {
  id: number; // PK
  user_id: number; // 유저 ID(FK)
  plan_name: PlanName; // 요금제 이름
  billing_cycle: "MONTHLY" | "YEARLY"; // 청구 주기
  price_cents: number; // 실제 청구 금액(cent 단위)
  token_grant: number; // 주기별 지급 토큰
  current_period_end: Date; // 현재 결제 주기 종료 시점
  pending_plan_name: PlanName | null; // 예약 플랜(다운그레이드 등)
  pending_billing_cycle: "MONTHLY" | "YEARLY" | null; // 예약 주기
  cancel_at_period_end: 0 | 1; // 주기 종료 후 해지 여부
  updated_at: Date; // 마지막 갱신 시간
}

export type PlanName = "FREE" | "BASIC" | "PRO";

export interface FeatureItem {
  label: string;
  /** 사용 시 차감 토큰(문자 그대로 '-10' 형식) */
  badge: string;
  /** 플랜에서 비활성화 여부 */
  disabled: boolean;
}

export type PlanMeta = Pick<
  SubscriptionRow,
  "plan_name" | "billing_cycle" | "price_cents" | "token_grant"
> & {
  items: FeatureItem[];
};

export const PLAN_ITEMS: Record<PlanName, FeatureItem[]> = {
  FREE: [
    { label: "Image", badge: "-10", disabled: false },
    { label: "Image Editing", badge: "-20", disabled: true },
    { label: "Video", badge: "-25", disabled: true },
    { label: "Document", badge: "-30", disabled: true },
    { label: "Custom Model", badge: "-35", disabled: true },
    { label: "Video Editing", badge: "-50", disabled: true },
  ],

  BASIC: [
    { label: "Image", badge: "-10", disabled: false },
    { label: "Image Editing", badge: "-20", disabled: false },
    { label: "Video", badge: "-25", disabled: true },
    { label: "Document", badge: "-30", disabled: true },
    { label: "Custom Model", badge: "-35", disabled: true },
    { label: "Video Editing", badge: "-50", disabled: true },
  ],

  PRO: [
    { label: "Image", badge: "-10", disabled: false },
    { label: "Image Editing", badge: "-20", disabled: false },
    { label: "Video", badge: "-25", disabled: false },
    { label: "Document", badge: "-30", disabled: false },
    { label: "Custom Model", badge: "-35", disabled: false },
    { label: "Video Editing", badge: "-50", disabled: false },
  ],
};

export interface UserRow {
  id: number;
  email: string;
  token_balance: number;
  created_at: Date;
}
