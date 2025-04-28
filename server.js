import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import path from 'path';
import WebSocket from 'ws';
import { sendLocalCreateTx } from './launcher.js';
import dotenv from 'dotenv';

dotenv.config();

// Express app setup
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Get directory name (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from current directory
app.use(express.static(__dirname));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// WebSocket connection to pump.fun
let pumpWS = null;
let activeToken = null;

// Trade counter
const tradeCounter = {
  totalBought: 0,
  totalSold: 0,
  get netAmount() {
    return this.totalBought - this.totalSold;
  },
  addTransaction(type, amount) {
    const solAmount = parseFloat(amount);
    if (isNaN(solAmount)) return;

    if (type.toUpperCase() === 'BUY') {
      this.totalBought += solAmount;
    } else if (type.toUpperCase() === 'SELL') {
      this.totalSold += solAmount;
    }
    
    // Broadcast the updated counters
    io.emit('counterUpdate', {
      totalBought: this.totalBought,
      totalSold: this.totalSold,
      netAmount: this.netAmount
    });
  }
};

// Start pump.fun monitoring
const startMonitor = () => {
  return new Promise((resolve) => {
    pumpWS = new WebSocket('wss://pumpportal.fun/api/data');

    pumpWS.on('open', () => {
      console.log('✅ Connected to pumpportal');
      resolve();
    });

    pumpWS.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.txType && msg.traderPublicKey && msg.solAmount !== undefined) {
          const wallet = msg.traderPublicKey.slice(-4);
          const solAmount = parseFloat(msg.solAmount);
          const txType = msg.txType.toUpperCase();
          
          // Add timestamp for age calculation
          const transaction = {
            txType,
            traderPublicKey: wallet,
            solAmount,
            timestamp: Date.now()
          };
          
          // Send transaction to frontend
          io.emit('transaction', transaction);
          
          // Update counter
          tradeCounter.addTransaction(txType, solAmount);
          
          // Log to console as well for debugging
          const isBuy = txType === 'BUY';
          const icon = isBuy ? '🟢' : '🔴';
          const colorType = isBuy ? '\x1b[32m' : '\x1b[31m';
          console.log(`\x1b[1m${colorType}${icon} wallet ...${wallet} ${txType} for ${solAmount.toFixed(2)} SOL\x1b[0m`);
        }
      } catch (err) {
        console.error('❌ Parse error:', err.message);
      }
    });

    pumpWS.on('error', (err) => {
      console.error('❌ WebSocket error:', err.message);
    });

    pumpWS.on('close', () => {
      console.log('🔌 WebSocket disconnected');
    });
  });
};

// Subscribe to token updates
const subscribeToToken = (token) => {
  if (!pumpWS || pumpWS.readyState !== WebSocket.OPEN) {
    console.error('❌ WebSocket not open');
    return;
  }

  if (activeToken) {
    pumpWS.send(JSON.stringify({
      method: "unsubscribeTokenTrade",
      keys: [activeToken]
    }));
    console.log(`🛑 Unsubscribed from token: ${activeToken}`);
  }

  pumpWS.send(JSON.stringify({
    method: "subscribeTokenTrade",
    keys: [token]
  }));
  activeToken = token;
  
  // Notify frontend of token subscription
  io.emit('tokenSubscription', token);
  
  console.log(`📡 Subscribed to token: ${token}`);
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🌐 New client connected');
  
  // If already subscribed to a token, notify the new client
  if (activeToken) {
    socket.emit('tokenSubscription', activeToken);
    
    // Send current counter state
    socket.emit('counterUpdate', {
      totalBought: tradeCounter.totalBought,
      totalSold: tradeCounter.totalSold,
      netAmount: tradeCounter.netAmount
    });
  }
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected');
  });
});

// Start the application
(async () => {
  // Start the HTTP server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`🌐 Server running on http://localhost:${PORT}`);
  });
  
  // Start the monitor
  await startMonitor();
  console.log('🟢 Monitoring active. Waiting for token creation...');

  // Get token address
  const tokenAddress = await sendLocalCreateTx();
  if (!tokenAddress) {
    console.error('❌ Error creating token');
    process.exit(1);
  }

  console.log('✅ Token created:', tokenAddress);
  subscribeToToken(tokenAddress);
})();