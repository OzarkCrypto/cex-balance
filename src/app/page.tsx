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
  master: {
    accounts: AccountData[];
    totalUsdValue: number;
  };
  subAccounts: {
    accounts: AccountData[];
    totalUsdValue: number;
  };
  grandTotal: number;
  timestamp: string;
  error?: string;
}

const formatUsd = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

const AccountCard = ({ account }: { account: AccountData }) => {
  const [expanded, setExpanded] = useState(account.totalUsdValue > 100);
  
  const typeColors: Record<string, string> = {
    spot: '#F0B90B',
    margin: '#F6465D',
    futures: '#0ECB81',
    coin_futures: '#1E90FF',
    earn: '#9B59B6',
    funding: '#3498DB',
    sub_spot: '#E67E22',
    sub_futures: '#27AE60',
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.1)',
      marginBottom: '12px',
      overflow: 'hidden',
    }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          borderLeft: `4px solid ${typeColors[account.accountType] || '#888'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#fff', fontWeight: '600' }}>{account.accountName}</span>
          <span style={{ 
            background: typeColors[account.accountType] || '#888',
            color: '#000',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: '600',
          }}>
            {account.balances.length} assets
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#64ffda', fontWeight: '700', fontFamily: 'monospace' }}>
            {formatUsd(account.totalUsdValue)}
          </span>
          <span style={{ color: '#8892b0' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      
      {expanded && account.balances.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '8px', textAlign: 'left', color: '#8892b0', fontSize: '0.75rem' }}>Asset</th>
                <th style={{ padding: '8px', textAlign: 'right', color: '#8892b0', fontSize: '0.75rem' }}>Available</th>
                <th style={{ padding: '8px', textAlign: 'right', color: '#8892b0', fontSize: '0.75rem' }}>Locked</th>
                <th style={{ padding: '8px', textAlign: 'right', color: '#8892b0', fontSize: '0.75rem' }}>USD Value</th>
              </tr>
            </thead>
            <tbody>
              {account.balances.map((b) => (
                <tr key={b.asset} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px', color: '#fff', fontWeight: '500' }}>{b.asset}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#ccd6f6', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {b.free.toFixed(6)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#8892b0', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {b.locked.toFixed(6)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#64ffda', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    ${b.usdValue.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/binance');
      const result = await response.json();
      
      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
              CEX Balance
            </h1>
            <p style={{ color: '#8892b0', fontSize: '0.9rem' }}>Binance Portfolio Dashboard</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              padding: '10px 20px',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(255, 82, 82, 0.1)',
            border: '1px solid rgba(255, 82, 82, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            color: '#ff5252',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Grand Total */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '8px' }}>
            Total Portfolio Value
          </p>
          <p style={{ color: '#fff', fontSize: '3rem', fontWeight: '700' }}>
            {loading && !data ? '...' : data ? formatUsd(data.grandTotal) : '$0.00'}
          </p>
          {data && (
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginTop: '8px' }}>
              Updated: {new Date(data.timestamp).toLocaleString()}
            </p>
          )}
        </div>

        {/* Summary Cards */}
        {data && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: 'rgba(240, 185, 11, 0.1)',
              border: '1px solid rgba(240, 185, 11, 0.3)',
              borderRadius: '12px',
              padding: '20px',
            }}>
              <p style={{ color: '#F0B90B', fontSize: '0.85rem', marginBottom: '4px' }}>Master Account</p>
              <p style={{ color: '#fff', fontSize: '1.5rem', fontWeight: '700' }}>
                {formatUsd(data.master.totalUsdValue)}
              </p>
              <p style={{ color: '#8892b0', fontSize: '0.75rem', marginTop: '4px' }}>
                {data.master.accounts.length} wallets
              </p>
            </div>
            <div style={{
              background: 'rgba(46, 204, 113, 0.1)',
              border: '1px solid rgba(46, 204, 113, 0.3)',
              borderRadius: '12px',
              padding: '20px',
            }}>
              <p style={{ color: '#2ecc71', fontSize: '0.85rem', marginBottom: '4px' }}>Sub Accounts</p>
              <p style={{ color: '#fff', fontSize: '1.5rem', fontWeight: '700' }}>
                {formatUsd(data.subAccounts.totalUsdValue)}
              </p>
              <p style={{ color: '#8892b0', fontSize: '0.75rem', marginTop: '4px' }}>
                {data.subAccounts.accounts.length} wallets
              </p>
            </div>
          </div>
        )}

        {/* Master Accounts */}
        {data && data.master.accounts.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#F0B90B', fontSize: '1.1rem', fontWeight: '600', marginBottom: '16px' }}>
              📊 Master Account
            </h2>
            {data.master.accounts.map((account, i) => (
              <AccountCard key={i} account={account} />
            ))}
          </div>
        )}

        {/* Sub Accounts */}
        {data && data.subAccounts.accounts.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#2ecc71', fontSize: '1.1rem', fontWeight: '600', marginBottom: '16px' }}>
              👥 Sub Accounts
            </h2>
            {data.subAccounts.accounts.map((account, i) => (
              <AccountCard key={i} account={account} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', color: '#8892b0', fontSize: '0.8rem' }}>
          <p>Auto-refresh every 60 seconds • Edge Runtime (Asia Region)</p>
        </div>
      </div>
    </div>
  );
}
