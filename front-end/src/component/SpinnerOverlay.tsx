import React from "react";

export const SpinnerOverlay = () => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
    <svg className="animate-spin h-10 w-10 text-white" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
      <path
        className="opacity-75"
        d="M12 2a10 10 0 110 20V2z"
        strokeWidth="4"
      />
    </svg>
  </div>
);
