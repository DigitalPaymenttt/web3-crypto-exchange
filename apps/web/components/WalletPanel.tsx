'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, isAddress, parseEther } from 'viem';
import { useState, type FormEvent } from 'react';

const networks = [
  { id: 1, name: 'Ethereum Mainnet', symbol: 'ETH', explorer: 'https://etherscan.io/tx/' },
  { id: 8453, name: 'Base Mainnet', symbol: 'ETH', explorer: 'https://basescan.org/tx/' },
  { id: 56, name: 'BNB Smart Chain', symbol: 'BNB', explorer: 'https://bscscan.com/tx/' },
] as const;

export default function WalletPanel() {
  const { address, chainId, isConnected } = useAccount();
  const supportedNetwork = networks.find((network) => network.id === chainId);
  const { data: balance, isLoading: balanceLoading, error: balanceError } = useBalance({
    address,
    query: { enabled: Boolean(address && supportedNetwork) },
  });
  const { switchChain, isPending: switching } = useSwitchChain();
  const {
    sendTransactionAsync,
    data: transactionHash,
    isPending: walletPending,
    error: transactionError,
  } = useSendTransaction();
  const {
    isLoading: confirming,
    isSuccess: confirmed,
    error: confirmationError,
  } = useWaitForTransactionReceipt({
    hash: transactionHash,
    query: { enabled: Boolean(transactionHash) },
  });

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [localError, setLocalError] = useState('');

  function reviewTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError('');

    if (!supportedNetwork || !chainId) {
      setLocalError('Switch to Ethereum, Base, or BNB Smart Chain before preparing a transfer.');
      return;
    }
    if (!isAddress(recipient.trim())) {
      setLocalError('Enter a valid destination address.');
      return;
    }
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(amount.trim()) || Number(amount) <= 0) {
      setLocalError('Enter a positive amount with no more than 18 decimal places.');
      return;
    }

    try {
      parseEther(amount.trim());
      setReviewing(true);
    } catch {
      setLocalError('The amount is not a valid native-coin value.');
    }
  }

  async function submitTransfer() {
    setLocalError('');
    if (!supportedNetwork || !chainId || !isAddress(recipient.trim())) {
      setLocalError('The network or destination address is not valid.');
      return;
    }

    try {
      const value = parseEther(amount.trim());
      if (balance?.value !== undefined && value > balance.value) {
        setLocalError('The amount exceeds the displayed balance. Keep extra funds available for network fees.');
        return;
      }
      await sendTransactionAsync({
        to: recipient.trim() as `0x${string}`,
        value,
        chainId,
      });
      setReviewing(false);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'The wallet did not submit the transaction.');
    }
  }

  return (
    <section className="panel wallet-panel">
      <div className="section-heading">
        <div>
          <h2>Connect your wallet</h2>
          <p className="muted">Connect to view the active account and native-coin balance. Wallet connection alone does not move funds.</p>
        </div>
        <ConnectButton />
      </div>

      {isConnected && address ? (
        <>
          <div className="wallet-status">
            <div>
              <span className="hint">Connected address</span>
              <div className="address-value">{address}</div>
            </div>
            <div>
              <span className="hint">Active network</span>
              <strong>{supportedNetwork?.name ?? `Unsupported network (chain ID ${chainId ?? 'unknown'})`}</strong>
            </div>
            <div>
              <span className="hint">Native balance</span>
              <strong>
                {!supportedNetwork ? 'Switch to a supported network' : balanceLoading ? 'Loading…' : balanceError ? 'Unavailable' : balance ? `${formatEther(balance.value)} ${supportedNetwork.symbol}` : 'Unavailable'}
              </strong>
            </div>
          </div>

          <div className="network-switches" aria-label="Supported networks">
            <span className="hint">Switch network:</span>
            {networks.map((network) => (
              <button
                className="secondary-button"
                type="button"
                key={network.id}
                disabled={switching || chainId === network.id}
                onClick={() => switchChain({ chainId: network.id })}
              >
                {chainId === network.id ? `✓ ${network.name}` : network.name}
              </button>
            ))}
          </div>

          <div className="transfer-box">
            <h3>Send native coin</h3>
            <p className="hint">Only ETH on Ethereum/Base or BNB on BNB Smart Chain is supported here. This form does not send tokens or run automatic transfers.</p>

            {!reviewing ? (
              <form onSubmit={reviewTransfer}>
                <label htmlFor="transfer-recipient">Destination address</label>
                <input
                  id="transfer-recipient"
                  className="address-input"
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                  placeholder="0x..."
                  autoComplete="off"
                  spellCheck={false}
                  required
                />
                <label htmlFor="transfer-amount">Amount ({supportedNetwork?.symbol ?? 'native coin'})</label>
                <input
                  id="transfer-amount"
                  className="address-input"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.01"
                  inputMode="decimal"
                  autoComplete="off"
                  required
                />
                <div className="actions">
                  <button className="primary-button" type="submit" disabled={!supportedNetwork}>Review transfer</button>
                </div>
              </form>
            ) : (
              <div className="transfer-review">
                <h4>Review before wallet approval</h4>
                <p><strong>Network:</strong> {supportedNetwork?.name}</p>
                <p><strong>From:</strong> {address}</p>
                <p><strong>To:</strong> {recipient}</p>
                <p><strong>Amount:</strong> {amount} {supportedNetwork?.symbol}</p>
                <p className="hint">Network fees are additional. Check the recipient, network, amount and fee in your wallet before approving.</p>
                <div className="actions">
                  <button className="primary-button" type="button" onClick={() => void submitTransfer()} disabled={walletPending || confirming}>
                    {walletPending ? 'Waiting for wallet…' : 'Confirm and request wallet signature'}
                  </button>
                  <button className="secondary-button" type="button" onClick={() => setReviewing(false)} disabled={walletPending}>Cancel</button>
                </div>
              </div>
            )}

            {localError ? <div className="notice error" role="alert">{localError}</div> : null}
            {transactionError ? <div className="notice error" role="alert">Wallet transaction error: {transactionError.message}</div> : null}
            {confirmationError ? <div className="notice error" role="alert">Confirmation lookup failed. Check the transaction hash in the block explorer.</div> : null}
            {transactionHash ? (
              <div className="notice" aria-live="polite">
                <p><strong>Transaction submitted.</strong> {confirming ? 'Waiting for network confirmation…' : confirmed ? 'Confirmed on-chain.' : 'Confirmation status is pending or unavailable.'}</p>
                <p className="hint">Transaction hash: {transactionHash}</p>
                {supportedNetwork ? <a href={supportedNetwork.explorer + transactionHash} target="_blank" rel="noreferrer">View transaction on {supportedNetwork.name} explorer</a> : null}
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <p className="hint">No wallet is connected. Connect only through the wallet selector above. Never enter a seed phrase or private key into this website.</p>
      )}
    </section>
  );
}
