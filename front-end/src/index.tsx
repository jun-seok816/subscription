import React from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { createRoot } from "react-dom/client";
import SubscriptionPage from "./component/Subscription/Main";

export default function Root(){
    return(
        <Routes>
            <Route index element={<SubscriptionPage/>} />
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

