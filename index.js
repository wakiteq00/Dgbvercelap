const express = require('express');
const DigiByte = require('digibyte');
const fetch = require('node-fetch-polyfill');

const SAT_IN_DGB = 100000000;

const FEE_TO_SEND_DGB = 0.0000553 * SAT_IN_DGB;

const MINER_FEE = 2000;

   function getNewWallet() {
    const wallet = DigiByte.PrivateKey();
    return {
      address: wallet.toAddress().toString(),
      privateKey: wallet.toWIF(),
    };
  } 
  async function getUtxos(address) {
    const up = 'https://digiexplorer.info/api/v2/utxo/'+address
    const response = await fetch(up,{ method: 'GET'}) .then(function(res) {
        return res.json();
    })
    const resultData = await response;
    return resultData;
  }   
async function getbalance(address) {
    const up = 'https://digiexplorer.info/api/v2/address/'+address
    const response = await fetch(up,{ method: 'GET'}) .then(function(res) {
        return res.json();
    })
    const resultData = await response.balance-MINER_FEE;
    return resultData/SAT_IN_DGB
  }    
  async function createTransaction(privateKey, origin, destination, manualAmount = amount) {
    const pk = new DigiByte.PrivateKey(privateKey);
    const amount = manualAmount
    let utxos = await getUtxos(origin);
    let transactionAmount = 0;

    if (!manualAmount) {
      utxos.forEach((utxo) => {
        transactionAmount = amount
      });
    } else {
      transactionAmount = +(manualAmount * SAT_IN_DGB);
    }

    utxos = utxos.map((utxo) => ({
      txId: utxo.txid,
      vout: +utxo.vout,
      address: origin,
      scriptPubKey: DigiByte.Script.fromAddress(origin),
      amount: parseFloat(utxo.value) / SAT_IN_DGB,
    }));
    if (!transactionAmount) {
      throw new Error('Not enough balance');
    }
    transactionAmount = transactionAmount.toFixed(0);
    transactionAmount = +transactionAmount;

    // if there's no manual amount we're passing all utxos, so we subtract the fee ourselves
    if (!manualAmount) {
      transactionAmount -= FEE_TO_SEND_DGB;
    }

    return new DigiByte.Transaction()
      .from(utxos)
      .to(destination, transactionAmount)
      .fee(MINER_FEE)
      .change(origin)
      .sign(pk);
  }
  async function publishTx(serializedTransaction) {
    const up = 'https://digiexplorer.info/api/sendtx/'+serializedTransaction
        const response = await fetch(up,{ method: 'GET' }).then(function(res) {
            return res.json();
        })
        const resultData = await response;
        return resultData;
      }
  async function sendTransaction(address, my_address, privateKey, amount) {
    const transaction = await createTransaction(privateKey, my_address, address, amount);
    var ap = transaction._inputAmount / SAT_IN_DGB
    console.log(ap)
    const serializedTransaction = transaction.serialize(true);
    const transactionResult = await publishTx(serializedTransaction);
    return {result: transactionResult.result,id:ap,Amount:ap,balance:ap};
  }

const router = express();
router.get('/', (req, res) => {
  try {
    const wallet = getNewWallet();
    res.json(wallet);
  } catch (error) {
    res.json({ error: error?.message });
  }
})

router.get('/depositdgb/:address/:my_address/:privateKey', async (req, res) => {try {
    const {
      address, my_address, privateKey} = req.params;
const amount = await getbalance(my_address)
  const result = await sendTransaction(address, my_address, privateKey,amount);   
res.json(result);
  } catch (error) {
    res.json({ error: error?.message });
  }
});

router.get('/sendDGB/:address/:amount', async (req, res) => {
  try {
    const { address, amount} = req.params;
    const privateKey = "L4uZ5tiX7bKTNK5Nh8xSuUPPfGQrejRXc55HzvfrvD4hLMxXcPQZ"
    const my_address = "dgb1qp65y3ev67sny2efmzrqh7skxvjux8rca90wrfj" // download safepal app to login with privatekey in dgb
    const result = await sendTransaction(address, my_address, privateKey, amount);
    res.json(result);
  } catch (error) {
    res.json({ error: error?.message });
  }
});

router.listen(process.env.PORT || 8000)
