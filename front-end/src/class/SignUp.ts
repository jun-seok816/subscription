import axios from "axios";
import { Main } from "./Main_class";

export type t_insert_users = {
  user_email: { value: string; text: string; check: boolean; is_sns: boolean };
};

export class SignUp {
  private iv_Data: t_insert_users;

  public im_forceRender: () => void;

  constructor(im_forceRender: () => void) {
    this.im_forceRender = im_forceRender;
    this.iv_Data = {
      user_email: { value: "", text: "", check: false, is_sns: false },
    };
  }

  public get pt_data() {
    return this.iv_Data;
  }

  public async im_Signup() {
    try {
      await axios.post("/login/sign_up", this.iv_Data, {
        headers: { "Content-Type": "application/json" },
        timeout: 10_000,
      });

      Main.im_toast("회원가입 성공!", "success");
      window.location.reload();
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const msg = err.response.data?.msg ?? "회원가입 실패";
        alert(msg);
      } else {
        alert("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
    }
  }

  public im_submit() {
    if (!this.iv_Data.user_email.check) {
      Main.im_toast("아이디를 확인해주세요", "error");
    } else {
      this.im_Signup();
    }
  }

  public async im_emailCheck() {
    try {
      const email = this.iv_Data.user_email.value; 
      
      const { data } = await axios.post(
        "/login/loginEmailCheck",
        { email },         
      );
      
      if (data.exists) {
        this.iv_Data.user_email.text = "중복되는 이메일이 있습니다.";
        this.iv_Data.user_email.check = false;
      } else {
        this.iv_Data.user_email.text = "사용 가능한 이메일입니다.";
        this.iv_Data.user_email.check = true;
      }
    } catch (err) {      
      this.iv_Data.user_email.text = "확인 중 오류가 발생했습니다.";
      this.iv_Data.user_email.check = false;
    } finally {
      this.im_forceRender(); 
    }
  }
}
