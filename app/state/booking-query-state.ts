import {
  createSerializer,
  createParser,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  type inferParserType,
} from "nuqs";
import { useSearchParams } from "react-router";
import type { ResultsChatBookingSummary } from "~/domain/models/results-chat";
import { MAX_PRIORITY_COUNT } from "~/domain/models/restaurant";
import type { RestaurantSearchQueryCondition } from "~/server/services/restaurant-search-query";
import {
  AREA_REGIONS,
  BUDGET_STEPS,
  COUNTERPARTS,
  PRIORITIES,
} from "~/mocks/data";
import { initialBookingState } from "./booking-context";

export const BOOKING_QUERY_TEXT_MAX_LENGTH = 120;

export type BookingQueryState = {
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
};

export type BookingQuerySetters = {
  toggleCity: (city: string) => Promise<URLSearchParams> | void;
  removeArea: (city: string) => Promise<URLSearchParams>;
  setDate: (value: string) => Promise<URLSearchParams>;
  setTime: (value: string) => Promise<URLSearchParams>;
  incPeople: () => Promise<URLSearchParams>;
  decPeople: () => Promise<URLSearchParams>;
  setCounterpart: (id: string) => Promise<URLSearchParams>;
  setCounterpartOtherText: (value: string) => Promise<URLSearchParams>;
  setBudgetMin: (value: string) => Promise<URLSearchParams>;
  setBudgetMax: (value: string) => Promise<URLSearchParams>;
  toggleBudgetOther: () => Promise<URLSearchParams>;
  setBudgetOtherText: (value: string) => Promise<URLSearchParams>;
  togglePriority: (key: string) => Promise<URLSearchParams> | void;
  togglePriorityOther: () => Promise<URLSearchParams>;
  setPriorityOtherText: (value: string) => Promise<URLSearchParams>;
  setQueryState: (next: Partial<BookingQueryState>) => Promise<URLSearchParams>;
};

const VALID_AREAS = new Set(
  AREA_REGIONS.flatMap((region) =>
    region.prefectures.flatMap((prefecture) => prefecture.cities),
  ),
);
const VALID_COUNTERPARTS = new Set(COUNTERPARTS.map((item) => item.id));
const VALID_BUDGETS = new Set(BUDGET_STEPS);
const VALID_PRIORITIES = new Set(PRIORITIES.map((item) => item.key));

const arrayParser = parseAsArrayOf(parseAsString, ",");
const booleanParser = createParser({
  parse(value) {
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;
    return null;
  },
  serialize(value) {
    return value ? "true" : "false";
  },
});

export const bookingQueryParsers = {
  selectedAreas: arrayParser.withDefault(initialBookingState.selectedAreas),
  date: parseAsString.withDefault(initialBookingState.date),
  time: parseAsString.withDefault(initialBookingState.time),
  people: parseAsInteger.withDefault(initialBookingState.people),
  counterpart: parseAsString,
  counterpartOtherText: parseAsString.withDefault(
    initialBookingState.counterpartOtherText,
  ),
  budgetMin: parseAsString.withDefault(initialBookingState.budgetMin),
  budgetMax: parseAsString.withDefault(initialBookingState.budgetMax),
  budgetOtherOn: booleanParser.withDefault(initialBookingState.budgetOtherOn),
  budgetOtherText: parseAsString.withDefault(initialBookingState.budgetOtherText),
  priorities: arrayParser.withDefault(initialBookingState.priorities),
  priorityOtherOn: booleanParser.withDefault(
    initialBookingState.priorityOtherOn,
  ),
  priorityOtherText: parseAsString.withDefault(
    initialBookingState.priorityOtherText,
  ),
};

export const bookingQueryUrlKeys = {
  selectedAreas: "areas",
  date: "date",
  time: "time",
  people: "people",
  counterpart: "counterpart",
  counterpartOtherText: "counterpartText",
  budgetMin: "budgetMin",
  budgetMax: "budgetMax",
  budgetOtherOn: "budgetOther",
  budgetOtherText: "budgetText",
  priorities: "priorities",
  priorityOtherOn: "priorityOther",
  priorityOtherText: "priorityText",
} as const;

type RawBookingQueryState = inferParserType<typeof bookingQueryParsers>;

export const bookingQuerySerializer = createSerializer(bookingQueryParsers, {
  urlKeys: bookingQueryUrlKeys,
});

