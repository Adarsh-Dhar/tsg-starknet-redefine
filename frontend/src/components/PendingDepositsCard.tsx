import React, { useState, useEffect } from 'react';
import { AlertCircle, Zap, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface PendingDeposit {
  txHash: string;
  amount: number;
  timestamp: string;
}

export function PendingDepositsCard({ userAddress }: { userAddress: string }) {
  const [pendingDeposits, setPendingDeposits] = useState<PendingDeposit[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch pending deposits
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const response = await fetch(
          `http://localhost:3333/api/delegate/history/${userAddress}?limit=20`
        );
        if (response.ok) {
          const data = await response.json();
          const pending = (data.transactions || []).filter(
            (tx: any) => tx.status === 'pending' && tx.type === 'deposit'
          );
          setPendingDeposits(pending);
        }
      } catch (err) {
        console.error('[PendingDeposits] Failed to fetch:', err);
      }
    };

    if (userAddress) {
      fetchPending();
      const interval = setInterval(fetchPending, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [userAddress]);

  const handleExecutePending = async () => {
    if (!userAddress) return;

    setIsExecuting(true);
    setError(null);
    setExecutionResult(null);

    try {
      const response = await fetch(
        `http://localhost:3333/api/execute-pending-deposits/${userAddress}`,
        { method: 'POST' }
      );

      const result = await response.json();

      if (response.ok) {
        console.log('[PendingDeposits] Execution successful:', result);
        setExecutionResult(result);
        setPendingDeposits([]); // Clear pending list
      } else {
        setError(result.message || result.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('[PendingDeposits] Execution failed:', err);
      setError(err.message || 'Failed to execute pending deposits');
    } finally {
      setIsExecuting(false);
    }
  };

  if (pendingDeposits.length === 0 && !executionResult) {
    return null; // Don't show card if no pending deposits
  }

  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {executionResult ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <CardTitle className="text-sm font-bold text-emerald-500">
                Deposits Executed
              </CardTitle>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-sm font-bold text-amber-500">
                {pendingDeposits.length} Pending Deposits
              </CardTitle>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {executionResult ? (
          <div className="space-y-2 text-xs">
            <p className="text-emerald-500 font-bold">
              ✅ {executionResult.executed} deposits executed!
            </p>
            <p className="text-emerald-500/70">
              Total: {executionResult.totalAmount} STRK
            </p>
            <p className="text-emerald-400 font-mono break-all text-[10px]">
              TX: {executionResult.transactionHash}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2 text-xs">
              <p className="text-amber-500/80">
                {pendingDeposits.length} deposits waiting to be executed on blockchain
              </p>
              <div className="max-h-24 overflow-y-auto space-y-1 text-amber-500/60">
                {pendingDeposits.slice(0, 3).map((deposit, i) => (
                  <div key={i} className="text-[10px] font-mono">
                    {deposit.amount.toFixed(4)} STRK - {deposit.timestamp}
                  </div>
                ))}
                {pendingDeposits.length > 3 && (
                  <div className="text-[10px] text-amber-500/40">
                    +{pendingDeposits.length - 3} more...
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                <p className="text-[10px] text-red-400">{error}</p>
                {error.includes('approved') && (
                  <p className="text-[10px] text-red-400/70 mt-1">
                    👉 You need to approve the vault contract as a spender on your STRK token
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleExecutePending}
              disabled={isExecuting || pendingDeposits.length === 0}
              className="w-full py-2 px-3 rounded bg-amber-500/20 border border-amber-500/40 text-xs font-bold text-amber-500 hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              <Zap className="w-3 h-3" />
              {isExecuting
                ? 'Executing...'
                : `Execute ${pendingDeposits.length} Deposit${pendingDeposits.length !== 1 ? 's' : ''}`}
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
