export interface Period {
  period: number;
  subject: string;
  location: string;
  color: string;
  color2?: string;  // オプションで2色目を指定
  course?: 'system' | 'design' | 'math' | 'english';  // 選択科目に対応
}

export interface DaySchedule {
  [day: string]: Period[];
}

export interface ClassSchedule {
  [className: string]: DaySchedule;
}

export interface Change {
  date: string;
  classYear: string;
  period: number;
  day: string;
  originalSubject?: string;
  newSubject: string;
  description: string;
}

export interface CourseSelection {
  specialty: 'system' | 'design';  // システムorデザイン
  language: 'math' | 'english';     // 数学or英語
}
