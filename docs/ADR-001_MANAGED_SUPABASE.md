# ADR-001: Vercel＋マネージドSupabaseへの移行

- 状態: 採用
- 決定日: 2026-09-07

## 背景

現行実装は、Next.js、Auth.js（NextAuth）、セルフホストKeycloak、独立PostgreSQLで構成されています。KeycloakはOIDC、Web、将来のFlutter、API認証を統合できますが、認証画面がatsumateのUIから分離し、テーマ、URL、証明書、バックアップ、更新を個別に運用する必要があります。

atsumateはLAN内利用を本番要件とせず、一般公開するWebアプリと将来のFlutterアプリを対象とします。ユーザー体験を統一しながら、認証、DB、ファイル保存をWebとFlutterで共用し、アプリ開発へ集中できる構成が必要です。

## 決定

本番環境に次の構成を採用します。

| 領域 | 採用技術・配置 |
| --- | --- |
| Webフロントエンド | Next.js / Vercel |
| Web API | Next.js Route Handlers `/api/v1` / Vercel |
| データベース | マネージドSupabase PostgreSQL（東京リージョン） |
| ORM・DBマイグレーション | Prisma ORM |
| Web・Flutter認証 | Supabase Auth |
| 幹事のログイン方法 | Googleログイン、メールOTP／マジックリンク |
| ファイル保存 | Supabase Storage |
| リアルタイム更新 | 必要な機能に限りSupabase Realtime |
| AIエージェント | Next.js APIを境界として`langgraph_sample`と連携 |

## アプリケーション境界

- WebとFlutterは、同じSupabase AuthプロジェクトのユーザーIDを利用する。
- WebとFlutterの業務処理はNext.js APIへ集約し、クライアントごとに会計・イベント管理ロジックを重複させない。
- Next.js APIはSupabaseが発行したJWTを検証して幹事を識別する。
- PrismaはSupabase PostgreSQLへ接続し、業務データを操作する。
- クライアントから業務テーブルを直接更新する構成は採用しない。Supabase Data APIを公開する場合もRLSで拒否または必要最小限に制限する。
- Storageは署名付きURLと適切なRLSポリシーを使用する。
- 参加者は引き続きログイン不要とし、招待URLとHttpOnlyゲストトークンで本人性を維持する。

## 環境方針

- 開発環境と本番環境でSupabaseプロジェクト、鍵、データを分離する。
- 本番URLは公開DNSとHTTPSを前提とし、プライベートIPや`.local`ホスト名を使用しない。
- SupabaseのシークレットキーとDB接続情報はVercelのサーバー環境変数だけに保存する。
- ブラウザとFlutterには公開可能なプロジェクトURLとPublishable Keyだけを配布する。
- Prismaの実行時接続とマイグレーション用直接接続を分離する。

## 移行方針

1. 開発用と本番用のSupabaseプロジェクトを作成する。
2. Prismaの接続先をSupabase PostgreSQLへ対応させ、既存スキーマとデータを移行する。
3. Supabase AuthとGoogleログイン、メールOTP／マジックリンクを設定する。
4. `User.oidcSubject`をSupabaseユーザーIDによる識別へ移行する。
5. Next.jsの認証処理と `/api/v1` のJWT検証をSupabaseへ置き換える。
6. atsumateのデザインに統一したWebログイン画面を実装する。
7. Flutterが同じSupabase AuthとNext.js APIを利用できる契約を定義する。
8. 認証、イベント所有権、ゲスト参加、ログアウトをE2Eで確認する。
9. 移行完了後にAuth.js、Keycloak、独立PostgreSQLの設定と依存関係を撤去する。

## 影響

### 利点

- Keycloakの既定画面を利用者へ見せず、ログイン体験をatsumateへ統一できる。
- WebとFlutterでユーザー、JWT、ストレージを共有できる。
- DB、認証、ストレージの可用性、更新、バックアップの多くをSupabaseへ委ねられる。
- PostgreSQLとPrismaを継続でき、業務モデルを大きく変更せずに移行できる。

### 注意点

- Supabaseの利用料金とサービス可用性に依存する。
- Auth、Storage、Realtime固有機能を使うほど、他基盤へ移行する際の作業量が増える。
- 既存のOIDC Subjectと新しいSupabaseユーザーIDの対応付けを、安全に移行する必要がある。
- Keycloakと独立PostgreSQLは、移行完了と検証前に停止または削除しない。
