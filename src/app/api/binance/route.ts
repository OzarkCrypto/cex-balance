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

interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
  usdValue: number;
}

interface AccountData {
  accountType: string;
  accountName: string;
  balances: Balance[];
  totalUsdValue: number;
}

async function fetchWithSignature(
  endpoint: string,
  apiKey: string,
  secretKey: string,
  extraParams: string = ''
): Promise<Response> {
  const timestamp = Date.now();
  const queryString = `${extraParams ? extraParams + '&' : ''}timestamp=${timestamp}`;
  const signature = await createSignature(queryString, secretKey);
  
  return fetch(`https://api.binance.com${endpoint}?${queryString}&signature=${signature}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
  });
}

async function fetchFuturesWithSignature(
  endpoint: string,
  apiKey: string,
  secretKey: string,
  extraParams: string = ''
): Promise<Response> {
  const timestamp = Date.now();
  const queryString = `${extraParams ? extraParams + '&' : ''}timestamp=${timestamp}`;
  const signature = await createSignature(queryString, secretKey);
  
  return fetch(`https://fapi.binance.com${endpoint}?${queryString}&signature=${signature}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
  });
}

async function fetchCoinFuturesWithSignature(
  endpoint: string,
  apiKey: string,
  secretKey: string,
  extraParams: string = ''
): Promise<Response> {
  const timestamp = Date.now();
  const queryString = `${extraParams ? extraParams + '&' : ''}timestamp=${timestamp}`;
  const signature = await createSignature(queryString, secretKey);
  
  return fetch(`https://dapi.binance.com${endpoint}?${queryString}&signature=${signature}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
  });
}

async function getPriceMap(): Promise<Record<string, number>> {
  const response = await fetch('https://api.binance.com/api/v3/ticker/price');
  const data = await response.json();
  const priceMap: Record<string, number> = {};
  data.forEach((p: { symbol: string; price: string }) => {
    priceMap[p.symbol] = parseFloat(p.price);
  });
  return priceMap;
}

function calculateUsdValue(asset: string, amount: number, priceMap: Record<string, number>): number {
  if (amount === 0) return 0;
  if (['USDT', 'USDC', 'BUSD', 'FDUSD', 'USD1', 'USDE'].includes(asset)) {
    return amount;
  }
  if (priceMap[`${asset}USDT`]) {
    return amount * priceMap[`${asset}USDT`];
  }
  if (priceMap[`${asset}BUSD`]) {
    return amount * priceMap[`${asset}BUSD`];
  }
  if (priceMap[`${asset}FDUSD`]) {
    return amount * priceMap[`${asset}FDUSD`];
  }
  return 0;
}

async function getSpotBalances(
  apiKey: string,
  secretKey: string,
  priceMap: Record<string, number>
): Promise<AccountData> {
  try {
    const response = await fetchWithSignature('/api/v3/account', apiKey, secretKey);
    if (!response.ok) return { accountType: 'spot', accountName: 'Spot', balances: [], totalUsdValue: 0 };
    
    const data = await response.json();
    let totalUsdValue = 0;
    const balances: Balance[] = data.balances
      .filter((b: { free: string; locked: string }) => 
        parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map((b: { asset: string; free: string; locked: string }) => {
        const free = parseFloat(b.free);
        const locked = parseFloat(b.locked);
        const total = free + locked;
        const usdValue = calculateUsdValue(b.asset, total, priceMap);
        totalUsdValue += usdValue;
        return { asset: b.asset, free, locked, total, usdValue };
      });
    
    return { accountType: 'spot', accountName: 'Spot', balances, totalUsdValue };
  } catch {
    return { accountType: 'spot', accountName: 'Spot', balances: [], totalUsdValue: 0 };
  }
}

async function getMarginBalances(
  apiKey: string,
  secretKey: string,
  priceMap: Record<string, number>
): Promise<AccountData> {
  try {
    const response = await fetchWithSignature('/sapi/v1/margin/account', apiKey, secretKey);
    if (!response.ok) return { accountType: 'margin', accountName: 'Cross Margin', balances: [], totalUsdValue: 0 };
    
    const data = await response.json();
    let totalUsdValue = 0;
    const balances: Balance[] = (data.userAssets || [])
      .filter((b: { free: string; locked: string; borrowed: string }) => 
        parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map((b: { asset: string; free: string; locked: string }) => {
        const free = parseFloat(b.free);
        const locked = parseFloat(b.locked);
        const total = free + locked;
        const usdValue = calculateUsdValue(b.asset, total, priceMap);
        totalUsdValue += usdValue;
        return { asset: b.asset, free, locked, total, usdValue };
      });
    
    return { accountType: 'margin', accountName: 'Cross Margin', balances, totalUsdValue };
  } catch {
    return { accountType: 'margin', accountName: 'Cross Margin', balances: [], totalUsdValue: 0 };
  }
}

async function getFuturesBalances(
  apiKey: string,
  secretKey: string,
  priceMap: Record<string, number>
): Promise<AccountData> {
  try {
    const response = await fetchFuturesWithSignature('/fapi/v2/account', apiKey, secretKey);
    if (!response.ok) return { accountType: 'futures', accountName: 'USDⓈ-M Futures', balances: [], totalUsdValue: 0 };
    
    const data = await response.json();
    let totalUsdValue = 0;
    const balances: Balance[] = (data.assets || [])
      .filter((b: { walletBalance: string }) => parseFloat(b.walletBalance) > 0)
      .map((b: { asset: string; walletBalance: string; availableBalance: string }) => {
        const total = parseFloat(b.walletBalance);
        const free = parseFloat(b.availableBalance);
        const locked = total - free;
        const usdValue = calculateUsdValue(b.asset, total, priceMap);
        totalUsdValue += usdValue;
        return { asset: b.asset, free, locked: locked > 0 ? locked : 0, total, usdValue };
      });
    
    return { accountType: 'futures', accountName: 'USDⓈ-M Futures', balances, totalUsdValue };
  } catch {
    return { accountType: 'futures', accountName: 'USDⓈ-M Futures', balances: [], totalUsdValue: 0 };
  }
}

async function getCoinFuturesBalances(
  apiKey: string,
  secretKey: string,
  priceMap: Record<string, number>
): Promise<AccountData> {
  try {
    const response = await fetchCoinFuturesWithSignature('/dapi/v1/account', apiKey, secretKey);
    if (!response.ok) return { accountType: 'coin_futures', accountName: 'COIN-M Futures', balances: [], totalUsdValue: 0 };
    
    const data = await response.json();
    let totalUsdValue = 0;
    const balances: Balance[] = (data.assets || [])
      .filter((b: { walletBalance: string }) => parseFloat(b.walletBalance) > 0)
      .map((b: { asset: string; walletBalance: string; availableBalance: string }) => {
        const total = parseFloat(b.walletBalance);
        const free = parseFloat(b.availableBalance);
        const locked = total - free;
        const usdValue = calculateUsdValue(b.asset, total, priceMap);
        totalUsdValue += usdValue;
        return { asset: b.asset, free, locked: locked > 0 ? locked : 0, total, usdValue };
      });
    
    return { accountType: 'coin_futures', accountName: 'COIN-M Futures', balances, totalUsdValue };
  } catch {
    return { accountType: 'coin_futures', accountName: 'COIN-M Futures', balances: [], totalUsdValue: 0 };
  }
}

async function getEarnBalances(
  apiKey: string,
  secretKey: string,
  priceMap: Record<string, number>
): Promise<AccountData> {
  try {
    const response = await fetchWithSignature('/sapi/v1/simple-earn/flexible/position', apiKey, secretKey, 'size=100');
    if (!response.ok) return { accountType: 'earn', accountName: 'Earn', balances: [], totalUsdValue: 0 };
    
    const data = await response.json();
    let totalUsdValue = 0;
    const balances: Balance[] = (data.rows || [])
      .filter((b: { totalAmount: string }) => parseFloat(b.totalAmount) > 0)
      .map((b: { asset: string; totalAmount: string }) => {
        const total = parseFloat(b.totalAmount);
        const usdValue = calculateUsdValue(b.asset, total, priceMap);
        totalUsdValue += usdValue;
        return { asset: b.asset, free: total, locked: 0, total, usdValue };
      });
    
    return { accountType: 'earn', accountName: 'Earn', balances, totalUsdValue };
  } catch {
    return { accountType: 'earn', accountName: 'Earn', balances: [], totalUsdValue: 0 };
  }
}

async function getFundingBalances(
  apiKey: string,
  secretKey: string,
  priceMap: Record<string, number>
): Promise<AccountData> {
  try {
    const response = await fetchWithSignature('/sapi/v1/asset/get-funding-asset', apiKey, secretKey);
    if (!response.ok) return { accountType: 'funding', accountName: 'Funding', balances: [], totalUsdValue: 0 };
    
    const data = await response.json();
    let totalUsdValue = 0;
    const balances: Balance[] = (data || [])
      .filter((b: { free: string }) => parseFloat(b.free) > 0)
      .map((b: { asset: string; free: string; locked: string }) => {
        const free = parseFloat(b.free);
        const locked = parseFloat(b.locked || '0');
        const total = free + locked;
        const usdValue = calculateUsdValue(b.asset, total, priceMap);
        totalUsdValue += usdValue;
        return { asset: b.asset, free, locked, total, usdValue };
      });
    
    return { accountType: 'funding', accountName: 'Funding', balances, totalUsdValue };
  } catch {
    return { accountType: 'funding', accountName: 'Funding', balances: [], totalUsdValue: 0 };
  }
}

async function getSubAccounts(apiKey: string, secretKey: string): Promise<string[]> {
  try {
    const response = await fetchWithSignature('/sapi/v1/sub-account/list', apiKey, secretKey);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.subAccounts || []).map((sub: { email: string }) => sub.email);
  } catch {
    return [];
  }
}

async function getSubAccountBalances(
  apiKey: string,
  secretKey: string,
  subEmail: string,
  priceMap: Record<string, number>
): Promise<AccountData[]> {
  const accounts: AccountData[] = [];
  
  // Sub-account spot
  try {
    const response = await fetchWithSignature(
      '/sapi/v3/sub-account/assets',
      apiKey,
      secretKey,
      `email=${encodeURIComponent(subEmail)}`
    );
    if (response.ok) {
      const data = await response.json();
      let totalUsdValue = 0;
      const balances: Balance[] = (data.balances || [])
        .filter((b: { free: string; locked: string }) => 
          parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
        .map((b: { asset: string; free: string; locked: string }) => {
          const free = parseFloat(b.free);
          const locked = parseFloat(b.locked);
          const total = free + locked;
          const usdValue = calculateUsdValue(b.asset, total, priceMap);
          totalUsdValue += usdValue;
          return { asset: b.asset, free, locked, total, usdValue };
        });
      
      if (balances.length > 0) {
        accounts.push({
          accountType: 'sub_spot',
          accountName: `${subEmail.split('@')[0]} - Spot`,
          balances,
          totalUsdValue
        });
      }
    }
  } catch {}
  
  // Sub-account futures
  try {
    const response = await fetchWithSignature(
      '/sapi/v2/sub-account/futures/account',
      apiKey,
      secretKey,
      `email=${encodeURIComponent(subEmail)}&futuresType=1`
    );
    if (response.ok) {
      const data = await response.json();
      let totalUsdValue = 0;
      const balances: Balance[] = (data.futureAccountResp?.assets || [])
        .filter((b: { walletBalance: string }) => parseFloat(b.walletBalance) > 0)
        .map((b: { asset: string; walletBalance: string; availableBalance: string }) => {
          const total = parseFloat(b.walletBalance);
          const free = parseFloat(b.availableBalance);
          const locked = total - free;
          const usdValue = calculateUsdValue(b.asset, total, priceMap);
          totalUsdValue += usdValue;
          return { asset: b.asset, free, locked: locked > 0 ? locked : 0, total, usdValue };
        });
      
      if (balances.length > 0) {
        accounts.push({
          accountType: 'sub_futures',
          accountName: `${subEmail.split('@')[0]} - Futures`,
          balances,
          totalUsdValue
        });
      }
    }
  } catch {}
  
  return accounts;
}

export async function GET() {
  const API_KEY = process.env.BINANCE_API_KEY || '';
  const SECRET_KEY = process.env.BINANCE_SECRET_KEY || '';

  if (!API_KEY || !SECRET_KEY) {
    return NextResponse.json({ error: 'Missing API credentials' }, { status: 500 });
  }

  try {
    const priceMap = await getPriceMap();
    
    // Fetch all master account balances in parallel
    const [spot, margin, futures, coinFutures, earn, funding] = await Promise.all([
      getSpotBalances(API_KEY, SECRET_KEY, priceMap),
      getMarginBalances(API_KEY, SECRET_KEY, priceMap),
      getFuturesBalances(API_KEY, SECRET_KEY, priceMap),
      getCoinFuturesBalances(API_KEY, SECRET_KEY, priceMap),
      getEarnBalances(API_KEY, SECRET_KEY, priceMap),
      getFundingBalances(API_KEY, SECRET_KEY, priceMap),
    ]);

    const masterAccounts = [spot, margin, futures, coinFutures, earn, funding].filter(a => a.balances.length > 0);
    const masterTotal = masterAccounts.reduce((sum, a) => sum + a.totalUsdValue, 0);

    // Get sub-accounts
    const subEmails = await getSubAccounts(API_KEY, SECRET_KEY);
    const subAccountsData: AccountData[] = [];
    
    for (const email of subEmails) {
      const subBalances = await getSubAccountBalances(API_KEY, SECRET_KEY, email, priceMap);
      subAccountsData.push(...subBalances);
    }
    
    const subTotal = subAccountsData.reduce((sum, a) => sum + a.totalUsdValue, 0);

    // Sort balances within each account by USD value
    masterAccounts.forEach(a => a.balances.sort((x, y) => y.usdValue - x.usdValue));
    subAccountsData.forEach(a => a.balances.sort((x, y) => y.usdValue - x.usdValue));

    return NextResponse.json({
      master: {
        accounts: masterAccounts,
        totalUsdValue: masterTotal,
      },
      subAccounts: {
        accounts: subAccountsData,
        totalUsdValue: subTotal,
      },
      grandTotal: masterTotal + subTotal,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch balances',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
