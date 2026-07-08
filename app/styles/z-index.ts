// /results 画面で重なり合うオーバーレイの積み順を一元管理する。
// 値は Tailwind の z-* ユーティリティ名（文字列）で持ち、下から上へ並べる。
export const Z_INDEX = {
  mapControls: "z-10",
  storeDetailBackdrop: "z-10",
  mapActionButton: "z-20",
  storeDetailPanel: "z-20",
  aiChatButton: "z-20",
  aiChatPanel: "z-30",
  comparePanel: "z-40",
  conditionsEditorOverlay: "z-50",
} as const;
