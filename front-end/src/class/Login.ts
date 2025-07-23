import axios from "axios";
import { Main } from "./Main_class";

export class Login {
  public im_forceRender: () => void;
  public iv_email: string;
  public iv_sessionData:
    | {
        email: string;
        is_login: boolean;
      }
    | undefined;

  public iv_modal: boolean = false;

  constructor(im_forceRender: () => void) {
    this.im_forceRender = im_forceRender;
    this.iv_email = "";
    this.iv_sessionData = undefined;
  }

  public async im_loginCheck() {
    if (this.iv_email.trim() === "") {
      Main.im_toast("아이디를 입력해 주세요.", "warn");
      return;
    }

    try {
      /* 1) 이메일 존재 여부 확인 */
      await axios.post("/login/loginEmailCheck", { email: this.iv_email });

      window.location.reload();
    } catch (err) {
      Main.im_toast("로그인 에러", "warn");
    }
  }

  public async im_Session() {
    await axios.get("/login/loginSession").then((res) => {
      if (res.data.loggedIn == true) {
        this.iv_sessionData = {
          email: res.data.email,
          is_login: true,
        };
      }else{
        this.iv_modal = true;
      }
      this.im_forceRender();
    });
  }

  public static sf_emailCheck(value: string) {
    var reg =
      /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/i;
    return reg.test(value);
  }
}
