import React, { useState } from "react";
import { Login } from "@jsLib/class/Login";
import C_signUp_select_btns from "./C_login_sns_email";
import C_signUp from "./C_signUp";
import { Main } from "@jsLib/class/Main_class";
import { SignUp } from "@jsLib/class/SignUp";

declare global {
  interface Window {
    globalCallback_snsSignUP: (p_platform: "google") => void;
    globalCallback_login: () => void;
  }
}

class LoginComponentClass extends Main {
  private iv_signUp: SignUp;
  private iv_login: Login;

  public get pt_signUp(): SignUp {
    return this.iv_signUp;
  }

  public get pt_login(): Login {
    return this.iv_login;
  }

  constructor() {
    super();
    this.iv_signUp = new SignUp(this.im_forceRender.bind(this));
    this.iv_login = new Login(this.im_forceRender.bind(this));
  }
}

export default function LoginComponent() {
  const [lv_Obj] = useState(() => {
    return new LoginComponentClass();
  });

  lv_Obj.im_Prepare_Hooks(async () => {
    await lv_Obj.im_Session();
    window.globalCallback_snsSignUP = (p_platform: "google") => {
      lv_Obj.pt_MainData.signUp_modal = true;
      lv_Obj.pt_MainData.login_modal = false;
      lv_Obj.im_forceRender();
      setTimeout(() => {
        lv_Obj.pt_MainData.setTimeOut_open = true;
        lv_Obj.im_forceRender();
      }, 300);      
    };
    window.globalCallback_login = () => {
      window.location.reload();
    };
    lv_Obj.im_forceRender();
  });

  return (
    <div className="lqd-modal-inner">
      <div className="lqd-modal-head"></div>
      <div className="lqd-modal-content">
        <section
          className="lqd-section w-full min-h-100vh flex flex-col items-center transition-all bg-black bg-center"          
        >
          {lv_Obj.pt_MainData.signUp_modal ? (
            <>
              <C_signUp lv_signUp={lv_Obj.pt_signUp} />
              <div className="text-center">
                <a
                  style={{ fontSize: "14px", cursor: "pointer" }}
                  onClick={() => {
                    lv_Obj.pt_MainData.signUp_modal = false;
                    lv_Obj.im_forceRender();
                  }}
                  className="fs-9 fw-bold text-dark"
                >
                  로그인
                </a>
              </div>
            </>
          ) : (
            <>
              <Login_tag lv_login={lv_Obj.pt_login}></Login_tag>
              <div className="text-center">
                <a
                  style={{ fontSize: "14px", cursor: "pointer" }}
                  onClick={() => {
                    lv_Obj.pt_MainData.signUp_modal = true;
                    lv_Obj.im_forceRender();
                  }}
                  className="fs-9 fw-bold text-dark"
                >
                  계정 생성
                </a>
              </div>
            </>
          )}
        </section>
      </div>
      <div className="lqd-modal-foot"></div>
    </div>
  );
}

function Login_tag(props: { lv_login: Login }) {
  const lv_login = props.lv_login;
  return (
    <>
      <div
        className="container flex flex-col justify-center gap-40 p-10"
        style={{ marginTop: "100px" }}
      >
        <C_signUp_select_btns
          is_signUp={false}
          p_state={"login"}
        ></C_signUp_select_btns>
        <div className="position-relative" style={{ position: "relative" }}>
          <hr className="bg-body-secondary mt-5 mb-4" />
        </div>
        <div className="w-full text-center">
          <div className="ld-sf relative ld-sf--input-solid ld-sf--button-solid ld-sf--size-xs ld-sf--round  ld-sf--border-none ld-sf--button-show ld-sf--button-inline">
            <section
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1em",
              }}
            >
              <input
                onChange={(e) => {
                  lv_login.iv_email = e.target.value;
                  lv_login.im_forceRender();
                }}
                type="email"
                className="block w-full rounded-2 bg-white-10 text-white-70 text-15"
                name="email"
                value={lv_login.iv_email}
                placeholder="Enter your email address"
              />
              <button
                onClick={() => {
                  lv_login.im_loginCheck();
                }}
                type="submit"
                className="inline-flex items-center justify-center m-0 rounded-2 relative text-white bg-primary text-15"
              >
                <span className="submit-text">로그인</span>
                <span className="ld-sf-spinner rounded-full absolute overflow-hidden">
                  <span className="block lqd-overlay flex rounded-full">
                    Sending{" "}
                  </span>
                </span>
              </button>
            </section>
            <div className="ld_sf_response"></div>
          </div>
        </div>
      </div>
    </>
  );
}
