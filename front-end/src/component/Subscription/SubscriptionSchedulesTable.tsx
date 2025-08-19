import { fmt } from "@allStore";
import { ScheduleStatus, SubscriptionScheduleRow } from "@allType";
import React, { useMemo, useState } from "react";
import "./SubscriptionSchedulesTable.scss";
import Modal from "react-modal";
import { Subscription } from "./Main";

export interface SubscriptionSchedulesTableProps {
  data: SubscriptionScheduleRow[];
  pageSize?: number;
}

function moneyKRW(v: number) {
  return v.toLocaleString("ko-KR");
}

const statusLabel: Record<ScheduleStatus, string> = {
  SCHEDULED: "예약",
  EXECUTED: "성공",
  CANCELLED: "해지",
};

export default function ScheduleModal(props: { lv_Obj: Subscription }) {
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
      isOpen={props.lv_Obj.iv_schedule}
      onRequestClose={() => {
        props.lv_Obj.iv_schedule = false;
        props.lv_Obj.im_forceRender();
      }}
      style={customStyles}
      contentLabel="schedule Modal"
    >
      {props.lv_Obj.pt_SubscriptionStore.schedule && (
        <SubscriptionSchedulesTable
          data={props.lv_Obj.pt_SubscriptionStore.schedule}
          pageSize={5}
        />
      )}
    </Modal>
  );
}

function SubscriptionSchedulesTable({
  data,
  pageSize = 10,
}: SubscriptionSchedulesTableProps) {
  const [filter, setFilter] = useState<"ALL" | ScheduleStatus>("ALL");
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const base = {
      ALL: data.length,
      SCHEDULED: 0,
      EXECUTED: 0,
      FAILED: 0,
      CANCELLED: 0,
    };
    for (const r of data) (base as any)[r.status] = (base as any)[r.status] + 1;
    return base;
  }, [data]);

  const filtered = useMemo(() => {
    const rows =
      filter === "ALL" ? data : data.filter((r) => r.status === filter);
    return rows;
  }, [data, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function changeFilter(next: "ALL" | ScheduleStatus) {
    setFilter(next);
    setPage(1);
  }

  return (
    <div className="sched-wrap">
      {/* 상단 탭/카운터 */}
      <div className="sched-tabs">
        <button
          className={`tab ${filter === "ALL" ? "active" : ""}`}
          onClick={() => changeFilter("ALL")}
        >
          전체 <span className="pill">{counts.ALL}</span>
        </button>
        <button
          className={`tab ${filter === "SCHEDULED" ? "active" : ""}`}
          onClick={() => changeFilter("SCHEDULED")}
        >
          예약 <span className="pill">{counts.SCHEDULED}</span>
        </button>
        <button
          className={`tab ${filter === "EXECUTED" ? "active" : ""}`}
          onClick={() => changeFilter("EXECUTED")}
        >
          성공 <span className="pill">{counts.EXECUTED}</span>
        </button>
        <button
          className={`tab ${filter === "CANCELLED" ? "active" : ""}`}
          onClick={() => changeFilter("CANCELLED")}
        >
          해지 <span className="pill">{counts.CANCELLED}</span>
        </button>
      </div>

      {/* 테이블 */}
      <div className="sched-table">
        <table>
          <thead>
            <tr>
              <th className="col-status">상태</th>
              <th className="col-datetime">등록일시</th>
              <th className="col-datetime">예정일시</th>
              <th className="col-datetime">완료일시</th>
              <th className="col-datetime">해지일시</th>
              <th className="col-id">
                상품명                
              </th>
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
              <tr key={r.payment_id}>
                <td className="col-status">
                  <span className={`badge ${r.status.toLowerCase()}`}>
                    {statusLabel[r.status]}
                  </span>             
                </td>
                <td className="mono">{fmt(r.created_at)}</td>
                <td className="mono">{fmt(r.schedule_at)}</td>
                <td className="mono">{fmt(r.executed_at)}</td>
                <td className="mono">{fmt(r.cancelled_at)}</td>
                <td className="col-id">
                  <div className="id-cell">
                    <span className="ellipsis">{r.product_name}</span>
                  </div>
                </td>
                <td className="mono amt">{moneyKRW(r.amount_krw)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
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
