'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { erc20Abi, formatEther, isAddress, parseEther, parseUnits, type Address } from 'viem';
import { useState, type FormEvent } from 'react';

const LINK_TOKEN_ADDRESSES: Record<number, Address> = {
  1: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  8453: '0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196',
  56: '0x404460C6A5EdE2D891e8297795264fDe62ADBB75',
};

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
  const linkTokenAddress = chainId ? LINK_TOKEN_ADDRESSES[chainId] : undefined;
  const { data: linkBalance, isLoading: linkBalanceLoading, error: linkBalanceError } = useBalance({
    address,
    token: linkTokenAddress,
    chainId,
    query: { enabled: Boolean(address && supportedNetwork && linkTokenAddress) },
  });
  const { switchChain, isPending: switching } = useSwitchChain();
  const { writeContractAsync, data: linkTransactionHash, isPending: linkWalletPending, error: linkWalletError } = useWriteContract();
  const { isLoading: linkConfirming, isSuccess: linkConfirmed, error: linkConfirmationError } = useWaitForTransactionReceipt({
    hash: linkTransactionHash,
    query: { enabled: Boolean(linkTransactionHash) },
  });
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
  const [reviewedChainId, setReviewedChainId] = useState<number | null>(null);
  const [localError, setLocalError] = useState('');
  const [submittedChainId, setSubmittedChainId] = useState<number | null>(null);
  const [linkRecipient, setLinkRecipient] = useState('');
  const [linkAmount, setLinkAmount] = useState('');
  const [linkReviewing, setLinkReviewing] = useState(false);
  const [reviewedLinkChainId, setReviewedLinkChainId] = useState<number | null>(null);
  const [linkLocalError, setLinkLocalError] = useState('');

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
      setReviewedChainId(chainId);
      setReviewing(true);
    } catch {
      setLocalError('The amount is not a valid native-coin value.');
    }
  }

  function reviewLinkTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLinkLocalError('');
    if (!supportedNetwork || !chainId || !linkTokenAddress) {
      setLinkLocalError('Switch to Ethereum, Base, or BNB Smart Chain before preparing a LINK transfer.');
      return;
    }
    if (!isAddress(linkRecipient.trim())) {
      setLinkLocalError('Enter a valid destination address.');
      return;
    }
    if (!/^(?:0|[1-9]\\d*)(?:\\.\\d{1,18})?$/.test(linkAmount.trim()) || Number(linkAmount) <= 0) {
      setLinkLocalError('Enter a positive LINK amount with no more than 18 decimal places.');
      return;
    }
    try {
      const value = parseUnits(linkAmount.trim(), 18);
      if (!linkBalance || value > linkBalance.value) {
        setLinkLocalError('The LINK amount exceeds the displayed balance or the balance has not loaded.');
        return;
      }
      setReviewedLinkChainId(chainId);
      setLinkReviewing(true);
    } catch {
      setLinkLocalError('Enter a valid LINK amount.');
    }
  }

  async function submitLinkTransfer() {
    setLinkLocalError('');
    if (!supportedNetwork || !chainId || chainId !== reviewedLinkChainId || !linkTokenAddress || !isAddress(linkRecipient.trim())) {
      setLinkLocalError('The active network changed or the recipient is invalid. Cancel and review again.');
      return;
    }
    try {
      const value = parseUnits(linkAmount.trim(), 18);
      if (!linkBalance || value > linkBalance.value) {
        setLinkLocalError('The LINK balance is insufficient. Refresh the balance and review again.');
        return;
      }
      await writeContractAsync({
        address: linkTokenAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [linkRecipient.trim() as Address, value],
        chainId: supportedNetwork.id,
      });
      setLinkReviewing(false);
    } catch (error) {
      setLinkLocalError(error instanceof Error ? error.message : 'The wallet did not submit the LINK transfer.');
    }
  }

  async function submitTransfer() {
    setLocalError('');
    if (!supportedNetwork || !chainId || !reviewedChainId || chainId !== reviewedChainId || !isAddress(recipient.trim())) {
      setLocalError('The active network changed or the destination is invalid. Cancel and review the transfer again.');
      return;
    }

    try {
      const value = parseEther(amount.trim());
      if (!balance) {
        setLocalError('Wait for the connected wallet balance to load before sending.');
        return;
      }
      if (value > balance.value) {
        setLocalError('The amount exceeds the displayed balance. Keep extra funds available for network fees.');
        return;
      }
      await sendTransactionAsync({
        to: recipient.trim() as `0x${string}`,
        value,
        chainId: supportedNetwork.id,
      });
      setSubmittedChainId(supportedNetwork.id);
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
            <div>
              <span className="hint">LINK balance (Mainnet)</span>
              <strong>
                {!supportedNetwork ? 'Switch to a supported network' : linkBalanceLoading ? 'Loading…' : linkBalanceError ? 'Unavailable' : linkBalance ? `${formatEther(linkBalance.value)} LINK` : '0 LINK'}
              </strong>
              <span className="hint">Live token balance on {supportedNetwork?.name ?? 'the selected network'}</span>
            </div>
          </div>

          <div className="transfer-box">
            <h3>Send LINK</h3>
            <p className="hint">Mainnet ERC-20 transfer. You must hold LINK and have the network's native coin (ETH on Ethereum/Base or BNB on BNB Chain) for gas. Review the fee and transaction details in your wallet before signing.</p>
            {!linkReviewing ? (
              <form onSubmit={reviewLinkTransfer}>
                <label htmlFor="link-recipient">LINK recipient address</label>
                <input id="link-recipient" className="address-input" value={linkRecipient} onChange={(event) => setLinkRecipient(event.target.value)} placeholder="0x..." autoComplete="off" spellCheck={false} required />
                <label htmlFor="link-amount">Amount (LINK)</label>
                <input id="link-amount" className="address-input" value={linkAmount} onChange={(event) => setLinkAmount(event.target.value)} placeholder="1.0" inputMode="decimal" autoComplete="off" required />
                <div className="actions"><button className="primary-button" type="submit" disabled={!supportedNetwork || !linkTokenAddress || linkBalanceLoading || !linkBalance || linkBalance.value === 0n}>Review LINK transfer</button></div>
              </form>
            ) : (
              <div className="transfer-review">
                <h4>Review LINK transfer</h4>
                <p><strong>Network:</strong> {networks.find((network) => network.id === reviewedLinkChainId)?.name}</p>
                <p><strong>Token contract:</strong> {linkTokenAddress}</p>
                <p><strong>From:</strong> {address}</p>
                <p><strong>To:</strong> {linkRecipient}</p>
                <p><strong>Amount:</strong> {linkAmount} LINK</p>
                <p className="hint">Only continue if the network, token contract, recipient, and amount are correct. Your wallet will show the network fee. Never approve an unexpected token allowance; this transfer calls LINK transfer directly.</p>
                <div className="actions">
                  <button className="primary-button" type="button" onClick={() => void submitLinkTransfer()} disabled={linkWalletPending || linkConfirming}>{linkWalletPending ? 'Waiting for wallet…' : 'Confirm and request wallet signature'}</button>
                  <button className="secondary-button" type="button" onClick={() => setLinkReviewing(false)} disabled={linkWalletPending}>Cancel</button>
                </div>
              </div>
            )}
            {linkLocalError ? <div className="notice error" role="alert">{linkLocalError}</div> : null}
            {linkWalletError ? <div className="notice error" role="alert">Wallet error: {linkWalletError.message}</div> : null}
            {linkConfirmationError ? <div className="notice error" role="alert">Confirmation lookup failed. Check the transaction hash in the block explorer.</div> : null}
            {linkTransactionHash ? <div className="notice" aria-live="polite">
              <p><strong>LINK transaction submitted.</strong> {linkConfirming ? 'Waiting for network confirmation…' : linkConfirmed ? 'Confirmed on-chain.' : 'Confirmation status is pending or unavailable.'}</p>
              <p className="hint">Transaction hash: {linkTransactionHash}</p>
              {supportedNetwork ? <a href={networks.find((network) => network.id === supportedNetwork.id)!.explorer + linkTransactionHash} target="_blank" rel="noreferrer">View LINK transfer on {supportedNetwork.name} explorer</a> : null}
            </div> : null}
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
            <p className="hint">Only ETH on Ethereum/Base or BNB on BNB Smart Chain is supported here. LINK is displayed as a read-only token balance; this form does not send tokens or run automatic transfers.</p>

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
                <p><strong>Network:</strong> {networks.find((network) => network.id === reviewedChainId)?.name ?? 'Unknown network'}</p>
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
                {networks.find((network) => network.id === submittedChainId) ? <a href={networks.find((network) => network.id === submittedChainId)!.explorer + transactionHash} target="_blank" rel="noreferrer">View transaction on {networks.find((network) => network.id === submittedChainId)!.name} explorer</a> : null}
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
