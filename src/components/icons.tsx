const PATHS = {
  person: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5Z",
  upload: "M11 16V7.8L8.4 10.4 7 9l5-5 5 5-1.4 1.4L13 7.8V16h-2Zm-6 4v-5h2v3h10v-3h2v5H5Z",
  mail: "M3 5h18v14H3V5Zm2 2v.5l7 4.6 7-4.6V7H5Zm14 2.9-7 4.6-7-4.6V17h14V9.9Z",
  gauge: "M4 19V5h2v12h14v2H4Zm4-4V10h2v5H8Zm4 0V7h2v8h-2Zm4 0v-3h2v3h-2Z",
  refresh: "M17.6 6.4A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.8-4.2L13 11h7V4l-2.4 2.4Z",
  check: "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z",
  chevron: "M7 10l5 5 5-5H7Z",
  warning: "M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z",
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

const TILE_COLORS: Record<string, string> = {
  person: "#5867e8",
  upload: "#3ba755",
  mail: "#ff538a",
  gauge: "#f49756",
};

/** Square object icon used in page headers, like a CRM record icon. */
export function IconTile({ name, size = 32 }: { name: IconName; size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded text-white" style={{ background: TILE_COLORS[name] ?? "#0176d3", width: size, height: size }}>
      <Icon name={name} className="h-[60%] w-[60%]" />
    </span>
  );
}
