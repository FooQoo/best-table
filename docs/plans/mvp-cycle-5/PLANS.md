# 計画

## 現在の目的

トップ、ヒアリング、検索結果で指定した会食条件を、画面遷移やリロード、URL 共有後も失わないようにする。

現在は `app/state/booking-context.tsx` の Jotai state が検索条件の主な保持先になっており、`/results` はマウント時にその state から `/api/restaurants/search/stream` へ検索条件を POST している。このため、リロードや直接 URL アクセスでは、ユーザーが指定した条件ではなく初期値に戻りやすい。

このサイクルでは `nuqs` を導入し、検索・会食条件を URL query state として正規化する。Jotai は、比較候補、取得済み店舗、詳細パネルなどの画面内一時状態を保持する役割に寄せる。

## 実装範囲

画面・パスの実装対象:

- トップ / 検索入口: `/`
- ヒアリング画面: `/hearing`
- MAP 付き検索結果: `/results`
- 上記3画面の URL query state 同期
- `/api/restaurants/search/stream` に渡す検索条件の組み立て
- 地図コンテキスト AI チャットに渡す `bookingSummary`

実装対象外:

- 実予約、実在庫連携
- 検索・AI 評価ロジック自体の変更
- 店舗候補、AI 評価結果、比較候補、詳細パネル状態、地図凡例の表示状態の URL 永続化
- `/results` の追加検索結果を共有リンクとして完全再現すること
- サーバーセッションや DB への条件保存

## プロダクトフロー計画

1. トップでエリア・日付・時刻・人数を指定する。
2. 指定内容が URL query に反映される。
3. 「AIに相談してお店を選ぶ」で `/hearing` に進んでも、同じ query が維持される。
4. ヒアリングで相手種別、予算、重視条件、自由入力を指定する。
5. 「この条件で検索する」で `/results` に進むと、同じ query から検索条件を復元して検索する。
6. `/results` をリロードしても、URL query の条件で再検索される。
7. `/results` の「条件を変更」から戻っても、既存条件を編集できる。

## マイルストーン1: 検索条件の URL query state 化

目的:

`BookingRequest` 相当の検索・会食条件を URL query の正規化された表現にし、トップ・ヒアリング・検索結果で同じ条件を参照できるようにする。

タスク:

- `nuqs` を導入し、parser / serializer を URL query state の型安全な定義に使う。React Router Framework Mode の実行境界では、`useSearchParams` で URL 更新を行う。
- `BookingState` のうち、検索条件として URL に保持するフィールドを定義する。
  - `selectedAreas`
  - `date`
  - `time`
  - `people`
  - `counterpart`
  - `counterpartOtherText`
  - `budgetMin`
  - `budgetMax`
  - `budgetOtherOn`
  - `budgetOtherText`
  - `priorities`
  - `priorityOtherOn`
  - `priorityOtherText`
- URL query と `BookingRequest` を相互変換する parser / serializer を作る。
- 不正な query 値は固定語彙・型・上限に合わせて安全に正規化し、無効値をそのまま検索 API へ渡さない。
- Jotai の `bookingAtom` は、URL に保持しない一時状態（`compareIds`, `restaurants` など）と、既存コンポーネントが参照するための互換レイヤーに整理する。

受け入れ条件:

- `/` でエリア・日付・時刻・人数を変更すると、URL query に反映される。
- `/hearing` へ進んでも、トップで指定した条件が維持される。
- ヒアリングで相手種別・予算・重視条件を変更すると、URL query に反映される。
- `/results` は Jotai の初期値ではなく URL query から復元した条件で検索する。
- 不正な `people`、未知の `counterpart`、4件以上の `priorities` などは正規化され、アプリが壊れない。

## マイルストーン2: URL 共有・戻る操作・条件変更導線

目的:

検索結果 URL を開き直したとき、またはブラウザの戻る/進むを使ったときに、ユーザーが指定した条件と表示される検索結果の前提がずれないようにする。

タスク:

- `/results` の初回検索を URL query 由来の条件に基づいて実行する。
- URL query が変わった場合、取得済み店舗・比較候補などの一時状態をクリアし、条件に合う検索をやり直す。
- 「条件を変更」は条件を破棄せず、現在の query を維持したまま `/` または `/hearing` へ戻れるようにする。
- 新規検索を明示的に始める操作では、会食文脈・比較候補・取得済み店舗などの一時状態をクリアしつつ、基本条件の扱いを整理する。
- 地図の「このエリアを検索」は URL query のエリア名を書き換えず、既存の構造化条件を維持した追加検索として扱う。

受け入れ条件:

- `/results?...` を直接開くと、その URL の条件で検索が走る。
- `/results` をリロードしても、条件が初期値に戻らない。
- ブラウザの戻る/進むで query が変わった場合、検索結果とサマリー表示が新しい条件に揃う。
- 「条件を変更」で戻った先に、直前の条件が入力済みで表示される。
- 共有 URL で再現されるのは検索条件までで、比較候補や表示済み追加検索結果は共有対象にならないことが仕様として明確になっている。

## 成功指標

ユーザー指標:

- 検索条件を指定した後にリロード・戻る操作をしても、入力のやり直しが発生しない。
- 検索結果 URL を共有・保存したときに、最低限の検索前提を再現できる。
- 条件変更のためにトップやヒアリングへ戻っても、直前の入力を編集できる。

開発指標:

- URL query に保存する状態と、Jotai に残す画面内一時状態の境界が明文化される。
- parser / serializer のテストで、正常値・不正値・初期値省略の挙動が固定される。
- `pnpm test` / `pnpm run typecheck` / `pnpm build` が通る。

## モック UI 方針

このサイクルは新しい画面や大きな UI パターンを追加しない。既存のトップ、ヒアリング、検索結果の入力・遷移を、URL query state に同期する内部設計変更が中心である。

そのため、`UNIT_OF_WORK.md` 生成前の mock UI 実装は行わない。実装時の確認は、既存3ルート（`/`, `/hearing`, `/results`）での query 反映、リロード、戻る/進む、条件変更導線の手動確認で代替する。
