import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const preferredRegion = 'sin1'; // Singapore

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

  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = await createSignature(queryString, SECRET_KEY);

    const response = await fetch(
      `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`,
      {
        headers: {
          'X-MBX-APIKEY': API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Binance API error', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Filter balances with non-zero amounts
    const balances = data.balances
      .filter((b: { free: string; locked: string }) => 
        parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
      )
      .map((b: { asset: string; free: string; locked: string }) => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total: parseFloat(b.free) + parseFloat(b.locked),
      }));

    return NextResponse.json({
      balances,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching Binance balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
