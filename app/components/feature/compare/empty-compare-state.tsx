type EmptyCompareStateProps = {
  onBack: () => void;
};

export function EmptyCompareState({ onBack }: EmptyCompareStateProps) {
  return (
    <div className="flex-1 p-10 flex flex-col items-center justify-center gap-4 text-center">
      <div className="text-[#79726a]">比較する店舗が選択されていません。</div>
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-[#8a6a1a] underline cursor-pointer bg-transparent border-none"
      >
        一覧に戻る
      </button>
    </div>
  );
}
