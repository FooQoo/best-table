import { useState } from "react";
import type { Restaurant } from "~/domain/models/restaurant";

const SUGGESTED_QUESTIONS = [
  "接待向きか教えて",
  "個室の期待値を教えて",
  "初対面の相手に堅すぎないか教えて",
];

// docs/DESIGN.md のガードレール: 自由入力は短く限定する。
export const MAX_QUESTION_LENGTH = 100;

type StoreAskPanelProps = {
  store: Restaurant;
};

export function StoreAskPanel({ store }: StoreAskPanelProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || isStreaming) return;

    setIsStreaming(true);
    setAnswer("");
    setError(null);

    try {
      const response = await fetch(`/api/stores/${store.id}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store, question: trimmed }),
      });

      if (!response.ok || !response.body) {
        setError("回答を取得できませんでした。時間をおいて再度お試しください。");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setAnswer(accumulated);
      }
    } catch {
      setError("回答を取得できませんでした。時間をおいて再度お試しください。");
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="bg-white border-[1.5px] border-[#e4ded0] rounded-md shadow-[0_1px_3px_rgba(20,20,20,.06),0_1px_2px_rgba(20,20,20,.04)] p-6 flex flex-col gap-3">
      <div className="font-bold text-[15px]">AIに質問する</div>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={isStreaming}
            onClick={() => ask(q)}
            className="text-[12px] px-3 py-1.5 border-[1.5px] border-[#d8d2c0] rounded-full cursor-pointer bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {q}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
        className="flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION_LENGTH))}
          maxLength={MAX_QUESTION_LENGTH}
          placeholder="気になることを短く入力（最大100文字）"
          className="flex-1 border-[1.5px] border-[#d8d2c0] rounded-md px-3 py-2 text-[13px]"
        />
        <button
          type="submit"
          disabled={isStreaming || !question.trim()}
          className="px-4 py-2 rounded-md text-[13px] font-bold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: "#12202f", color: "#f7f4ee" }}
        >
          質問する
        </button>
      </form>
      {error && (
        <div className="text-[12px] text-red-700" data-testid="store-ask-error">
          {error}
        </div>
      )}
      {(isStreaming || answer) && (
        <p
          className="text-[13px] leading-relaxed m-0"
          data-testid="store-ask-answer"
        >
          {answer}
          {isStreaming && "…"}
        </p>
      )}
    </div>
  );
}
