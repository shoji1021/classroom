import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Change } from '@/types/timetable';

export async function GET() {
  try {
    // フォームから取得したデータを読み込む
    const dataPath = join(process.cwd(), '..', 'data', 'latest.json');
    
    if (!existsSync(dataPath)) {
      return NextResponse.json([]);
    }

    const formData = JSON.parse(readFileSync(dataPath, 'utf8'));
    
    // 新しいデータ構造に対応
    if (!formData.changes || !Array.isArray(formData.changes)) {
      return NextResponse.json([]);
    }
    
    // 授業変更情報を変換
    const changes: Change[] = [];
    
    formData.changes.forEach((change: any) => {
      // 各クラスと各時限に対して変更を生成
      const classes = change.classes || [];
      const periods = change.periods || [];
      
      classes.forEach((classInfo: any) => {
        const classYear = `${classInfo.year}${classInfo.type}`;
        
        periods.forEach((period: number) => {
          // periods[0] は全時限を意味する場合、0-6時限に対して変更を追加
          if (period === 0 && periods.length === 1) {
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
            // 通常の時限（1-indexed）を0-indexedに変換
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
    
    console.log('Loaded changes:', changes.slice(0, 5));
    return NextResponse.json(changes);
  } catch (error) {
    console.error('授業変更データの読み込みエラー:', error);
    return NextResponse.json([]);
  }
}
