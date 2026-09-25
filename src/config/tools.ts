import { extraTools } from "./extra-tools";

export type ToolDefinition = {
  id: string;
  name: string;
  category: "image" | "csv" | "json" | "text" | "pdf" | "qr" | "video" | "japanese" | "developer" | "date" | "calculator" | "share" | "security" | "japan" | "office";
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
  {
    id: "simple-survey",
    name: "簡易アンケート",
    category: "share",
    href: "/survey/",
    description: "単一選択・複数選択・5段階評価のアンケートをURL共有で集計します。",
    status: "available",
  },
  {
    id: "random-team-divider",
    name: "ランダムチーム分け",
    category: "share",
    href: "/team-divider/",
    description: "参加者を指定チーム数へランダムかつ均等に振り分けます。",
    status: "available",
  },
  {
    id: "shared-lottery-order",
    name: "順番決め・くじ引き",
    category: "share",
    href: "/lottery-order/",
    description: "共有URLから参加者を集め、主催者がランダムに順番を抽選します。",
    status: "available",
  },
  {
    id: "availability-match",
    name: "空き時間マッチング",
    category: "share",
    href: "/availability-match/",
    description: "候補時間への回答を集め、みんなが空いている時間を自動集計します。",
    status: "available",
  },
  {
    id: "packing-assignment",
    name: "持ち物分担表",
    category: "share",
    href: "/packing-list/",
    description: "旅行やイベントの持ち物を共有し、担当者を分担できます。",
    status: "available",
  },
  {
    id: "shared-checklist",
    name: "共有TODO・チェックリスト",
    category: "share",
    href: "/shared-checklist/",
    description: "共有URLでTODOを追加・チェックできる共同チェックリストです。",
    status: "available",
  },
  {
    id: "seat-shuffle",
    name: "席決め・座席表ジェネレーター",
    category: "share",
    href: "/seat-shuffle/",
    description: "参加者をランダム配置し、固定席や離したい組み合わせにも対応します。",
    status: "available",
  },
  {
    id: "travel-expense-share",
    name: "旅行費用分担",
    category: "share",
    href: "/travel-expense/",
    description: "旅行中の立替を共有し、最終的な精算額を自動計算します。",
    status: "available",
  },
  {
    id: "candidate-ranking",
    name: "候補ランキング作成",
    category: "share",
    href: "/candidate-ranking/",
    description: "候補の順位回答を集め、Borda方式で総合ランキングを作ります。",
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
