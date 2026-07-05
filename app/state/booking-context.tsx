import { useCallback, useMemo, type ReactNode } from "react";
import { Provider as JotaiProvider, atom, useAtom } from "jotai";

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
  finalStoreId: string | null;
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
  finalStoreId: null,
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
  selectFinalStore: (id: string) => void;
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
        if (s.priorities.length >= 3) return s;
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
        if (s.compareIds.length >= 5) return s;
        return { ...s, compareIds: [...s.compareIds, id] };
      }),
    [setState],
  );

  const selectFinalStore = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        finalStoreId: s.finalStoreId === id ? null : id,
      })),
    [setState],
  );

  const resetForNewChat = useCallback(
    () =>
      setState((s) => ({
        ...s,
        counterpart: null,
        counterpartOtherText: "",
        priorities: [],
        priorityOtherOn: false,
        priorityOtherText: "",
        compareIds: [],
        finalStoreId: null,
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
      selectFinalStore,
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
      selectFinalStore,
      resetForNewChat,
    ],
  );
}
