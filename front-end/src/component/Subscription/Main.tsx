import { SubscriptionStore } from "@jsLib/class/SubscriptionClass";
import React, { useState } from "react";
import SideBar from "./SideBar";
import SubscriptionManagementPage from "./SubscriptionManagementPage";
import { Main } from "../../class/Main_class";
import LoginModal from "../Login/LoginModal";
import { Payment } from "@jsLib/class/Payment";
import ScheduleModal from "./SubscriptionSchedulesTable";
import PaymentModal from "./PaymentTable";
import { Login } from "@jsLib/class/Login";

export class Subscription extends Main {
  private iv_SubscriptionStore = new SubscriptionStore(
    this.im_forceRender.bind(this)
  );

  private iv_Login = new Login(this.im_forceRender.bind(this));

  private iv_Payement = new Payment();
  public iv_loading = false;
  public iv_schedule = false;
  public iv_payments = false;

  constructor() {
    super();
  }

  get pt_SubscriptionStore() {
    return this.iv_SubscriptionStore;
  }

  get pt_Payment() {
    return this.iv_Payement;
  }

  public get pt_login(): Login {
    return this.iv_Login;
  }
}

export default function MainComponent() {
  const [lv_Obj] = useState(() => {
    return new Subscription();
  });

  lv_Obj.im_Prepare_Hooks(async () => {
    window.globalCallback_login = () => {
      window.location.reload();
    };
    await lv_Obj.pt_login.im_Session();    
    await lv_Obj.pt_SubscriptionStore.load();
  });

  return (
    <>
      <LoginModal lv_Obj={lv_Obj.pt_login}/>
      <ScheduleModal lv_Obj={lv_Obj} />
      <PaymentModal lv_Obj={lv_Obj} />
      <div className="app-shell">
        <SideBar lv_Obj={lv_Obj} />
        <SubscriptionManagementPage lv_Obj={lv_Obj} />
      </div>
    </>
  );
}
