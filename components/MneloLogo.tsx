type MneloLogoProps = {
  className?: string;
  showWordmark?: boolean;
};

export function MneloLogo({ className = "", showWordmark = true }: MneloLogoProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        aria-hidden="true"
        className="h-9 w-9 shrink-0"
        fill="none"
        viewBox="0 0 96 96"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="mnelo-mark-stroke" x1="19" x2="77" y1="24" y2="74">
            <stop stopColor="#16A34A" />
            <stop offset="1" stopColor="#A3E635" />
          </linearGradient>
          <radialGradient cx="0" cy="0" gradientTransform="translate(23 24) rotate(45) scale(22)" gradientUnits="userSpaceOnUse" id="mnelo-node-left" r="1">
            <stop stopColor="#22C55E" />
            <stop offset="1" stopColor="#047857" />
          </radialGradient>
          <radialGradient cx="0" cy="0" gradientTransform="translate(73 24) rotate(45) scale(22)" gradientUnits="userSpaceOnUse" id="mnelo-node-right" r="1">
            <stop stopColor="#BEF264" />
            <stop offset="1" stopColor="#65A30D" />
          </radialGradient>
          <radialGradient cx="0" cy="0" gradientTransform="translate(48 72) rotate(45) scale(24)" gradientUnits="userSpaceOnUse" id="mnelo-node-bottom" r="1">
            <stop stopColor="#4ADE80" />
            <stop offset="1" stopColor="#16A34A" />
          </radialGradient>
        </defs>
        <path
          d="M23 24H73L48 72L23 24Z"
          stroke="url(#mnelo-mark-stroke)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="10"
        />
        <circle cx="23" cy="24" fill="url(#mnelo-node-left)" r="13" />
        <circle cx="73" cy="24" fill="url(#mnelo-node-right)" r="13" />
        <circle cx="48" cy="72" fill="url(#mnelo-node-bottom)" r="13" />
      </svg>
      {showWordmark ? <span className="text-2xl font-semibold tracking-tight text-[#062f25]">Mnelo</span> : null}
    </span>
  );
}
