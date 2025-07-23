import React, { useState } from "react";
import { Login } from "@jsLib/class/Login";
import C_signUp_select_btns from "./SignUp_select_btns";
import "./LoginModal.scss";
import { Main } from "@jsLib/class/Main_class";
import Modal from "react-modal";

declare global {
  interface Window {
    globalCallback_snsSignUP: (p_platform: "google") => void;
    globalCallback_login: () => void;
  }
}

class LoginComponentClass extends Main {
  private iv_login: Login;

  public get pt_login(): Login {
    return this.iv_login;
  }

  constructor() {
    super();
    this.iv_login = new Login(this.im_forceRender.bind(this));
  }
}

export default function LoginModal() {
  const [lv_Obj] = useState(() => {
    return new LoginComponentClass();
  });

  lv_Obj.im_Prepare_Hooks(async () => {
    window.globalCallback_login = () => {
      window.location.reload();
    };
    lv_Obj.pt_login.im_Session();    
  });

  const customStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      marginRight: "-50%",
      transform: "translate(-50%, -50%)",
    },
  };

  Modal.setAppElement("#app");  

  return (
    <Modal
      isOpen={lv_Obj.pt_login.iv_modal}
      onRequestClose={() => {
        lv_Obj.pt_login.iv_modal = false;
        lv_Obj.im_forceRender();
      }}
      shouldCloseOnOverlayClick={false}
      style={customStyles}
      contentLabel="img_down Modal"
    >
      <div id="signUp_modal">
        <Login_tag lv_Obj={lv_Obj}></Login_tag>
      </div>
    </Modal>
  );
}

function Login_tag(props: { lv_Obj: LoginComponentClass }) {
  const lv_login = props.lv_Obj.pt_login;
  return (
    <>
      <div style={{ fontSize: "26px" }}>
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
                onBlur={() => {}}
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
