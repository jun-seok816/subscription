import { SubscriptionStore } from "@jsLib/class/SubscriptionClass";
import React, { useState } from "react";
import SideBar from "./SideBar";
import SubscriptionManagementPage from "./SubscriptionManagementPage";
import { Main } from "../../class/Main_class";
import LoginModal from "../Login/LoginModal";
import { SpinnerOverlay } from "../SpinnerOverlay";

export class Subscription extends Main {
  private iv_SubscriptionStore = new SubscriptionStore(
    this.im_forceRender.bind(this)
  );
  public iv_loading = false;

  constructor() {
    super();
  }

  get pt_SubscriptionStore() {
    return this.iv_SubscriptionStore;
  }
}

export default function MainComponent() {
  const [lv_Obj] = useState(() => {
    return new Subscription();
  });

  lv_Obj.im_Prepare_Hooks(() => {
    lv_Obj.pt_SubscriptionStore.load();
  });

  return (
    <>
      {lv_Obj.iv_loading && <SpinnerOverlay />}
      <LoginModal />
      <div style={{ display: "flex" }}>
        <SideBar lv_Obj={lv_Obj} />
        <SubscriptionManagementPage lv_Obj={lv_Obj} />
      </div>
    </>
  );
}
