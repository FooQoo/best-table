import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

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

const initialState: BookingState = {
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

type BookingContextValue = {
  state: BookingState;
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

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BookingState>(initialState);

  const value = useMemo<BookingContextValue>(
    () => ({
      state,
      toggleCity: (city) =>
        setState((s) => {
          const has = s.selectedAreas.includes(city);
          return { ...s, selectedAreas: has ? s.selectedAreas.filter((x) => x !== city) : [...s.selectedAreas, city] };
        }),
      removeArea: (city) => setState((s) => ({ ...s, selectedAreas: s.selectedAreas.filter((x) => x !== city) })),
      setDate: (v) => setState((s) => ({ ...s, date: v })),
      setTime: (v) => setState((s) => ({ ...s, time: v })),
      incPeople: () => setState((s) => ({ ...s, people: s.people + 1 })),
      decPeople: () => setState((s) => ({ ...s, people: Math.max(1, s.people - 1) })),
      setCounterpart: (id) => setState((s) => ({ ...s, counterpart: id })),
      setCounterpartOtherText: (v) => setState((s) => ({ ...s, counterpartOtherText: v })),
      setBudgetMin: (v) => setState((s) => ({ ...s, budgetMin: v })),
      setBudgetMax: (v) => setState((s) => ({ ...s, budgetMax: v })),
      toggleBudgetOther: () => setState((s) => ({ ...s, budgetOtherOn: !s.budgetOtherOn })),
      setBudgetOtherText: (v) => setState((s) => ({ ...s, budgetOtherText: v })),
      togglePriority: (key) =>
        setState((s) => {
          const has = s.priorities.includes(key);
          if (has) return { ...s, priorities: s.priorities.filter((x) => x !== key) };
          if (s.priorities.length >= 3) return s;
          return { ...s, priorities: [...s.priorities, key] };
        }),
      togglePriorityOther: () => setState((s) => ({ ...s, priorityOtherOn: !s.priorityOtherOn })),
      setPriorityOtherText: (v) => setState((s) => ({ ...s, priorityOtherText: v })),
      toggleCompare: (id) =>
        setState((s) => {
          const has = s.compareIds.includes(id);
          if (has) return { ...s, compareIds: s.compareIds.filter((x) => x !== id) };
          if (s.compareIds.length >= 5) return s;
          return { ...s, compareIds: [...s.compareIds, id] };
        }),
      selectFinalStore: (id) => setState((s) => ({ ...s, finalStoreId: s.finalStoreId === id ? null : id })),
      resetForNewChat: () =>
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
    }),
    [state],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within a BookingProvider");
  return ctx;
}
