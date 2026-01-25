'use client';

import { useState, useEffect, useCallback } from 'react';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/binance');
      const result = await res.json();
      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
        setError(null);
      }
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const fmt = (n: number) => {
    if (!n) return '$0';
    if (n >= 1e6) return '$' + (n/1e6).toFixed(2) + 'M';
    if (n >= 1e3) return '$' + (n/1e3).toFixed(1) + 'K';
    return '$' + n.toFixed(2);
  };

  const fmtNum = (n: number) => {
    if (!n) return '0';
    if (n >= 1) return n.toFixed(4);
    return n.toFixed(8);
  };

  const colors: any = {
    spot: '#F0B90B', futures: '#00C853', earn: '#9C27B0',
    sub_spot: '#FF9800', sub_futures: '#4CAF50',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ fontSize: 18, margin: 0 }}>CEX Balance</h1>
          <button onClick={fetchData} style={{ padding: '6px 12px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            {loading ? '⏳' : '🔄'}
          </button>
        </div>

        {error && <div style={{ background: '#fee', padding: 8, marginBottom: 12, borderRadius: 4, color: 'red' }}>{error}</div>}

        {/* Total */}
        <div style={{ background: '#1a73e8', color: '#fff', padding: 16, borderRadius: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Total Portfolio</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{data ? fmt(data.grandTotal) : '...'}</div>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #ddd' }}>
            <div style={{ fontSize: 10, color: '#F0B90B' }}>MASTER</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{data ? fmt(data.master?.totalUsdValue) : '$0'}</div>
          </div>
          <div style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #ddd' }}>
            <div style={{ fontSize: 10, color: '#4CAF50' }}>SUB</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{data ? fmt(data.subAccounts?.totalUsdValue) : '$0'}</div>
          </div>
        </div>

        {/* Master Accounts */}
        {data?.master?.accounts?.map((acc: any, i: number) => {
          const key = 'm' + i;
          const isOpen = expanded.has(key);
          return (
            <div key={key} style={{ background: '#fff', borderRadius: 6, marginBottom: 6, border: '1px solid #ddd', overflow: 'hidden' }}>
              <div onClick={() => toggle(key)} style={{ padding: '8px 12px', cursor: 'pointer', borderLeft: '3px solid ' + (colors[acc.accountType] || '#999'), display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: 12 }}>{acc.accountName}</span>
                <span style={{ color: '#1a73e8', fontWeight: 700, fontSize: 12 }}>{fmt(acc.totalUsdValue)} {isOpen ? '▲' : '▼'}</span>
              </div>
              {isOpen && (
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#f8f8f8' }}>
                    <th style={{ padding: 4, textAlign: 'left' }}>Asset</th>
                    <th style={{ padding: 4, textAlign: 'right', fontWeight: 700 }}>Total</th>
                    <th style={{ padding: 4, textAlign: 'right', color: '#888' }}>Avail</th>
                    <th style={{ padding: 4, textAlign: 'right', color: '#888' }}>Lock</th>
                    <th style={{ padding: 4, textAlign: 'right' }}>USD</th>
                  </tr></thead>
                  <tbody>
                    {acc.balances?.map((b: any) => (
                      <tr key={b.asset} style={{ borderTop: '1px solid #eee' }}>
                        <td style={{ padding: 4 }}>{b.asset}</td>
                        <td style={{ padding: 4, textAlign: 'right', fontWeight: 600 }}>{fmtNum(b.total)}</td>
                        <td style={{ padding: 4, textAlign: 'right', color: '#888' }}>{fmtNum(b.free)}</td>
                        <td style={{ padding: 4, textAlign: 'right', color: '#888' }}>{fmtNum(b.locked)}</td>
                        <td style={{ padding: 4, textAlign: 'right', color: '#1a73e8' }}>{fmt(b.usdValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}

        {/* Sub Accounts */}
        {data?.subAccounts?.accounts?.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 10, color: '#666', marginBottom: 6 }}>SUB ACCOUNTS</div>
        )}
        {data?.subAccounts?.accounts?.map((acc: any, i: number) => {
          const key = 's' + i;
          const isOpen = expanded.has(key);
          return (
            <div key={key} style={{ background: '#fff', borderRadius: 6, marginBottom: 6, border: '1px solid #ddd', overflow: 'hidden' }}>
              <div onClick={() => toggle(key)} style={{ padding: '8px 12px', cursor: 'pointer', borderLeft: '3px solid ' + (colors[acc.accountType] || '#999'), display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: 12 }}>{acc.accountName}</span>
                <span style={{ color: '#1a73e8', fontWeight: 700, fontSize: 12 }}>{fmt(acc.totalUsdValue)} {isOpen ? '▲' : '▼'}</span>
              </div>
              {isOpen && (
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#f8f8f8' }}>
                    <th style={{ padding: 4, textAlign: 'left' }}>Asset</th>
                    <th style={{ padding: 4, textAlign: 'right', fontWeight: 700 }}>Total</th>
                    <th style={{ padding: 4, textAlign: 'right', color: '#888' }}>Avail</th>
                    <th style={{ padding: 4, textAlign: 'right', color: '#888' }}>Lock</th>
                    <th style={{ padding: 4, textAlign: 'right' }}>USD</th>
                  </tr></thead>
                  <tbody>
                    {acc.balances?.map((b: any) => (
                      <tr key={b.asset} style={{ borderTop: '1px solid #eee' }}>
                        <td style={{ padding: 4 }}>{b.asset}</td>
                        <td style={{ padding: 4, textAlign: 'right', fontWeight: 600 }}>{fmtNum(b.total)}</td>
                        <td style={{ padding: 4, textAlign: 'right', color: '#888' }}>{fmtNum(b.free)}</td>
                        <td style={{ padding: 4, textAlign: 'right', color: '#888' }}>{fmtNum(b.locked)}</td>
                        <td style={{ padding: 4, textAlign: 'right', color: '#1a73e8' }}>{fmt(b.usdValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
