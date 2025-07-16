import React from "react";
import "./SubscriptionManagementPage.scss";

export default function SubscriptionManagementPage() {
  return (
    <div className="sub-dashboard">
      {/* 현재 구독 정보 */}
      <section className="sub-dashboard__current">
        <h2>현재 구독</h2>
        <table className="current-table">
          <tbody>
            <tr>
              <th>플랜</th>
              <td>PRO</td>
            </tr>
            <tr>
              <th>다음 결제일</th>
              <td>2025-08-01</td>
            </tr>
            <tr>
              <th>토큰 잔액</th>
              <td>610</td>
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
              <li>모든 것이 무료</li>
              <li>
                메시지, 파일 업로드, 고급 데이터 분석, 이미지 생성에 한도 증가
              </li>
              <li>표준 및 고급 음성 모드</li>
              <li>
                심층 리서치 및 여러 이성 모델(04-mini, o4-mini-high, o3),
                GPT-4.5 리서치 프리뷰에 액세스
              </li>
              <li>작업, 프로젝트를 생성, 사용하고 GPT를 맞춤 설정하세요</li>
              <li>Sora 영상 생성에 제한적 액세스</li>
              <li>새 기능 테스트 기회</li>
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
