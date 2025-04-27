"use client"
import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import styles from './styles/Home.module.css';
import Roulette from './components/Roulette';

export default function Home() {
  const [game, setGame] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [phase, setPhase] = useState('deposits');

  const createGame = async () => {
    const res = await fetch('http://localhost:3001/api/create-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    setGame(data);
  };

  const addDeposit = async (e) => {
    e.preventDefault();
    if (!walletAddress || !depositAmount) {
      alert('Please enter a wallet address and deposit amount.');
      return;
    }
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Deposit amount must be a positive number.');
      return;
    }

    await fetch(`http://localhost:3001/api/deposit/${game.gameId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: walletAddress, amount }),
    });
    setWalletAddress('');
    setDepositAmount('');
  };

  const fetchGameStatus = async () => {
    if (!game) return;
    const res = await fetch(`http://localhost:3001/api/game-status/${game.gameId}`);
    const data = await res.json();
    setGame(data);
    setPhase(data.phase);

    const now = Date.now();
    const timeLeftMs = data.phaseEndTime - now;
    setTimeLeft(Math.max(0, Math.floor(timeLeftMs / 1000)));
  };

  useEffect(() => {
    createGame();
  }, []);

  useEffect(() => {
    if (!game) return;
    fetchGameStatus();
    const interval = setInterval(fetchGameStatus, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [game]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>ADA Roulette</title>
        <meta charset="UTF-8" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kanit&display=swap" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>ADA Roulette</h1>
        {game && (
          <>
            <p className={styles.depositAddress}>
              Deposit Address: {game.walletAddress}
            </p>
            <p className={styles.timer}>
              {phase === 'deposits' && `Time to Deposit: ${timeLeft}s`}
              {phase === 'last-transactions' && `Last Transactions: ${timeLeft}s`}
              {phase === 'ended' && 'Game Ended'}
            </p>
            {phase !== 'ended' && (
              <div className={styles.form}>
                <input
                  type="text"
                  placeholder="Wallet Address"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className={styles.input}
                />
                <input
                  type="number"
                  placeholder="ADA Amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className={styles.input}
                  min="0"
                  step="0.1"
                />
                <button onClick={addDeposit} className={styles.addButton}>
                  Add Deposit
                </button>
              </div>
            )}
            <Roulette game={game} phase={phase} />
            <h2>Deposits</h2>
            <ul className={styles.depositList}>
              {game.deposits.map((deposit, index) => {
                const percentage = ((deposit.amount / game.balance) * 100).toFixed(2);
                return (
                  <li key={index}>
                    ...{deposit.wallet.slice(-4)}: {deposit.amount} ADA ({percentage}%) {' '}
                    <span
                      className={styles.colorSwatch}
                      style={{ backgroundColor: deposit.color }}
                    ></span>
                  </li>
                );
              })}
            </ul>
            <p className={styles.totalPot}>Total Pot: {game.balance} ADA</p>
          </>
        )}
      </main>
    </div>
  );
}