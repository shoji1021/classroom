# 🚀 クイックスタートガイド

このガイドに従って、すぐにGoogleフォームから授業変更情報を取得できます。

**所要時間: 約3分** | **認証不要・簡単セットアップ**

---

## ステップ 1: 依存パッケージをインストール

```bash
npm install
```

## ステップ 2: データ取得テスト

```bash
npm run fetch
```

成功すると、以下のファイルが作成されます:
- `data/form_data_2026-02-18.json` - 今日の日付付きファイル
- `data/latest.json` - 最新データ

## ステップ 3: 定期実行の設定（1日おき）

```bash
chmod +x scripts/setup-cron.sh
./scripts/setup-cron.sh
```

これで、2日おきの午前2時に自動的にデータが取得されます。

---

## 完了！🎉

これで設定は完了です。

- **手動実行**: `npm run fetch`
- **自動実行**: 2日おきの午前2時
- **データ**: `data/latest.json` に最新データが保存されます

---

## 📝 フォームURLを変更したい場合

`.env`ファイルを編集：

```bash
FORM_URL=https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform
```

---

## 🔍 cron設定の確認

```bash
# cron設定を確認
crontab -l

# 実行ログを確認
tail -f logs/cron.log
```

---

## ⚠️ トラブルシューティング

### 「フォームデータの取得に失敗しました」

→ フォームURLが正しいか確認してください  
→ フォームが公開されているか確認してください

### cronが動作しない

→ `./scripts/setup-cron.sh` を再実行してください

---

詳細は [README.md](README.md) を参照してください。
