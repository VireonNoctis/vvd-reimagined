type IconName = "archive" | "arrow-left" | "chevron-down" | "chevron-right" | "close" | "dots" | "edit" | "files" | "folder" | "globe" | "layers" | "panel-left" | "plus" | "search" | "share-2" | "spark" | "trash";

const paths: Record<IconName, string[]> = {
  "chevron-down": ["m6 9 6 6 6-6"],
  "chevron-right": ["m9 18 6-6-6-6"],
  close: ["M18 6 6 18", "m6 6 12 12"],
  archive: ["M3 4h18v5H3z", "M5 9v11h14V9", "M10 13h4"],
  "arrow-left": ["M19 12H5", "m12 19-7-7 7-7"],
  dots: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
  edit: ["M12 20h9", "M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"],
  folder: ["M3 6h7l2 2h9v11H3z", "M3 9h18"],
  trash: ["M3 6h18", "M8 6V4h8v2", "m19 6-1 14H6L5 6", "M10 11v5", "M14 11v5"],
  files: ["M8 6h12v15H8z", "M4 18V3h12"],
  globe: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M2 12h20", "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"],
  layers: ["m12 3 9 5-9 5-9-5 9-5Z", "m3 12 9 5 9-5", "m3 16 9 5 9-5"],
  "panel-left": ["M3 4h18v16H3z", "M9 4v16"],
  plus: ["M12 5v14", "M5 12h14"],
  search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "m21 21-4.35-4.35"],
  "share-2": ["M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z", "M18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z", "m8.6 13.5 6.8-4", "m8.6 16.5 6.8 4"],
  spark: ["m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"]
};

export function Icon({ name, size = 17 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{paths[name].map((path, index) => <path d={path} key={index} />)}</svg>;
}
