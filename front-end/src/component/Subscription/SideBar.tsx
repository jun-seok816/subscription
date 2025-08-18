import React, { useState } from "react";
import { PLAN_ITEMS } from "@BackEnd/src/all_Types";
import "./SideBar.scss";
import { Subscription } from "./Main";
import "bootstrap-icons/font/bootstrap-icons.css"
import { Main } from "@jsLib/class/Main_class";

export default function SideBar(props: { lv_Obj: Subscription }) {
  return (
    <aside className="sidebar" id="jueo34oiuhowd8">
      <div style={{ color: "white", marginBottom: "1em", marginLeft: "1em" }}>
        <h2>토큰 차감API</h2>
      </div>
      <div>
        <Labels lv_Obj={props.lv_Obj} />
      </div>
    </aside>
  );
}

function Labels(props: { lv_Obj: Subscription }) {
  const SECTIONS = props.lv_Obj.pt_SubscriptionStore.planMeta?.items ?? [];
  const ICONS: Record<string, string> = {
    "Image": "bi-image",
    "Image Editing": "bi-brush",
    "Video": "bi-camera-video",
    "Document": "bi-file-earmark-text",
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
            <span onClick={()=>{
              if(e.disabled)return Main.im_toast("access denied",'warn');
              props.lv_Obj.pt_SubscriptionStore.callFeature(e.label);
            }} {...common}>
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
