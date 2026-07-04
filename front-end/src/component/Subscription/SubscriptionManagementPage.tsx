import React from "react";
import { Subscription } from "./Main";
import "./SubscriptionManagementPage.scss";
import { PLAN_ITEMS } from "@BackEnd/src/all_Types";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Card from "./Card";

export default function SubscriptionManagementPage(props: {
  lv_Obj: Subscription;
}) {
  const lv_user = props.lv_Obj.pt_SubscriptionStore.user;
  const lv_sub = props.lv_Obj.pt_SubscriptionStore.subscription;
  const currentPeriodEnd = lv_sub?.current_period_end
    ? new Date(lv_sub.current_period_end)
    : null;

  return (
    <main className="sub-dashboard">
      <header className="sub-dashboard__hero">
        <div>
          <p className="eyebrow">Subscription Console</p>
          <h1>구독 결제 및 토큰 관리</h1>
          <p>
            플랜 변경, 정기결제 예약, 토큰 잔액을 한 화면에서 확인하고
            관리합니다.
          </p>
        </div>
        <div className="hero-stat">
          <span>보유 토큰</span>
          <strong>{lv_user ? lv_user.token_balance.toLocaleString() : 0}</strong>
        </div>
      </header>

      <section className="sub-dashboard__current">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Overview</p>
            <h2 className="title">현재 구독 정보</h2>
          </div>
        </div>

        <div className="table-div">
          <table className="current-table">
            <tbody>
              <tr>
                <th>이메일</th>
                <td>{lv_user?.email ?? "-"}</td>
              </tr>
              <tr>
                <th>현재 플랜</th>
                <td>
                  <span className="status-chip">{lv_sub?.plan_name ?? "-"}</span>
                </td>
              </tr>
              <tr>
                <th>다음 결제일</th>
                <td>
                  {lv_sub && (
                    <div className="date-control">
                      <DatePicker
                        selected={currentPeriodEnd}
                        onChange={(d) => {
                          if (window.confirm("다음 결제일을 변경하시겠습니까?")) {
                            if (d) lv_sub.current_period_end = d;
                            props.lv_Obj.pt_SubscriptionStore.periodChange();
                          }
                        }}
                        showTimeSelect
                        timeFormat="HH:mm:ss"
                        timeIntervals={1}
                        dateFormat="yyyy-MM-dd HH:mm:ss"
                        placeholderText="다음 결제일 선택"
                      />

                      <button
                        type="button"
                        className="btn__red"
                        onClick={() => {
                          if (
                            window.confirm(
                              "다음 결제일을 1분 뒤로 변경하시겠습니까?"
                            )
                          ) {
                            lv_sub.current_period_end = new Date(
                              Date.now() + 60 * 1000
                            );
                            props.lv_Obj.pt_SubscriptionStore.periodChange();
                          }
                        }}
                      >
                        1분 뒤
                      </button>
                    </div>
                  )}
                </td>
              </tr>
              <tr>
                <th>토큰 잔액</th>
                <td>{lv_user ? lv_user.token_balance.toLocaleString() : 0}</td>
              </tr>
            </tbody>
          </table>

          <table className="current-table">
            <tbody>
              {lv_sub && lv_sub.pending_plan_name && (
                <tr>
                  <th>다음 주기 적용 플랜</th>
                  <td>
                    <span className="status-chip status-chip--pending">
                      {lv_sub.pending_plan_name}
                    </span>
                  </td>
                </tr>
              )}

              {lv_user && <Card lv_Obj={props.lv_Obj} />}
            </tbody>
          </table>
        </div>
      </section>

      <section className="plan-upgrade">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Plans</p>
            <h2 className="title">플랜 선택</h2>
          </div>
        </div>

        <div className="plan-upgrade__cards">
          {Object.entries(PLAN_ITEMS).map((plan, index) => (
            <article key={plan[0]} className="card card--plus">
              <header className="card__header">
                <h3 className="card__name">{plan[0]}</h3>
                <p className="card__price">
                  <span className="card__amount">
                    {plan[1].price.toLocaleString()}
                  </span>
                  <span className="card__unit">KRW / 월</span>
                </p>
                <p className="card__desc">
                  {plan[1].token_grant.toLocaleString()} token
                </p>
                <button
                  className="card__cta"
                  disabled={lv_sub?.plan_name === plan[0]}
                  onClick={() => {
                    if (lv_user?.billing_key_status === "ACTIVE") {
                      return props.lv_Obj.pt_SubscriptionStore.change(index);
                    }
                    props.lv_Obj.pt_Payment
                      .im_issueBillingKey(lv_user?.email)
                      .then((res) => {
                        if (res) props.lv_Obj.pt_SubscriptionStore.change(index);
                      });
                  }}
                >
                  {lv_sub?.plan_name === plan[0]
                    ? "현재 이용 중"
                    : `${plan[0]} 이용하기`}
                </button>
              </header>
              <ul className="card__features">
                {plan[1].features.map((e) => (
                  <li key={e.label} className={e.disabled ? "disabled" : ""}>
                    {e.label} 기능 사용
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
