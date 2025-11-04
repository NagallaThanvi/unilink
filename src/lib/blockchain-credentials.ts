import { createPublicClient, createWalletClient, http, parseEther, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon } from "viem/chains";
import { db } from "@/db";
import { credentials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NotificationService } from "./notifications";

// Blockchain configuration
const RPC_URL = process.env.BLOCKCHAIN_RPC_URL || "https://polygon-rpc.com";
const PRIVATE_KEY = process.env.UNIVERSITY_PRIVATE_KEY as `0x${string}`;
const CONTRACT_ADDRESS = process.env.CREDENTIAL_CONTRACT_ADDRESS as `0x${string}`;

// Smart contract ABI for credential verification
const CREDENTIAL_ABI = [
  {
    "inputs": [
      {"name": "studentId", "type": "string"},
      {"name": "universityId", "type": "string"},
      {"name": "credentialType", "type": "string"},
      {"name": "credentialHash", "type": "string"}
    ],
    "name": "issueCredential",
    "outputs": [{"name": "", "type": "bytes32"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "credentialId", "type": "bytes32"}],
    "name": "verifyCredential",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "credentialId", "type": "bytes32"}],
    "name": "getCredential",
    "outputs": [
      {"name": "studentId", "type": "string"},
      {"name": "universityId", "type": "string"},
      {"name": "credentialType", "type": "string"},
      {"name": "credentialHash", "type": "string"},
      {"name": "timestamp", "type": "uint256"},
      {"name": "isValid", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "credentialId", "type": "bytes32"}],
    "name": "revokeCredential",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "credentialId", "type": "bytes32"},
      {"indexed": false, "name": "studentId", "type": "string"},
      {"indexed": false, "name": "universityId", "type": "string"}
    ],
    "name": "CredentialIssued",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "credentialId", "type": "bytes32"}
    ],
    "name": "CredentialRevoked",
    "type": "event"
  }
] as const;

export class BlockchainCredentialService {
  private publicClient;
  private walletClient;
  private account;
  private contract;

  constructor() {
    // Initialize clients
    this.publicClient = createPublicClient({
      chain: polygon,
      transport: http(RPC_URL)
    });

    if (PRIVATE_KEY && CONTRACT_ADDRESS) {
      this.account = privateKeyToAccount(PRIVATE_KEY);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: polygon,
        transport: http(RPC_URL)
      });

