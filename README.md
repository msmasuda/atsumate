# atsumate（集まて）

集まりごとの企画、日程調整、参加確認、立替管理、割り勘、精算までを一つの流れで管理するWebアプリです。幹事はWebまたは将来のFlutterアプリから同じアカウントでログインし、参加者は招待URLからログインせずに参加できます。

## 現在の実装範囲

MVPの最初の縦切りを実装しています。

- Next.js 16 App RouterによるレスポンシブWeb UI
- Auth.js v5によるGoogle、メール＋パスワード認証
- メール確認、パスワード再設定、ログアウト
- Flutter等の外部クライアント向けBearerトークンAPI
- イベント作成REST API（`/api/v1/events`）
- ログイン中の幹事本人のイベント、参加者数、日程候補数、対応事項を表示するダッシュボード
- 表示用slugと分離した、ハッシュ保存の招待トークンと招待URLコピー
- 招待URLからのゲスト自己登録、完了表示、同一端末の重複登録防止、HttpOnly本人トークン
- 幹事による日程候補の追加・削除・確定、参加者による○△×回答、回答状況の集計表示
- 日程確定後の参加可否回答、参加者による立替申請、幹事による承認・却下
- 参加予定者での等分精算、バージョン付き再計算、支払報告と入金確認
- `langgraph_sample`による日程候補のAI提案
- `langgraph_sample`のWeb検索による店舗候補のAI提案、候補保存、参加者投票、店舗決定
- 立替承認、バージョン付き精算に対応するPrismaスキーマ
- 円単位の整数演算による送金集約ロジックと単体テスト
- atsumate専用PostgreSQL向けのPrisma接続とマイグレーション
- Docker向けNext.jsスタンドアロンビルド

ホーム画面はログイン中の幹事本人のデータだけをサーバー側で取得します。Flutter本体は別プロジェクトで、現在は認証API契約のみ提供しています。Vision、掲示板、写真、通知は後続フェーズです。

## システム構成

- Next.js WebとRoute HandlersはVercelへデプロイする
- WebセッションはAuth.jsの暗号化されたHttpOnly Cookieを使用する
- モバイルはatsumate APIが発行する短期アクセストークンとローテーション式更新トークンを使用する
- WebとモバイルはPostgreSQLの同じ`User.id`を主体IDとして利用する
- 業務データ、OAuthアカウント、パスワードハッシュ、更新トークンはatsumate専用PostgreSQLへ保存する
- Prisma ORMを業務データと認証データのアクセス・マイグレーションに使用する
- 参加者の招待URLとログイン不要のゲストトークン方式は維持する
- ファイル保存とリアルタイム更新の基盤は、対象機能の着手時に選定する

詳細は[ADR-002](./docs/ADR-002_APPLICATION_AUTH.md)を参照してください。

## 現在の技術構成

- Node.js 24以上
- Next.js 16 / React 19 / TypeScript
- Tailwind CSS 4
- Auth.js（NextAuth）v5 / Prisma Adapter
- Prisma ORM / PostgreSQL
- Vitest

## セットアップ

### 1. PostgreSQLを起動

`infra/postgres/compose.yaml` と `infra/postgres/.env.example` をDockgeへ登録します。既存のatsumate DBを利用する場合、この手順は不要です。

```bash
cd infra/postgres
cp .env.example .env
```

`.env`のパスワードを変更し、`POSTGRES_PORT`はDB接続URLと同じポートにしてください。既定値は`5433`です。

### 2. Webアプリを設定

```bash
npm install
cp .env.example .env
openssl rand -base64 33
```

生成した別々の値を`AUTH_SECRET`、`MOBILE_TOKEN_SECRET`、`GUEST_TOKEN_PEPPER`へ設定し、`DATABASE_URL`を実際の接続先へ変更します。

AIによる日程・店舗候補を使う場合は`langgraph_sample`を起動し、`AGENT_API_URL`へAPIのURLを設定します。ローカルの`AUTH_MODE=disabled`では`AGENT_API_TOKEN`は空欄のまま利用できます。店舗候補の提案には同エージェントの`web_search`を使用し、現在は検索結果ページを参考候補として表示します。店舗の詳細はリンク先で確認してください。

Googleログインを使う場合はGoogle Cloud ConsoleでWeb OAuth Clientを作成し、次を設定します。

- 承認済みJavaScript生成元: `http://localhost:3000`
- 承認済みリダイレクトURI: `http://localhost:3000/api/auth/callback/google`
- Client ID: `AUTH_GOOGLE_ID`
- Client secret: `AUTH_GOOGLE_SECRET`

FlutterのGoogleログインで発行されるIDトークンを受け付ける場合は、Android/iOSのClient IDを`GOOGLE_ALLOWED_CLIENT_IDS`へカンマ区切りで設定します。

メール確認とパスワード再設定を送信するには、ResendのAPIキーと検証済みFromアドレスを`RESEND_API_KEY`、`AUTH_EMAIL_FROM`へ設定します。開発環境で未設定の場合は、送信内容をサーバーログへ表示します。本番環境では設定必須です。

