import React from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { createRoot } from "react-dom/client";
import SubscriptionPage from "./component/Subscription/Main";
import LoginComponent from "./component/Login/C_login";

export default function Root(){
    return(
        <Routes>
            <Route index element={<LoginComponent/>} />
            <Route path="/subscription" element={<SubscriptionPage/>} />
        </Routes>
    )
}

const container = document.getElementById("app");
const root = createRoot(container!); // createRoot(container!) if you use TypeScript

root.render(
  <>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </>
);

