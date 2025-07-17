import React, { useState } from "react";
import { useLocation, Link, To, NavLink, useNavigate } from "react-router-dom";
import {PLAN_ITEMS} from "@BackEnd/src/all_Types";
import "./SideBar.scss";
import { Subscription } from "./Main";

export default function SideBar(props:{lv_Obj:Subscription}) {
  
  return (
    <aside className="sidebar" id="jueo34oiuhowd8">
      <div style={{"color":"white","marginBottom":"1em","marginLeft":"1em"}}>
        <h2>토큰 차감API</h2>
      </div>
      <div>        
        <Labels lv_Obj={props.lv_Obj}/>
      </div>      
    </aside>
  );
}

function Labels(props:{lv_Obj:Subscription}) {  
  const SECTIONS = PLAN_ITEMS['BASIC'];
  return (
    <div className="nptubnbowbpeih27">
      <nav  className="sidebar__section">  
      <span className="sidebar__title">토큰 사용하기</span>
      {SECTIONS.map(e=>{                
        const common = {
          key: e.label,
          className: `sidebar__item ${
            e.disabled ? "is-disabled" : ""
          }`,
        };
        return (
          <span {...common}>
            <img src={`/assets/images/${e.label}`} alt="" className="sidebar__icon" />
            <span className="sidebar__label">{e.label}</span>
            <div className="sidebar__badge">{e.badge}</div> 
          </span>
        )
      })}
   
      </nav>
    </div>
  );
}

