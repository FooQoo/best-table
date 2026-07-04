import { BORDER, GOLD, INK, NAVY, hexToRgb, shade } from "~/lib/data";

export function getTheme() {
  const primary = NAVY;
  const accent = GOLD;
  const [ar, ag, ab] = hexToRgb(accent);
  const tint = (a: number) => `rgba(${ar},${ag},${ab},${a})`;

  return {
    primary,
    accent,
    primaryHover: shade(primary, 22),
    primaryActive: shade(primary, -18),
    accentHover: shade(accent, 16),
    accentActive: shade(accent, -16),
    accentSoftBg: tint(0.12),
    accentSoftBorder: tint(0.4),
    focusRing: tint(0.45),
    focusRingStrong: tint(0.65),
  };
}

export type Theme = ReturnType<typeof getTheme>;

// Style for radio-like selectable cards (counterpart, priorities, city checkboxes, budget "other" toggle).
export function radioStyle(t: Theme, selected: boolean, disabled = false) {
  if (disabled) {
    return {
      borderColor: "#eee",
      bg: "#fafafa",
      color: "#bbb",
      hoverBg: "#fafafa",
      indicatorBorder: "#eee",
      indicatorBg: "transparent",
    };
  }
  return selected
    ? {
        borderColor: t.accent,
        bg: t.primary,
        color: "#f7f4ee",
        hoverBg: t.primaryHover,
        indicatorBorder: t.accent,
        indicatorBg: t.accent,
      }
    : {
        borderColor: BORDER,
        bg: "#fff",
        color: INK,
        hoverBg: t.accentSoftBg,
        indicatorBorder: "#b8b09a",
        indicatorBg: "transparent",
      };
}

// Style for toggle buttons (store compare toggle, final-select button).
export function toggleButtonStyle(t: Theme, selected: boolean, disabled: boolean) {
  if (disabled) {
    return {
      btnBorder: "#eee",
      btnBg: "#fff",
      btnColor: "#bbb",
      indicatorBorder: "#eee",
      indicatorBg: "transparent",
    };
  }
  return selected
    ? {
        btnBorder: t.primary,
        btnBg: t.primary,
        btnColor: "#f7f4ee",
        indicatorBorder: t.accent,
        indicatorBg: t.accent,
      }
    : {
        btnBorder: BORDER,
        btnBg: "#fff",
        btnColor: INK,
        indicatorBorder: "#b8b09a",
        indicatorBg: "transparent",
      };
}
