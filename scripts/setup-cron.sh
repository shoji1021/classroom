#!/bin/bash

# このスクリプトはcronジョブを設定します
# 2日おきに午前2時にGoogleフォームから授業変更情報を取得します

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Classroom WebApp - Cron設定 ==="
echo ""
echo "プロジェクトディレクトリ: $PROJECT_DIR"
echo ""

# Node.jsのパスを取得
NODE_PATH=$(which node)
NPM_PATH=$(which npm)

if [ -z "$NODE_PATH" ]; then
    echo "エラー: Node.jsが見つかりません"
    exit 1
fi

echo "Node.js: $NODE_PATH"
echo "npm: $NPM_PATH"
echo ""

# cronジョブのコマンド
CRON_COMMAND="0 2 */2 * * cd $PROJECT_DIR && $NPM_PATH run fetch >> $PROJECT_DIR/logs/cron.log 2>&1"

echo "設定するcronジョブ:"
echo "$CRON_COMMAND"
echo ""
echo "このcronジョブは2日おきの午前2時に実行されます"
echo ""

# ログディレクトリを作成
mkdir -p "$PROJECT_DIR/logs"

# 現在のcrontabを取得
CURRENT_CRON=$(crontab -l 2>/dev/null)

# 既に同じジョブが存在するかチェック
if echo "$CURRENT_CRON" | grep -q "classroom-webapp.*fetch"; then
    echo "警告: 既に類似のcronジョブが存在します"
    echo ""
    echo "現在のcrontab:"
    crontab -l
    echo ""
    read -p "上書きしますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "キャンセルしました"
        exit 0
    fi
    # 既存のジョブを削除
    CURRENT_CRON=$(echo "$CURRENT_CRON" | grep -v "classroom-webapp.*fetch")
fi

# cronジョブを追加
(echo "$CURRENT_CRON"; echo "$CRON_COMMAND") | crontab -

echo ""
echo "✓ cronジョブの設定が完了しました"
echo ""
echo "確認: crontab -l"
echo "削除: crontab -e で該当行を削除"
echo ""
echo "ログファイル: $PROJECT_DIR/logs/cron.log"