      this.contract = getContract({
        address: CONTRACT_ADDRESS,
        abi: CREDENTIAL_ABI,
        client: {
          public: this.publicClient,
          wallet: this.walletClient
        }
      });
    }
  }

  /**
   * Issue a credential on the blockchain
   */
  async issueCredential(
    studentId: string,
    universityId: string,
    credentialType: string,
    credentialData: any
  ): Promise<{ txHash: string; credentialId: string }> {
    if (!this.contract || !this.walletClient) {
      throw new Error("Blockchain service not properly configured");
    }

    try {
      // Create a hash of the credential data
      const credentialHash = await this.createCredentialHash(credentialData);

      // Issue credential on blockchain
      const txHash = await this.contract.write.issueCredential([
        studentId,
        universityId,
        credentialType,
        credentialHash
      ]);

      // Wait for transaction confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });

      // Extract credential ID from event logs
      let credentialId = "";
      if (receipt.logs && receipt.logs.length > 0) {
        for (const log of receipt.logs) {
          try {
            const decoded = this.publicClient.decodeEventLog({
              abi: CREDENTIAL_ABI,
              data: log.data,
              topics: log.topics
            });
            
            if (decoded.eventName === 'CredentialIssued') {
              credentialId = decoded.args.credentialId as string;
              break;
            }
          } catch (e) {
            // Ignore non-matching logs
          }
        }
      }

      return { txHash, credentialId };
    } catch (error) {
      console.error("Failed to issue credential on blockchain:", error);
      throw error;
    }
  }

  /**
   * Verify a credential on the blockchain
   */
  async verifyCredential(credentialId: string): Promise<boolean> {
    if (!this.contract) {
      throw new Error("Blockchain service not properly configured");
    }

    try {
      const isValid = await this.contract.read.verifyCredential([credentialId as `0x${string}`]);
      return isValid;
    } catch (error) {
      console.error("Failed to verify credential on blockchain:", error);
      return false;
    }
  }

  /**
   * Get credential details from blockchain
   */
  async getCredentialDetails(credentialId: string) {
    if (!this.contract) {
      throw new Error("Blockchain service not properly configured");
    }

    try {
      const details = await this.contract.read.getCredential([credentialId as `0x${string}`]);
      return {
        studentId: details[0],
        universityId: details[1],
        credentialType: details[2],
        credentialHash: details[3],
        timestamp: Number(details[4]),
        isValid: details[5]
      };
    } catch (error) {
      console.error("Failed to get credential details from blockchain:", error);
      throw error;
    }
  }

  /**
   * Revoke a credential on the blockchain
   */
  async revokeCredential(credentialId: string): Promise<string> {
    if (!this.contract || !this.walletClient) {
      throw new Error("Blockchain service not properly configured");
    }

    try {
      const txHash = await this.contract.write.revokeCredential([credentialId as `0x${string}`]);
      await this.publicClient.waitForTransactionReceipt({ hash: txHash });
      return txHash;
    } catch (error) {
      console.error("Failed to revoke credential on blockchain:", error);
      throw error;
    }
  }

  /**
   * Automatically issue and verify credential
   */
  async autoIssueCredential(credentialDbId: number): Promise<void> {
    try {
      // Get credential from database
      const credential = await db.select()
        .from(credentials)
        .where(eq(credentials.id, credentialDbId))
        .limit(1);

      if (credential.length === 0) {
        throw new Error("Credential not found in database");
      }

      const cred = credential[0];

      // Skip if already verified on chain
      if (cred.isVerifiedOnChain) {
        return;
      }

      // Prepare credential data for blockchain
      const credentialData = {
        title: cred.title,
        description: cred.description,
        credentialType: cred.credentialType,
        issueDate: cred.issueDate,
        expiryDate: cred.expiryDate,
        metadata: cred.metadata ? JSON.parse(cred.metadata) : null
      };

      // Issue on blockchain
      const { txHash, credentialId } = await this.issueCredential(
        cred.userId,
        cred.universityId.toString(),
        cred.credentialType,
        credentialData
      );

      // Update database with blockchain info
      await db.update(credentials)
        .set({
          blockchainTxHash: txHash,
          isVerifiedOnChain: true,
          metadata: JSON.stringify({
            ...credentialData,
            blockchainCredentialId: credentialId,
            verifiedAt: new Date().toISOString()
          }),
          updatedAt: new Date().toISOString()
        })
        .where(eq(credentials.id, credentialDbId));

      // Send notification to user
      await NotificationService.notifyCredentialIssued(
        cred.userId,
        cred.title,
        credentialDbId
      );

      console.log(`Credential ${credentialDbId} successfully issued on blockchain with TX: ${txHash}`);
    } catch (error) {
      console.error(`Failed to auto-issue credential ${credentialDbId}:`, error);
      throw error;
    }
  }

  /**
   * Create a hash of credential data for blockchain storage
   */
  private async createCredentialHash(credentialData: any): Promise<string> {
    const dataString = JSON.stringify(credentialData, Object.keys(credentialData).sort());
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Batch process pending credentials for blockchain verification
   */
  async processPendingCredentials(): Promise<void> {
    try {
      // Get all unverified credentials
      const pendingCredentials = await db.select()
        .from(credentials)
        .where(eq(credentials.isVerifiedOnChain, false))
        .limit(10); // Process in batches

      console.log(`Processing ${pendingCredentials.length} pending credentials...`);

      for (const credential of pendingCredentials) {
        try {
          await this.autoIssueCredential(credential.id);
          // Add delay between transactions to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Failed to process credential ${credential.id}:`, error);
          // Continue with next credential
        }
      }
    } catch (error) {
      console.error("Failed to process pending credentials:", error);
    }
  }

  /**
   * Check if blockchain service is properly configured
   */
  isConfigured(): boolean {
    return !!(PRIVATE_KEY && CONTRACT_ADDRESS && this.contract);
  }

  /**
   * Get blockchain network info
   */
  async getNetworkInfo() {
    try {
      const blockNumber = await this.publicClient.getBlockNumber();
      const chainId = await this.publicClient.getChainId();
      
      return {
        chainId,
        blockNumber: Number(blockNumber),
        contractAddress: CONTRACT_ADDRESS,
        isConfigured: this.isConfigured()
      };
    } catch (error) {
      console.error("Failed to get network info:", error);
      return {
        chainId: null,
        blockNumber: null,
        contractAddress: CONTRACT_ADDRESS,
        isConfigured: false
      };
    }
  }
}

// Export singleton instance
export const blockchainCredentialService = new BlockchainCredentialService();
