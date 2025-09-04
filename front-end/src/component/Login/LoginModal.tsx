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



export default function LoginModal(props:{lv_Obj:Login}) {
  
  const lv_Obj = props.lv_Obj;

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
      isOpen={lv_Obj.iv_modal}
      onRequestClose={() => {
        lv_Obj.iv_modal = false;
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

function Login_tag(props: { lv_Obj: Login }) {
  const lv_login = props.lv_Obj;
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
