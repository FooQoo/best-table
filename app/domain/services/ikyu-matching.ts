import type { IkyuListing } from "~/domain/models/ikyu-listing";
import type { IkyuReferral } from "~/domain/models/restaurant";

// docs/MODEL.md「IkyuMatchingService」: 施設検索で得た候補と一休掲載店マスタを
// 照合する純粋関数。外部 I/O を持たない（Client/Server 両方から参照可能）。
export type IkyuMatchCandidate = {
  placeId: string | null;
  phone: string | null;
  name: string;
  address: string | null;
};

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

// 強いキー（placeId・電話番号）が両者に存在し、かつ値が異なる場合は矛盾とみなし、
// 弱いキーでの一致を採用しない（同じ電話番号を複数店舗が共有する等の誤爆を避ける）。
function conflictsOnPlaceId(
  candidate: IkyuMatchCandidate,
  listing: IkyuListing,
): boolean {
  return (
    candidate.placeId !== null &&
    listing.placeId !== null &&
    candidate.placeId !== listing.placeId
  );
}

function conflictsOnPhone(
  candidate: IkyuMatchCandidate,
  listing: IkyuListing,
): boolean {
  const candidatePhone = normalizePhone(candidate.phone);
  const listingPhone = normalizePhone(listing.phone);
  return (
    candidatePhone !== null &&
    listingPhone !== null &&
    candidatePhone !== listingPhone
  );
}

// 照合キーの優先順: placeId → 電話番号（正規化） → 店名+住所。
// どのキーでも一致しない場合は null（除外はしない。呼び出し側で Restaurant.ikyu に
// そのまま反映する）。
export function matchIkyuListing(
  candidate: IkyuMatchCandidate,
  listings: readonly IkyuListing[],
): IkyuReferral | null {
  if (candidate.placeId) {
    const found = listings.find(
      (listing) =>
        listing.placeId !== null && listing.placeId === candidate.placeId,
    );
    if (found) return { url: found.url, matchedBy: "placeId" };
  }

  const candidatePhone = normalizePhone(candidate.phone);
  if (candidatePhone) {
    const found = listings.find((listing) => {
      if (conflictsOnPlaceId(candidate, listing)) return false;
      return normalizePhone(listing.phone) === candidatePhone;
    });
    if (found) return { url: found.url, matchedBy: "phone" };
  }

  if (candidate.address) {
    const found = listings.find((listing) => {
      if (conflictsOnPlaceId(candidate, listing)) return false;
      if (conflictsOnPhone(candidate, listing)) return false;
      return (
        listing.name === candidate.name &&
        listing.address !== null &&
        listing.address === candidate.address
      );
    });
    if (found) return { url: found.url, matchedBy: "name-address" };
  }

  return null;
}
