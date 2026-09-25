import { extraTools } from "./extra-tools";

export type ToolDefinition = {
  id: string;
  name: string;
  category: "image" | "csv" | "json" | "text" | "pdf" | "qr" | "video" | "japanese" | "developer" | "date" | "calculator" | "share";
  href: string;
  description: string;
  status: "available" | "planned";
};

const baseTools: ToolDefinition[] = [
  {
    id: "image-batch-converter",
    name: "画像一括リサイズ・圧縮・WebP変換",
    category: "image",
    href: "/image/batch-converter/",
    description: "JPG・PNG・WebPをまとめてリサイズ、圧縮、形式変換します。",
    status: "available",
  },
  {
    id: "csv-split",
    name: "CSV分割",
    category: "csv",
    href: "/csv/split/",
    description: "CSVを指定行数ごとに正しく解析・分割します。",
    status: "available",
  },
  {
    id: "remove-duplicate-lines",
    name: "テキスト重複行削除",
    category: "text",
    href: "/text/remove-duplicates/",
    description: "重複行を条件指定で削除し、コピーやTXT保存ができます。",
    status: "available",
  },
  {
    id: "schedule-coordination",
    name: "日程調整",
    category: "share",
    href: "/schedule/",
    description: "候補日を共有し、参加者が○△×で回答。結果を自動集計します。",
    status: "available",
  },
  {
    id: "anonymous-poll",
    name: "匿名投票",
    category: "share",
    href: "/poll/",
    description: "選択肢を共有し、登録不要の匿名投票をリアルタイム集計します。",
    status: "available",
  },
  {
    id: "attendance-check",
    name: "出欠確認",
    category: "share",
    href: "/attendance/",
    description: "イベントの参加・未定・不参加を共有URLで集計します。",
    status: "available",
  },
  {
    id: "shared-split-bill",
    name: "割り勘・立替精算",
    category: "share",
    href: "/split-bill/",
    description: "立替を共有して、誰が誰へいくら払うかを自動計算します。",
    status: "available",
  },
];

export const tools: ToolDefinition[] = [
  ...baseTools,
  ...extraTools.map((tool) => ({
    id: tool.id,
    name: tool.name,
    category: tool.categoryKey,
    href: tool.href,
    description: tool.description,
    status: "available" as const,
  })),
];
