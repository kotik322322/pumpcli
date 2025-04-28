import { sendLocalCreateTx } from './launcher.js';
import { startMonitor, subscribeToToken } from './monitorServer.js';
// import { sellTokens } from './sellTokens.js';
// import { sellAllViaJito } from './sellViaJito.js';
import dotenv from 'dotenv';
dotenv.config();



(async () => {
    await startMonitor();
    console.log('🟢 Мониторинг активен. Ждём создания токена...');

    const tokenAddress = await sendLocalCreateTx();
    if (!tokenAddress) {
        console.error('❌ Ошибка создания токена');
        process.exit(1);
    }

    console.log('✅ Токен создан:', tokenAddress);
    subscribeToToken(tokenAddress);

    //   console.log('\n⏳ Нажми [s] чтобы продать токены, [j] — через Jito, [q] — выход');

    //   process.stdin.setRawMode(true);
    //   process.stdin.resume();
    //   process.stdin.on('data', async (key) => {
    //     const pressed = key.toString();

    //     if (pressed === 's') {
    //       console.log('💸 Продаём токены обычным способом...');
    //       await sellTokens(walletPublicKey, walletPrivateKey, tokenAddress);
    //       process.exit();
    //     } else if (pressed === 'j') {
    //       console.log('⚡ Продаём токены через Jito...');
    //       await sellAllViaJito(walletPrivateKey, tokenAddress);
    //       process.exit();
    //     } else if (pressed === 'q' || pressed === '\u0003') {
    //       console.log('👋 Выход...');
    //       process.exit();
    //     }
    //   });
})();