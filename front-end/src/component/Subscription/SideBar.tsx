import React, { useState } from "react";
import { useLocation, Link, To, NavLink, useNavigate } from "react-router-dom";
import "./SideBar.scss";


type NavItem = {
  label: string;
  icon: string; // webp 파일 경로
  to: string;
  badge?: string; // 예: 'Dev'
  disabled?: boolean; // 비활성(회색) 처리
};

// 섹션별 아이템 배열
const SECTIONS: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { label: "Home", icon: "/assets/images/icons/home.webp", to: "#" },
      {
        label: "Search",
        icon: "/assets/images/icons/search.webp",
        to: "/clip_seek/clip",
      },
      {
        label: "Mypage",
        icon: "/assets/images/icons/folder.webp",
        to: "/BillingSettings",
      },
    ],
  },
  {
    title: "AI Translation",
    items: [
      {
        label: "Image",
        icon: "/assets/images/icons/image.webp",
        to: "/tooniz/createProject",
      },
      {
        label: "Image Editing",
        icon: "/assets/images/icons/pen.webp",
        to: "/tooniz/dashboard",
      },
      {
        label: "Video",
        icon: "/assets/images/icons/video.webp",
        to: "/clip_seek/dashboard",
      },
      {
        label: "Document",
        icon: "/assets/images/icons/file.webp",
        to: "#",
        disabled: true,
        badge: "Dev",
      },
      {
        label: "Custom Model",
        icon: "/assets/images/icons/x.webp",
        to: "#",
        disabled: true,
      },
      {
        label: "All Tools Video",
        icon: "/assets/images/icons/apps.webp",
        to: "/tools/video",
        disabled: true,
      },
    ],
  },
];

export default function SideBar() {
  
  return (
    <aside className="sidebar" id="jueo34oiuhowd8">
      <div>        
        <Labels />
      </div>      
    </aside>
  );
}

function Labels() {
  const { pathname } = useLocation();

  return (
    <div className="nptubnbowbpeih27">
      {SECTIONS.map(({ title, items }) => (
        <nav key={title ?? Math.random()} className="sidebar__section">
          {title && <span className="sidebar__title">{title}</span>}

          {items.map(({ label, icon, to, badge, disabled }) => {
            const isActive = pathname === to;
            const Comp = disabled ? "span" : Link;

            const common = {
              key: label,
              className: `sidebar__item ${isActive ? "is-active" : ""} ${
                disabled ? "is-disabled" : ""
              }`,
            };

            return disabled ? (
              <span {...common}>
                <img src={icon} alt="" className="sidebar__icon" />
                <span className="sidebar__label">{label}</span>
                {badge ? <div className="sidebar__badge">{badge}</div> : <></>}
              </span>
            ) : (
              <Link {...common} to={to as To}>
                <img src={icon} alt="" className="sidebar__icon" />
                <span className="sidebar__label">{label}</span>
                {badge ? <div className="sidebar__badge">{badge}</div> : <></>}
              </Link>
            );
          })}
        </nav>
      ))}
    </div>
  );
}

