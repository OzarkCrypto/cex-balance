import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch(
      'https://api.binance.com/api/v3/ticker/price'
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch prices' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Convert to a map for easy lookup
    const priceMap: Record<string, number> = {};
    data.forEach((item: { symbol: string; price: string }) => {
      priceMap[item.symbol] = parseFloat(item.price);
    });

    return NextResponse.json(priceMap);
  } catch (error) {
    console.error('Error fetching prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
