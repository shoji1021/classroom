'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import timetableData from '@/data/timetable.json';
import { Period, Change, CourseSelection } from '@/types/timetable';
import styles from './page.module.css';

interface TimetableClientProps {
  className: string;
}

export default function TimetableClient({ className }: TimetableClientProps) {
  const router = useRouter();
  
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [courseSelection, setCourseSelection] = useState<CourseSelection>({
    specialty: 'system',
    language: 'math',
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Cookieから履修選択を復元（client-sideのみで実行）
    const saved = Cookies.get('courseSelection');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCourseSelection(parsed);
      } catch (e) {
        console.error('Cookieのパースに失敗しました:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // 履修選択をCookieに保存
  useEffect(() => {
    if (isLoaded) {
      Cookies.set('courseSelection', JSON.stringify(courseSelection), { expires: 365 });
    }
  }, [courseSelection, isLoaded]);

  useEffect(() => {
    // 授業変更データを読み込み
    loadChanges();
  }, []);

  const loadChanges = async () => {
    try {
      const response = await fetch('/changes.json');
      if (!response.ok) {
        throw new Error('授業変更データの取得に失敗しました');
      }
      const data = await response.json();
      console.log('Loaded changes from API:', data.slice(0, 5));
      console.log('Total changes:', data.length);
      setChanges(data);
      
      // 授業変更データの最後の日付を取得
      if (data.length > 0) {
        const maxDateStr = data.reduce((max: string, change: any) => {
          return change.date > max ? change.date : max;
        }, data[0].date);
        
        const maxDate = new Date(maxDateStr);
        generateWeekUpTo(maxDate);
      } else {
        // 変更データがない場合は平日5日分
        generateDefaultWeek();
      }
    } catch (error) {
      console.error('授業変更の読み込みに失敗しました:', error);
      setChanges([]);
      generateDefaultWeek();
    }
  };

  const generateDefaultWeek = () => {
    // 今日から平日5日分の日付を生成
    const today = new Date();
    const week: Date[] = [];
    let daysAdded = 0;
    let offset = 0;
    
    while (daysAdded < 5) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const dayOfWeek = date.getDay();
      
      // 平日のみ追加（0=日曜, 6=土曜を除外）
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        week.push(date);
        daysAdded++;
      }
      offset++;
    }
    setCurrentWeek(week);
  };

  const generateWeekUpTo = (maxDate: Date) => {
    // 今日から最後の日付までの平日を生成
    const today = new Date();
    const week: Date[] = [];
    let offset = 0;
    
    while (true) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const dayOfWeek = date.getDay();
      
      // 平日のみ追加
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        week.push(date);
      }
      
      // 最後の日付を超えたら終了
      if (date > maxDate) {
        break;
      }
      offset++;
    }
    setCurrentWeek(week);
  };

  const getWeekday = (date: Date): string => {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return weekdays[date.getDay()];
  };

  const formatDate = (date: Date): string => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  };

  const getScheduleForDay = (weekday: string): Period[] => {
    const schedule = (timetableData as any)[className];
    if (!schedule || !schedule[weekday]) return [];
    
    // 選択に応じて科目名と教室を修正
    return schedule[weekday].map((period: Period) => {
      let subject = period.subject;
      let location = period.location;
      
      // パターン1: データベース / メディアとサービス
      if (subject.includes('データベース') && subject.includes('メディア')) {
        subject = courseSelection.specialty === 'system' ? 'データベース' : 'メディア';
        // "SY / MM" → システムならSY、デザインならMM
        if (location && location.includes('/')) {
          const [systemLoc, designLoc] = location.split('/').map(s => s.trim());
          location = courseSelection.specialty === 'system' ? systemLoc : designLoc;
        }
      }
      // パターン2: コンテンツ / ネットワーク
      else if (subject.includes('コンテンツ') && subject.includes('ネットワーク')) {
        subject = courseSelection.specialty === 'design' ? 'コンテンツ' : 'ネットワーク';
        // "MM / PG,NW" → デザインならMM、システムならPG,NW
        if (location && location.includes('/')) {
          const [designLoc, systemLoc] = location.split('/').map(s => s.trim());
          location = courseSelection.specialty === 'design' ? designLoc : systemLoc;
        }
      }
      // パターン3: 数学Ⅱ / 英語Ⅱ
      else if (subject.includes('数学') && subject.includes('英語')) {
        subject = courseSelection.language === 'math' ? '数学Ⅱ' : '英語Ⅱ';
        // "/プロA,B" → 数学なら空、英語ならプロA,B
        if (location && location.includes('/')) {
          const [mathLoc, englishLoc] = location.split('/').map(s => s.trim());
          location = courseSelection.language === 'math' ? mathLoc : englishLoc;
        }
      }
      
      return { ...period, subject, location };
    });
  };

  const getChangeForPeriod = (date: Date, period: number): Change | undefined => {
    // YYYY-MM-DD 形式に変換
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return changes.find(change => {
      // 日付、クラス、時限が完全に一致するものを探す
      return change.date === dateStr && 
             change.classYear === className && 
             change.period === period;
    });
  };

  // 1日通して変更がある場合を判定
  const isFullDayChange = (date: Date): boolean => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // その日のすべての変更を取得
    const dayChanges = changes.filter(change => 
      change.date === dateStr && change.classYear === className
    );
    
    // 5時限以上変更がある場合は1日通しての変更とみなす
    return dayChanges.length >= 5;
  };

  // 休みの日を判定（自宅学習、休み、なしなどのキーワード）
  const isHoliday = (date: Date): boolean => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // その日の変更を取得
    const dayChanges = changes.filter(change => 
      change.date === dateStr && change.classYear === className
    );
    
    // 「自宅学習」「休み」「なし」などのキーワードがあれば休み
    return dayChanges.some(change => 
      change.newSubject?.includes('自宅学習') || 
      change.newSubject?.includes('休み') ||
      change.newSubject?.includes('なし') ||
      change.description?.includes('自宅学習') ||
      change.description?.includes('休み')
    );
  };

  // 変更がある日を判定
  const hasChange = (date: Date): boolean => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // その日の変更が1つでもあればtrue
    return changes.some(change => 
      change.date === dateStr && change.classYear === className
    );
  };

  const getPeriodLabel = (period: number): string => {
    return `${period + 1}h`;
  };

  const getColorClass = (color: string): string => {
    return `color-${color}`;
  };

  const getGridTemplateColumns = (): string => {
    // 時間列 + 日付列 × currentWeek.length
    return `80px repeat(${currentWeek.length}, 1fr)`;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => router.push('/')}>
          ← 戻る
        </button>
        <h1 className={styles.title}>{className} - 時間割</h1>
        
        {/* 履修選択ボタン */}
        <div className={styles.courseSelector}>
          <div className={styles.buttonGroup}>
            <button 
              className={`${styles.courseButton} ${courseSelection.specialty === 'system' ? styles.active : ''}`}
              onClick={() => setCourseSelection({...courseSelection, specialty: 'system'})}
            >
              システム
            </button>
            <button 
              className={`${styles.courseButton} ${courseSelection.specialty === 'design' ? styles.active : ''}`}
              onClick={() => setCourseSelection({...courseSelection, specialty: 'design'})}
            >
              デザイン
            </button>
          </div>
          
          <div className={styles.buttonGroup}>
            <button 
              className={`${styles.courseButton} ${courseSelection.language === 'math' ? styles.active : ''}`}
              onClick={() => setCourseSelection({...courseSelection, language: 'math'})}
            >
              数学
            </button>
            <button 
              className={`${styles.courseButton} ${courseSelection.language === 'english' ? styles.active : ''}`}
              onClick={() => setCourseSelection({...courseSelection, language: 'english'})}
            >
              英語
            </button>
          </div>
        </div>
      </header>

      <div className={styles.timetableWrapper}>
        <div className={styles.timetable} style={{ gridTemplateColumns: getGridTemplateColumns() }}>
          {/* ヘッダー */}
          <div className={styles.headerRow}>
            <div className={styles.periodHeader}>時間割</div>
            {currentWeek.map((date, index) => {
              const weekday = getWeekday(date);
              const holiday = isHoliday(date);
              const fullDay = isFullDayChange(date);
              const changed = hasChange(date);
              
              // バッジの優先順位: 休み > 全日変更 > 変更あり
              let badge = null;
              if (holiday) {
                badge = <div className={styles.fullDayBadge}>休み</div>;
              } else if (fullDay) {
                badge = <div className={styles.fullDayBadge}>全日変更</div>;
              } else if (changed) {
                badge = <div className={styles.changeBadge}>変更あり</div>;
              }
              
              return (
                <div key={index} className={`${styles.dayHeader} ${holiday ? styles.fullDayHeader : ''}`}>
                  {badge}
                  <div className={styles.weekday}>{weekday}</div>
                  <div className={styles.date}>{formatDate(date)}</div>
                </div>
              );
            })}
          </div>

          {/* 時間割本体 */}
          {[0, 1, 2, 3, 4, 5, 6].map((period) => (
            <div key={period} className={styles.periodRow}>
              <div className={styles.periodLabel}>{getPeriodLabel(period)}</div>
              {currentWeek.map((date, dayIndex) => {
                const weekday = getWeekday(date);
                
                const schedule = getScheduleForDay(weekday);
                const periodData = schedule.find(p => p.period === period);
                const change = getChangeForPeriod(date, period);

                // 元のスケジュール（修正前）から color2 を取得
                const rawSchedule = (timetableData as any)[className][weekday];
                const rawPeriodData = rawSchedule?.find((p: Period) => p.period === period);

                if (!periodData) {
                  return <div key={dayIndex} className={styles.emptyPeriod}></div>;
                }

                // 背景色を決定（選択に応じて色を選択）
                let backgroundColor = periodData.color;
                if (rawPeriodData?.color2) {
                  // パターンマッチで色を選択
                  const originalSubject = rawPeriodData.subject;
                  if ((originalSubject.includes('データベース') && originalSubject.includes('メディア'))) {
                    backgroundColor = courseSelection.specialty === 'system' ? rawPeriodData.color : rawPeriodData.color2;
                  } else if ((originalSubject.includes('コンテンツ') && originalSubject.includes('ネットワーク'))) {
                    backgroundColor = courseSelection.specialty === 'design' ? rawPeriodData.color : rawPeriodData.color2;
                  } else if ((originalSubject.includes('数学') && originalSubject.includes('英語'))) {
                    backgroundColor = courseSelection.language === 'math' ? rawPeriodData.color : rawPeriodData.color2;
                  }
                }

                const cellStyle = {
                  background: `var(--color-${backgroundColor})`
                };

                return (
                  <div 
                    key={dayIndex} 
                    className={styles.period}
                    style={cellStyle}
                  >
                    {change ? (
                      <div className={styles.changedSubject}>
                        <div className={styles.originalSubject}>
                          {periodData.subject}
                        </div>
                        <div className={styles.arrow}>↓</div>
                        <div className={styles.newSubject}>
                          {change.newSubject}
                        </div>
                      </div>
                    ) : (
                      <div className={styles.subjectName}>
                        {periodData.subject}
                        {periodData.location && (
                          <div className={styles.location}>{periodData.location}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {changes.length > 0 && (
        <div className={styles.changesSection}>
          <h2>授業変更情報</h2>
          <ul className={styles.changesList}>
            {Array.from(new Set(changes.map(c => c.description))).map((description) => (
              <li key={description} className={styles.changeItem}>
                {description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
