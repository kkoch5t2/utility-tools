export type GameMeta = {
  id: string;
  href: string;
  name: string;
  genre: string;
  playTime: string;
  control: string;
  tagline: string;
  thumbnail: string;
  featured?: boolean;
};

export const gameMeta: GameMeta[] = [
  {
    id: "game-lumo-sky-run",
    href: "/game/lumo-sky-run/",
    name: "Lumo's Sky Run",
    genre: "アクション",
    playTime: "3〜8分",
    control: "キーボード / タッチ",
    tagline: "走って、跳んで、空中遺跡を駆け抜けろ。",
    thumbnail: "/game-art/lumo-sky-run.jpg",
    featured: true,
  },
  {
    id: "game-meteor-drift",
    href: "/game/meteor-drift/",
    name: "Meteor Drift",
    genre: "反射神経",
    playTime: "45秒",
    control: "ドラッグ / キーボード",
    tagline: "隕石をかわして、45秒の宇宙サバイバル。",
    thumbnail: "/game-art/meteor-drift.jpg",
    featured: true,
  },
  {
    id: "game-neon-snake",
    href: "/game/neon-snake/",
    name: "Neon Snake",
    genre: "アーケード",
    playTime: "1〜3分",
    control: "スワイプ / キーボード",
    tagline: "食べて伸びる。ぶつかるまで終われない。",
    thumbnail: "/game-art/neon-snake.jpg",
    featured: true,
  },
  {
    id: "game-number-chain-10",
    href: "/game/number-chain-10/",
    name: "10をつくれ！ナンバーチェイン",
    genre: "パズル",
    playTime: "70秒",
    control: "ドラッグ",
    tagline: "数字をつないで合計10。コンボで一気に稼げ。",
    thumbnail: "/game-art/number-chain-10.jpg",
  },
  {
    id: "game-flash-matrix",
    href: "/game/flash-matrix/",
    name: "Flash Matrix",
    genre: "記憶力",
    playTime: "1〜5分",
    control: "タップ",
    tagline: "光った順番、どこまで覚えられる？",
    thumbnail: "/game-art/flash-matrix.jpg",
  },
  {
    id: "game-reaction-zero",
    href: "/game/reaction-zero/",
    name: "Reaction Zero",
    genre: "反応速度",
    playTime: "30秒",
    control: "タップ",
    tagline: "光った瞬間に押せ。反応速度をミリ秒で測定。",
    thumbnail: "/game-art/reaction-zero.jpg",
  },
  {
    id: "game-orbit-catch",
    href: "/game/orbit-catch/",
    name: "Orbit Catch",
    genre: "タイミング",
    playTime: "30〜60秒",
    control: "1タップ",
    tagline: "回る光を黄色の中心で止めろ。",
    thumbnail: "/game-art/orbit-catch.jpg",
  },
];

export const gameMetaByHref = Object.fromEntries(gameMeta.map((game) => [game.href, game])) as Record<string, GameMeta>;
