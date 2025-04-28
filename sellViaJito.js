import {
    VersionedTransaction,
    Connection,
    Keypair,
    PublicKey
} from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const web3 = new Connection(RPC_ENDPOINT, 'confirmed');
const JITO_BUNDLE_URL = 'https://mainnet.block-engine.jito.wtf/api/v1/bundles';

async function getTokenBalance(wallet, mint) {
    const tokenAccounts = await web3.getParsedTokenAccountsByOwner(
        new PublicKey(wallet),
        { mint: new PublicKey(mint) }
    );
    if (!tokenAccounts.value.length) return 0;
    return tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
}

export async function sellAllViaJito(walletPriv58, mint) {
    const keypair = Keypair.fromSecretKey(bs58.decode(walletPriv58));
    const walletPub = keypair.publicKey.toBase58();

    const balance = await getTokenBalance(walletPub, mint);
    if (balance <= 0) {
        console.log('❌ Нет токенов для продажи');
        return;
    }

    const tradeRes = await fetch('https://pumpportal.fun/api/trade-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{
            publicKey: walletPub,
            action: 'sell',
            mint,
            denominatedInSol: 'false',
            amount: balance,
            slippage: 20,
            priorityFee: 0.015,
            pool: 'pump'
        }])
    });

    if (tradeRes.status !== 200) {
        const errText = await tradeRes.text();
        throw new Error('Ошибка trade-local: ' + errText);
    }

    const [txBase58] = await tradeRes.json();
    const tx = VersionedTransaction.deserialize(new Uint8Array(bs58.decode(txBase58)));
    tx.sign([keypair]);

    const encodedTx = bs58.encode(tx.serialize());

    const jitoRes = await fetch(JITO_BUNDLE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'sendBundle',
            params: [[encodedTx]]
        })
    });

    const resJson = await jitoRes.json();
    console.log('✅ Отправлено через Jito!', resJson);
}