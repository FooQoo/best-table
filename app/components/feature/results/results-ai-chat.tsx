import { Loader2, MessageCircle, Send, Square, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import type { Restaurant } from "~/domain/models/restaurant";
import type { ResultsChatBookingSummary } from "~/domain/models/results-chat";
import { INITIAL_RESULTS_CHAT_QUESTIONS } from "~/utils/results-chat-suggestions";

// Gemini の回答は Markdown（箇条書き・強調）で返ることがあるため、
// アシスタントの本文だけ react-markdown で描画する。生 HTML は解釈しないため XSS の心配はない。
const ASSISTANT_MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-bold text-[#20201c]">{children}</strong>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#8a6a1f] underline underline-offset-2"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-[#f7f4ee] px-1 py-0.5 text-[12px]">
      {children}
    </code>
  ),
};

function AssistantMarkdown({ text }: { text: string }) {
  return (
    <div className="[&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={ASSISTANT_MARKDOWN_COMPONENTS}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  status?: "loading" | "error";
};

type ResultsAiChatProps = {
  stores: Restaurant[];
  bookingSummary: ResultsChatBookingSummary;
};

export function canSendResultsChatQuestion(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.length > 0 && trimmed.length <= 400;
}

export function buildResultsChatRequest(input: {
  question: string;
  stores: Restaurant[];
  bookingSummary: ResultsChatBookingSummary;
}) {
  return {
    question: input.question.trim(),
    restaurants: input.stores,
    bookingSummary: input.bookingSummary,
  };
}

export function ResultsAiChat({ stores, bookingSummary }: ResultsAiChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const hasAsked = messages.some((message) => message.role === "user");
  const storeCountLabel = useMemo(
    () => `${stores.length}件の表示中店舗`,
    [stores.length],
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 112)}px`;
  }, [input]);

  const ask = async (question: string) => {
    const trimmed = question.trim();
    if (!canSendResultsChatQuestion(trimmed) || isSending) return;

    const assistantMessageId = createMessageId("assistant");
    setMessages((current) => [
      ...current,
      { id: createMessageId("user"), role: "user", text: trimmed },
      {
        id: assistantMessageId,
        role: "assistant",
        text: "",
        status: "loading",
      },
    ]);
    setInput("");
    setIsSending(true);
    setAiSuggestions(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/results/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildResultsChatRequest({
            question: trimmed,
            stores,
            bookingSummary,
          }),
        ),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      if (!response.body) {
        const text = await response.text();
        updateAssistantMessage(assistantMessageId, text);
        void loadSuggestions(trimmed, text);
        return;
      }

      let finalAnswer = "";
      await readTextStream(response.body, (text) => {
        finalAnswer = text;
        updateAssistantMessage(assistantMessageId, text);
      });
      void loadSuggestions(trimmed, finalAnswer);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setMessages((current) =>
          current.map((currentMessage) =>
            currentMessage.id === assistantMessageId &&
            currentMessage.status === "loading"
              ? { ...currentMessage, text: "回答の生成を中断しました。", status: undefined }
              : currentMessage,
          ),
        );
        return;
      }

      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "AI回答を取得できませんでした。検索結果と比較操作はそのまま使えます。";
      setMessages((current) =>
        current.map((currentMessage) =>
          currentMessage.id === assistantMessageId
            ? {
                ...currentMessage,
                text: message,
                status: "error",
              }
            : currentMessage,
        ),
      );
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  };

  const stopAsking = () => {
    abortControllerRef.current?.abort();
  };

  const updateAssistantMessage = (messageId: string, text: string) => {
    setMessages((current) =>
      current.map((currentMessage) =>
        currentMessage.id === messageId
          ? {
              ...currentMessage,
              text,
              status: undefined,
            }
          : currentMessage,
      ),
    );
  };

  const loadSuggestions = async (question: string, answer: string) => {
    if (!answer.trim()) return;

    setSuggestionsLoading(true);
    try {
      const response = await fetch("/api/results/chat/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          answer,
          restaurants: stores,
          bookingSummary,
        }),
      });
      if (!response.ok) return;

      const body = (await response.json()) as { questions?: unknown };
      if (
        Array.isArray(body.questions) &&
        body.questions.every((question) => typeof question === "string")
      ) {
        setAiSuggestions(body.questions);
      }
    } catch {
      // AI 生成の質問候補が取得できなくても deterministic な候補を使い続ける。
    } finally {
      setSuggestionsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        data-results-ai-chat
        onClick={() => setOpen(true)}
        className="absolute bottom-5 right-5 z-20 flex items-center gap-2 rounded-full border border-[#b08424] bg-[#20201c] px-4 py-3 text-[13px] font-bold text-[#fffdf8] shadow-[0_10px_24px_rgba(20,20,20,.28)] transition-colors hover:bg-[#3a352c]"
        aria-label="AIに地図上の店舗を相談する"
      >
        <MessageCircle className="size-4" aria-hidden="true" />
        AIに相談
      </button>

      <aside
        aria-label="地図上の店舗をAIに相談"
        data-results-ai-chat
        data-open={open ? "true" : "false"}
        className="absolute bottom-4 right-4 top-4 z-30 flex w-[390px] max-w-[calc(100%-32px)] flex-col overflow-hidden rounded-md border-[1.5px] border-[#d8c79d] bg-[#fffdf8] shadow-[0_14px_36px_rgba(20,20,20,.24)] transition-transform duration-300 data-[open=false]:translate-x-[calc(100%+32px)] data-[open=true]:translate-x-0"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#e4ded0] px-4 py-3">
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-[#20201c]">
              地図上の店舗をAIに相談
            </div>
            <div className="mt-0.5 text-xs text-[#79726a]">
              {storeCountLabel}をもとに回答します
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid size-9 flex-none place-items-center rounded-full border border-[#ddd4c2] bg-white text-[#4a463f] transition-colors hover:bg-[#f7f4ee]"
            aria-label="AIチャットを閉じる"
            title="AIチャットを閉じる"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col gap-3">
              <div className="text-[13px] leading-relaxed text-[#4a463f]">
                表示中の店舗を横断して、比較に入れる候補や予約前に確認すべき懸念を相談できます。
              </div>
                <QuestionList
                  questions={INITIAL_RESULTS_CHAT_QUESTIONS}
                  onAsk={ask}
                  disabled={isSending}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={
                    message.role === "user"
                      ? "ml-8 whitespace-pre-wrap break-words rounded-md bg-[#20201c] px-3 py-2 text-[13px] leading-relaxed text-[#fffdf8]"
                      : message.status === "error"
                        ? "mr-8 whitespace-pre-wrap break-words rounded-md border border-[#d8a39a] bg-[#fff5f3] px-3 py-2 text-[13px] leading-relaxed text-[#7a2f26]"
                        : "mr-8 break-words rounded-md border border-[#e4ded0] bg-white px-3 py-2 text-[13px] leading-relaxed text-[#4a463f]"
                  }
                >
                  {message.role === "assistant" ? (
                    message.status === "loading" ? (
                      <span className="inline-flex items-center gap-2 text-[#79726a]">
                        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        回答を作成しています...
                      </span>
                    ) : message.status === "error" ? (
                      message.text
                    ) : (
                      <AssistantMarkdown text={message.text} />
                    )
                  ) : (
                    message.text
                  )}
                </div>
              ))}
              {(suggestionsLoading || (aiSuggestions && aiSuggestions.length > 0)) && (
                <div className="border-t border-[#e4ded0] pt-3">
                  <div className="mb-2 text-xs font-bold text-[#79726a]">
                    次のおすすめ質問
                  </div>
                  {suggestionsLoading ? (
                    <SuggestionsSkeleton />
                  ) : (
                    <QuestionList
                      questions={aiSuggestions ?? []}
                      onAsk={ask}
                      disabled={isSending}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <form
          className="flex gap-2 border-t border-[#e4ded0] p-3"
          onSubmit={(event) => {
            event.preventDefault();
            ask(input);
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value.slice(0, 100))}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) return;
              event.preventDefault();
              ask(input);
            }}
            maxLength={400}
            rows={1}
            placeholder="地図上の候補について質問"
            className="max-h-28 min-h-10 min-w-0 flex-1 resize-none overflow-y-auto rounded-md border border-[#ddd4c2] bg-white px-3 py-2 text-[13px] leading-relaxed text-[#20201c] outline-none focus:border-[#b08424]"
          />
          {isSending ? (
            <button
              type="button"
              onClick={stopAsking}
              className="grid size-10 flex-none place-items-center rounded-md border border-[#b08424] bg-[#20201c] text-[#fffdf8] transition-colors hover:bg-[#3a352c]"
              aria-label="回答の生成を中断"
              title="回答の生成を中断"
            >
              <Square className="size-3.5 fill-current" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSendResultsChatQuestion(input)}
              className="grid size-10 flex-none place-items-center rounded-md border border-[#b08424] bg-[#b08424] text-[#20201c] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="質問を送信"
              title="質問を送信"
            >
              <Send className="size-4" aria-hidden="true" />
            </button>
          )}
        </form>
      </aside>
    </>
  );
}

function QuestionList({
  questions,
  onAsk,
  disabled,
}: {
  questions: string[];
  onAsk: (question: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      {questions.map((question) => (
        <button
          key={question}
          type="button"
          onClick={() => onAsk(question)}
          disabled={disabled}
          className="rounded-md border border-[#e4ded0] bg-[#f7f4ee] px-3 py-2 text-left text-[13px] leading-relaxed text-[#20201c] transition-colors hover:border-[#b08424] hover:bg-[#fff8e2] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {question}
        </button>
      ))}
    </div>
  );
}

function SuggestionsSkeleton() {
  return (
    <div className="grid gap-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center rounded-md border border-[#e4ded0] bg-[#f7f4ee] px-3 py-2"
        >
          <div className="h-3 w-full max-w-56 animate-pulse rounded bg-[#e4ded0]" />
        </div>
      ))}
    </div>
  );
}

function createMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function readTextStream(
  body: ReadableStream<Uint8Array>,
  onText: (text: string) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onText(text);
  }

  text += decoder.decode();
  onText(text.trim() || "回答を取得できませんでした。検索結果と比較操作はそのまま使えます。");
}

async function readErrorMessage(response: Response): Promise<string> {
  const responseClone = response.clone();
  try {
    const body = (await responseClone.json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error.trim()) {
      return `${body.error} 検索結果と比較操作はそのまま使えます。`;
    }
  } catch {
    // text fallback below
  }
  const text = await response.text().catch(() => "");
  return text.trim() || "AI回答を取得できませんでした。検索結果と比較操作はそのまま使えます。";
}
