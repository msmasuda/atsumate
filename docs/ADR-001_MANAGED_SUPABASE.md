# ADR-001: Vercel＋Supabase Authへの移行

- 状態: 実施済み
- 決定日: 2026-09-07
- 実施日: 2026-09-09

## 背景

移行前の実装は、Next.js、Auth.js（NextAuth）、セルフホストKeycloak、独立PostgreSQLで構成されていました。KeycloakはOIDC、Web、将来のFlutter、API認証を統合できますが、認証画面がatsumateのUIから分離し、テーマ、URL、証明書、バックアップ、更新を個別に運用する必要がありました。

atsumateは一般公開するWebアプリと将来のFlutterアプリを対象とします。ユーザー体験を統一しながら認証をWebとFlutterで共用し、業務データは既存のatsumate専用PostgreSQLへ保存します。

## 決定

本番環境に次の構成を採用します。

| 領域 | 採用技術・配置 |
| --- | --- |
| Webフロントエンド | Next.js / Vercel |
| Web API | Next.js Route Handlers `/api/v1` / Vercel |
| データベース | atsumate専用PostgreSQL |
| ORM・DBマイグレーション | Prisma ORM |
| Web・Flutter認証 | Supabase Auth |
| 幹事のログイン方法 | Googleログイン、メール＋パスワード、メールOTP／マジックリンク |
| ファイル保存 | Supabase Storage |
| リアルタイム更新 | 必要な機能に限りSupabase Realtime |
| AIエージェント | Next.js APIを境界として`langgraph_sample`と連携 |

## アプリケーション境界

- WebとFlutterは、同じSupabase AuthプロジェクトのユーザーIDを利用する。
- WebとFlutterの業務処理はNext.js APIへ集約し、クライアントごとに会計・イベント管理ロジックを重複させない。
- Next.js APIはSupabaseが発行したJWTを検証して幹事を識別する。
- Prismaはatsumate専用PostgreSQLへ接続し、業務データを操作する。
- クライアントから業務テーブルを直接更新する構成は採用しない。
- Storageは署名付きURLと適切なRLSポリシーを使用する。
- 参加者は引き続きログイン不要とし、招待URLとHttpOnlyゲストトークンで本人性を維持する。

## 環境方針

- 開発環境と本番環境でSupabaseプロジェクト、鍵、データを分離する。
- 本番URLは公開DNSとHTTPSを前提とし、プライベートIPや`.local`ホスト名を使用しない。
- Supabaseの公開キーとDB接続情報は環境変数で管理する。
- ブラウザとFlutterには公開可能なプロジェクトURLとPublishable Keyだけを配布する。

## 実施内容

1. Prismaの接続先として既存のatsumate専用PostgreSQLを継続利用した。
2. Supabase AuthのGoogleログイン、メール＋パスワードの新規登録・ログイン、メールのマジックリンクに対応した。
3. `User.oidcSubject`を`User.authUserId`へ、既存値を保持したままリネームした。
4. WebのCookieセッションと、`/api/v1`へ送信されるBearer JWTを同じ検証処理へ統合した。
5. atsumate内のログイン画面とログアウト処理をSupabaseへ置き換えた。
6. Auth.jsとKeycloakの設定・依存関係を撤去した。

## 影響

### 利点

- Keycloakの既定画面を利用者へ見せず、ログイン体験をatsumateへ統一できる。
- WebとFlutterでユーザー、JWT、ストレージを共有できる。
- 認証とストレージの可用性、更新、バックアップをSupabaseへ委ねられる。
- PostgreSQLとPrismaを継続でき、業務モデルを大きく変更せずに移行できる。

### 注意点

- Supabaseの利用料金とサービス可用性に依存する。
- Auth、Storage、Realtime固有機能を使うほど、他基盤へ移行する際の作業量が増える。
- 既存利用者を引き継ぐ場合は、移行後のSupabaseユーザーIDへ`User.authUserId`を対応付ける必要がある。
