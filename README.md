# atsumate（集まて）

集まりごとの企画、日程調整、参加確認、立替管理、割り勘、精算までを一つの流れで管理するWebアプリです。幹事はSupabaseでログインし、参加者は招待URLからログインせずに参加できます。

## 現在の実装範囲

MVPの最初の縦切りを実装しています。

- Next.js 16 App RouterによるレスポンシブWeb UI
- Supabase AuthによるGoogle、メール＋パスワード、マジックリンク認証と新規登録
- ログイン中のユーザー名表示とログアウト
- イベント作成REST API（`/api/v1/events`）
- ログイン中の幹事本人のイベント、参加者数、日程候補数、対応事項を表示するダッシュボード
- 表示用slugと分離した、ハッシュ保存の招待トークンと招待URLコピー
- 招待URLからのゲスト自己登録、完了表示、同一端末の重複登録防止、HttpOnly本人トークン
- 日程候補・回答、立替承認、バージョン付き精算に対応するPrismaスキーマ
- 円単位の整数演算による送金集約ロジックと単体テスト
- atsumate専用PostgreSQL向けのPrisma接続とマイグレーション
- Docker向けNext.jsスタンドアロンビルド

ホーム画面はログイン中の幹事本人のデータだけをサーバー側で取得し、進行中・終了済みのイベント、回答期限、未承認の立替、参加者数、日程候補数を表示します。日程候補の登録・回答UIは次の実装単位です。AI店舗検索、Vision、掲示板、写真、通知は後続フェーズ、Flutterは別プロジェクトです。

## システム構成

認証とストレージはSupabase、業務データはatsumate専用PostgreSQLで管理します。

- Next.js WebとRoute HandlersはVercelへデプロイする
- AuthとStorageはSupabaseを利用する
- 業務データはatsumate専用PostgreSQLへ保存する
- Prisma ORMは継続し、業務データへのアクセスとマイグレーションに使用する
- Webと将来のFlutterアプリは同じSupabase Authのユーザーを利用する
- 幹事のログイン方法はGoogle、メール＋パスワード、メールOTP／マジックリンクとする
- ログイン画面と認証エラーはatsumate内のUIとして実装する
- WebとFlutterの業務処理は `/api/v1` に集約し、APIがSupabase JWTを検証する
- 参加者の招待URLとログイン不要のゲストトークン方式は維持する
- 写真などのファイルはSupabase Storageへ保存する
- WebはCookieセッション、Flutter等の外部クライアントはBearer JWTを使用する
- APIは署名検証済みJWTの`sub`を`User.authUserId`として扱う

採用理由、境界、移行手順は[アーキテクチャ決定記録](./docs/ADR-001_MANAGED_SUPABASE.md)を参照してください。

## 現在の技術構成

- Node.js 24以上
- Next.js 16 / React 19 / TypeScript
- Tailwind CSS 4
- Supabase Auth（`@supabase/ssr`）
- Prisma ORM / atsumate専用PostgreSQL
- Vitest

## セットアップ

### 1. Supabaseを設定

Supabase DashboardでGoogleプロバイダーとメールログインを有効にします。AuthenticationのURL設定には次を登録してください。

- Site URL: `http://localhost:3000`（本番では公開URL）
- Redirect URLs: `http://localhost:3000/auth/callback` と本番の同パス

Google Cloud側のOAuthクライアントには、Supabase Dashboardに表示されるコールバックURLを登録します。メール＋パスワードの利用者は`/signup`から作成し、メール確認が有効な環境では確認メール内のリンクから登録を完了します。パスワードを使わない場合は既定のマジックリンク方式を利用できます。

開発用self-hosted SupabaseのURLとPublishable Keyは`langgraph_sample/deploy/supabase`の構成と共用できます。

### 2. PostgreSQLを起動

`infra/postgres/compose.yaml` と `infra/postgres/.env.example` をDockgeへ登録します。既存のatsumate DBを利用する場合、この手順は不要です。

```bash
cd infra/postgres
cp .env.example .env
```

`.env`のパスワードを変更し、`POSTGRES_PORT`はDB接続URLと同じポートにしてください。既定値は`5433`です。

### 3. Webアプリを設定

```bash
npm install
cp .env.example .env
```

`.env`のSupabase URL、Publishable Key、DB接続URL、`GUEST_TOKEN_PEPPER`を実際の値へ変更します。DBパスワードに記号が含まれる場合はURLエンコードしてください。

`localhost`以外から開発サーバーを開く場合は、ブラウザから実際にアクセスするURLとホストを設定します。たとえば `192.168.100.56` から開く場合は次のようにします。変更後は開発サーバーを再起動してください。

```dotenv
NEXT_PUBLIC_SITE_URL=http://192.168.100.56:3000
ALLOWED_DEV_ORIGINS=192.168.100.56
```

`ALLOWED_DEV_ORIGINS`はカンマ区切りで複数指定できます。未設定の場合、Next.js開発サーバーは`localhost`以外のオリジンから届く開発用リソース要求を拒否します。`NEXT_PUBLIC_SITE_URL`とSupabaseの許可Redirect URLは、ブラウザからアクセスする実際のURLへ揃えてください。

### 4. DBを初期化して起動

```bash
npm run db:deploy
npm run dev
```

Webアプリは `http://localhost:3000`、ヘルスチェックは `http://localhost:3000/api/v1/health` です。

既存DBから移行する場合、マイグレーションは認証ID列を値を保持したまま`authUserId`へ改名します。既存利用者を引き継ぐ場合は、Supabase Authで作成したユーザーのUUIDへこの値を更新してから公開してください。

## 開発コマンド

```bash
npm run lint       # ESLint
npm test           # 単体テスト
npm run build      # Prisma Client生成 + 本番ビルド
npm run db:studio  # Prisma Studio
```

## Dockerビルド

ルートの`Dockerfile`はNext.jsのstandalone出力を使用します。実行時に`.env.example`記載の環境変数をコンテナへ渡してください。DBマイグレーションはアプリ起動前に `npm run db:deploy` で適用します。

## API

| Method | Path | 認証 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | 不要 | 稼働確認 |
| GET | `/api/v1/events` | 幹事 | 自分のイベント一覧 |
| POST | `/api/v1/events` | 幹事 | イベント作成 |
| POST | `/api/v1/invitations/:token/participants` | 招待トークン | ゲスト参加登録 |

APIはFlutter等の別クライアントからも利用できるよう、`/api/v1`以下で後方互換性を維持します。WebはSupabaseのCookie、外部クライアントは`Authorization: Bearer <Supabase access token>`で認証します。

## 会計上の方針

立替は参加者が申請し、幹事が承認します。精算を確定した後の再計算は既存結果を上書きせず、新しいバージョンとして保存します。

現在の送金計算は、ネット残高から送金を最大 `N-1` 回に集約する方式です。一般的に回数を減らせますが、すべての入力で数学的な最小回数を保証するものではないため、「送金回数を削減」と表現します。

## ドキュメント

- [全体仕様書・企画設計書](./docs/SPECIFICATION.md)
- [AIエージェント詳細設計書](./docs/AI_AGENT_DESIGN.md)
- [懸念事項・リスク分析](./docs/CONSIDERATIONS_AND_RISKS.md)
- [ADR-001: Supabase Authへの移行](./docs/ADR-001_MANAGED_SUPABASE.md)

## 開発フェーズ

1. Web基盤、認証、イベント、ゲスト参加、日程調整、手入力会計・精算
2. `langgraph_sample`連携、AI日程・店舗提案、Vision解析
3. 掲示板、写真、通知、運用機能

コミットは行う前に必ず確認します。
