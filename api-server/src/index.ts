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
        
        // クラス(1M, 2Fなど)を基準に分割して、複数の情報を処理する
        const classSegments = normalized.split(/([1-3][FM])/gi).filter(Boolean);
        
        // 全学年の処理
        if (text.includes('全学年') || text.includes('全校')) {
          const isHomeStudy = text.includes('自宅学習');
          ['1','2','3'].forEach(y => {
            ['F','M'].forEach(t => {
              for(let p = 1; p <= 6; p++) {
                changes.push({ date, classYear: `${y}${t}`, period: p, day: '', newSubject: isHomeStudy ? '自宅学習' : '行事等', description: text });
              }
            });
          });
          return; // 全学年ならここで次の行へ
        }

        let currentClassYear = "";

        for (let i = 0; i < classSegments.length; i++) {
          const segment = classSegments[i].trim();
          
          if (segment.match(/^[1-3][FM]$/i)) {
            currentClassYear = segment.toUpperCase();
            continue;
          }

          if (!currentClassYear) continue;

          // 「1h 英I」のような時限と科目のペアを探す
          const periodMatches = Array.from(segment.matchAll(/([1-6])h\s*([^1-6]+)/gi));
          let found = false;

          for (const match of periodMatches) {
            found = true;
            const period = parseInt(match[1]); // ★ここが重要：マイナス1しない！
            const subject = match[2].trim().split(/[\s,、]/)[0]; 

            changes.push({
              date,
              classYear: currentClassYear,
              period: period,
              day: '',
              newSubject: subject,
              description: text
            });
          }

          // 「清掃」などの記載があるのに「1h」が書いていない場合の予備処理
          if (!found && segment.length > 0) {
             const subject = segment.split(/[\s,、]/)[0] || '授業変更';
             for (let p = 1; p <= 6; p++) {
               changes.push({ date, classYear: currentClassYear, period: p, day: '', newSubject: subject, description: text });
             }
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