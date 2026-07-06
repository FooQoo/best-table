import { useCallback, useMemo, type ReactNode } from "react";
import { Provider as JotaiProvider, atom, useAtom } from "jotai";
import {
  MAX_COMPARE_COUNT,
  MAX_PRIORITY_COUNT,
  type Restaurant,
} from "~/domain/models/restaurant";

export type BookingState = {
  selectedAreas: string[];
  date: string;
  time: string;
  people: number;

  counterpart: string | null;
  counterpartOtherText: string;

  budgetMin: string;
  budgetMax: string;
  budgetOtherOn: boolean;
  budgetOtherText: string;

  priorities: string[];
  priorityOtherOn: boolean;
  priorityOtherText: string;

  compareIds: string[];

  // UoW-7: /results が実検索(app/server/services/restaurant-search.ts)から取得した結果。
  // /results 内の詳細パネル・比較サイドパネルは再検索せず、この一覧から id で参照する。
  restaurants: Restaurant[];
};

export const initialBookingState: BookingState = {
  selectedAreas: ["銀座"],
  date: "2026-07-15",
  time: "19:00",
  people: 4,

  counterpart: null,
  counterpartOtherText: "",

  budgetMin: "指定なし",
  budgetMax: "指定なし",
  budgetOtherOn: false,
  budgetOtherText: "",

  priorities: [],
  priorityOtherOn: false,
  priorityOtherText: "",

  compareIds: [],

  restaurants: [],
};

export const bookingAtom = atom<BookingState>(initialBookingState);

type BookingActions = {
  toggleCity: (city: string) => void;
  removeArea: (city: string) => void;
  setDate: (v: string) => void;
  setTime: (v: string) => void;
  incPeople: () => void;
  decPeople: () => void;
  setCounterpart: (id: string) => void;
  setCounterpartOtherText: (v: string) => void;
  setBudgetMin: (v: string) => void;
  setBudgetMax: (v: string) => void;
  toggleBudgetOther: () => void;
  setBudgetOtherText: (v: string) => void;
  togglePriority: (key: string) => void;
  togglePriorityOther: () => void;
  setPriorityOtherText: (v: string) => void;
  toggleCompare: (id: string) => void;
  setRestaurants: (restaurants: Restaurant[]) => void;
  appendRestaurants: (restaurants: Restaurant[]) => void;
  resetForNewChat: () => void;
};

type BookingValue = BookingActions & {
  state: BookingState;
};

export function BookingProvider({ children }: { children: ReactNode }) {
  return <JotaiProvider>{children}</JotaiProvider>;
}

