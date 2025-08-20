import { fmt } from "@allStore";
import { PaymentsPublic } from "@allType";
import React, { useMemo, useState } from "react";
import "./SubscriptionSchedulesTable.scss";
import Modal from "react-modal";
import { Subscription } from "./Main";

export interface PaymentsTableProps {
  data: PaymentsPublic[];
  pageSize?: number;
}

function moneyKRW(v: number) {
  return v.toLocaleString("ko-KR");
}

export default function PaymentModal(props: { lv_Obj: Subscription }) {
  const customStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      marginRight: "-50%",
      transform: "translate(-50%, -50%)",
    },
  };

  Modal.setAppElement("#app");
  return (
    <Modal
      isOpen={props.lv_Obj.iv_payments}
      onRequestClose={() => {
        props.lv_Obj.iv_payments = false;
        props.lv_Obj.im_forceRender();
      }}
      style={customStyles}
      contentLabel="payments Modal"
    >
      {props.lv_Obj.pt_SubscriptionStore.payments && (
        <PaymentTable
          data={props.lv_Obj.pt_SubscriptionStore.payments}
          pageSize={5}
        />
      )}
    </Modal>
  );
}

function PaymentTable({ data, pageSize = 10 }: PaymentsTableProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const pageRows = data.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="sched-wrap">
      <div className="sched-table">
        <table>
          <thead>
            <tr>
              <th className="col-status">상태</th>
              <th className="col-title">상품명</th>
              <th className="col-datetime">결제일시</th>
              <th className="col-amt">금액(₩)</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td className="empty" colSpan={10}>
                  데이터가 없습니다.
                </td>
              </tr>
            )}
            {pageRows.map((r) => (
              <tr key={r.id}>
                <td className="col-status">
                  <span className={`badge ${r.is_success ?'executed':"failed" }`}>
                    {r.is_success?"결제 성공":"결제 실패"}
                  </span>
                </td>
                <td className="mono">{r.order_name}</td>
                <td className="mono">{fmt(r.paid_at)}</td>
                <td className="mono amt">{moneyKRW(r.amount_krw)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sched-pagination">
        <button
          className="nav"
          onClick={() => setPage(1)}
          disabled={page === 1}
          aria-label="처음 페이지"
        >
          «
        </button>
        <button
          className="nav"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          aria-label="이전 페이지"
        >
          ‹
        </button>
        <span className="page-indicator">
          {page} / {totalPages}
        </span>
        <button
          className="nav"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          aria-label="다음 페이지"
        >
          ›
        </button>
        <button
          className="nav"
          onClick={() => setPage(totalPages)}
          disabled={page === totalPages}
          aria-label="마지막 페이지"
        >
          »
        </button>
      </div>
    </div>
  );
}
