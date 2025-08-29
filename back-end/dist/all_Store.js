"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSlug = void 0;
exports.fmt = fmt;
exports.formatDateTime = formatDateTime;
exports.computeNextAt = computeNextAt;
const toSlug = (s) => s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
exports.toSlug = toSlug;
function pad(n) {
    return n < 10 ? `0${n}` : `${n}`;
}
function fmt(dt) {
    if (!dt)
        return "-";
    const d = typeof dt === "string" ? new Date(dt) : dt;
    if (Number.isNaN(d.getTime()))
        return "-";
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}
// ---------------------- 공용 유틸 ----------------------
function formatDateTime(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function computeNextAt(currentPeriodEnd) {
    if (currentPeriodEnd)
        return new Date(currentPeriodEnd);
    const d = new Date();
    d.setMinutes(d.getMinutes() + 1);
    return d;
}
//# sourceMappingURL=all_Store.js.map