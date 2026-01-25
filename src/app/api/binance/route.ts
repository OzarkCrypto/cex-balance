import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const preferredRegion = ['hnd1', 'sin1', 'icn1'];

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function createSignature(queryString: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(queryString));
  return arrayBufferToHex(signature);
}

export async function GET() {
  const API_KEY = process.env.BINANCE_API_KEY || '';
  const SECRET_KEY = process.env.BINANCE_SECRET_KEY || '';

  // Debug: Check if env vars are set
  if (!API_KEY || !SECRET_KEY) {
    return NextResponse.json({
      error: 'Missing API credentials',
      debug: {
        hasApiKey: !!API_KEY,
        hasSecretKey: !!SECRET_KEY,
        apiKeyLength: API_KEY.length,
        secretKeyLength: SECRET_KEY.length
      }
    }, { status: 500 });
  }

  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = await createSignature(queryString, SECRET_KEY);

    const url = `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`;
    
    const accountResponse = await fetch(url, {
      headers: {
        'X-MBX-APIKEY': API_KEY,
      },
    });

    const responseText = await accountResponse.text();
    
    if (!accountResponse.ok) {
      return NextResponse.json({
        error: 'Binance API error',
        status: accountResponse.status,
        details: responseText,
        debug: {
          url: url.substring(0, 80) + '...',
          timestamp
        }
      }, { status: accountResponse.status });
    }

    const accountData = JSON.parse(responseText);
    
    const balances = accountData.balances.filter(
      (b: { free: string; locked: string }) => 
        parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
    );

    const pricesResponse = await fetch('https://api.binance.com/api/v3/ticker/price');
    const pricesData = await pricesResponse.json();
    
    const priceMap: Record<string, number> = {};
    pricesData.forEach((p: { symbol: string; price: string }) => {
      priceMap[p.symbol] = parseFloat(p.price);
    });

    let totalUsdValue = 0;
    const enrichedBalances = balances.map((b: { asset: string; free: string; locked: string }) => {
      const total = parseFloat(b.free) + parseFloat(b.locked);
      let usdValue = 0;

      if (b.asset === 'USDT' || b.asset === 'USDC' || b.asset === 'BUSD' || b.asset === 'FDUSD') {
        usdValue = total;
      } else if (priceMap[`${b.asset}USDT`]) {
        usdValue = total * priceMap[`${b.asset}USDT`];
      } else if (priceMap[`${b.asset}BUSD`]) {
        usdValue = total * priceMap[`${b.asset}BUSD`];
      } else if (priceMap[`${b.asset}FDUSD`]) {
        usdValue = total * priceMap[`${b.asset}FDUSD`];
      }

      totalUsdValue += usdValue;

      return {
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total,
        usdValue,
      };
    });

    enrichedBalances.sort((a: { usdValue: number }, b: { usdValue: number }) => 
      b.usdValue - a.usdValue
    );

    return NextResponse.json({
      totalUsdValue,
      balances: enrichedBalances,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch balance',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
