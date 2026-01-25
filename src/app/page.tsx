'use client';

import { useState, useEffect } from 'react';

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

interface ApiResponse {
  master: { accounts: AccountData[]; totalUsdValue: number };
  subAccounts: { accounts: AccountData[]; totalUsdValue: number };
  grandTotal: number;
  timestamp: string;
}

function formatUsd(value: number | undefined | null): string {
  if (!value) return '$0';
  if (value >= 1000000) return '$' + (value / 1000000).toFixed(2) + 'M';
  if (value >= 1000) return '$' + (value / 1000).toFixed(1) + 'K';
  return '$' + value.toFixed(2);
}

function formatAmount(value: number): string {
  if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(2) + 'K';
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(8);
}

const colors: Record<string, string> = {
  spot: '#F0B90B',
  margin: '#E91E63',
  futures: '#00C853',
  coin_futures: '#2196F3',
  earn: '#9C27B0',
  funding: '#00BCD4',
  sub_spot: '#FF9800',
  sub_futures: '#4CAF50',
};

export default function Home() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/binance');
      const result = await res.json();
      if (result.error) setError(result.error);
      else {
        setData(result);
        setError(null);
        const exp: Record<string, boolean> = {};
        result.master?.accounts?.forEach((_: AccountData, i: number) => exp['m' + i] = true);
        result.subAccounts?.accounts?.forEach((a: AccountData, i: number) => { if (a.totalUsdValue > 1000) exp['s' + i] = true; });
        setExpanded(exp);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 60000); return () => clearInterval(i); }, []);

  const renderAccount = (acc: AccountData, key: string) => (
    <div key={key} style={{ background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0', marginBottom: 8, overflow: 'hidden' }}>
      <div onClick={() => toggle(key)} style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderLeft: `3px solid ${colors[acc.accountType] || '#999'}`, background: expanded[key] ? '#fafafa' : '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#333' }}>{acc.accountName}</span>
          <span style={{ background: colors[acc.accountType] || '#999', color: '#fff', padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600 }}>{acc.balances?.length || 0}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#1a73e8', fontFamily: 'monospace' }}>{formatUsd(acc.totalUsdValue)}</span>
          <span style={{ color: '#999', fontSize: 10 }}>{expanded[key] ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded[key] && acc.balances?.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '6px 10px', textAlign: 'left', color: '#666', fontWeight: 500 }}>Asset</th>
              <th style={{ padding: '6px 10px', textAlign: 'right', color: '#666', fontWeight: 500 }}>Amount</th>
              <th style={{ padding: '6px 10px', textAlign: 'right', color: '#666', fontWeight: 500 }}>USD</th>
            </tr>
          </thead>
          <tbody>
            {acc.balances.map(b => (
              <tr key={b.asset} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: '6px 10px', fontWeight: 500, color: '#333' }}>{b.asset}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#555' }}>{formatAmount(b.total)}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#1a73e8', fontWeight: 500 }}>{formatUsd(b.usdValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#333', margin: 0 }}>CEX Balance</h1>
          <button onClick={fetchData} disabled={loading} style={{ background: '#1a73e8', border: 'none', borderRadius: 6, padding: '8px 16px', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontSize: 13, fontWeight: 500 }}>
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>

        {error && <div style={{ background: '#ffebee', border: '1px solid #ef9a9a', borderRadius: 6, padding: 12, marginBottom: 16, color: '#c62828', fontSize: 13 }}>⚠️ {error}</div>}

        {/* Total Card */}
        <div style={{ background: 'linear-gradient(135deg, #1a73e8, #6c5ce7)', borderRadius: 12, padding: 20, marginBottom: 16, color: '#fff' }}>
          <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>Total Portfolio</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{loading && !data ? '...' : formatUsd(data?.grandTotal)}</div>
          {data?.timestamp && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{new Date(data.timestamp).toLocaleString()}</div>}
        </div>

        {/* Summary */}
        {data && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#fff', borderRadius: 8, padding: 14, border: '1px solid #e0e0e0' }}>
              <div style={{ fontSize: 11, color: '#F0B90B', fontWeight: 600, marginBottom: 2 }}>MASTER</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#333' }}>{formatUsd(data.master?.totalUsdValue)}</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 8, padding: 14, border: '1px solid #e0e0e0' }}>
              <div style={{ fontSize: 11, color: '#4CAF50', fontWeight: 600, marginBottom: 2 }}>SUB ACCOUNTS</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#333' }}>{formatUsd(data.subAccounts?.totalUsdValue)}</div>
            </div>
          </div>
        )}

        {/* Master */}
        {data?.master?.accounts?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 8, textTransform: 'uppercase' }}>Master Account</div>
            {data.master.accounts.map((acc, i) => renderAccount(acc, 'm' + i))}
          </div>
        )}

        {/* Sub Accounts */}
        {data?.subAccounts?.accounts?.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 8, textTransform: 'uppercase' }}>Sub Accounts</div>
            {data.subAccounts.accounts.map((acc, i) => renderAccount(acc, 's' + i))}
          </div>
        )}

        <div style={{ textAlign: 'center', color: '#999', fontSize: 11, marginTop: 20 }}>Auto-refresh 60s • Asia Edge</div>
      </div>
    </div>
  );
}
