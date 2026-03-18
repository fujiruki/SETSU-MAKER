# SETSU-MAKER 開発環境定義

## プロジェクト情報

| 項目 | 値 |
|---|---|
| AppID | `sm` |
| システム名 | SETSU-MAKER（手順説明書作成Webアプリ） |
| 種別 | Type A（React Vite + PHP） |

## ポート

| サービス | ポート |
|---|---|
| フロントエンド (Vite) | **5179** |
| バックエンド (PHP) | **8004** |

## URL

| 環境 | URL |
|---|---|
| 開発 | `http://localhost:5179/contents/sm/` |
| 本番フロント | `https://door-fujita.com/contents/sm/` |
| 本番API | `https://door-fujita.com/contents/sm/api/` |

## ディレクトリ構成

```
SETSU-MAKER/
  frontend/       ← Vite + React + TypeScript
    src/
      models/     ← 型定義
      repositories/ ← APIアクセス層のインターフェース
      viewmodels/ ← MVVM ViewModel (React Hooks)
      views/      ← ページレベルコンポーネント
      components/ ← 再利用可能UIコンポーネント
      hooks/      ← 汎用カスタムHooks
      utils/      ← ユーティリティ関数
  api/            ← PHPバックエンド
  docs/           ← 仕様書
  svp_config.json
  .git/
```

## リソースプレフィックス

| カテゴリ | プレフィックス例 |
|---|---|
| Cookie | `sm_session` |
| LocalStorage | `sm_` |
| DB テーブル | `sm_` |

## 開発サーバー起動

```powershell
cd C:\Fujiruki\Projects\SETSU-MAKER
powershell -ExecutionPolicy Bypass -File C:\Fujiruki\00_AI共通\複数プロジェクト管理\svp_runner.ps1
```
