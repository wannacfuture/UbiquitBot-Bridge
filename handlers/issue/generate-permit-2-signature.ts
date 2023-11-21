import { MaxUint256, PERMIT2_ADDRESS, PermitTransferFrom, SignatureTransfer } from "@uniswap/permit2-sdk";
import Decimal from "decimal.js";
import { BigNumber, ethers } from "ethers";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { getPayoutConfigByNetworkId } from "../../helpers/payout";
import { decryptKeys } from "../../utils/private";

export async function generatePermit2Signature(
  { beneficiary, amount, userId, config, X25519_PRIVATE_KEY }: GeneratePermit2SignatureParams
) {
  const {
    payments: { evmNetworkId },
    keys: { evmPrivateEncrypted },
  } = config;

  if (!evmPrivateEncrypted) throw console.warn("No bot wallet private key defined");
  const { rpc, paymentToken } = getPayoutConfigByNetworkId(evmNetworkId);
  const { privateKey } = await decryptKeys(evmPrivateEncrypted, X25519_PRIVATE_KEY);

  if (!rpc) throw console.error("RPC is not defined");
  if (!privateKey) throw console.error("Private key is not defined");
  if (!paymentToken) throw console.error("Payment token is not defined");

  let provider;
  let adminWallet;
  try {
    provider = new ethers.providers.JsonRpcProvider(rpc);
  } catch (error) {
    throw console.debug("Failed to instantiate provider", error);
  }

  try {
    adminWallet = new ethers.Wallet(privateKey, provider);
  } catch (error) {
    throw console.debug("Failed to instantiate wallet", error);
  }

  const permitTransferFromData: PermitTransferFrom = {
    permitted: {
      token: paymentToken,
      amount: ethers.utils.parseUnits(amount.toString(), 18),
    },
    spender: beneficiary,
    nonce: BigNumber.from(keccak256(toUtf8Bytes(userId))),
    deadline: MaxUint256,
  };

  const { domain, types, values } = SignatureTransfer.getPermitData(
    permitTransferFromData,
    PERMIT2_ADDRESS,
    evmNetworkId
  );

  const signature = await adminWallet._signTypedData(domain, types, values).catch((error) => {
    throw console.debug("Failed to sign typed data", error);
  });

  const transactionData: TransactionData = {
    permit: {
      permitted: {
        token: permitTransferFromData.permitted.token,
        amount: permitTransferFromData.permitted.amount.toString(),
      },
      nonce: permitTransferFromData.nonce.toString(),
      deadline: permitTransferFromData.deadline.toString(),
    },
    transferDetails: {
      to: permitTransferFromData.spender,
      requestedAmount: permitTransferFromData.permitted.amount.toString(),
    },
    owner: adminWallet.address,
    signature: signature,
  };

  // const transactionDataV2 = {
  //   token: permitTransferFromData.permitted.token,
  //   nonce: permitTransferFromData.nonce.toString(),
  //   deadline: permitTransferFromData.deadline.toString(),
  //   beneficiary: permitTransferFromData.spender,
  //   amount: permitTransferFromData.permitted.amount.toString(),
  // };

  const base64encodedTxData = Buffer.from(JSON.stringify(transactionData)).toString("base64");

  const url = new URL("https://pay.ubq.fi/");
  url.searchParams.append("claim", base64encodedTxData);
  url.searchParams.append("network", evmNetworkId.toString());

  console.info("Generated permit2 signature", { transactionData, url: url.toString() });

  return { transactionData, url };
}
interface GeneratePermit2SignatureParams {
  beneficiary: string;
  amount: Decimal;

  userId: string;
  config: any;
  X25519_PRIVATE_KEY: string;
}

interface TransactionData {
  permit: {
    permitted: {
      token: string;
      amount: string;
    };
    nonce: string;
    deadline: string;
  };
  transferDetails: {
    to: string;
    requestedAmount: string;
  };
  owner: string;
  signature: string;
}
