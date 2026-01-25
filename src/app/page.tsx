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

function formatNum(value: number): string {
  if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(2) + 'K';
  if (value >= 1) return value.toFixed(4);
  if (value >= 0.0001) return value.toFixed(6);
  return value.toFixed(8);
}

const colors: Record<string, string> = {
  spot: '#F0B90B', margin: '#E91E63', futures: '#00C853',
  coin_futures: '#2196F3', earn: '#9C27B0', funding: '#00BCD4',
  sub_spot: '#FF9800', sub_futures: '#4CAF50',
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
        (result.master?.accounts || []).forEach((_: AccountData, i: number) => { exp['m' + i] = true; });
        (result.subAccounts?.accounts || []).forEach((a: AccountData, i: number) => { if (a.totalUsdValue > 1000) exp['s' + i] = true; });
        setExpanded(exp);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 60000); return () => clearInterval(i); }, []);

  const renderAccount = (acc: AccountData, key: string) => (
    <div key={key} style={{ background: '#fff', borderRadius: 6, border: '1px solid #e5e5e5', marginBottom: 6, overflow: 'hidden' }}>
      <div onClick={() => toggle(key)} style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderLeft: '3px solid ' + (colors[acc.accountType] || '#999') }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 12, color: '#333' }}>{acc.accountName}</span>
          <span style={{ background: colors[acc.accountType] || '#999', color: '#fff', padding: '1px 5px', borderRadius: 3, fontSize: 9 }}>{acc.balances?.length || 0}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 12, color: '#1a73e8' }}>{formatUsd(acc.totalUsdValue)}</span>
          <span style={{ color: '#999', fontSize: 9 }}>{expanded[key] ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded[key] && (acc.balances?.length || 0) > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead><tr style={{ background: '#f8f8f8' }}>
            <th style={{ padding: '4px 8px', textAlign: 'left', color: '#666', fontWeight: 500 }}>Asset</th>
            <th style={{ padding: '4px 8px', textAlign: 'right', color: '#666', fontWeight: 600 }}>Total</th>
            <th style={{ padding: '4px 8px', textAlign: 'right', color: '#999', fontWeight: 400, fontSize: 10 }}>Avail</th>
            <th style={{ padding: '4px 8px', textAlign: 'right', color: '#999', fontWeight: 400, fontSize: 10 }}>Lock</th>
            <th style={{ padding: '4px 8px', textAlign: 'right', color: '#666', fontWeight: 500 }}>USD</th>
          </tr></thead>
          <tbody>
            {(acc.balances || []).map(b => (
              <tr key={b.asset} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '4px 8px', fontWeight: 500, color: '#333' }}>{b.asset}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#000', fontWeight: 600 }}>{formatNum(b.total)}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#888', fontSize: 10 }}>{formatNum(b.free)}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#888', fontSize: 10 }}>{formatNum(b.locked)}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#1a73e8', fontWeight: 500 }}>{formatUsd(b.usdValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const masterAccounts = data?.master?.accounts || [];
  const subAccounts = data?.subAccounts?.accounts || [];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: 16, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#333', margin: 0 }}>CEX Balance</h1>
          <button onClick={fetchData} disabled={loading} style={{ background: '#1a73e8', border: 'none', borderRadius: 4, padding: '6px 12px', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontSize: 11 }}>
            {loading ? '⏳' : '🔄'}
          </button>
        </div>

        {error && <div style={{ background: '#ffebee', border: '1px solid #ef9a9a', borderRadius: 4, padding: 8, marginBottom: 12, color: '#c62828', fontSize: 11 }}>⚠️ {error}</div>}

        <div style={{ background: '#1a73e8', borderRadius: 8, padding: 16, marginBottom: 12, color: '#fff' }}>
          <div style={{ fontSize: 11, opacity: 0.8 }}>Total Portfolio</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{loading && !data ? '...' : formatUsd(data?.grandTotal)}</div>
          {data?.timestamp && <div style={{ fontSize: 9, opacity: 0.6, marginTop: 4 }}>{new Date(data.timestamp).toLocaleString()}</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div style={{ background: '#fff', borderRadius: 6, padding: 10, border: '1px solid #e5e5e5' }}>
            <div style={{ fontSize: 9, color: '#F0B90B', fontWeight: 600 }}>MASTER</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>{formatUsd(data?.master?.totalUsdValue)}</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 6, padding: 10, border: '1px solid #e5e5e5' }}>
            <div style={{ fontSize: 9, color: '#4CAF50', fontWeight: 600 }}>SUB</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>{formatUsd(data?.subAccounts?.totalUsdValue)}</div>
          </div>
        </div>

        {masterAccounts.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#666', marginBottom: 6 }}>MASTER</div>
            {masterAccounts.map((acc, i) => renderAccount(acc, 'm' + i))}
          </div>
        )}

        {subAccounts.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#666', marginBottom: 6 }}>SUB ACCOUNTS</div>
            {subAccounts.map((acc, i) => renderAccount(acc, 's' + i))}
          </div>
        )}

        <div style={{ textAlign: 'center', color: '#999', fontSize: 9, marginTop: 16 }}>60s refresh • Asia Edge</div>
      </div>
    </div>
  );
}
