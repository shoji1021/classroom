import * as cheerio from 'cheerio';

const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScUd3YWWX57ZIZP1de41DH8YQKlFCJZjQAW3Vj0EpijXq8WMw/viewform';

interface ClassInfo { year: string; type: string; }
interface Change { date: string; classYear: string; period: number; day: string; newSubject: string; description: string; }

// テキスト正規化
function normalizeText(text: string): string {
  return text
    .replace(/[０-９]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0xFEE0))
    .replace(/[ａ-ｚ]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0xFEE0))
    .replace(/[Ａ-Ｚ]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0xFEE0))
    .replace(/[、，]/g, ',')
    .replace(/ｈ/g, 'h');
}

function parseClass(text: string): ClassInfo | null {
  const normalized = normalizeText(text);
  const match = normalized.match(/([123])[\/\s]?([FM])/i);
  return match ? { year: match[1], type: match[2].toUpperCase() } : null;
}

function parsePeriods(text: string): number[] {
  const normalized = normalizeText(text);
  const periods: number[] = [];
  const singleMatches = normalized.match(/([1-6])\s*h/gi);
  if (singleMatches) {
    singleMatches.forEach(m => {
      const n = parseInt(m.match(/[1-6]/)![0]);
      if (!periods.includes(n)) periods.push(n);
    });
  }
  return periods.sort((a, b) => a - b);
}

function parseDate(text: string, year: number = 2026): string | null {
  const normalized = normalizeText(text);
  const match = normalized.match(/(\d{1,2})月(\d{1,2})日/);
  if (match) {
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return null;
}

// Workerのメイン処理
export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
      const response = await fetch(FORM_URL);
      const html = await response.text();
      const $ = cheerio.load(html);

      const items: string[] = [];
      $('div[role="listitem"]').each((_, el) => {
        const qTitle = $(el).find('div[role="heading"]').text().trim();
        if (qTitle) items.push(qTitle);
      });

      const changes: Change[] = [];

      items.forEach((text) => {
        const date = parseDate(text);
        if (!date) return;

        const normalized = normalizeText(text);
        
        // --- 修正ポイント：セグメントごとに解析 ---
        // クラス名(1Mなど)を基準にテキストを分割して、それぞれの科目を特定しやすくします
        const segments = normalized.split(/([1-3][FM])/gi).filter(Boolean);
        let currentClasses: ClassInfo[] = [];

        // 全学年などの処理
        if (text.includes('全学年') || text.includes('全校')) {
          ['1','2','3'].forEach(y => ['F','M'].forEach(t => currentClasses.push({year:y, type:t})));
        }

        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          const classInfo = parseClass(seg);

          if (classInfo) {
            // クラス名が見つかった場合、その次のセグメントに時限と科目があるはず
            currentClasses = [classInfo];
            continue;
          }

          // このセグメント内の時限(1h, 2h...)を探す
          const periods = parsePeriods(seg);
          if (currentClasses.length === 0) continue;

          // 科目名を抽出（時限の後の文字列を取得）
          // 例: "1h 英I" -> "英I"
          let subject = seg.replace(/[1-6]h/gi, '').trim()
                           .replace(/^[、,（）()]*/, '') // 不要な記号をカット
                           .split(/[\s　]/)[0] || '授業変更';

          const classYearList = currentClasses.map(c => `${c.year}${c.type}`);
          
          if (periods.length === 0) {
            // 時限指定がない場合は全日(1-6)として登録
            classYearList.forEach(classYear => {
              for (let p = 1; p <= 6; p++) {
                changes.push({ date, classYear, period: p, day: '', newSubject: subject, description: text });
              }
            });
          } else {
            // 指定された時限ごとに登録
            classYearList.forEach(classYear => {
              periods.forEach(p => {
                // period: p - 1 ではなく p そのままにする
                changes.push({ date, classYear, period: p, day: '', newSubject: subject, description: text });
              });
            });
          }
        }
      });

      return new Response(JSON.stringify(changes), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });

    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};