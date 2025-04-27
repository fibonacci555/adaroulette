// server.js
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const gameStore = require('../gameStore');

const app = express();
app.use(cors());
app.use(express.json());

const ENCRYPTION_KEY = crypto.randomBytes(32); // In production, store this securely
const IV = crypto.randomBytes(16); // Initialization vector

function encrypt(text) {
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(encrypted) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Mock wallet creation (replace with actual Cardano wallet creation in production)
function createWallet() {
  const seedPhrase = `wallet-seed-${uuidv4()}`; // Mock seed phrase
  const address = `addr_${Math.random().toString(36).substring(2, 15)}`;
  return { seedPhrase, address };
}

// Mock balance check (replace with actual Cardano blockchain query)
function checkBalance(walletAddress) {
  // Simulate balance based on deposits in gameStore
  const game = gameStore.getActiveGame();
  if (!game || game.walletAddress !== walletAddress) return 0;
  return game.deposits.reduce((sum, deposit) => sum + deposit.amount, 0);
}

// Create a new game
app.post('/api/create-game', (req, res) => {
  const { seedPhrase, address } = createWallet();
  const gameId = uuidv4();
  const encryptedSeed = encrypt(seedPhrase);
  const game = {
    gameId,
    seedPhrase: encryptedSeed,
    walletAddress: address,
    deposits: [],
    winner: null,
    startTime: new Date().toISOString(),
    phase: 'deposits', // 'deposits', 'last-transactions', 'ended'
    phaseEndTime: Date.now() + 90 * 1000, // 1:30 for deposits
  };
  gameStore.createGame(game);
  res.json({ gameId, walletAddress: address });
});

// Get game status
app.get('/api/game-status/:gameId', (req, res) => {
  const game = gameStore.getGame(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const now = Date.now();
  let phase = game.phase;
  let phaseEndTime = game.phaseEndTime;

  // Update phase if necessary
  if (phase === 'deposits' && now >= phaseEndTime) {
    phase = 'last-transactions';
    phaseEndTime = now + 30 * 1000; // 0:30 for last transactions
    game.phase = phase;
    game.phaseEndTime = phaseEndTime;
  }
  if (phase === 'last-transactions' && now >= phaseEndTime) {
    phase = 'ended';
    game.phase = phase;
    // Determine winner
    if (!game.winner && game.deposits.length > 0) {
      const weights = game.deposits.map((deposit) => deposit.amount);
      const totalWeight = weights.reduce((acc, w) => acc + w, 0);
      const random = Math.random() * totalWeight;
      let cumulative = 0;
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (random < cumulative) {
          game.winner = game.deposits[i].wallet;
          break;
        }
      }
    }
  }

  const balance = checkBalance(game.walletAddress);
  res.json({
    gameId: game.gameId,
    walletAddress: game.walletAddress,
    balance,
    deposits: game.deposits,
    phase,
    phaseEndTime,
    winner: game.winner,
  });
});

// Add a deposit (mocked; in production, this would be handled by blockchain events)
app.post('/api/deposit/:gameId', (req, res) => {
  const { wallet, amount } = req.body;
  const game = gameStore.getGame(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  if (game.phase !== 'deposits' && game.phase !== 'last-transactions') {
    return res.status(400).json({ error: 'Deposits are closed' });
  }

  const deposit = { wallet, amount: parseFloat(amount) };
  game.deposits.push(deposit);
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log('Backend server running on http://localhost:3000');
});