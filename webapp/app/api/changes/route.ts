import { NextResponse } from 'next/server';

const API_URL = 'https://api-server.shoji-masato.workers.dev';
export const runtime = 'edge';

// 追加：Next.jsにこのルート自体を動的に扱うよう強制する
export const revalidate = 0; 

export async function GET() {
  try {
    // 解決策：URLの末尾にタイムスタンプを付けてキャッシュを物理的に回避する
    const timestamp = new Date().getTime();
    const response = await fetch(`${API_URL}?t=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API サーバーのエラー: ${response.status}`);
    }

    const changes = await response.json();
    return NextResponse.json(changes);

  } catch (error: any) {
    console.error('授業変更データの取得エラー:', error);
    return NextResponse.json([]);
  }
}