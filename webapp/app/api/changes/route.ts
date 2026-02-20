import { NextResponse } from 'next/server';

const API_URL = 'https://api-server.shoji-masato.workers.dev';
export const runtime = 'edge';

// 追加：Next.jsにこのルート自体を動的に扱うよう強制する
export const revalidate = 0; 

export async function GET() {
  try {
    // 解決策：URLの末尾にタイムスタンプを付けてキャッシュを物理的に回避する
    const timestamp = new Date().getTime();
    const url = `${API_URL}?t=${timestamp}`;
    
    console.log('[route.ts] APIリクエスト開始:', url);
    
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log('[route.ts] APIレスポンスステータス:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[route.ts] API エラーレスポンス:', errorText);
      throw new Error(`API サーバーのエラー: ${response.status} ${errorText}`);
    }

    const changes = await response.json();
    console.log('[route.ts] 取得データ:', changes.length, '件');
    
    // データが配列か確認
    if (!Array.isArray(changes)) {
      console.warn('[route.ts] APIが配列を返していません:', typeof changes);
      return NextResponse.json([]);
    }
    
    return NextResponse.json(changes);

  } catch (error: any) {
    console.error('[route.ts] 授業変更データの取得エラー:', error.message || error);
    // エラーの詳細をクライアントに返す（デバッグ用）
    return NextResponse.json({
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}