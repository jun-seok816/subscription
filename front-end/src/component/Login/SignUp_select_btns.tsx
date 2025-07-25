import React from "react";

export default function SignUp_select_btns(props: {
  is_signUp: boolean;
  p_state: "login"|"sign_up";
}) {
  /*
   * Create form to request access token from Google's OAuth 2.0 server.
   */
  function lf_oauthSignIn_google() {
    // Google's OAuth 2.0 endpoint for requesting an access token
    var screenWidth = window.screen.width;
    var screenHeight = window.screen.height;

    var width = 650;
    var height = 800;

    // 창의 가운데 위치 계산
    var left = (screenWidth - width) / 2;
    var top = (screenHeight - height) / 2;

    var newWindow = window.open(
      "",
      "_blank",
      "width=" +
        width +
        ", height=" +
        height +
        ", left=" +
        left +
        ", top=" +
        top
    );

    var oauth2Endpoint = "https://accounts.google.com/o/oauth2/v2/auth";

    // Create <form> element to submit parameters to OAuth 2.0 endpoint.
    var form = document.createElement("form");
    form.setAttribute("method", "GET"); // Send as a GET request.
    form.setAttribute("action", oauth2Endpoint);

    // Parameters to pass to OAuth 2.0 endpoint.
    var params = {
      client_id:
        "77168105156-i07b37ii7efesqo4ckpq1iv4crntvefe.apps.googleusercontent.com",
      redirect_uri: `${window.origin}/login/google_signup`,
      response_type: "token",
      scope: "email profile",
      state: props.p_state,
    };

    // Add form parameters as hidden input values.
    for (var p in params) {
      var input = document.createElement("input");
      input.setAttribute("type", "hidden");
      input.setAttribute("name", p);

      //@ts-ignore
      input.setAttribute("value", params[p]);
      form.appendChild(input);
    }

    // Add form to page and submit it to open the OAuth 2.0 endpoint.
    newWindow?.document.body.appendChild(form);
    form.submit();
  }

  return (
    <>
      <button
        type="submit"        
        onClick={() => {
          lf_oauthSignIn_google();
        }}
        className="signUp_btns"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24"
          viewBox="0 0 24 24"
          width="24"
          style={{"marginRight":"1em"}}
        >
          <script />
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
          <path d="M1 1h22v22H1z" fill="none" />
          <script />
        </svg>        
        구글 계정으로 로그인하기
      </button>
    </>
  );
}
