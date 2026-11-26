import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  showWordmark = true,
  className = "",
  onClick,
}) => {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9 sm:w-10 sm:h-10",
    lg: "w-12 h-12",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl sm:text-2xl",
    lg: "text-2xl sm:text-3xl",
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 sm:gap-3 ${onClick ? "cursor-pointer group select-none" : ""} ${className}`}
      aria-label="JobOps — Engineering Intelligence Radar"
    >
      {/* Precision Geometric SVG Brand Mark (12px control corner) */}
      <div
        className={`${iconSizes[size]} rounded-[12px] bg-[#1D1D1F] dark:bg-obsidian-800 flex items-center justify-center text-[#0A84FF] shadow-sm shadow-[#0071E3]/15 group-hover:scale-105 transition-transform duration-[260ms] ease-base flex-shrink-0 border border-[#0071E3]/30`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 text-[#0A84FF]"
        >
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.9" />
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" strokeDasharray="2 2" />
          <line x1="12" y1="2.5" x2="12" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="19" x2="12" y2="21.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="2.5" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="19" y1="12" x2="21.5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2" fill="#30D158" />
        </svg>
      </div>

      {showWordmark && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className={`${textSizes[size]} font-bold tracking-tight text-brand-text font-sans leading-none`}>
              Job<span className="text-brand-primary">Ops</span>
            </span>
            <span className="hidden xs:inline-flex items-center text-[10px] font-mono font-semibold tracking-wider px-2 py-0.5 rounded-md bg-brand-accentSoft text-brand-primary border border-brand-primary/20">
              DIRECT ATS
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
