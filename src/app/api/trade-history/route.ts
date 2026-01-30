import { NextRequest, NextResponse } from 'next/server';

const DATA_API_URL = 'https://data-api.polymarket.com';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    const tradesUrl = `${DATA_API_URL}/trades?user=${address.toLowerCase()}&limit=100`;

    const tradesRes = await fetch(tradesUrl, {
      headers: { Accept: 'application/json' },
    });

    if (!tradesRes.ok) {
      console.error('[trade-history] Data API error:', tradesRes.status);
      return NextResponse.json({ trades: [] });
    }

    const rawTrades = await tradesRes.json();

    if (!rawTrades || rawTrades.length === 0) {
      return NextResponse.json({ trades: [] });
    }

    const trades = rawTrades.map((t: any, idx: number) => {
      let outcome = 'Yes';
      if (t.outcome) {
        outcome = t.outcome;
      } else if (typeof t.outcomeIndex === 'number') {
        outcome = t.outcomeIndex === 0 ? 'Yes' : 'No';
      }

      return {
        id: t.id || t.transactionHash || `trade-${idx}`,
        asset_id: t.asset || '',
        side: t.side || 'BUY',
        price: Number(t.price) || 0,
        size: Number(t.size) || 0,
        timestamp: t.timestamp
          ? new Date(t.timestamp * 1000).toISOString()
          : new Date().toISOString(),
        outcome,
        question: t.title || '',
        slug: t.slug || t.eventSlug || '',
        image: t.icon || '',
      };
    });

    trades.sort(
      (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({ trades });
  } catch (error) {
    console.error('[trade-history] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch trade history' }, { status: 500 });
  }
}