export function serializeBookingQueryToSearchParams(
  query: Partial<BookingQueryState>,
): URLSearchParams {
  return new URLSearchParams(bookingQuerySerializer(query).replace(/^\?/, ""));
}

export function parseBookingQueryFromSearchParams(
  searchParams: URLSearchParams,
): BookingQueryState {
  const raw: RawBookingQueryState = {
    selectedAreas:
      bookingQueryParsers.selectedAreas.parseServerSide(
        searchParams.get(bookingQueryUrlKeys.selectedAreas) ?? undefined,
      ),
    date: bookingQueryParsers.date.parseServerSide(
      searchParams.get(bookingQueryUrlKeys.date) ?? undefined,
    ),
    time: bookingQueryParsers.time.parseServerSide(
      searchParams.get(bookingQueryUrlKeys.time) ?? undefined,
    ),
    people: bookingQueryParsers.people.parseServerSide(
      searchParams.get(bookingQueryUrlKeys.people) ?? undefined,
    ),
    counterpart: bookingQueryParsers.counterpart.parseServerSide(
      searchParams.get(bookingQueryUrlKeys.counterpart) ?? undefined,
    ),
    counterpartOtherText:
      bookingQueryParsers.counterpartOtherText.parseServerSide(
        searchParams.get(bookingQueryUrlKeys.counterpartOtherText) ?? undefined,
      ),
    budgetMin: bookingQueryParsers.budgetMin.parseServerSide(
      searchParams.get(bookingQueryUrlKeys.budgetMin) ?? undefined,
    ),
    budgetMax: bookingQueryParsers.budgetMax.parseServerSide(
      searchParams.get(bookingQueryUrlKeys.budgetMax) ?? undefined,
    ),
    budgetOtherOn: bookingQueryParsers.budgetOtherOn.parseServerSide(
      searchParams.get(bookingQueryUrlKeys.budgetOtherOn) ?? undefined,
    ),
    budgetOtherText: bookingQueryParsers.budgetOtherText.parseServerSide(
      searchParams.get(bookingQueryUrlKeys.budgetOtherText) ?? undefined,
    ),
    priorities: bookingQueryParsers.priorities.parseServerSide(
      searchParams.get(bookingQueryUrlKeys.priorities) ?? undefined,
    ),
    priorityOtherOn: bookingQueryParsers.priorityOtherOn.parseServerSide(
      searchParams.get(bookingQueryUrlKeys.priorityOtherOn) ?? undefined,
    ),
    priorityOtherText: bookingQueryParsers.priorityOtherText.parseServerSide(
      searchParams.get(bookingQueryUrlKeys.priorityOtherText) ?? undefined,
    ),
  };

  return normalizeBookingQuery(raw);
}

export function normalizeBookingQuery(
  value: Partial<BookingQueryState>,
): BookingQueryState {
  const selectedAreas = normalizeUniqueStrings(
    value.selectedAreas,
    VALID_AREAS,
    initialBookingState.selectedAreas,
  );
  const priorities = normalizeUniqueStrings(
    value.priorities,
    VALID_PRIORITIES,
    initialBookingState.priorities,
  ).slice(0, MAX_PRIORITY_COUNT);
  const counterpart =
    typeof value.counterpart === "string" && VALID_COUNTERPARTS.has(value.counterpart)
      ? value.counterpart
      : null;

  return {
    selectedAreas,
    date: normalizeText(value.date, initialBookingState.date),
    time: normalizeText(value.time, initialBookingState.time),
    people: normalizePeople(value.people),
    counterpart,
    counterpartOtherText: normalizeText(
      value.counterpartOtherText,
      initialBookingState.counterpartOtherText,
    ),
    budgetMin: normalizeSetValue(
      value.budgetMin,
      VALID_BUDGETS,
      initialBookingState.budgetMin,
    ),
    budgetMax: normalizeSetValue(
      value.budgetMax,
      VALID_BUDGETS,
      initialBookingState.budgetMax,
    ),
    budgetOtherOn: value.budgetOtherOn === true,
    budgetOtherText: normalizeText(
      value.budgetOtherText,
      initialBookingState.budgetOtherText,
    ),
    priorities,
    priorityOtherOn: value.priorityOtherOn === true,
    priorityOtherText: normalizeText(
      value.priorityOtherText,
      initialBookingState.priorityOtherText,
    ),
  };
}

