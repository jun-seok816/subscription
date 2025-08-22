import React from "react";
import { Subscription } from "./Main";
import "./SubscriptionManagementPage.scss";
import { format } from "date-fns";
import { PLAN_ITEMS } from "@BackEnd/src/all_Types";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Card from "./Card";

export default function SubscriptionManagementPage(props: {
  lv_Obj: Subscription;
}) {
  const lv_user = props.lv_Obj.pt_SubscriptionStore.user;
  const lv_sub = props.lv_Obj.pt_SubscriptionStore.subscription;

  return (
    <div className="sub-dashboard">
      <section className="sub-dashboard__current">
        <h2 className="title">사용자 정보</h2>
        <div className="table-div">
          <table className="current-table">
            <tbody>
              <tr>
                <th>이메일</th>
                <td>{lv_user?.email}</td>
              </tr>
              <tr>
                <th>플랜</th>
                <td>{lv_sub?.plan_name}</td>
              </tr>
              <tr>
                <th>다음 결제일 변경</th>
                <td>
                  {lv_sub && (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <DatePicker
                        selected={lv_sub && new Date(lv_sub.current_period_end)}
                        onChange={(d) => {
                          if (
                            window.confirm("다음 결제일을 변경하시겠습니까?")
                          ) {
                            if (lv_sub && d) lv_sub.current_period_end = d;
                            props.lv_Obj.pt_SubscriptionStore.periodChange();
                          }
                        }}
                        showTimeSelect
                        timeFormat="HH:mm:ss"
                        timeIntervals={1} // 1분 간격
                        dateFormat="yyyy-MM-dd HH:mm:ss"
                        placeholderText="다음 결제일 변경"
                      />

                      <button
                        type="button"
                        className="btn__red"
                        onClick={() => {
                          if (
                            window.confirm("다음 결제일을 1분뒤로 변경하시겠습니까?")
                          ) {
                            const cur = new Date();
                            const next = new Date(cur.getTime() + 60 * 1000); // +1분
                            lv_sub.current_period_end = next;
                            props.lv_Obj.pt_SubscriptionStore.periodChange();
                          }
                        }}
                        style={{ padding: "6px 10px", cursor: "pointer" }}
                      >
                        1분뒤
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
                  <th>다음 결제일에 적용될 플랜</th>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>{lv_sub && lv_sub.pending_plan_name}</div>
                    </div>
                  </td>
                </tr>
              )}

              {lv_user && <Card lv_Obj={props.lv_Obj} />}
            </tbody>
          </table>
        </div>
      </section>

      {/* 플랜 카드 영역 */}
      <div className="plan-upgrade__cards">
        {Object.entries(PLAN_ITEMS).map((plan, index) => (
          <article key={plan[0]} className="card card--plus" onClick={() => {}}>
            <header className="card__header">
              <h3 className="card__name">{plan[0]}</h3>
              <p className="card__price">
                <span className="card__amount">
                  {plan[1].price.toLocaleString()}
                </span>
                <span className="card__unit">KRW/월</span>
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
                {`${plan[0]} 이용하기`}
              </button>
            </header>
            <ul className="card__features">
              {plan[1].features.map((e) => {
                const common = {
                  key: e.label,
                  className: `${e.disabled ? "disabled" : ""}`,
                };
                return <li {...common}>{e.label} 작업 엑세스</li>;
              })}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
