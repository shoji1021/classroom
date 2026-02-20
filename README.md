# Classroom WebApp - 授業変更情報取得 & 時間割アプリ

Googleフォームに記載されている授業変更情報を定期的に取得し、時間割と一緒に表示するWebアプリケーションです。

## プロジェクト構成

このプロジェクトは2つの部分で構成されています：

### 1. データ取得システム（ルートディレクトリ）
Googleフォームから授業変更情報を取得し、JSONファイルとして保存します。

### 2. 時間割Webアプリ（webapp/）
取得したデータを使って、授業変更を反映した時間割を表示します。

## クイックスタート

### データ取得システムのセットアップ

```bash
# 依存パッケージのインストール
npm install

# フォームからデータを取得
npm run fetch

# 定期実行の設定（2日おき午前2時）
chmod +x scripts/setup-cron.sh
./scripts/setup-cron.sh
```

### Webアプリのセットアップ

```bash
# webappディレクトリに移動
cd webapp

# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

## 機能

### データ取得システム
- ✅ **認証不要** - Google Cloud Console設定不要
- ✅ **自動取得** - cronで2日おきに自動実行
- ✅ **HTMLスクレイピング** - 公開フォームから直接取得

### 時間割Webアプリ
- 📅 **週間時間割表示** - 今日から1週間分の時間割
- 🔄 **授業変更の自動反映** - 元の科目 → 変更後 を表示
- 🎨 **色分け表示** - 科目ごとに色分け
- 📱 **レスポンシブ対応** - PC・スマホ対応

## 前提条件

- Node.js 18以上

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定（オプション）

`.env`ファイルでフォームURLやデータ保存先を変更できます：

```bash
# デフォルト値が設定済みなので、そのまま使う場合は編集不要
FORM_URL=https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform
OUTPUT_DIR=./data
```

### 3. 動作確認

```bash
npm run fetch
```

成功すると、`data/` ディレクトリに以下のファイルが作成されます：
- `form_data_YYYY-MM-DD.json` - 日付付きバックアップ
- `latest.json` - 最新データ

## 使い方

### 手動実行

```bash
npm run fetch
```

### 定期実行（cron設定）

1. cronジョブ設定スクリプトを実行可能にする

```bash
chmod +x scripts/setup-cron.sh
```

2. cronジョブを設定

```bash
./scripts/setup-cron.sh
```

これにより、2日おきの午前2時に自動実行されます。

### 既存のcron設定を確認

```bash
crontab -l
```

### cron設定を削除

```bash
crontab -e
# エディタで該当行を削除
```

## データ形式

取得されるJSONデータの形式：

```json
{
  "url": "https://docs.google.com/forms/d/e/.../viewform",
  "title": "授業変更フォーム",
  "description": "フォームの説明",
  "items": [
    {
      "title": "設問タイトル",
      "required": true,
      "type": "text"
    }
  ],
  "fetchedAt": "2026-02-18T12:00:00.000Z"
}
```

## ディレクトリ構造

```
classroom-webapp/
├── src/
│   └── fetchFormData.ts  # メインスクリプト（HTMLスクレイピング）
├── data/                 # 取得データ保存先
├── scripts/
│   └── setup-cron.sh     # cron設定スクリプト
├── .env                  # 環境変数
└── package.json
```

## トラブルシューティング

### エラー: credentials.json が見つかりません

→ Google Cloud Console で OAuth クライアント ID を作成し、JSONファイルをダウンロードしてプロジェクトルートに配置してください。
フォームデータの取得に失敗しました

→ フォームURLが正しいか、フォームが公開されているか確認してください。

### エラー: ECONNREFUSED / ネットワークエラー

→ インターネット接続を確認してください。

### cronが動作しない

→ スクリプトのパスが絶対パスになっているか、実行権限があるか確認してください。

### 設問が正しく取得できない

→ Googleフォームの構造が変更された可能性があります。HTMLの構造を確認してスクリプトを調整してください。

## 注意事項

- このツールは公開されているGoogleフォームのHTMLを解析します
- Googleフォームの構造が変更された場合、動作しなくなる可能性があります
- 非公開フォームや認証が必要なフォームには対応していません
- 過度なアクセスは避けてください（2日おき推奨）
ISC
