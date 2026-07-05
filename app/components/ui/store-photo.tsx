import { useState } from "react";
import { StorePhotoPlaceholder } from "~/components/ui/store-photo-placeholder";
import type { Restaurant } from "~/domain/models/restaurant";
import { resolvePhotoPlaceholderLabel } from "~/utils/photo-placeholder-label";

type StorePhotoProps = {
  store: Pick<Restaurant, "name" | "room" | "photoUrl">;
  className?: string;
};

// docs/ARCHITECTURE.md「店舗写真の取得」：photoUrl がある場合だけ実写真を表示し、
// 無い場合・読み込み失敗時は既存の StorePhotoPlaceholder にフォールバックする。
export function StorePhoto({ store, className = "" }: StorePhotoProps) {
  const [failed, setFailed] = useState(false);

  if (!store.photoUrl || failed) {
    return (
      <StorePhotoPlaceholder
        label={resolvePhotoPlaceholderLabel(store)}
        className={className}
      />
    );
  }

  return (
    <img
      src={store.photoUrl}
      alt={`${store.name}の店内写真`}
      className={`object-cover object-center ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
