import React, { useState } from "react";
import { Login } from "@jsLib/class/Login";
import C_signUp_select_btns from "./C_login_sns_email";
import './C_login.scss';
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
    <div id="signUp_modal">
      <Login_tag lv_login={lv_Obj.pt_login}></Login_tag>        
    </div>
  );
}

function Login_tag(props: { lv_login: Login }) {
  const lv_login = props.lv_login;
  return (
    <>
      <div style={{"fontSize":"26px"}}>
        <C_signUp_select_btns
          is_signUp={false}
          p_state={"login"}
        ></C_signUp_select_btns>
        <div id="hr-login">
          <hr />
          <div id="or">or</div>
        </div>
        <div>
          <div>
            <section>
              <input
                onChange={(e) => {
                  lv_login.iv_email = e.target.value;
                  lv_login.im_forceRender();
                }}
                type="email"
                name="email"
                className="test-login-input"
                value={lv_login.iv_email}
                placeholder="Enter your email address"
              />
              <button
                onClick={() => {
                  lv_login.im_loginCheck();
                }}
                type="submit"
                className="test-login"
              >
                <span className="submit-text">Test Login</span>                
              </button>
            </section>            
          </div>
        </div>
      </div>
    </>
  );
}
