# pumpfun-launcher by Malakia.sol

Launch a token on pump.fun with your custom contract address.

This repository contains a bot for automated token creation on the Solana blockchain on **Pump.fun**. The bot interacts with the **PumpPortal API** to create and manage tokens automatically.

You can view the example.png file in the repository to see the log of a token being created.

**Make sure to have a "logo.png" file in the project directory to use as Token Image.**

## Features

- **Automated Token Creation:**
  - Uploads metadata to IPFS.
  - Creates new tokens using the Pump.fun API.
  - Handles transaction signing and submission.
  - Allows using a predefined mint address if provided, or generates a new one dynamically.
- **Secure Key Management:**
  - Uses environment variables to store only constant values (RPC endpoint and deployer private key).
  - Accepts token-related parameters as function arguments for flexibility and integration.

## Technologies Used

- **Solana Web3.js** – For blockchain interactions.
- **PumpPortal API** – For token management.
- **Node.js** – Backend environment.
- **dotenv** – For environment variable management.
- **bs58** – For key decoding.
- **fs/promises** – For file handling.
- **FormData API** – For metadata submission.

## Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/Malakia-sol/pumpfun-launcher
   cd pumpfun-launcher
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Create a `.env` file and provide the following environment variables:
   ```env
   RPC_ENDPOINT=your_rpc_endpoint
   DEPLOYER_PRIVATE_KEY=deployer_private_keys
   CUSTOM_CA_PRIVATE_KEY= // leave blank if you dont use a custom ca
   ```

4. Run the bot with custom token parameters:
   ```sh
   node launcher.js
   ```

## Usage

- The bot will use the `.env` file only for constant values like the RPC endpoint and deployer private key.
- Token-specific parameters must be passed as arguments  e.g.:
   ```js
   // Configurable token parameters
      const tokenConfig = {
          name: "MyToken", // Token name
          symbol: "MTK", // Symbol
          description: "This is a test token", // Description
          twitter: "https://x.com/example", // Twitter link
          telegram: "https://t.me/example", // Telegram link
          website: "https://example.com", // Website
          showName: "true", // Don't touch this!
          amount: 0.0001, // SOL amount to buy at creation
          slippage: 0.5, // Slippage
          priorityFee: 0.0005, // Priority Fee
          pool: "pump", // Always "pump"
      };
   ```
- If a mint private key is provided, it will be used; otherwise, the bot will generate a new one.
- Monitor the output logs for transaction status and confirmations.

## Important Notes

- Ensure private keys are kept secure and never shared.
- Monitor network fees and adjust `priorityFee` accordingly for better execution.

**Author:** Malakia.sol - Tg: @KingMalakia  
**GitHub:** [Malakia.sol](https://github.com/Malakia-sol)
