# 時間割Webアプリ

授業変更も見られる時間割表示アプリケーションです。

## 機能

- 📅 **週間時間割表示** - 今日から1週間分の時間割を表示
- 🔄 **授業変更の反映** - Googleフォームから取得した授業変更を自動反映
- 🎨 **色分け表示** - 科目ごとに色分けされた見やすい時間割
- 📱 **レスポンシブ対応** - PC・スマートフォンどちらでも使いやすい

## セットアップ

### 1. 依存パッケージのインストール

```bash
cd webapp
npm install
```

### 2. 時間割データの設定

`webapp/data/timetable.json` を編集して、各クラスの時間割を設定します。

```json
{
  "1F": {
    "月": [
      { "period": 0, "subject": "数学A", "location": "", "color": "gray" }
    ],
    ...
  }
}
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

### 4. 本番ビルド

```bash
npm run build
npm start
```

## 使い方

1. **クラス選択** - トップページで自分のクラス（1F, 2F, 3F, 1M, 2M, 3M）を選択
2. **時間割表示** - 今日から1週間分の時間割が表示されます
3. **授業変更確認** - フォームから取得した授業変更がある場合、元の科目 → 変更後 の形式で表示されます

## ディレクトリ構造

```
webapp/
├── app/
│   ├── page.tsx              # クラス選択ページ
│   ├── timetable/
│   │   └── [class]/
│   │       └── page.tsx      # 時間割表示ページ
│   └── api/
│       └── changes/
│           └── route.ts      # 授業変更API
├── data/
│   └── timetable.json        # 時間割データ
├── types/
│   └── timetable.ts          # 型定義
└── package.json
```

## 授業変更データの連携

親ディレクトリの `data/latest.json` から授業変更データを自動読み込みします。

定期的に授業変更データを取得するには、親ディレクトリで：

```bash
npm run fetch
```

## カスタマイズ

### 色の変更

`webapp/app/timetable/[class]/page.module.css` で色を変更できます：

```css
.color-gray { background: #95a5a6; }
.color-red { background: #e74c3c; }
.color-blue { background: #2980b9; }
```

### 時限数の変更

`webapp/app/timetable/[class]/page.tsx` の以下の部分を変更：

```tsx
{[0, 1, 2, 3].map((period) => ( // 4時限の場合
```

## トラブルシューティング

### 授業変更が表示されない

→ 親ディレクトリで `npm run fetch` を実行して、最新データを取得してください

### 時間割が表示されない

→ `webapp/data/timetable.json` が正しく設定されているか確認してください

## ライセンス

ISC
