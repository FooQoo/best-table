# Unit of Work 分解（AWS AI-DLC 形式）

`docs/plans/mvp-cycle-5/PLANS.md` のマイルストーンを Unit of Work（UoW）へ分解したものです。

各 UoW は TDD の Bolt（Red → Green → Verify）で進めます。現在の進捗は [`docs/STATUS.md`](../../STATUS.md) を正とし、各 UoW の実装計画（`docs/plans/mvp-cycle-5/uow-N-plan.md`）は着手直前に作成します。テンプレートは [`docs/plans/TEMPLATE.md`](../TEMPLATE.md) を使います。

| Unit of Work | 実装計画 |
|---|---|
| UoW-1 | [docs/plans/mvp-cycle-5/uow-1-plan.md](uow-1-plan.md) |
| UoW-2 | [docs/plans/mvp-cycle-5/uow-2-plan.md](uow-2-plan.md) |
| UoW-3 | [docs/plans/mvp-cycle-5/uow-3-plan.md](uow-3-plan.md) |

---

## 1. Unit of Work 定義

### UoW-1: URL query state のモデル化

- **責務**: `BookingRequest` 相当の検索・会食条件を、`nuqs` で扱える URL query state として定義し、型・parser・serializer・正規化ルールを固定する。
- **対象領域**: `app/state/`, `app/domain/models/`, `app/utils/` または `app/domain/services/`
- **スコープ外**: UI コンポーネントへの接続、検索 API 呼び出しの変更、比較候補・店舗結果の永続化。
- **依存する UoW**: なし
- **出力**: URL query と検索条件を相互変換する純粋関数、`nuqs` parser 定義、不正値の正規化テスト。
- **元マイルストーン**: マイルストーン1

### UoW-2: トップ・ヒアリングの query 同期

- **責務**: `/` と `/hearing` の入力を URL query state に接続し、画面遷移しても条件が維持されるようにする。
- **対象ルート**: `/`, `/hearing`
- **スコープ外**: 検索実行、検索結果表示、店舗一覧・比較状態の扱い。
- **依存する UoW**: UoW-1
- **出力**: トップとヒアリングの入力が query に反映され、query から初期表示を復元できる UI。
- **元マイルストーン**: マイルストーン1

### UoW-3: 検索結果の query 復元と再検索

- **責務**: `/results` が URL query 由来の条件で検索・サマリー・地図コンテキスト AI チャット用 `bookingSummary` を組み立て、query 変更時に検索結果を条件に揃えて再取得する。
- **対象ルート**: `/results`, `/api/restaurants/search/stream` 呼び出し境界
- **スコープ外**: Places API / Gemini の検索・評価ロジック変更、比較候補や追加検索結果の URL 共有。
- **依存する UoW**: UoW-1, UoW-2
- **出力**: `/results?...` の直接アクセス・リロード・戻る/進むで条件が復元される検索結果画面。
- **元マイルストーン**: マイルストーン2

---

## 2. 依存関係マトリクス

| Unit of Work | 依存先 | 並行実行可否 |
|---|---|---|
| UoW-1 URL query state のモデル化 | なし | 最初に着手。後続の前提。 |
| UoW-2 トップ・ヒアリングの query 同期 | UoW-1 | UoW-1 完了後。 |
| UoW-3 検索結果の query 復元と再検索 | UoW-1, UoW-2 | UoW-2 と一部並行可能だが、ユーザー操作の一気通貫確認は最後に行う。 |

```
UoW-1 ─→ UoW-2 ─→ UoW-3
```

---

## 3. ストーリーマップ（PLANS.md 対応表）

| Unit of Work | 対応する `docs/plans/mvp-cycle-5/PLANS.md` の受け入れ条件 |
|---|---|
| UoW-1 | 不正な `people`、未知の `counterpart`、4件以上の `priorities` などが正規化され、アプリが壊れない |
| UoW-2 | `/` で基本条件を変更すると URL query に反映される／`/hearing` へ進んでも条件が維持される／ヒアリング条件が URL query に反映される |
| UoW-3 | `/results` は URL query から復元した条件で検索する／直接アクセス・リロード・戻る/進むで検索結果とサマリー表示が条件に揃う／条件変更で直前の入力を編集できる |

