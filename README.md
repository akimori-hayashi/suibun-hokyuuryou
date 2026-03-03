# 水分補給量計算アプリ

体重・運動量・気温から、1日に必要な水分補給量を計算するWebアプリケーションです。

## 機能

- 体重・運動強度・運動時間・気温を入力して必要水分量を計算
- 時間帯別（朝/昼/夜/運動前後）の推奨摂取量を表示
- AI解説機能（簡潔版・詳細版）
- URLシェア機能（計算条件をURLパラメータで共有可能）

## 計算ロジック

| 項目 | 計算式 |
|------|--------|
| 基本水分量 | 体重(kg) × 30ml |
| 運動追加量（軽い運動） | 運動時間(分) × 5ml |
| 運動追加量（中程度） | 運動時間(分) × 8ml |
| 運動追加量（激しい運動） | 運動時間(分) × 12ml |
| 気温補正（普通） | × 1.05（+5%） |
| 気温補正（暑い） | × 1.20（+20%） |

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **スタイリング**: Tailwind CSS
- **AI**: Anthropic Claude API
  - 簡潔な解説: `claude-haiku-4-5-20251001`
  - 詳しい解説: `claude-sonnet-4-5-20250929`
- **デプロイ**: Vercel

## セットアップ

### 前提条件

- Node.js 18以上
- npm または yarn
- Anthropic APIキー

### インストール

```bash
git clone <repository-url>
cd suibun-hokyuuryou
npm install
```

### 環境変数の設定

`.env.example` をコピーして `.env.local` を作成し、APIキーを設定します。

```bash
cp .env.example .env.local
```

`.env.local` を編集します：

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxx
```

> APIキーは [Anthropic Console](https://console.anthropic.com/) から取得できます。

### ローカル開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## Vercelへのデプロイ

### GitHubからのデプロイ手順

1. このリポジトリをGitHubにプッシュします
2. [Vercel](https://vercel.com) にサインインしてダッシュボードを開きます
3. **"New Project"** をクリックしてリポジトリをインポートします
4. フレームワークとして **Next.js** が自動検出されることを確認します
5. **Environment Variables** セクションで以下を追加します：

   | 変数名 | 値 |
   |--------|-----|
   | `ANTHROPIC_API_KEY` | `sk-ant-...`（実際のAPIキー） |

6. **"Deploy"** をクリックしてデプロイを開始します

### 環境変数の追加（デプロイ後）

Vercelのプロジェクト設定で環境変数を追加・変更できます：

1. Vercelダッシュボードでプロジェクトを選択
2. **Settings** > **Environment Variables** を開く
3. `ANTHROPIC_API_KEY` を追加して保存
4. **Deployments** から最新のデプロイを再デプロイ（Redeploy）

## セキュリティについて

- `ANTHROPIC_API_KEY` は必ずサーバーサイドの環境変数として設定してください
- `.env.local` はgitignoreで除外済みです。絶対にコミットしないでください
- Claude APIの呼び出しはすべてサーバーサイド（`/api/explain`）で行われます
- フロントエンドにAPIキーは一切露出しません

## ファイル構成

```
/
├── app/
│   ├── api/
│   │   └── explain/
│   │       └── route.ts    # Claude API呼び出し（サーバーサイド）
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx            # メインページ（計算UI）
├── .env.example            # 環境変数テンプレート
├── .gitignore
├── next.config.ts
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json
```
