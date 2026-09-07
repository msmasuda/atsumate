## プロジェクト固有の指示

- チャットでの返答、質問の選択肢、ユーザー向け文言は日本語にする。
- Gitコミットは必ずユーザーへ確認してから行い、コミットメッセージは日本語にする。
- 判断に困った場合は勝手に進めず、ユーザーへ質問する。
- 実装内容に合わせてREADME.mdを常に最新に保つ。
- UIや画面遷移を変更した場合は、完了報告前にブラウザで主要導線のスモークテストを実施し、作成したテストデータを後片付けする。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
