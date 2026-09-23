import { extraTools } from "./extra-tools";

export type ToolDefinition = {
  id: string;
  name: string;
  category: "image" | "csv" | "text" | "pdf" | "qr" | "developer";
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
