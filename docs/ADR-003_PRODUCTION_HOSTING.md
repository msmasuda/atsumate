# ADR-003: 本番ホスティングと開発環境

- 状態: 採用（本番構築はリリース判定後に実施）
- 決定日: 2026-10-20

## 背景

これまでVercelへのデプロイを前提としていたが、Hobbyプランは商用利用できない。atsumateは実際に使われるサービスを目指すため、商用利用できる環境が必要である。

AI機能は`langgraph_sample`が担う。LLMの選定や配置は`langgraph_sample`側の責務で、atsumateはそのAPIを呼ぶだけとする。`langgraph_sample`はConoHa VPS（2GB）上で本番稼働しており、iOSアプリ（MealLog）からも利用されている。

## 決定

### 開発・検証

- 開発時のAI連携は、`192.168.100.2`上の`langgraph_sample`検証環境（Docker）を使用する。
- atsumateの開発用PostgreSQLも引き続き`192.168.100.2`のDocker（Dockge）を使用する。
- ローカルの`AGENT_API_URL`には検証環境のAPI URLを設定する。

### 本番

- `langgraph_sample`とは別に、atsumate専用のConoHa VPS（メモリ1GBプラン）を契約する。
  - atsumateのデプロイ失敗や負荷が、MealLogなど`langgraph_sample`の利用者へ波及しないようにするため。
  - 512MBプランは、Next.js・PostgreSQL・Caddyの常駐でメモリの余裕がないため採用しない。
- ドメインは`atsumate.my-style.jp`とし、お名前.comでVPSへAレコードを向ける。
- atsumateの本番用Docker Composeに次をまとめる。`langgraph_sample`のComposeやCaddyfileは変更しない。
  - `caddy`: HTTPS終端とリバースプロキシ。80/443番だけを公開する。
  - `web`: 既存の`Dockerfile`（Next.js standalone）。
  - `postgres`: atsumate専用のDB。ポートはホストへ公開しない。
  - `migrate`: 起動時に`npm run db:deploy`を一度実行して終了する。`web`はその成功後に起動する。
- AI連携は`AGENT_API_URL=https://agent.my-style.jp`へHTTPSで接続する。
  - `langgraph_sample`の`API_KEYS`に`atsumate:<SHA-256ハッシュ>`を追加し、キー本体をatsumateの`AGENT_API_TOKEN`へ設定する。
- イメージはVPS上でビルドしない。開発PCでビルドしてレジストリ（GitHub Container Registry等）へ置き、VPSは取得して起動するだけとする。
- PostgreSQLは`pg_dump`で毎日バックアップし、VPSの外にも保管する。会計データを扱うため、復元手順を確認してから公開する。
- ConoHaのセキュリティグループは22・80・443番だけを開放する。

## リリース判定

本番構築は、次を満たしてから着手する。

- 実際の集まりで1回使い、参加者が招待URLから迷わず回答・精算まで完了できた。
- AI連携が未設定・停止中でも、AI以外の機能が問題なく使える（AIの操作は非表示またはエラー表示にとどまる）。
- その利用で見つかった重大な不具合を解消した。

## 影響

- 仕様書とリスク分析にあるVercel前提の記述（タイムアウト、ローカルエージェントへの接続）は本ADRで置き換える。VPSのため、関数の実行時間制限は受けない。
- サーバー2台の更新、バックアップ、監視をatsumate側で運用する責任が生じる。
- 月額費用がVPS 1台分増える。
