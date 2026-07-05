import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import type { Restaurant } from "~/domain/models/restaurant";
import type { ResultsChatBookingSummary } from "~/domain/models/results-chat";
import {
  buildResultsChatRequest,
  canSendResultsChatQuestion,
  ResultsAiChat,
} from "./results-ai-chat";

const stores = [
  {
    id: "a",
    placeId: "places/a",
    name: "銀座 接待店 A",
    area: "銀座",
    address: null,
    location: null,
    phone: null,
    photoUrl: null,
    genre: null,
    score: null,
    room: null,
    quiet: null,
    prestige: null,
    service: null,
    access: null,
    budgetLabel: null,
    concerns: [],
    matchingSummary: null,
    evidence: [],
    confidence: null,
    generatedAt: null,
  },
] as Restaurant[];

const bookingSummary: ResultsChatBookingSummary = {
  selectedAreas: ["銀座"],
  date: "2026-07-15",
  time: "19:00",
  people: 4,
  budgetMin: "指定なし",
  budgetMax: "指定なし",
  budgetOtherOn: false,
  budgetOtherText: "",
  priorities: ["room"],
  priorityOtherOn: false,
  priorityOtherText: "",
  counterpart: "exec",
  counterpartOtherText: "",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("canSendResultsChatQuestion", () => {
  it("accepts non-empty questions within the API limit", () => {
    expect(canSendResultsChatQuestion("比較に入れるべき店は？")).toBe(true);
    expect(canSendResultsChatQuestion("  ")).toBe(false);
    expect(canSendResultsChatQuestion("あ".repeat(401))).toBe(false);
  });
});

describe("buildResultsChatRequest", () => {
  it("trims the question and keeps visible restaurants plus hearing summary", () => {
    const request = buildResultsChatRequest({
      question: " 比較に入れるべき店は？ ",
      stores,
      bookingSummary,
    });

    expect(request.question).toBe("比較に入れるべき店は？");
    expect(request.restaurants[0].name).toBe("銀座 接待店 A");
    expect(request.bookingSummary.counterpart).toBe("exec");
  });
});

describe("ResultsAiChat", () => {
  it("opens the map chat panel and sends an FAQ question to the results chat API", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response("Ginza Rokusantei を比較候補にできます。"),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      createElement(ResultsAiChat, {
        stores,
        bookingSummary,
      }),
    );

    await user.click(
      screen.getByRole("button", { name: "AIに地図上の店舗を相談する" }),
    );

    expect(screen.getByLabelText("地図上の店舗をAIに相談")).toHaveAttribute(
      "data-open",
      "true",
    );

    await user.click(
      screen.getByRole("button", {
        name: "この条件なら、まず比較に入れるべき店はどれですか？",
      }),
    );

    expect(await screen.findByText("Ginza Rokusantei を比較候補にできます。")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/results/chat",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(requestInit.body as string);
    expect(body.restaurants[0].name).toBe("銀座 接待店 A");
    expect(body.bookingSummary.counterpart).toBe("exec");
  });

  it("keeps failures inside the chat panel", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: "相談できる表示中店舗がありません。" },
          { status: 400 },
        ),
      ),
    );

    render(
      createElement(ResultsAiChat, {
        stores: [],
        bookingSummary,
      }),
    );

    await user.click(
      screen.getByRole("button", { name: "AIに地図上の店舗を相談する" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "この条件なら、まず比較に入れるべき店はどれですか？",
      }),
    );

    expect(
      await screen.findByText(
        "相談できる表示中店舗がありません。 検索結果と比較操作はそのまま使えます。",
      ),
    ).toBeInTheDocument();
  });

  it("shows a stop button while waiting and lets the user cancel generation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      createElement(ResultsAiChat, {
        stores,
        bookingSummary,
      }),
    );

    await user.click(
      screen.getByRole("button", { name: "AIに地図上の店舗を相談する" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "この条件なら、まず比較に入れるべき店はどれですか？",
      }),
    );

    const stopButton = await screen.findByRole("button", {
      name: "回答の生成を中断",
    });
    await user.click(stopButton);

    expect(
      await screen.findByText("回答の生成を中断しました。"),
    ).toBeInTheDocument();
  });
});
