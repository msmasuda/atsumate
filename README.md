# atsumate（集まて）

集まりごとの企画、日程調整、参加確認、立替管理、割り勘、精算までを一つの流れで管理するWebアプリです。幹事だけがKeycloakでログインし、参加者は招待URLからログインせずに参加できます。

## 現在の実装範囲

MVPの最初の縦切りを実装しています。

- Next.js 16 App RouterによるレスポンシブWeb UI
- Keycloak/OIDCによる幹事ログイン
- ログイン中のユーザー名表示とログアウト
- イベント作成REST API（`/api/v1/events`）
- 表示用slugと分離した、ハッシュ保存の招待トークン
- 招待URLからのゲスト自己登録とHttpOnly本人トークン
- 日程候補・回答、立替承認、バージョン付き精算に対応するPrismaスキーマ
- 円単位の整数演算による送金集約ロジックと単体テスト
- Dockgeへ登録できるatsumate専用PostgreSQL Compose
- Docker向けNext.jsスタンドアロンビルド

ホーム画面にはUI確認用のサンプル値を表示しています。イベント一覧などの実データ接続は次の実装単位で行います。AI店舗検索、Vision、掲示板、写真、通知は後続フェーズ、Flutterは別プロジェクトです。

## 技術構成

- Node.js 24以上
- Next.js 16 / React 19 / TypeScript
- Tailwind CSS 4
- Auth.js（NextAuth）/ Keycloak
- Prisma ORM / PostgreSQL
- Vitest

## セットアップ

### 1. PostgreSQLを起動

`infra/postgres/compose.yaml` と `.env.example` をDockgeへ登録します。Dockgeで指定したスタック名がそのままComposeプロジェクト名になるため、スタック名は `atsumate-db` を推奨します。

```bash
cd infra/postgres
cp .env.example .env
```

`.env` のパスワードを必ず変更し、`POSTGRES_PORT`には `192.168.100.2` で未使用のポートを指定してください。初期値は `5433` ですが、使用中なら変更が必要です。

### 2. Keycloakクライアントを作成

管理画面 `http://192.168.100.2:8080/admin/` を開き、既存の `langgraph` Realmを選択します。`Clients` → `Create client` から次の機密クライアントを作成します。

**General settings**

- Client type: `OpenID Connect`
- Client ID: `atsumate-web`
- Name: `atsumate Web`

**Capability config**

- Client authentication: `On`
- Authorization: `Off`
- Standard flow: `On`
- Direct access grants: `Off`
- Implicit flow、Service accounts roles、Device Authorization Grant、CIBA: `Off`

**Login settings**

- Root URL: `http://localhost:3000`
- Home URL: `http://localhost:3000`
- Valid redirect URIs: `http://localhost:3000/api/auth/callback/keycloak`
- Valid post logout redirect URIs: `http://localhost:3000/*`
- Web origins: `http://localhost:3000`
- Admin URL: 空欄

`Settings`に`Require PKCE`が表示される場合は`On`にします。`PKCE method`の選択欄が表示される管理画面では`S256`を選択します。atsumateのNextAuthはS256でPKCEを送信します。`Credentials`タブのClient secretを、アプリの`.env`にある`KEYCLOAK_CLIENT_SECRET`へ設定します。

将来`langgraph_sample`へアクセストークンを転送するため、`Client scopes` → `atsumate-web-dedicated` → `Add mapper` → `By configuration` → `Audience`で次も設定します。

- Name: `langgraph-api-audience`
- Included Client Audience: `langgraph-api`
- Included Custom Audience: 空欄
- Add to ID token: `Off`
- Add to access token: `On`
- Add to lightweight access token: `On`（項目が表示される場合）

本番URLを使用する場合は、同じパスの本番URLもKeycloakへ追加してください。

### 3. Webアプリを設定

```bash
npm install
cp .env.example .env
```

`.env`のDBパスワード、Keycloakクライアントシークレット、`NEXTAUTH_SECRET`、`GUEST_TOKEN_PEPPER`を実際の値へ変更します。二つのシークレットは別々の安全なランダム値を使用してください。DockgeへWebアプリも配置する場合、`NEXTAUTH_URL`はブラウザからアクセスする実際のURLへ変更します。

### 4. DBを初期化して起動

```bash
npm run db:deploy
npm run dev
```

Webアプリは `http://localhost:3000`、ヘルスチェックは `http://localhost:3000/api/v1/health` です。

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

APIはFlutter等の別クライアントからも利用できるよう、`/api/v1`以下で後方互換性を維持します。

## 会計上の方針

立替は参加者が申請し、幹事が承認します。精算を確定した後の再計算は既存結果を上書きせず、新しいバージョンとして保存します。

現在の送金計算は、ネット残高から送金を最大 `N-1` 回に集約する方式です。一般的に回数を減らせますが、すべての入力で数学的な最小回数を保証するものではないため、「送金回数を削減」と表現します。

## ドキュメント

- [全体仕様書・企画設計書](./docs/SPECIFICATION.md)
- [AIエージェント詳細設計書](./docs/AI_AGENT_DESIGN.md)
- [懸念事項・リスク分析](./docs/CONSIDERATIONS_AND_RISKS.md)

## 開発フェーズ

1. Web基盤、認証、イベント、ゲスト参加、日程調整、手入力会計・精算
2. `langgraph_sample`連携、AI日程・店舗提案、Vision解析
3. 掲示板、写真、通知、運用機能

コミットは行う前に必ず確認します。
