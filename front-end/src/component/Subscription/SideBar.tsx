import React from "react";
import "./SideBar.scss";
import { Subscription } from "./Main";
import "bootstrap-icons/font/bootstrap-icons.css";
import { Main } from "@jsLib/class/Main_class";

export default function SideBar(props: { lv_Obj: Subscription }) {
  return (
    <aside className="sidebar" id="jueo34oiuhowd8">
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark">S</div>
        <div>
          <h2>구독 관리</h2>
          <p>Billing & Token</p>
        </div>
      </div>

      <Labels lv_Obj={props.lv_Obj} />

      <nav className="sidebar__section">
        <span className="sidebar__title">결제 관리</span>
        <button
          type="button"
          className="sidebar__item"
          onClick={() => {
            props.lv_Obj.iv_schedule = true;
            props.lv_Obj.im_forceRender();
          }}
        >
          <i className="sidebar__icon bi bi-calendar2-check" />
          <span className="sidebar__label">구독 스케줄</span>
          <span className="sidebar__badge">
            {props.lv_Obj.pt_SubscriptionStore.schedule?.length ?? 0}
          </span>
        </button>
        <button
          type="button"
          className="sidebar__item"
          onClick={() => {
            props.lv_Obj.iv_payments = true;
            props.lv_Obj.im_forceRender();
          }}
        >
          <i className="sidebar__icon bi bi-receipt" />
          <span className="sidebar__label">청구 내역</span>
          <span className="sidebar__badge">
            {props.lv_Obj.pt_SubscriptionStore.payments?.length ?? 0}
          </span>
        </button>
      </nav>

      <nav className="sidebar__section sidebar__section--bottom">
        <span className="sidebar__title">Project</span>
        <a
          className="sidebar__item sidebar__external-link"
          href="https://github.com/jun-seok816/subscription"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub 저장소 열기"
        >
          <i className="sidebar__icon bi bi-github" />
          <span className="sidebar__label">GitHub</span>
          <i className="bi bi-box-arrow-up-right sidebar__external-icon" />
        </a>
      </nav>
    </aside>
  );
}

function Labels(props: { lv_Obj: Subscription }) {
  const SECTIONS = props.lv_Obj.pt_SubscriptionStore.planMeta?.items ?? [];
  const ICONS: Record<string, string> = {
    Image: "bi-image",
    "Image Editing": "bi-brush",
    Video: "bi-camera-video",
    Document: "bi-file-earmark-text",
    "Custom Model": "bi-gear",
    "Video Editing": "bi-scissors",
  };

  return (
    <nav className="sidebar__section">
      <span className="sidebar__title">토큰 사용</span>
      {SECTIONS.map((e) => {
        const iconClass = ICONS[e.label] || "bi-question-circle";

        return (
          <button
            type="button"
            key={e.label}
            className={`sidebar__item ${e.disabled ? "is-disabled" : ""}`}
            onClick={() => {
              if (e.disabled) return Main.im_toast("access denied", "warn");
              props.lv_Obj.pt_SubscriptionStore.callFeature(e.label);
            }}
          >
            <i className={`sidebar__icon bi ${iconClass}`} />
            <span className="sidebar__label">{e.label}</span>
            <span className="sidebar__badge">{e.badge}</span>
          </button>
        );
      })}
    </nav>
  );
}
