import React, { useMemo, useState } from "react";
import "./SubscriptionSchedulesTable.scss";

export type ScheduleStatus = "SCHEDULED" | "EXECUTED" | "CANCELLED" | "FAILED";

export interface SubscriptionScheduleRow {
  // DB 컬럼 (필수)
  payment_id: string;
  subscription_id: number;
  schedule_at: string | Date;
  amount_krw: number;
  status: ScheduleStatus; // DB에는 FAILED가 없지만 UI 호환 위해 허용
  created_at: string | Date;

  // UI 확장 컬럼 (선택)
  executed_at?: string | Date | null;   // 완료일시
  cancelled_at?: string | Date | null;  // 해지일시
  gateway?: string | null;              // 결제대행사
  routing_group?: string | null;        // 라우팅그룹
  customer_name?: string | null;        // 고객 이름
  customer_external_id?: string | null; // 고객 식별 정보(예: 해시/키)
}

export interface SubscriptionSchedulesTableProps {
  data: SubscriptionScheduleRow[];
  pageSize?: number; // 기본 10
}

const statusLabel: Record<ScheduleStatus, string> = {
  SCHEDULED: "예약",
  EXECUTED: "성공",
  CANCELLED: "해지",
  FAILED: "실패",
};

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function fmt(dt?: string | Date | null) {
  if (!dt) return "-";
  const d = typeof dt === "string" ? new Date(dt) : dt;
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

function moneyKRW(v: number) {
  return v.toLocaleString("ko-KR");
}

export default function SubscriptionSchedulesTable({
  data,
  pageSize = 10,
}: SubscriptionSchedulesTableProps) {
  const [filter, setFilter] = useState<"ALL" | ScheduleStatus>("ALL");
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const base = { ALL: data.length, SCHEDULED: 0, EXECUTED: 0, FAILED: 0, CANCELLED: 0 };
    for (const r of data) (base as any)[r.status] = (base as any)[r.status] + 1;
    return base;
  }, [data]);

  const filtered = useMemo(() => {
    const rows = filter === "ALL" ? data : data.filter((r) => r.status === filter);
    return rows;
  }, [data, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function changeFilter(next: "ALL" | ScheduleStatus) {
    setFilter(next);
    setPage(1);
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
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
          className={`tab ${filter === "FAILED" ? "active" : ""}`}
          onClick={() => changeFilter("FAILED")}
        >
          실패 <span className="pill">{counts.FAILED}</span>
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
                고객사 거래번호
                <span className="info">
                  i
                  <span className="tooltip">가맹점 주문/결제 고유번호 등</span>
                </span>
              </th>
              <th className="col-gw">
                결제대행사·라우팅그룹
                <span className="info">
                  i
                  <span className="tooltip">예: 카카오페이 · 그룹명</span>
                </span>
              </th>
              <th className="col-name">고객이름</th>
              <th className="col-ext">고객 식별 정보</th>
              <th className="col-amt">금액(₩)</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td className="empty" colSpan={10}>데이터가 없습니다.</td>
              </tr>
            )}
            {pageRows.map((r) => (
              <tr key={r.payment_id}>
                <td className="col-status">
                  <span className={`badge ${r.status.toLowerCase()}`}>
                    {statusLabel[r.status]}
                  </span>
                  {r.status === "SCHEDULED" && (
                    <div className="sub-action">예약 변경·해지</div>
                  )}
                </td>
                <td className="mono">{fmt(r.created_at)}</td>
                <td className="mono">{fmt(r.schedule_at)}</td>
                <td className="mono">{fmt(r.executed_at)}</td>
                <td className="mono">{fmt(r.cancelled_at)}</td>
                <td className="col-id">
                  <div className="id-cell" title={r.payment_id}>
                    <span className="ellipsis">{r.payment_id}</span>
                    <button className="copy" onClick={() => copy(r.payment_id)}>복사</button>
                  </div>
                </td>
                <td>
                  <div className="ellipsis" title={`${r.gateway ?? "-"}${r.routing_group ? " · " + r.routing_group : ""}`}>
                    {r.gateway ?? "-"}{r.routing_group ? " · " + r.routing_group : ""}
                  </div>
                </td>
                <td>{r.customer_name ?? "-"}</td>
                <td className="mono">
                  <div className="ellipsis" title={r.customer_external_id ?? "-"}>
                    {r.customer_external_id ?? "-"}
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

