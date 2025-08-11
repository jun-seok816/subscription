import React from "react";
import { Subscription } from "./Main";
import "./Card.scss";

// ──────────────────────────────────────────────────────────────────────────────
const KFTC_CODE_BY_BRAND: Record<string, string> = {
  KOOKMIN_CARD: "381", // KB국민
  SHINHAN_CARD: "366",
  SAMSUNG_CARD: "365",
  HYUNDAI_CARD: "367",
  LOTTE_CARD: "368",
  WOORI_CARD: "041", // 우리카드(0xx)
  BC_CARD: "361",
  NH_CARD: "371",
  KAKAOPAY:"001",
};

const BRAND_LABEL: Record<string, string> = {
  KOOKMIN_CARD: "KB국민카드",
  SHINHAN_CARD: "신한카드",
  SAMSUNG_CARD: "삼성카드",
  HYUNDAI_CARD: "현대카드",
  LOTTE_CARD: "롯데카드",
  WOORI_CARD: "우리카드",
  BC_CARD: "BC카드",
  NH_CARD: "NH농협카드",
  KAKAOPAY:"카카오페이"
};

function getBrandMeta(brand: string | null): {
  label: string;
  kftc: string | null;
  iconPath: string | null;
} {
  if (!brand) return { label: "카드", kftc: null, iconPath: null };
  const kftc = KFTC_CODE_BY_BRAND[brand] ?? null;
  const label = BRAND_LABEL[brand] ?? brand;
  const iconPath = kftc
    ? `/assets/images/icons/${kftc}.png`
    : null;
  return { label, kftc, iconPath };
}

function maskLast4(last4: string | null): string {
  if (!last4) return "—";
  const clean = String(last4).replace(/\D+/g, "").slice(-4);
  return clean ? `•••• ${clean}` : "—";
}

export default function Card(props: { lv_Obj: Subscription }) {
  const lv_user = props.lv_Obj.pt_SubscriptionStore.user;
  if (!lv_user) return <></>;
  const brand = getBrandMeta(lv_user.card_brand || lv_user.easy_pay_provider);
  return (
    <>
      <tr>
        <th>결제 수단</th>
        <td>
          <div style={{display:"flex","alignItems":"center","justifyContent":"space-between"}}>
            {brand.iconPath && (
              <img
                src={brand.iconPath}
                alt={brand.kftc ? `KFTC ${brand.kftc}` : "카드"}
                className="ubt__brandIcon"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    "/icons/cards/generic.svg";
                }}
              />
            )}
            <div className="ubt__cellMain">
              <div className="ubt__brandName">{brand.label}</div>
              <div className="ubt__sub">{maskLast4(lv_user.card_last4)}</div>
            </div>
            <button
              className="btn__red"
              onClick={async () => {
                if (window.confirm("결제 수단을 삭제하시겠습니까?")) {
                  await props.lv_Obj.pt_Payment.im_deleteBillingKey();
                }
              }}
            >
              결제 수단 삭제
            </button>
          </div>
        </td>
      </tr>
    </>
  );
}
