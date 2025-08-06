import axios, { AxiosError } from "axios";
import {
  SubscriptionRow,
  UserRow,
  PlanName,
  PlanMeta,
  PLAN_ITEMS,
} from "@BackEnd/src/all_Types";
import { Main } from "./Main_class";
import { ToastContainer, toast } from "react-toastify";

interface StoreState {
  user: UserRow | null;
  subscription: SubscriptionRow | null;
  /** PLAN_ITEMS + 청구 정보가 병합된 런타임 메타 */
  planMeta: PlanMeta | null;
}

interface ApiErrorPayload {
  err: boolean;
  msg: string;
}

export class SubscriptionStore {
  private state: StoreState = {
    user: null,
    subscription: null,
    planMeta: null,
  };

  private im_forceRender: () => void;

  constructor(im_forceRender: () => void) {
    this.im_forceRender = im_forceRender;
  }

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
    try {
      // 사용자 정보
      const userRes = await axios.post<UserRow>("/subscription/me");
      // 구독 정보 (1행)
      const subRes = await axios.post<SubscriptionRow>("/subscription/load");

      const user = userRes.data;
      const sub = subRes.data;

      // ③ PLAN_ITEMS 와 병합
      const planMeta: PlanMeta = {
        plan_name: sub.plan_name,
        billing_cycle: sub.billing_cycle,
        price_cents: sub.price_cents,
        token_grant: sub.token_grant,
        items: PLAN_ITEMS[sub.plan_name].features,
      };

      // ④ 상태 저장
      this.state = { user, subscription: sub, planMeta };

      this.im_forceRender();
    } catch (e) {
      if (axios.isAxiosError(e) && e.response) {
        const { err, msg } = e.response.data;
        console.error("API Error:", msg); // 👉 에러 메시지 사용
        Main.im_toast(msg, "error");
      } else {
        console.error(e);
        Main.im_toast("네트워크 오류가 발생했습니다.", "error");
      }
    }
  }

  public async change(plan_name: number): Promise<void> {
    try {
      const subRes = await axios.post<SubscriptionRow>(
        "/subscription/planChange",
        { plan_name }
      );
      const userRes = await axios.post<UserRow>("/subscription/me");
      const sub = subRes.data;
      const user = userRes.data;
      // ③ PLAN_ITEMS 와 병합
      const planMeta: PlanMeta = {
        plan_name: sub.plan_name,
        billing_cycle: sub.billing_cycle,
        price_cents: sub.price_cents,
        token_grant: sub.token_grant,
        items: PLAN_ITEMS[sub.plan_name].features,
      };

      // ④ 상태 저장
      this.state = { user, subscription: sub, planMeta };

      this.im_forceRender();
    } catch (e) {
      if (axios.isAxiosError(e) && e.response) {
        const { err, msg } = e.response.data;
        Main.im_toast(msg, "error");
      } else {
        console.error(e);
        Main.im_toast("네트워크 오류가 발생했습니다.", "error");
      }
    }
  }

  public async rollNext(force = false): Promise<void> {
    try {
      const subPromise = axios.post<SubscriptionRow>(
        "/subscription/nextPeriod",
        { force }
      );

      toast.promise(subPromise, {
        pending: "다음 주기로 이동 중…",
        success: "새 구독 주기가 시작됐습니다!",
        error: {
          render({ data }) {
            const err = (data as AxiosError<ApiErrorPayload>).response?.data;
            return err?.msg ?? "주기 이동 실패";
          },
        },
      });

      const subRes = await subPromise; // 롤오버된 구독 행
      const userRes = await axios.post<UserRow>("/subscription/me");

      const planMeta: PlanMeta = {
        plan_name: subRes.data.plan_name,
        billing_cycle: subRes.data.billing_cycle,
        price_cents: subRes.data.price_cents,
        token_grant: subRes.data.token_grant,
        items: PLAN_ITEMS[subRes.data.plan_name].features,
      };

      this.state = { user: userRes.data, subscription: subRes.data, planMeta };
      this.im_forceRender();
    } catch (e) {
      console.error(e);      
    }
  }

  /** 토큰 잔액 갱신용 메서드(예: 결제/차감 후) */
  public updateTokenBalance(delta: number) {
    if (!this.state.user) return;
    this.state.user.token_balance += delta;
  }
}
