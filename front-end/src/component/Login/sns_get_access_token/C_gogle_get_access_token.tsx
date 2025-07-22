import axios from "axios";
import React from "react";

export default function C_google_get_access_token() {
  // Step 2: Handle the redirect callback
  function handleRedirectCallback(): void {
    const {
      access_token,
      token_type,
      expires_in,
      state,
    }: Record<string, string> = parseFragment();

    // Do something with the access_token and other parameters
    console.log("Access Token:", access_token);
    console.log("Token Type:", token_type);
    console.log("Expires In:", expires_in);
    console.log("State:", state);
    let lv_data = "google";

    // You can make API requests using the access_token
    // e.g., fetch('API_ENDPOINT', { headers: { 'Authorization': `${token_type} ${access_token}` }})

    axios
      .post("/login/save_data_google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          access_token: access_token,
          expires_in: expires_in,
          signup_platform: lv_data,
        },
      })
      .then((res) => {
        let lv_msg = res.data.msg;

        let lv_state = state;

        if (lv_msg == "login") {
          if (lv_state === "login") {
            window.opener.globalCallback_login();
            window.close();
            return;
          } else {
            alert("이전에 가입한 계정으로 자동 로그인 됩니다.");
            window.opener.globalCallback_login();
            window.close();
            return;
          }
        }

        if (lv_msg == "another_platform") {
          if (lv_state === "login") {
            alert("구글로 가입하신,이력이 없어요 다른 방식으로 시도해주세요");
            window.close();
            return;
          } else {
            alert(
              "해당 이메일은 이미 가입한 이력이 있습니다. 다른 방식으로 시도해주세요"
            );
            window.close();
            return;
          }
        }

        if (lv_msg == "sign_up") {
          if (lv_state === "login") {
            alert("가입이력이 없는 아이디입니다. 회원가입을 해주세요");
            window.opener.globalCallback_snsSignUP(lv_data);
            window.close();
            return;
          } else {
            window.opener.globalCallback_snsSignUP(lv_data);
            window.close();
            return;
          }
        }
      })
      .catch((err) => {
        alert("Server Err!");
        window.close();
      });
  }

  // Utility function to parse the fragment parameters from the redirect URI
  function parseFragment(): Record<string, string> {
    const fragment: Record<string, string> = {};
    const fragmentString: string = window.location.hash.substring(1);

    if (fragmentString === "error=access_denied") {
      window.close();
    }

    const fragmentParams: string[] = fragmentString.split("&");
    for (const param of fragmentParams) {
      const [key, value]: string[] = param.split("=");
      fragment[key] = decodeURIComponent(value);
    }
    return fragment;
  }

  // Handle the redirect callback
  handleRedirectCallback();

  return <></>;
}