export function useBookingQuery(): BookingQueryState & BookingQuerySetters {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = parseBookingQueryFromSearchParams(searchParams);

  const setQueryState = (next: Partial<BookingQueryState>) => {
    const normalized = normalizeBookingQuery({ ...state, ...next });
    const nextParams = serializeBookingQueryToSearchParams(normalized);
    setSearchParams(nextParams, { replace: true });
    return Promise.resolve(nextParams);
  };

  return {
    ...state,
    setQueryState,
    toggleCity: (city) => {
      if (!VALID_AREAS.has(city)) return;
      const selectedAreas = state.selectedAreas.includes(city)
        ? state.selectedAreas.filter((area) => area !== city)
        : [...state.selectedAreas, city];
      return setQueryState({ selectedAreas });
    },
    removeArea: (city) => {
      return setQueryState({
        selectedAreas: state.selectedAreas.filter((area) => area !== city),
      });
    },
    setDate: (date) => setQueryState({ date }),
    setTime: (time) => setQueryState({ time }),
    incPeople: () => setQueryState({ people: state.people + 1 }),
    decPeople: () => setQueryState({ people: Math.max(1, state.people - 1) }),
    setCounterpart: (counterpart) => setQueryState({ counterpart }),
    setCounterpartOtherText: (counterpartOtherText) =>
      setQueryState({ counterpartOtherText }),
    setBudgetMin: (budgetMin) => setQueryState({ budgetMin }),
    setBudgetMax: (budgetMax) => setQueryState({ budgetMax }),
    toggleBudgetOther: () =>
      setQueryState({ budgetOtherOn: !state.budgetOtherOn }),
    setBudgetOtherText: (budgetOtherText) => setQueryState({ budgetOtherText }),
    togglePriority: (key) => {
      if (!VALID_PRIORITIES.has(key)) return;
      const has = state.priorities.includes(key);
      if (has) {
        return setQueryState({
          priorities: state.priorities.filter((priority) => priority !== key),
        });
      }
      if (state.priorities.length >= MAX_PRIORITY_COUNT) return;
      return setQueryState({ priorities: [...state.priorities, key] });
    },
    togglePriorityOther: () =>
      setQueryState({ priorityOtherOn: !state.priorityOtherOn }),
    setPriorityOtherText: (priorityOtherText) =>
      setQueryState({ priorityOtherText }),
  };
}

export function toRestaurantSearchCondition(
  query: BookingQueryState,
  searchCenter: { latitude: number; longitude: number } | null = null,
): RestaurantSearchQueryCondition {
  return {
    selectedAreas: query.selectedAreas,
    searchLatLng: searchCenter,
    date: query.date,
    time: query.time,
    people: query.people,
    budgetMin: query.budgetMin,
    budgetMax: query.budgetMax,
    budgetOtherOn: query.budgetOtherOn,
    budgetOtherText: query.budgetOtherText,
    priorities: query.priorities,
    priorityOtherOn: query.priorityOtherOn,
    priorityOtherText: query.priorityOtherText,
    counterpart: query.counterpart,
    counterpartOtherText: query.counterpartOtherText,
  };
}

export function toResultsChatBookingSummary(
  query: BookingQueryState,
): ResultsChatBookingSummary {
  return {
    selectedAreas: query.selectedAreas,
    date: query.date,
    time: query.time,
    people: query.people,
    budgetMin: query.budgetMin,
    budgetMax: query.budgetMax,
    budgetOtherOn: query.budgetOtherOn,
    budgetOtherText: query.budgetOtherText,
    priorities: query.priorities,
    priorityOtherOn: query.priorityOtherOn,
    priorityOtherText: query.priorityOtherText,
    counterpart: query.counterpart,
    counterpartOtherText: query.counterpartOtherText,
  };
}

export function getSearchConditionKey(query: BookingQueryState): string {
  return JSON.stringify(toRestaurantSearchCondition(query));
}

function normalizeUniqueStrings(
  values: unknown,
  allowed: Set<string>,
  fallback: string[],
): string[] {
  if (!Array.isArray(values)) return fallback;
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!allowed.has(trimmed) || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }
  return normalized.length ? normalized : fallback;
}

function normalizeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, BOOKING_QUERY_TEXT_MAX_LENGTH);
}

function normalizeSetValue(
  value: unknown,
  allowed: Set<string>,
  fallback: string,
): string {
  if (typeof value !== "string") return fallback;
  return allowed.has(value) ? value : fallback;
}

function normalizePeople(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return initialBookingState.people;
  }
  return Math.max(1, Math.floor(value));
}
