const fs = require('fs');
const path = require('path');

// データディレクトリと出力先のパス
const dataPath = path.join(__dirname, '..', '..', 'data', 'latest.json');
const outputPath = path.join(__dirname, '..', 'public', 'changes.json');

// 授業変更データを変換
function convertChanges(formData) {
  if (!formData.changes || !Array.isArray(formData.changes)) {
    return [];
  }
  
  const changes = [];
  
  formData.changes.forEach((change) => {
    const classes = change.classes || [];
    const periods = change.periods || [];
    
    classes.forEach((classInfo) => {
      const classYear = `${classInfo.year}${classInfo.type}`;
      
      periods.forEach((period) => {
        if (period === 0 && periods.length === 1) {
          // 全時限
          for (let p = 0; p <= 6; p++) {
            changes.push({
              date: change.date || '',
              classYear,
              period: p,
              day: '',
              newSubject: change.subject || '授業変更',
              description: change.description || '',
            });
          }
        } else {
          // 通常の時限（1-indexed to 0-indexed）
          changes.push({
            date: change.date || '',
            classYear,
            period: period - 1,
            day: '',
            newSubject: change.subject || '授業変更',
            description: change.description || '',
          });
        }
      });
    });
  });
  
  return changes;
}

// メイン処理
try {
  // publicディレクトリがなければ作成
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // データファイルが存在するかチェック
  if (!fs.existsSync(dataPath)) {
    console.log('latest.json が見つかりません。空の配列を出力します。');
    fs.writeFileSync(outputPath, JSON.stringify([], null, 2));
    process.exit(0);
  }

  // データファイルを読み込んで変換
  const formData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const changes = convertChanges(formData);
  
  // 変換したデータを出力
  fs.writeFileSync(outputPath, JSON.stringify(changes, null, 2));
  console.log(`授業変更データを ${outputPath} に出力しました (${changes.length}件)`);
} catch (error) {
  console.error('データ準備エラー:', error);
  // エラーでも空の配列を出力してビルドを継続
  fs.writeFileSync(outputPath, JSON.stringify([], null, 2));
}
