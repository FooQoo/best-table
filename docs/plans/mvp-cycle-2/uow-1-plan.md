# UoW-1 実装計画: Places 店舗データ解決と mock mode

## 対象

`docs/plans/mvp-cycle-2/UNIT_OF_WORK.md` の UoW-1 を対象にする。

- `MODE=mock` で Gemini / Places を呼ばず、座標・住所・代表写真付きの `Restaurant[]` を返す
- 通常 mode では `placeId` から座標・住所・代表写真を解決するサーバー側境界を追加する
- Places の FieldMask は Essentials / Pro 相当の必要フィールドに限定し、rating / reviews など上位 SKU の情報を同時取得しない

## 現状

- `package.json` には `MODE=real react-router dev` と `MODE=mock react-router dev` がある。
- `/api/restaurants/search` は `process.env.MODE === "mock"` のとき1秒待って `MAP_RENDERING_MOCK_RESTAURANTS` を返す。
- `MAP_RENDERING_MOCK_RESTAURANTS` は座標と mock placeId を持つが、住所・代表写真 URL がまだ入っていない。
- 実検索の `searchRestaurants` は Gemini grounding の `placeId` / 店名 / ベストエフォート住所を `Restaurant` に変換しているが、`location` と `photoUrl` は `null` のまま。

## Bolt 分解

### Bolt 1-1: mock mode のデータ形状を完成させる

Red:
- `MAP_RENDERING_MOCK_RESTAURANTS` が `Restaurant` として妥当で、全件 `location` / `address` / `photoUrl` / `placeId` を持つことをテストする。
- mock placeId が実 Place ID と誤認されないよう `mock-place-*` 形式であることをテストする。

Green:
- `app/mocks/data.ts` の `MAP_RENDERING_MOCK_RESTAURANTS` に住所と代表写真 URL を追加する。
- 古いコメント（実接続まで `location` / `photoUrl` は null）を、通常モック `STORES` と map rendering mock の役割分担が分かる内容へ更新する。

Verify:
- `pnpm test`
- `pnpm run typecheck`

### Bolt 1-2: Places Details の FieldMask と変換境界

Red:
- `placeId` と Place Details レスポンスから `location` / `address` / `photoUrl` 候補へ変換する純粋関数テストを書く。
- FieldMask が `location,formattedAddress,shortFormattedAddress,types,viewport,plusCode,photos` 以内で、`displayName` / `rating` / `reviews` を含まないことをテストする。

Green:
- `app/server/clients/google-places.ts` に client adapter と変換関数を追加する。
- API key は server-only env から読む。ブラウザ用 Maps key とは分ける。

Verify:
- `pnpm test`
- `pnpm run typecheck`

### Bolt 1-3: 検索オーケストレーションへの接続

Red:
- `searchRestaurants` の依存注入テストで、通常 mode 相当では候補10件分だけ Places 解決を呼ぶことを書く。
- Places 解決失敗時も候補自体は落とさず、`location` / `photoUrl` などが `null` のまま返ることを書く。

Green:
- `restaurant-search.ts` に Places 解決 deps を追加し、候補変換時に座標・住所・代表写真をマージする。
- 10件単位取得の本体は UoW-2 で扱うため、ここでは既存候補配列への解決処理に留める。

Verify:
- `pnpm test`
- `pnpm run typecheck`
- `pnpm build`

## 今回着手する範囲

Bolt 1-1〜1-3 まで完了。

- Bolt 1-1: `MAP_RENDERING_MOCK_RESTAURANTS` に座標・住所・代表写真・mock placeId を付与し、mock mode のデータ形状を固定した。
- Bolt 1-2: `app/server/clients/google-places.ts` に Places Details の FieldMask、レスポンス変換、Place Photos media URL 生成、server-only API key 参照を実装した。FieldMask は `location,formattedAddress,shortFormattedAddress,types,viewport,plusCode,photos` に限定し、`displayName` / `rating` / `reviews` 等は取得しない。
- Bolt 1-3: `searchRestaurants` に Places 解決依存を接続し、候補の先頭10件だけ `placeId` から `address` / `location` / `photoUrl` を補完するようにした。Places 解決が失敗しても候補自体は落とさず、グラウンディング由来の住所または `null` にフォールバックする。

Verify:
- `pnpm test`
- `pnpm run typecheck`
- `pnpm build`
