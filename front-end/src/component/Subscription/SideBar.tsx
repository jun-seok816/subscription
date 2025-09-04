import React, { useState } from "react";
import "./SideBar.scss";
import { Subscription } from "./Main";
import "bootstrap-icons/font/bootstrap-icons.css";
import { Main } from "@jsLib/class/Main_class";

export default function SideBar(props: { lv_Obj: Subscription }) {
  const lv_user = props.lv_Obj.pt_SubscriptionStore.user;
  const lv_login = props.lv_Obj.pt_login;
  return (
    <aside className="sidebar" id="jueo34oiuhowd8">
      <div style={{ color: "white", marginBottom: "1em", marginLeft: "1em" }}>
        <h2>토큰 차감API</h2>
      </div>
      <div>
        <Labels lv_Obj={props.lv_Obj} />
      </div>
      <div>
        <div className="nptubnbowbpeih27">
          <nav className="sidebar__section">
            <span className="sidebar__title">결제 기록</span>
            <span
              className="sidebar__item"
              onClick={() => {
                props.lv_Obj.iv_schedule = true;
                props.lv_Obj.im_forceRender();
              }}
            >
              <span className="sidebar__label">구독 스케쥴</span>
              <div className="sidebar__badge">
                +{props.lv_Obj.pt_SubscriptionStore.schedule?.length}
              </div>
            </span>
            <span
              className="sidebar__item"
              onClick={() => {
                props.lv_Obj.iv_payments = true;
                props.lv_Obj.im_forceRender();
              }}
            >
              <span className="sidebar__label">청구서 내역</span>
              <div className="sidebar__badge">
                +{props.lv_Obj.pt_SubscriptionStore.payments?.length}
              </div>
            </span>
          </nav>
        </div>

        <nav className="sidebar__section">
          <span className="sidebar__title">계정</span>

          <button
            type="button"
            className="sidebar__item sidebar__item--danger"
            onClick={()=>{
              lv_login.im_Logout();
            }}
            disabled={lv_user === null}            
          >
            <span className="sidebar__label">
              {lv_user===null ? "로그아웃 중..." : "로그아웃"}
            </span>
          </button>
        </nav>
      </div>
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
    <div className="nptubnbowbpeih27">
      <nav className="sidebar__section">
        <span className="sidebar__title">토큰 사용하기</span>
        {SECTIONS.map((e) => {
          const common = {
            key: e.label,
            className: `sidebar__item ${e.disabled ? "is-disabled" : ""}`,
          };
          // 매핑된 아이콘이 없으면 bi-question-circle
          const iconClass = ICONS[e.label] || "bi-question-circle";
          return (
            <span
              onClick={() => {
                if (e.disabled) return Main.im_toast("access denied", "warn");
                props.lv_Obj.pt_SubscriptionStore.callFeature(e.label);
              }}
              {...common}
            >
              <i className={`sidebar__icon bi ${iconClass}`} />
              <span className="sidebar__label">{e.label}</span>
              <div className="sidebar__badge">{e.badge}</div>
            </span>
          );
        })}
      </nav>
    </div>
  );
}
