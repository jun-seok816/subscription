import axios from "axios";
import { Main } from "./Main_class";
import { SignUp } from "./SignUp";

export class Login {
  public im_forceRender: () => void;

  private iv_signUp: SignUp;
  public iv_email: string;

  constructor(im_forceRender: () => void) {
    this.im_forceRender = im_forceRender;
    this.iv_signUp = new SignUp(this.im_forceRender.bind(this));
    this.iv_email = "";
  }

  public get pt_signUp(): SignUp {
    return this.iv_signUp;
  }

  public async im_loginCheck() {
    if (this.iv_email.trim() === "") {
      Main.im_toast("아이디를 입력해 주세요.", "warn");
      return;
    }

    try {
      /* 1) 이메일 존재 여부 확인 */
      const { data } = await axios.post(
        "/login/loginEmailCheck",
        { email: this.iv_email },         
      );

      /* 2) 결과에 따른 처리 */
      if (data.exists) {        
      } else {
        Main.im_toast("가입된 계정을 찾을 수 없습니다.", "warn");
      }
    } catch (err) {
      Main.im_toast("아이디를 확인해 주세요.", "warn");
    }
  }

  public static sf_Celluar(value: string) {
    console.log(value);
    // 숫자만 허용하고 자릿수를 1~20자리로 제한하는 정규식
    const regExp = /^\d{1,20}$/;
    return regExp.test(value); // 형식에 맞는 경우 true 리턴
  }

  public static sf_nameCheck(value: string) {
    var regExp = /^[가-힣]{2,4}$/; //
    return regExp.test(value); // 형식에 맞는 경우 true 리턴
  }

  public static sf_emailCheck(value: string) {
    var reg =
      /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/i;
    return reg.test(value);
  }
}
