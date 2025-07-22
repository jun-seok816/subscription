import React, { useState } from "react";
import "./C_login.scss";
import { SignUp } from "@jsLib/class/SignUp";
import { Login } from "@jsLib/class/Login";
import C_signUp_select_btns from "./C_login_sns_email";

export default function SignUpComponent(props: { lv_signUp: SignUp }) {
  return (
    <>
      <div
        className="container flex flex-col justify-center gap-40 p-10"
        style={{ marginTop: "100px" }}
      >
        <C_signUp_select_btns
          is_signUp={true}
          p_state={"sign_up"}
        ></C_signUp_select_btns>
        <div className="w-full text-center">
          <div className="ld-sf relative ld-sf--input-solid ld-sf--button-solid ld-sf--size-xs ld-sf--round  ld-sf--border-none ld-sf--button-show ld-sf--button-inline">
            <section
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1em",
              }}
            >
              <C_email lv_su={props.lv_signUp}></C_email>
              <button
                onClick={() => {
                  props.lv_signUp.im_submit();
                }}
                type="submit"
                className="w-full inline-flex items-center justify-center m-0 rounded-2 relative text-white bg-primary text-15"
              >
                계정 생성
              </button>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

function C_email(props: { lv_su: SignUp }) {  
  const lv_su = props.lv_su.pt_data;

  return (
    <div className="d-flex flex-column gap-1">
      <div className="text-start w-full">
        <label className="form-label nbpwiefbssvwoefwefsdf" htmlFor="email">
          Email address
          {!lv_su.user_email.check && lv_su.user_email.text.length !== 0 ? (
            <p className="t-danger">{lv_su.user_email.text}</p>
          ) : (
            <></>
          )}
          {lv_su.user_email.check && lv_su.user_email.text.length !== 0 ? (
            <p className="t-success">{lv_su.user_email.text}</p>
          ) : (
            <></>
          )}
        </label>
        <div className="form-icon-container">
          <input
            id="email"
            type="email"
            className="block w-full rounded-2 bg-white-10 text-white-70 text-15"
            placeholder="name@example.com"            
            value={props.lv_su.pt_data.user_email.value}
            onChange={(e) => {
              props.lv_su.pt_data.user_email.value = e.target.value;
              props.lv_su.im_forceRender();
            }}
            onBlur={(e) => {
              if (e.target.value === "") {
                props.lv_su.pt_data.user_email.text = "이메일을 입력해 주세요";
                props.lv_su.pt_data.user_email.check = false;
                props.lv_su.im_forceRender();
              } else if (!Login.sf_emailCheck(e.target.value)) {
                props.lv_su.pt_data.user_email.text =
                  "올바른 이메일 형식이 아닙니다";
                props.lv_su.pt_data.user_email.check = false;
                props.lv_su.im_forceRender();
              } else {
                props.lv_su.im_emailCheck();
              }
            }}
          />
          <span className="fas fa-user text-body fs-9 form-icon"></span>
        </div>
      </div>
    </div>
  );
}

