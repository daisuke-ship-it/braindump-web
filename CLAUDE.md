@AGENTS.md

## デザインシステム

UI 実装時は必ず `DESIGN.md` を参照（Apple インスパイアのデザインシステム）。

## 姉妹プロジェクト参照

chokainfo（釣果情報.com）と同じアーキテクチャ・デプロイ構成を使用。
設計判断に迷った場合は chokainfo の実装を参照すること。

- **CLAUDE.md**: `/Users/daisuke/Documents/chokainfo/CLAUDE.md`
- **フロントエンド**: `/Users/daisuke/Documents/chokainfo/apps/frontend/`
- **本番URL**: https://www.chokainfo.com
- **共通技術スタック**: Next.js 16 + React 19 + Supabase + Tailwind CSS 4 + Vercel

### デプロイ構成（chokainfo に準拠）
- Vercel Hobby プラン、Public リポジトリ
- 環境変数: `ADMIN_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 認証: `ADMIN_PASSWORD` によるシンプルなパスワード認証（cookie ベース）
- `git push` で自動デプロイ
