import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import { initialBookingState } from "./booking-context";
import {
  BOOKING_QUERY_TEXT_MAX_LENGTH,
  bookingQuerySerializer,
  getSearchConditionKey,
  normalizeBookingQuery,
  parseBookingQueryFromSearchParams,
  toResultsChatBookingSummary,
  toRestaurantSearchCondition,
  useBookingQuery,
} from "./booking-query-state";

describe("booking query state", () => {
  it("空 query は検索・会食条件の初期値へ復元する", () => {
    expect(parseBookingQueryFromSearchParams(new URLSearchParams())).toEqual({
      selectedAreas: initialBookingState.selectedAreas,
      date: initialBookingState.date,
      time: initialBookingState.time,
      people: initialBookingState.people,
      counterpart: initialBookingState.counterpart,
      counterpartOtherText: initialBookingState.counterpartOtherText,
      budgetMin: initialBookingState.budgetMin,
      budgetMax: initialBookingState.budgetMax,
      budgetOtherOn: initialBookingState.budgetOtherOn,
      budgetOtherText: initialBookingState.budgetOtherText,
      priorities: initialBookingState.priorities,
      priorityOtherOn: initialBookingState.priorityOtherOn,
      priorityOtherText: initialBookingState.priorityOtherText,
    });
  });

  it("配列・number・boolean を query から復元する", () => {
    const params = new URLSearchParams(
      "areas=%E9%8A%80%E5%BA%A7,%E5%85%AD%E6%9C%AC%E6%9C%A8&people=6&budgetOther=1&priorityOther=true&priorities=calm,room",
    );

    expect(parseBookingQueryFromSearchParams(params)).toMatchObject({
      selectedAreas: ["銀座", "六本木"],
      people: 6,
      budgetOtherOn: true,
      priorityOtherOn: true,
      priorities: ["calm", "room"],
    });
  });

  it("不正な固定語彙と上限超過を正規化する", () => {
    const normalized = normalizeBookingQuery({
      selectedAreas: ["銀座", "未知のエリア", "六本木"],
      date: "2026-07-20",
      time: "19:30",
      people: 0,
      counterpart: "unknown",
      counterpartOtherText: " 重要な相手 ",
      budgetMin: "bad",
      budgetMax: "¥30,000",
      budgetOtherOn: false,
      budgetOtherText: " 1人2万円 ",
      priorities: ["calm", "bad", "room", "prestige", "service"],
      priorityOtherOn: false,
      priorityOtherText: " 静かな席 ",
    });

    expect(normalized).toMatchObject({
      selectedAreas: ["銀座", "六本木"],
      people: 1,
      counterpart: null,
      counterpartOtherText: "重要な相手",
      budgetMin: initialBookingState.budgetMin,
      budgetMax: "¥30,000",
      priorities: ["calm", "room", "prestige"],
      priorityOtherText: "静かな席",
    });
  });

  it("自由入力を trim し長さ上限で切り詰める", () => {
    const longText = ` ${"あ".repeat(BOOKING_QUERY_TEXT_MAX_LENGTH + 10)} `;

    const normalized = normalizeBookingQuery({
      ...initialBookingState,
      counterpartOtherText: longText,
      budgetOtherText: longText,
      priorityOtherText: longText,
    });

    expect(normalized.counterpartOtherText).toHaveLength(
      BOOKING_QUERY_TEXT_MAX_LENGTH,
    );
    expect(normalized.budgetOtherText).toHaveLength(
      BOOKING_QUERY_TEXT_MAX_LENGTH,
    );
    expect(normalized.priorityOtherText).toHaveLength(
      BOOKING_QUERY_TEXT_MAX_LENGTH,
    );
  });

  it("検索 API 条件と AI チャット summary を同じ query state から作る", () => {
    const query = normalizeBookingQuery({
      ...initialBookingState,
      selectedAreas: ["六本木"],
      people: 3,
      counterpart: "exec",
      priorities: ["room", "service"],
    });

    expect(toRestaurantSearchCondition(query)).toMatchObject({
      selectedAreas: ["六本木"],
      searchLatLng: null,
      people: 3,
      counterpart: "exec",
      priorities: ["room", "service"],
    });
    expect(toResultsChatBookingSummary(query)).toEqual({
      selectedAreas: ["六本木"],
      date: query.date,
      time: query.time,
      people: 3,
      budgetMin: query.budgetMin,
      budgetMax: query.budgetMax,
      budgetOtherOn: query.budgetOtherOn,
      budgetOtherText: query.budgetOtherText,
      priorities: ["room", "service"],
      priorityOtherOn: query.priorityOtherOn,
      priorityOtherText: query.priorityOtherText,
      counterpart: "exec",
      counterpartOtherText: query.counterpartOtherText,
    });
  });

  it("serializer は検索条件だけを query に出力する", () => {
    const query = bookingQuerySerializer({
      selectedAreas: ["銀座", "六本木"],
      people: 5,
      counterpart: "boss",
      priorities: ["budget"],
    });

    expect(query).toContain("areas=");
    expect(query).toContain("people=5");
    expect(query).toContain("counterpart=boss");
    expect(query).toContain("priorities=budget");
    expect(query).not.toContain("compareIds");
    expect(query).not.toContain("restaurants");
  });

  it("検索条件 key は同じ条件なら安定し条件変更で変わる", () => {
    const base = normalizeBookingQuery({
      ...initialBookingState,
      selectedAreas: ["銀座", "六本木"],
      priorities: ["calm", "room"],
    });
    const same = normalizeBookingQuery({ ...base });
    const changed = normalizeBookingQuery({ ...base, people: base.people + 1 });

    expect(getSearchConditionKey(base)).toBe(getSearchConditionKey(same));
    expect(getSearchConditionKey(base)).not.toBe(
      getSearchConditionKey(changed),
    );
  });

  it("useBookingQuery は基本条件の操作を URL query に反映する", async () => {
    const { result } = renderHook(() => useBookingQuery(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MemoryRouter>{children}</MemoryRouter>
      ),
    });

    await act(async () => {
      await result.current.toggleCity("六本木");
    });
    await waitFor(() => expect(result.current.selectedAreas).toContain("六本木"));
    await act(async () => {
      await result.current.setDate("2026-07-20");
    });
    await waitFor(() => expect(result.current.date).toBe("2026-07-20"));
    await act(async () => {
      await result.current.setTime("20:00");
    });
    await waitFor(() => expect(result.current.time).toBe("20:00"));
    await act(async () => {
      await result.current.incPeople();
    });

    await waitFor(() => {
      expect(result.current.selectedAreas).toContain("六本木");
      expect(result.current.date).toBe("2026-07-20");
      expect(result.current.time).toBe("20:00");
      expect(result.current.people).toBe(initialBookingState.people + 1);
    });
    expect(result.current.people).toBe(5);
  });

  it("useBookingQuery はヒアリング条件を URL query から復元し操作で更新する", async () => {
    const { result } = renderHook(() => useBookingQuery(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MemoryRouter
          initialEntries={[
            "/hearing?counterpart=exec&budgetMin=%C2%A510%2C000&priorities=room,service",
          ]}
        >
          {children}
        </MemoryRouter>
      ),
    });

    expect(result.current.counterpart).toBe("exec");
    expect(result.current.budgetMin).toBe("¥10,000");
    expect(result.current.priorities).toEqual(["room", "service"]);

    await act(async () => {
      await result.current.setCounterpart("boss");
    });
    await waitFor(() => expect(result.current.counterpart).toBe("boss"));
    await act(async () => {
      await result.current.toggleBudgetOther();
    });
    await waitFor(() => expect(result.current.budgetOtherOn).toBe(true));
    await act(async () => {
      await result.current.setBudgetOtherText("1人2万円まで");
    });
    await waitFor(() =>
      expect(result.current.budgetOtherText).toBe("1人2万円まで"),
    );
    await act(async () => {
      await result.current.togglePriority("budget");
    });

    await waitFor(() => {
      expect(result.current.counterpart).toBe("boss");
      expect(result.current.budgetOtherOn).toBe(true);
      expect(result.current.budgetOtherText).toBe("1人2万円まで");
      expect(result.current.priorities).toEqual(["room", "service", "budget"]);
    });
    expect(result.current.counterpart).toBe("boss");
  });
});