---

## 4. Bolt 分解と TDD サイクル（Red → Green → Verify）

共通 Verify（全 UoW 共通・`AGENTS.md` 準拠）:

- `pnpm test`
- `pnpm run typecheck`
- `pnpm build`
- ルーティング/UI に影響する UoW では `/`, `/hearing`, `/results` を確認する。

### UoW-1: URL query state のモデル化

- Bolt 1-1（query schema と初期値）
  - Red: URL query が空の場合に `initialBookingState` 相当の検索条件へ復元されること、配列・boolean・number が期待型に変換されることをテストとして先に書く。
  - Green: `nuqs` parser と、URL query から検索条件を作る純粋関数を実装する。
  - Verify: `pnpm test`。
- Bolt 1-2（不正値の正規化）
  - Red: 未知のエリア、未知の相手種別、4件以上の重視条件、1未満の人数、不正な boolean が安全に正規化されることをテストとして先に書く。
  - Green: 固定語彙と上限に基づく normalize 処理を実装する。
  - Verify: `pnpm test` + `pnpm run typecheck`。

### UoW-2: トップ・ヒアリングの query 同期

- Bolt 2-1（トップ基本条件）
  - Red: `/` のエリア・日付・時刻・人数操作が query state setter を呼ぶことをコンポーネントテストとして先に書く。
  - Green: `TopScreen` / `AreaPicker` / stepper 系の状態接続を query state に差し替える。既存コンポーネント API を大きく壊さず、必要なら薄い hook を挟む。
  - Verify: `/` で入力変更後、URL query が変わることを手動確認。
- Bolt 2-2（ヒアリング条件）
  - Red: 相手種別・予算・重視条件・自由入力の操作が query state に反映されることをテストとして先に書く。
  - Green: `CounterpartStep` / `BudgetStep` / `PriorityStep` を query state に接続する。
  - Verify: `/hearing` の各ステップで query が維持・更新されることを手動確認。
- Bolt 2-3（遷移時の query 維持）
  - Red: トップからヒアリング、ヒアリングから検索結果へ遷移しても query が消えないことをテストまたは手動確認観点として固定する。
  - Green: `navigate` 呼び出しを query を落とさない形に調整する。
  - Verify: `/` → `/hearing` → `/results` の一気通貫確認。

### UoW-3: 検索結果の query 復元と再検索

- Bolt 3-1（検索条件と summary の復元）
  - Red: query 由来の条件から `/api/restaurants/search/stream` に渡す condition と `ResultsChatBookingSummary` が組み立てられることをテストとして先に書く。
  - Green: `ResultsScreen` の `buildCondition` / `chatBookingSummary` / サマリー表示を query state 由来にする。
  - Verify: `/results?...` 直接アクセスでサマリーが query と一致することを確認。
- Bolt 3-2（query 変更時の再検索）
  - Red: query の検索条件キーが変わった場合、取得済み店舗・比較候補をクリアし、再検索を1回だけ起動することをテストまたは hook レベルのテストとして先に書く。
  - Green: `ResultsScreen` の初回検索制御を query key ベースに変更する。StrictMode の二重実行対策は既存コメントの意図を保つ。
  - Verify: ブラウザ戻る/進む、リロード、条件変更後の再検索を手動確認。
- Bolt 3-3（条件変更導線）
  - Red: 「条件を変更」が検索条件を破棄せず編集画面へ戻ること、明示的な新規検索だけが一時状態をクリアすることを確認観点として固定する。
  - Green: `resetForNewChat` の責務を見直し、URL query と Jotai 一時状態のクリア範囲を分ける。
  - Verify: `/results` から条件変更して戻った先に直前条件が残ることを確認。

---

## 5. 実装計画作成ルール

各 UoW の `uow-N-plan.md` は作成済み。実装に入る直前に、必要であれば実際のコードベースの状態を読み直して該当計画を更新してから Red に入る。
