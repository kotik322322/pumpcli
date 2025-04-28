import { VersionedTransaction, Connection, Keypair, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import bs58 from 'bs58'; // ⬅️ добавили для декодирования приватного ключа

dotenv.config();

const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";
const web3Connection = new Connection(RPC_ENDPOINT, 'confirmed');

const color = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    bold: '\x1b[1m',
};

async function getTokenBalance(walletAddress, mintAddress) {
    if (!walletAddress || !mintAddress) {
        throw new Error("walletAddress или mintAddress не переданы");
    }

    const tokenAccounts = await web3Connection.getParsedTokenAccountsByOwner(
        new PublicKey(walletAddress),
        { mint: new PublicKey(mintAddress) }
    );

    if (tokenAccounts.value.length === 0) return 0;

    return tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
}

export async function sellTokens(walletPublicKey, privateKey, tokenMintAddress) {
    try {
        console.log(`${color.bold}🔍 Проверка баланса токенов...${color.reset}`);
        const tokenBalance = await getTokenBalance(walletPublicKey, tokenMintAddress);
        if (tokenBalance <= 0) {
            console.log(`${color.red}🚫 Нет токенов для продажи.${color.reset}`);
            return { success: true, signature: null };
        }

        console.log(`${color.green}💸 Продаём ${tokenBalance} токенов...${color.reset}`);
        const response = await fetch(`https://pumpportal.fun/api/trade-local`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                publicKey: walletPublicKey,
                action: "sell",
                mint: tokenMintAddress,
                denominatedInSol: "false",
                amount: tokenBalance,
                slippage: 10,
                priorityFee: 0.001,
                pool: "auto"
            })
        });

        if (response.status !== 200) {
            throw new Error(`Ошибка API: ${response.statusText}`);
        }

        const data = await response.arrayBuffer();
        const tx = VersionedTransaction.deserialize(new Uint8Array(data));

        // Обновляем блокхеш перед подписью
        const { blockhash } = await web3Connection.getLatestBlockhash("finalized");
        tx.message.recentBlockhash = blockhash;

        // 🛠 Исправление: декодируем приватный ключ
        const signerKeyPair = Keypair.fromSecretKey(bs58.decode(privateKey));

        tx.sign([signerKeyPair]);

        const signature = await web3Connection.sendTransaction(tx, { skipPreflight: false });
        console.log(`${color.green}✅ Успешная продажа: https://solscan.io/tx/${signature}${color.reset}`);
        return { success: true, signature };

    } catch (error) {
        console.error(`${color.red}❌ Ошибка при продаже: ${error.message}${color.reset}`);
        if (error.transactionLogs) {
            console.log("📝 Логи симуляции:", error.transactionLogs);
        }
        return { success: false, signature: null };
    }
}
