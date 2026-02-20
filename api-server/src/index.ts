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
    // CORSヘッダー（Next.jsなどの別サイトからAPIを叩けるようにする）
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 1. GoogleフォームのHTMLを取得
      const response = await fetch(FORM_URL);
      const html = await response.text();
      const $ = cheerio.load(html);

      const items: any[] = [];
      $('div[role="listitem"]').each((_, el) => {
        const qTitle = $(el).find('div[role="heading"]').text().trim();
        if (qTitle) items.push({ title: qTitle });
      });

      const changes: Change[] = [];

      // 2. データを解析してJSONの配列に変換
      items.forEach((item) => {
        const text = item.title;
        const date = parseDate(text);
        if (!date) return;

        const normalized = normalizeText(text);
        const classMatches = normalized.match(/([123])[\/\s]?([FM])/gi);
        const classes: ClassInfo[] = [];

        if (classMatches) {
          classMatches.forEach(cText => {
            const info = parseClass(cText);
            if (info && !classes.find(c => c.year === info.year && c.type === info.type)) {
              classes.push(info);
            }
          });
        }

        if (text.includes('全学年') || text.includes('全校') || (classes.length === 0 && (text.includes('行事') || text.includes('式典')))) {
          classes.length = 0;
          ['1','2','3'].forEach(y => ['F','M'].forEach(t => classes.push({year:y, type:t})));
        }

        if (classes.length === 0) return;

        const rawPeriods = parsePeriods(text);
        const periods = rawPeriods.length > 0 ? rawPeriods : [0];
        const subject = text.split(/[\s　]/).pop() || '授業変更';

        // クラス×時限ごとにデータを展開（Next.js側が読みやすい形にする）
        classes.forEach((classInfo) => {
          const classYear = `${classInfo.year}${classInfo.type}`;
          periods.forEach((period) => {
            if (period === 0) {
              for (let p = 0; p <= 6; p++) {
                changes.push({ date, classYear, period: p, day: '', newSubject: subject, description: text });
              }
            } else {
              changes.push({ date, classYear, period: period - 1, day: '', newSubject: subject, description: text });
            }
          });
        });
      });

      // 3. JSONとして結果を返す
      return new Response(JSON.stringify(changes), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });

    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};