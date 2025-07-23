import React from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { createRoot } from "react-dom/client";
import SubscriptionPage from "./component/Subscription/Main";
import { ToastContainer } from "react-toastify";
import Google_get_access_token from "./component/Login/sns_get_access_token/Google_get_access_token";

export default function Root() {
  return (
    <Routes>
      <Route index element={<SubscriptionPage />} />
      <Route
        path="/login/google_signup"
        element={<Google_get_access_token/>}
      ></Route>
    </Routes>
  );
}

const container = document.getElementById("app");
const root = createRoot(container!); // createRoot(container!) if you use TypeScript

root.render(
  <>
    <ToastContainer
      position="bottom-right"
      style={{ fontSize: "0.6em", width: "auto", minWidth: "10rem" }}
    />
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </>
);
