// src/components/AlertCard.js
import React from "react";

const levelStyles = {
  danger: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    pillBg: "bg-red-100",
    pillText: "text-red-700",
    emoji: "⚠️",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    pillBg: "bg-amber-100",
    pillText: "text-amber-700",
    emoji: "⚠️",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    pillBg: "bg-blue-100",
    pillText: "text-blue-700",
    emoji: "ℹ️",
  },
};

const AlertCard = ({ level = "info", title, message, valueLabel, category }) => {
  const style = levelStyles[level] || levelStyles.info;

  return (
    <div
      className={`${style.bg} ${style.border} ${style.text} border rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2`}
    >
      {/* Left: icon + text */}
      <div className="flex items-start gap-3 flex-1">
        <div className="text-lg mt-0.5">{style.emoji}</div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {category && (
              <span
                className={`${style.pillBg} ${style.pillText} text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full`}
              >
                {category}
              </span>
            )}
            <h3 className="text-sm font-semibold leading-tight">{title}</h3>
          </div>
          <p className="text-xs mt-1 leading-snug">{message}</p>
        </div>
      </div>

      {/* Right: current value */}
      {valueLabel && (
        <div className="text-xs font-medium whitespace-nowrap opacity-80">
          Current: <span className="font-semibold">{valueLabel}</span>
        </div>
      )}
    </div>
  );
};

export default AlertCard;
