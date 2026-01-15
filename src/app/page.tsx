'use client';

import { useState, useEffect, useCallback } from 'react';

interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
  usdValue?: number;
}

interface BinanceResponse {
  balances: Balance[];
  timestamp: string;
  error?: string;
}

export default function Home() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [balanceRes, priceRes] = await Promise.all([
        fetch('/api/binance'),
        fetch('/api/prices'),
      ]);

      if (!balanceRes.ok) {
        const errorData = await balanceRes.json();
        throw new Error(errorData.error || 'Failed to fetch balances');
      }

      const balanceData: BinanceResponse = await balanceRes.json();
      const priceData: Record<string, number> = await priceRes.json();

      setPrices(priceData);

      // Calculate USD values
      const balancesWithUsd = balanceData.balances.map((b) => {
        let usdValue = 0;

        if (b.asset === 'USDT' || b.asset === 'USDC' || b.asset === 'BUSD' || b.asset === 'USD') {
          usdValue = b.total;
        } else if (priceData[`${b.asset}USDT`]) {
          usdValue = b.total * priceData[`${b.asset}USDT`];
        } else if (priceData[`${b.asset}BUSD`]) {
          usdValue = b.total * priceData[`${b.asset}BUSD`];
        } else if (priceData[`${b.asset}USDC`]) {
          usdValue = b.total * priceData[`${b.asset}USDC`];
        }

        return { ...b, usdValue };
      });

      // Sort by USD value descending
      balancesWithUsd.sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0));

      setBalances(balancesWithUsd);
      setLastUpdate(new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const totalUsdValue = balances.reduce((sum, b) => sum + (b.usdValue || 0), 0);

  const formatNumber = (num: number, decimals: number = 2) => {
    if (num === 0) return '0';
    if (num < 0.01) return num.toFixed(8);
    return num.toLocaleString('en-US', { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals 
    });
  };

  const formatUsd = (num: number) => {
    return '$' + num.toLocaleString('en-US', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">CEX Balance</h1>
            <p className="text-gray-400 mt-1">Exchange Portfolio Dashboard</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Total Value Card */}
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-lg">B</span>
            </div>
            <span className="text-xl font-semibold text-yellow-500">Binance</span>
          </div>
          <p className="text-gray-400 text-sm mb-1">Total Portfolio Value</p>
          <p className="text-4xl font-bold text-white">{formatUsd(totalUsdValue)}</p>
          <p className="text-gray-500 text-sm mt-2">Last updated: {lastUpdate}</p>
        </div>

        {/* Balances Table */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold">Asset Balances</h2>
          </div>
          
          {loading && balances.length === 0 ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">Loading balances...</p>
            </div>
          ) : balances.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400">No balances found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 text-sm">
                    <th className="text-left px-6 py-3 font-medium">Asset</th>
                    <th className="text-right px-6 py-3 font-medium">Available</th>
                    <th className="text-right px-6 py-3 font-medium">Locked</th>
                    <th className="text-right px-6 py-3 font-medium">Total</th>
                    <th className="text-right px-6 py-3 font-medium">USD Value</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((balance) => (
                    <tr 
                      key={balance.asset} 
                      className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold">
                            {balance.asset.slice(0, 2)}
                          </div>
                          <span className="font-medium">{balance.asset}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-300">
                        {formatNumber(balance.free, 8)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-300">
                        {formatNumber(balance.locked, 8)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-white font-medium">
                        {formatNumber(balance.total, 8)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-yellow-500 font-medium">
                        {balance.usdValue ? formatUsd(balance.usdValue) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Auto-refreshes every 60 seconds • Data from Binance API</p>
        </div>
      </div>
    </div>
  );
}
