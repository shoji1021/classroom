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

        // 改行や空白で分割し、1行（または1情報の塊）ずつ処理する
        const lines = text.split(/[\n\r、,]/); 

        lines.forEach(line => {
          const normalized = normalizeText(line);
          const classInfo = parseClass(normalized);
          const periods = parsePeriods(normalized);

          if (!classInfo || periods.length === 0) return;

          const classYear = `${classInfo.year}${classInfo.type}`;
          
          // 【ここがポイント】
          // その「行」の中で、時限（1hなど）より後ろにある文字列を科目名として抜き出す
          const subjectMatch = normalized.match(/[1-6]h\s*(.+)$/);
          const subject = subjectMatch ? subjectMatch[1].trim() : '授業変更';

          periods.forEach((p) => {
            // period: p - 1 ではなく p そのまま（Next.jsの表示枠に合わせる）
            changes.push({ 
              date, 
              classYear, 
              period: p, 
              day: '', 
              newSubject: subject, 
              description: line 
            });
          });
        });
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