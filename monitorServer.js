import WebSocket from 'ws';

let pumpWS = null;
let activeToken = null;

const color = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    bold: '\x1b[1m',
};

export const startMonitor = (tokenAddress) => {
    return new Promise((resolve) => {
        pumpWS = new WebSocket('wss://pumpportal.fun/api/data');

        pumpWS.on('open', () => {
            console.log('✅ Подключено к pumpportal');

            // Подписка на токен
            subscribeToToken(tokenAddress);
            resolve();
        });

        pumpWS.on('message', (data) => {
            try {
                const msg = JSON.parse(data);
                if (msg.txType && msg.traderPublicKey && msg.solAmount !== undefined) {
                    const wallet = msg.traderPublicKey.slice(-4);
                    const sol = Number(msg.solAmount).toFixed(2);
                    const txType = msg.txType.toUpperCase();
                    const isBuy = txType === 'BUY';
                    const icon = isBuy ? '🟢' : '🔴';
                    const colorType = isBuy ? color.green : color.red;

                    console.log(`${color.bold}${colorType}${icon} wallet ...${wallet} ${txType} for ${sol} SOL${color.reset}`);
                }
            } catch (err) {
                console.error('❌ Ошибка парсинга:', err.message);
            }
        });

        pumpWS.on('error', (err) => {
            console.error('❌ WebSocket ошибка:', err.message);
        });

        pumpWS.on('close', () => {
            console.log('🔌 WebSocket отключён');
        });
    });
};

export const subscribeToToken = (token) => {
    if (activeToken) {
        pumpWS.send(JSON.stringify({
            method: "unsubscribeTokenTrade",
            keys: [activeToken]
        }));
        console.log(`🛑 Отписка от токена: ${activeToken}`);
    }

    pumpWS.send(JSON.stringify({
        method: "subscribeTokenTrade",
        keys: [token]
    }));
    activeToken = token;

    console.log(`📡 Подписка на токен: ${token}`);
};
