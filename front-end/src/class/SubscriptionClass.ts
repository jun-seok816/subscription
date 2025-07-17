import axios from 'axios';
import {
  SubscriptionRow,
  UserRow,
  PlanName,
  PlanMeta,
  PLAN_ITEMS,
} from '@BackEnd/src/all_Types';

interface StoreState {
  user: UserRow | null;
  subscription: SubscriptionRow | null;
  /** PLAN_ITEMS + 청구 정보가 병합된 런타임 메타 */
  planMeta: PlanMeta | null;
}

export class SubscriptionStore{

  private state: StoreState = {
    user: null,
    subscription: null,
    planMeta: null,
  };

  private im_forceRender:()=>void;

  constructor(im_forceRender:()=>void) {    
    this.im_forceRender = im_forceRender;
  }

  /* ----------------- 공개 Getter ----------------- */
  get user() {
    return this.state.user;
  }

  get subscription() {
    return this.state.subscription;
  }

  /** 현재 플랜의 메타(가격·토큰·기능 목록) */
  get planMeta(): PlanMeta | null {
    return this.state.planMeta;
  }

  /** 현재 플랜 이름 편의 접근자 */
  get planName(): PlanName | null {
    return this.state.subscription?.plan_name ?? null;
  }

  /** 로그인 후 한 번 호출해 데이터를 메모리에 로드  */
  public async load(): Promise<void> {
    // ① 사용자 정보
    const userRes = await axios.get<UserRow>('/api/me');
    // ② 구독 정보 (1행)
    const subRes = await axios.get<SubscriptionRow>('/api/me/subscription');

    const user = userRes.data;
    const sub = subRes.data;

    // ③ PLAN_ITEMS 와 병합
    const planMeta: PlanMeta = {
      plan_name: sub.plan_name,
      billing_cycle: sub.billing_cycle,
      price_cents: sub.price_cents,
      token_grant: sub.token_grant,
      items: PLAN_ITEMS[sub.plan_name],
    };

    // ④ 상태 저장
    this.state = { user, subscription: sub, planMeta };

    this.im_forceRender();
  }

  /** 토큰 잔액 갱신용 메서드(예: 결제/차감 후) */
  public updateTokenBalance(delta: number) {
    if (!this.state.user) return;
    this.state.user.token_balance += delta;
  }

  /** 플랜 변경 후 구독 행만 갱신 */
  public patchSubscription(partial: Partial<SubscriptionRow>) {
    if (!this.state.subscription) return;
    this.state.subscription = { ...this.state.subscription, ...partial };
    // price_cents · token_grant 값이 바뀌었다면 planMeta도 갱신
    const { price_cents, token_grant, plan_name } = this.state.subscription;
    this.state.planMeta = {
      plan_name,
      billing_cycle: this.state.subscription.billing_cycle,
      price_cents,
      token_grant,
      items: PLAN_ITEMS[plan_name],
    };
  }
}

