import { createPublicClient, http, encodeFunctionData, erc20Abi } from 'viem';
import { polygon } from 'viem/chains';
import { OperationType, SafeTransaction } from '@polymarket/builder-relayer-client';

// Contract addresses
export const USDC_E_CONTRACT_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
export const CTF_CONTRACT_ADDRESS = '0x4d97dcd97ec945f40cf65f87097ace5ea0476045';
export const CTF_EXCHANGE_ADDRESS = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';
export const NEG_RISK_CTF_EXCHANGE_ADDRESS = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
export const NEG_RISK_ADAPTER_ADDRESS = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296';

const POLYGON_RPC_URL = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com';

const MAX_UINT256 =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935';

const erc1155Abi = [
  {
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'operator', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(POLYGON_RPC_URL),
});

const USDC_E_SPENDERS = [
  { address: CTF_CONTRACT_ADDRESS, name: 'CTF Contract' },
  { address: NEG_RISK_ADAPTER_ADDRESS, name: 'Neg Risk Adapter' },
  { address: CTF_EXCHANGE_ADDRESS, name: 'CTF Exchange' },
  { address: NEG_RISK_CTF_EXCHANGE_ADDRESS, name: 'Neg Risk CTF Exchange' },
] as const;

const OUTCOME_TOKEN_SPENDERS = [
  { address: CTF_EXCHANGE_ADDRESS, name: 'CTF Exchange' },
  { address: NEG_RISK_CTF_EXCHANGE_ADDRESS, name: 'Neg Risk Exchange' },
  { address: NEG_RISK_ADAPTER_ADDRESS, name: 'Neg Risk Adapter' },
] as const;

const checkUSDCApprovalForSpender = async (
  safeAddress: string,
  spender: string
): Promise<boolean> => {
  try {
    const allowance = await publicClient.readContract({
      address: USDC_E_CONTRACT_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [safeAddress as `0x${string}`, spender as `0x${string}`],
    });

    const threshold = BigInt('1000000000000');
    return allowance >= threshold;
  } catch (error) {
    console.warn(`Failed to check USDC approval for ${spender}:`, error);
    return false;
  }
};

const checkERC1155ApprovalForSpender = async (
  safeAddress: string,
  spender: string
): Promise<boolean> => {
  try {
    const isApproved = await publicClient.readContract({
      address: CTF_CONTRACT_ADDRESS as `0x${string}`,
      abi: erc1155Abi,
      functionName: 'isApprovedForAll',
      args: [safeAddress as `0x${string}`, spender as `0x${string}`],
    });

    return isApproved;
  } catch (error) {
    console.warn(`Failed to check ERC1155 approval for ${spender}:`, error);
    return false;
  }
};

export const checkAllApprovals = async (
  safeAddress: string
): Promise<{
  allApproved: boolean;
  usdcApprovals: Record<string, boolean>;
  outcomeTokenApprovals: Record<string, boolean>;
}> => {
  const usdcApprovals: Record<string, boolean> = {};
  const outcomeTokenApprovals: Record<string, boolean> = {};

  await Promise.all(
    USDC_E_SPENDERS.map(async ({ address, name }) => {
      usdcApprovals[name] = await checkUSDCApprovalForSpender(safeAddress, address);
    })
  );

  await Promise.all(
    OUTCOME_TOKEN_SPENDERS.map(async ({ address, name }) => {
      outcomeTokenApprovals[name] = await checkERC1155ApprovalForSpender(safeAddress, address);
    })
  );

  const allApproved =
    Object.values(usdcApprovals).every((approved) => approved) &&
    Object.values(outcomeTokenApprovals).every((approved) => approved);

  return {
    allApproved,
    usdcApprovals,
    outcomeTokenApprovals,
  };
};

export const createAllApprovalTxs = (): SafeTransaction[] => {
  const safeTxns: SafeTransaction[] = [];

  for (const { address } of USDC_E_SPENDERS) {
    safeTxns.push({
      to: USDC_E_CONTRACT_ADDRESS,
      operation: OperationType.Call,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [address as `0x${string}`, BigInt(MAX_UINT256)],
      }),
      value: '0',
    });
  }

  for (const { address } of OUTCOME_TOKEN_SPENDERS) {
    safeTxns.push({
      to: CTF_CONTRACT_ADDRESS,
      operation: OperationType.Call,
      data: encodeFunctionData({
        abi: erc1155Abi,
        functionName: 'setApprovalForAll',
        args: [address as `0x${string}`, true],
      }),
      value: '0',
    });
  }

  return safeTxns;
};