export function useBooking(): BookingValue {
  const [state, setState] = useAtom(bookingAtom);

  const toggleCity = useCallback(
    (city: string) =>
      setState((s) => {
        const has = s.selectedAreas.includes(city);
        return {
          ...s,
          selectedAreas: has
            ? s.selectedAreas.filter((x) => x !== city)
            : [...s.selectedAreas, city],
        };
      }),
    [setState],
  );

  const removeArea = useCallback(
    (city: string) =>
      setState((s) => ({
        ...s,
        selectedAreas: s.selectedAreas.filter((x) => x !== city),
      })),
    [setState],
  );

  const setDate = useCallback(
    (v: string) => setState((s) => ({ ...s, date: v })),
    [setState],
  );
  const setTime = useCallback(
    (v: string) => setState((s) => ({ ...s, time: v })),
    [setState],
  );
  const incPeople = useCallback(
    () => setState((s) => ({ ...s, people: s.people + 1 })),
    [setState],
  );
  const decPeople = useCallback(
    () => setState((s) => ({ ...s, people: Math.max(1, s.people - 1) })),
    [setState],
  );
  const setCounterpart = useCallback(
    (id: string) => setState((s) => ({ ...s, counterpart: id })),
    [setState],
  );
  const setCounterpartOtherText = useCallback(
    (v: string) => setState((s) => ({ ...s, counterpartOtherText: v })),
    [setState],
  );
  const setBudgetMin = useCallback(
    (v: string) => setState((s) => ({ ...s, budgetMin: v })),
    [setState],
  );
  const setBudgetMax = useCallback(
    (v: string) => setState((s) => ({ ...s, budgetMax: v })),
    [setState],
  );
  const toggleBudgetOther = useCallback(
    () => setState((s) => ({ ...s, budgetOtherOn: !s.budgetOtherOn })),
    [setState],
  );
  const setBudgetOtherText = useCallback(
    (v: string) => setState((s) => ({ ...s, budgetOtherText: v })),
    [setState],
  );

  const togglePriority = useCallback(
    (key: string) =>
      setState((s) => {
        const has = s.priorities.includes(key);
        if (has)
          return { ...s, priorities: s.priorities.filter((x) => x !== key) };
        if (s.priorities.length >= MAX_PRIORITY_COUNT) return s;
        return { ...s, priorities: [...s.priorities, key] };
      }),
    [setState],
  );

  const togglePriorityOther = useCallback(
    () => setState((s) => ({ ...s, priorityOtherOn: !s.priorityOtherOn })),
    [setState],
  );
  const setPriorityOtherText = useCallback(
    (v: string) => setState((s) => ({ ...s, priorityOtherText: v })),
    [setState],
  );

  const toggleCompare = useCallback(
    (id: string) =>
      setState((s) => {
        const has = s.compareIds.includes(id);
        if (has)
          return { ...s, compareIds: s.compareIds.filter((x) => x !== id) };
        if (s.compareIds.length >= MAX_COMPARE_COUNT) return s;
        return { ...s, compareIds: [...s.compareIds, id] };
      }),
    [setState],
  );

  const setRestaurants = useCallback(
    (restaurants: Restaurant[]) =>
      setState((s) => ({ ...s, restaurants })),
    [setState],
  );

  const appendRestaurants = useCallback(
    (restaurants: Restaurant[]) =>
      setState((s) => {
        const seenIds = new Set(s.restaurants.map((restaurant) => restaurant.id));
        const nextRestaurants = restaurants.filter((restaurant) => {
          if (seenIds.has(restaurant.id)) return false;
          seenIds.add(restaurant.id);
          return true;
        });
        return { ...s, restaurants: [...s.restaurants, ...nextRestaurants] };
      }),
    [setState],
  );

  const resetForNewChat = useCallback(
    () =>
      setState((s) => ({
        ...s,
        counterpart: null,
        counterpartOtherText: "",
        budgetMin: initialBookingState.budgetMin,
        budgetMax: initialBookingState.budgetMax,
        budgetOtherOn: initialBookingState.budgetOtherOn,
        budgetOtherText: initialBookingState.budgetOtherText,
        priorities: [],
        priorityOtherOn: false,
        priorityOtherText: "",
        compareIds: [],
        restaurants: [],
      })),
    [setState],
  );

  return useMemo(
    () => ({
      state,
      toggleCity,
      removeArea,
      setDate,
      setTime,
      incPeople,
      decPeople,
      setCounterpart,
      setCounterpartOtherText,
      setBudgetMin,
      setBudgetMax,
      toggleBudgetOther,
      setBudgetOtherText,
      togglePriority,
      togglePriorityOther,
      setPriorityOtherText,
      toggleCompare,
      setRestaurants,
      appendRestaurants,
      resetForNewChat,
    }),
    [
      state,
      toggleCity,
      removeArea,
      setDate,
      setTime,
      incPeople,
      decPeople,
      setCounterpart,
      setCounterpartOtherText,
      setBudgetMin,
      setBudgetMax,
      toggleBudgetOther,
      setBudgetOtherText,
      togglePriority,
      togglePriorityOther,
      setPriorityOtherText,
      toggleCompare,
      setRestaurants,
      appendRestaurants,
      resetForNewChat,
    ],
  );
}