localhost以外から開発サーバーを開く場合は、ブラウザから実際にアクセスするURLとホストを設定し、Google OAuthの生成元・リダイレクトURIも同じURLへ変更します。

```dotenv
AUTH_URL=http://192.168.100.56:3000
ALLOWED_DEV_ORIGINS=192.168.100.56
```

### 3. DBを初期化して起動

```bash
npm run db:deploy
npm run dev
```

Webアプリは`http://localhost:3000`、ヘルスチェックは`http://localhost:3000/api/v1/health`です。

## 開発コマンド

```bash
npm run lint       # ESLint
npm test           # 単体テスト
npm run build      # Prisma Client生成 + 本番ビルド
npm run db:studio  # Prisma Studio
```

## Dockerビルド

ルートの`Dockerfile`はNext.jsのstandalone出力を使用します。実行時に`.env.example`記載の環境変数をコンテナへ渡してください。DBマイグレーションはアプリ起動前に`npm run db:deploy`で適用します。

## API

| Method | Path | 認証 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | 不要 | 稼働確認 |
| POST | `/api/v1/auth/register` | 不要 | メール＋パスワード登録 |
| GET | `/api/v1/auth/verify-email` | 確認トークン | メール確認 |
| POST / PATCH | `/api/v1/auth/password-reset` | 不要 / 再設定トークン | 再設定メール送信 / パスワード変更 |
| POST | `/api/v1/auth/token` | パスワードまたはGoogle IDトークン | モバイルトークン発行 |
| POST | `/api/v1/auth/token/refresh` | 更新トークン | モバイルトークン更新 |
| DELETE | `/api/v1/auth/token` | 更新トークン | モバイルセッション失効 |
| GET | `/api/v1/events` | 幹事 | 自分のイベント一覧 |
| POST | `/api/v1/events` | 幹事 | イベント作成 |
| POST / PATCH / DELETE | `/api/v1/events/:id/date-options` | 幹事 | 日程候補の追加 / 確定 / 削除 |
| POST | `/api/v1/events/:id/date-suggestions` | 幹事 | AIによる日程候補の提案 |
| POST / PATCH / DELETE | `/api/v1/events/:id/venue-options` | 幹事 | 店舗候補の追加 / 決定 / 削除 |
| POST | `/api/v1/events/:id/venue-suggestions` | 幹事 | Web検索を使ったAI店舗候補の提案 |
| POST | `/api/v1/invitations/:token/participants` | 招待トークン | ゲスト参加登録 |
| PUT | `/api/v1/invitations/:token/date-votes` | 招待＋本人トークン | 日程回答の登録・更新 |
| PUT | `/api/v1/invitations/:token/venue-votes` | 招待＋本人トークン | 店舗投票の登録・変更 |
| PUT | `/api/v1/invitations/:token/attendance` | 招待＋本人トークン | 確定日への参加可否回答 |
| POST | `/api/v1/invitations/:token/expenses` | 招待＋本人トークン | 立替申請 |
| PATCH | `/api/v1/invitations/:token/settlements` | 招待＋本人トークン | 支払い済み報告 |
| PATCH | `/api/v1/events/:id/expenses` | 幹事 | 立替申請の承認・却下 |
| POST / PATCH | `/api/v1/events/:id/settlements` | 幹事 | 精算の確定・入金確認 |

WebはAuth.js Cookie、外部クライアントは`Authorization: Bearer <accessToken>`で`/api/v1`へアクセスします。アクセストークンの有効期間は15分、更新トークンは30日で、更新するたびにローテーションします。

`POST /api/v1/auth/token`のリクエスト例:

```json
{ "grantType": "password", "email": "user@example.com", "password": "your-password" }
```

```json
{ "grantType": "googleIdToken", "idToken": "google-id-token" }
```

## 会計上の方針

立替は参加予定の参加者が申請し、幹事が承認します。現在の精算は参加予定者で等分し、割り切れない1円単位の端数は参加登録順に割り当てます。精算を確定した後の再計算は既存結果を上書きせず、新しいバージョンとして保存します。

現在の送金計算は、ネット残高から送金を最大`N-1`回に集約する方式です。一般的に回数を減らせますが、すべての入力で数学的な最小回数を保証するものではないため、「送金回数を削減」と表現します。

## ドキュメント

- [全体仕様書・企画設計書](./docs/SPECIFICATION.md)
- [AIエージェント詳細設計書](./docs/AI_AGENT_DESIGN.md)
- [懸念事項・リスク分析](./docs/CONSIDERATIONS_AND_RISKS.md)
- [ADR-001: Supabase Auth移行（置換済み）](./docs/ADR-001_MANAGED_SUPABASE.md)
- [ADR-002: アプリケーション認証基盤](./docs/ADR-002_APPLICATION_AUTH.md)

## 開発フェーズ

1. Web基盤、認証、イベント、ゲスト参加、日程調整、手入力会計・精算
2. `langgraph_sample`連携、AI日程・店舗提案、Vision解析
3. 掲示板、写真、通知、運用機能

コミットは行う前に必ず確認します。
