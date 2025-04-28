import { VersionedTransaction, Connection, Keypair } from '@solana/web3.js';
import bs58 from "bs58";
import fs from 'fs/promises';
import dotenv from 'dotenv';
import ora from 'ora';
import chalk from 'chalk';

dotenv.config();

const RPC_ENDPOINT = process.env.RPC_ENDPOINT;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const CUSTOM_CA_PRIVATE_KEY = process.env.CUSTOM_CA_PRIVATE_KEY; // Opzionale

if (!RPC_ENDPOINT || !DEPLOYER_PRIVATE_KEY) {
    console.error(chalk.red("Missing required environment variables! Please check your .env file."));
    process.exit(1);
}

const web3Connection = new Connection(RPC_ENDPOINT, 'confirmed');

export async function sendLocalCreateTx() {
    const spinner = ora();
    let mintKeypair;

    try {
        console.log(chalk.blue.bold("Initializing token creation process..."));

        // Loading deployer keys
        spinner.start(chalk.yellow("Loading deployer keys..."));
        const signerKeyPair = Keypair.fromSecretKey(bs58.decode(DEPLOYER_PRIVATE_KEY));
        spinner.succeed(chalk.green("Deployer keys loaded successfully."));

        // Determining mint Keypair (custom or generated)
        if (CUSTOM_CA_PRIVATE_KEY) {
            spinner.start(chalk.yellow("Loading custom CA key..."));
            mintKeypair = Keypair.fromSecretKey(bs58.decode(CUSTOM_CA_PRIVATE_KEY));
            spinner.succeed(chalk.green("Custom CA key loaded successfully."));
        } else {
            spinner.start(chalk.yellow("Generating new mint key..."));
            mintKeypair = Keypair.generate();
            spinner.succeed(chalk.green("New mint key generated."));
        }

        // Configurable token parameters
        const tokenConfig = {
            name: "Myken", // Nome del token
            symbol: "MT", // Simbolo
            description: "This is a test token for Pump.fun", // Descrizione
            twitter: "https://twitter.com/example", // Link Twitter
            telegram: "https://t.me/example", // Link Telegram
            website: "https://example.com", // Sito Web
            showName: "true", // Nome visibile
            amount: 0.01, // Quantità token
            slippage: 0.5, // Slippage
            priorityFee: 0.0005, // Priority Fee
            pool: "pump", // Pool
        };

        // Image loading and metadata preparation
        spinner.start(chalk.yellow("Reading logo image..."));
        const imageFile = await fs.readFile("./sol.jpg");
        spinner.succeed(chalk.green("Image loaded successfully."));

        spinner.start(chalk.yellow("Preparing metadata..."));
        const formData = new FormData();
        formData.append("file", new Blob([imageFile]), "sol.jpg");
        formData.append("name", tokenConfig.name);
        formData.append("symbol", tokenConfig.symbol);
        formData.append("description", tokenConfig.description);
        formData.append("twitter", tokenConfig.twitter);
        formData.append("telegram", tokenConfig.telegram);
        formData.append("website", tokenConfig.website);
        formData.append("showName", tokenConfig.showName);
        spinner.succeed(chalk.green("Metadata prepared successfully."));

        spinner.start(chalk.yellow("Uploading metadata to IPFS..."));
        const metadataResponse = await fetch("https://pump.fun/api/ipfs", {
            method: "POST",
            body: formData,
        });

        if (!metadataResponse.ok) {
            throw new Error(`Metadata upload failed: ${metadataResponse.statusText}`);
        }

        const metadataResponseJSON = await metadataResponse.json();
        spinner.succeed(chalk.green("Metadata uploaded successfully!"));

        // Token creation request
        spinner.start(chalk.yellow("Requesting token creation..."));
        const createTokenResponse = await fetch(`https://pumpportal.fun/api/trade-local`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                "publicKey": signerKeyPair.publicKey.toBase58(),
                "action": "create",
                "tokenMetadata": {
                    name: metadataResponseJSON.metadata.name,
                    symbol: metadataResponseJSON.metadata.symbol,
                    uri: metadataResponseJSON.metadataUri
                },
                "mint": mintKeypair.publicKey.toBase58(),
                "denominatedInSol": "true",
                "amount": tokenConfig.amount,
                "slippage": tokenConfig.slippage,
                "priorityFee": tokenConfig.priorityFee,
                "pool": tokenConfig.pool
            })
        });

        if (!createTokenResponse.ok) {
            throw new Error(`Token creation request failed: ${createTokenResponse.statusText}`);
        }

        const responseBuffer = await createTokenResponse.arrayBuffer();
        spinner.succeed(chalk.green("Token creation initiated successfully!"));

        spinner.start(chalk.yellow("Signing transaction..."));
        const tx = VersionedTransaction.deserialize(new Uint8Array(responseBuffer));
        tx.sign([mintKeypair, signerKeyPair]);
        spinner.succeed(chalk.green("Transaction signed successfully."));

        spinner.start(chalk.yellow("Sending transaction to the blockchain..."));
        const signature = await web3Connection.sendTransaction(tx, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });
        spinner.succeed(chalk.green("Transaction sent successfully!"));
        console.log(chalk.cyan(`Transaction Link: https://solscan.io/tx/${signature}`));

        spinner.start(chalk.yellow("Awaiting transaction confirmation..."));
        const confirmation = await web3Connection.confirmTransaction(signature, 'confirmed');
        spinner.succeed(chalk.green("Transaction confirmed!"));
        console.log(chalk.cyan("Confirmation details:"), confirmation);

    } catch (error) {
        spinner.fail(chalk.red("An error occurred:"));
        console.error(chalk.red(error));
    }

    spinner.succeed(chalk.green(`Token adress ${mintKeypair.publicKey.toBase58()}`));
    return mintKeypair.publicKey.toBase58();


}

