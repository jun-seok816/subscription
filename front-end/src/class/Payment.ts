import axios from "axios";
import * as PortOne from "@portone/browser-sdk/v2";
import { Main } from "./Main_class";

const STORE_ID = "store-1bf4f4b6-f07e-4415-8d81-1fca605c699f";
const CHANNEL_KEY = "channel-key-ce371e74-f728-4b88-92c1-6374ba1dd8b5";

export class Payment {
  async im_handlePayment(): Promise<boolean> {
    try {
      const paymentId = `payment_${crypto.randomUUID()}`;
      const response = await PortOne.requestPayment({
        storeId: STORE_ID,
        channelKey: CHANNEL_KEY,
        paymentId,
        orderName: "테스트 상품",
        totalAmount: 1000,
        currency: "CURRENCY_KRW",
        payMethod: "EASY_PAY",
      });

      if (!response) throw Error("no res");

      if (response.code !== undefined) {
        console.error("PortOne SDK Error:", response);        
        Main.im_toast('결제 실패','error');
        return false;
      }

      //결제 성공 → 백엔드 검증 호출
      const result = await axios.post("/pay/complete", {
        paymentId: response.paymentId,
      });

      if (result.data.err) {
        Main.im_toast(result.data.msg,'error');
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}
