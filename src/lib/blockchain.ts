import { createPublicClient, http, type Hash, decodeEventLog } from "viem";

// Minimal chain-agnostic setup: use RPC URL from env. You may refine
// with a specific chain import from `viem/chains` if desired.
const RPC_URL = process.env.BLOCKCHAIN_RPC_URL;

if (!RPC_URL) {
  // Do not throw at import time in production builds. Consumers should
  // handle missing configuration gracefully and report a clear error.
  console.warn("BLOCKCHAIN_RPC_URL is not set. On-chain verification will fail.");
}

export const publicClient = createPublicClient({
  transport: http(RPC_URL),
});

export type VerifyTxOptions = {
  expectedTo?: `0x${string}`;
  expectedFrom?: `0x${string}`;
  // Optional event check if you have a specific contract ABI/event. If not provided, we only check success.
  event?: {
    abi: any[]; // ABI fragment containing the expected event
    eventName: string;
  };
};

export async function verifyTransactionSuccess(txHash: Hash, opts: VerifyTxOptions = {}) {
  // Fetch receipt and basic properties
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

  if (!receipt || receipt.status !== "success") {
    return { ok: false, reason: "Transaction not found or failed" } as const;
  }

  if (opts.expectedTo && receipt.to?.toLowerCase() !== opts.expectedTo.toLowerCase()) {
    return { ok: false, reason: "Mismatched recipient (to)" } as const;
  }

  if (opts.expectedFrom && receipt.from?.toLowerCase() !== opts.expectedFrom.toLowerCase()) {
    return { ok: false, reason: "Mismatched sender (from)" } as const;
  }

  // If an event is specified, ensure at least one matching log decodes.
  if (opts.event) {
    const { abi, eventName } = opts.event;
    let matched = false;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi, data: log.data, topics: log.topics });
        if (decoded.eventName === eventName) {
          matched = true;
          break;
        }
      } catch (_) {
        // ignore non-matching logs
      }
    }
    if (!matched) {
      return { ok: false, reason: "Expected event not found in logs" } as const;
    }
  }

  return { ok: true, receipt } as const;
}
