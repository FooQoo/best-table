import { useCallback, useMemo, type ReactNode } from "react";
import { Provider as JotaiProvider, atom, useAtom } from "jotai";
import {
  MAX_COMPARE_COUNT,
  MAX_PRIORITY_COUNT,
  type Restaurant,
} from "~/domain/models/restaurant";
import { getRestaurantDeduplicationKey } from "~/utils/restaurant-deduplication";

export type BookingState = {
  compareIds: string[];

  // UoW-7: /results が実検索(app/server/services/restaurant-search.ts)から取得した結果。
  // /results 内の詳細パネル・比較サイドパネルは再検索せず、この一覧から id で参照する。
  restaurants: Restaurant[];
};

export const initialBookingState: BookingState = {
  compareIds: [],
  restaurants: [],
};

export const bookingAtom = atom<BookingState>(initialBookingState);

type BookingActions = {
  toggleCompare: (id: string) => void;
  setRestaurants: (restaurants: Restaurant[]) => void;
  appendRestaurants: (restaurants: Restaurant[]) => void;
  updateRestaurant: (restaurant: Restaurant) => void;
  clearCompareIds: () => void;
  clearTransientResultsState: () => void;
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
    (restaurants: Restaurant[]) => setState((s) => ({ ...s, restaurants })),
    [setState],
  );

  const appendRestaurants = useCallback(
    (restaurants: Restaurant[]) =>
      setState((s) => {
        const seenKeys = new Set(
          s.restaurants.map((restaurant) =>
            getRestaurantDeduplicationKey(restaurant),
          ),
        );
        const nextRestaurants = restaurants.filter((restaurant) => {
          const key = getRestaurantDeduplicationKey(restaurant);
          if (seenKeys.has(key)) return false;
          seenKeys.add(key);
          return true;
        });
        return { ...s, restaurants: [...s.restaurants, ...nextRestaurants] };
      }),
    [setState],
  );

  const updateRestaurant = useCallback(
    (restaurant: Restaurant) =>
      setState((s) => ({
        ...s,
        restaurants: s.restaurants.map((r) =>
          getRestaurantDeduplicationKey(r) ===
          getRestaurantDeduplicationKey(restaurant)
            ? restaurant
            : r,
        ),
      })),
    [setState],
  );

  const clearCompareIds = useCallback(
    () => setState((s) => ({ ...s, compareIds: [] })),
    [setState],
  );

  const clearTransientResultsState = useCallback(
    () => setState((s) => ({ ...s, compareIds: [], restaurants: [] })),
    [setState],
  );

  const resetForNewChat = useCallback(
    () =>
      setState(() => ({
        ...initialBookingState,
      })),
    [setState],
  );

  return useMemo(
    () => ({
      state,
      toggleCompare,
      setRestaurants,
      appendRestaurants,
      updateRestaurant,
      clearCompareIds,
      clearTransientResultsState,
      resetForNewChat,
    }),
    [
      state,
      toggleCompare,
      setRestaurants,
      appendRestaurants,
      updateRestaurant,
      clearCompareIds,
      clearTransientResultsState,
      resetForNewChat,
    ],
  );
}
