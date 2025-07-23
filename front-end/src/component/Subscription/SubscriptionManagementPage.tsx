import React from "react";
import { Subscription } from "./Main";
import "./SubscriptionManagementPage.scss";

export default function SubscriptionManagementPage(props:{lv_Obj:Subscription}) {
  const lv_user = props.lv_Obj.pt_SubscriptionStore.user;
  const lv_sub = props.lv_Obj.pt_SubscriptionStore.subscription;
  return (
    <div className="sub-dashboard">      
      <section className="sub-dashboard__current">
        <h2>사용자 정보</h2>
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
              <th>다음 결제일</th>
              <td>{}</td>
            </tr>
            <tr>
              <th>토큰 잔액</th>
              <td>{lv_user?.token_balance}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 플랜 카드 영역 */}
      <div className="plan-upgrade__cards">
        {["FREE", "BASIC", "PRO"].map((plan) => (
          <article key={plan} className="card card--plus" onClick={() => {}}>
            <header className="card__header">
              <h3 className="card__name">{plan}</h3>
              <p className="card__price">
                <span className="card__currency">원</span>
                <span className="card__amount">0</span>

                <span className="card__unit">KRW/월</span>
              </p>
              <p className="card__desc">
                더 넉넉한 액세스로 생산성과 창의성을 끌어올리세요
              </p>
              <button className="card__cta" disabled={false}>
                {`${plan} 이용하기`}
              </button>
            </header>
            <ul className="card__features">
              <li>Image 작업 엑세스</li>
              <li>Image Editing 작업 엑세스</li>
              <li>Video 작업 엑세스</li>
              <li>Document 작업 엑세스</li>
              <li>Custom Model 작업 엑세스</li>
              <li>Video Editing 작업 엑세스</li>              
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
