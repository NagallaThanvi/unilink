# Blockchain Credential Verification

## Overview

UniLink uses Polygon blockchain for immutable credential verification, ensuring academic achievements are tamper-proof and instantly verifiable.

## Architecture

### Smart Contract Structure

```solidity
// CredentialRegistry.sol
pragma solidity ^0.8.0;

contract CredentialRegistry {
    struct Credential {
        string studentId;
        string universityId;
        string credentialType;
        string credentialHash;
        uint256 timestamp;
        bool isValid;
    }
    
    mapping(bytes32 => Credential) public credentials;
    mapping(address => bool) public authorizedUniversities;
    
    event CredentialIssued(bytes32 indexed credentialId, string studentId, string universityId);
    event CredentialRevoked(bytes32 indexed credentialId);
    
    modifier onlyAuthorized() {
        require(authorizedUniversities[msg.sender], "Not authorized");
        _;
    }
    
    function issueCredential(
        string memory studentId,
        string memory universityId,
        string memory credentialType,
        string memory credentialHash
    ) public onlyAuthorized returns (bytes32) {
        bytes32 credentialId = keccak256(abi.encodePacked(studentId, universityId, block.timestamp));
        
        credentials[credentialId] = Credential({
            studentId: studentId,
            universityId: universityId,
            credentialType: credentialType,
            credentialHash: credentialHash,
            timestamp: block.timestamp,
            isValid: true
        });
        
        emit CredentialIssued(credentialId, studentId, universityId);
        return credentialId;
    }
    
    function verifyCredential(bytes32 credentialId) public view returns (bool) {
        return credentials[credentialId].isValid;
    }
    
    function revokeCredential(bytes32 credentialId) public onlyAuthorized {
        require(credentials[credentialId].isValid, "Already revoked");
        credentials[credentialId].isValid = false;
        emit CredentialRevoked(credentialId);
    }
}
```

## Implementation Guide

### 1. Setup Polygon Network

```bash
# Install dependencies
npm install ethers @polygon/sdk hardhat

# Configure Hardhat
npx hardhat init
```

### 2. Deploy Smart Contract

```javascript
// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const CredentialRegistry = await hre.ethers.getContractFactory("CredentialRegistry");
  const registry = await CredentialRegistry.deploy();
  await registry.deployed();
  
  console.log("CredentialRegistry deployed to:", registry.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### 3. Integration with UniLink API

```typescript
// src/lib/blockchain.ts
import { ethers } from "ethers";

const POLYGON_RPC = process.env.POLYGON_RPC_URL || "https://polygon-rpc.com";
const CONTRACT_ADDRESS = process.env.CREDENTIAL_CONTRACT_ADDRESS;

export class BlockchainService {
  private provider: ethers.providers.JsonRpcProvider;
  private contract: ethers.Contract;
  
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC);
    const abi = [/* Contract ABI */];
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, abi, this.provider);
  }
  
  async issueCredential(
    studentId: string,
    universityId: string,
    credentialType: string,
    credentialData: any
  ): Promise<string> {
    const wallet = new ethers.Wallet(process.env.UNIVERSITY_PRIVATE_KEY!, this.provider);
    const contractWithSigner = this.contract.connect(wallet);
    
    const credentialHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(JSON.stringify(credentialData))
    );
    
    const tx = await contractWithSigner.issueCredential(
      studentId,
      universityId,
      credentialType,
      credentialHash
    );
    
    const receipt = await tx.wait();
    const event = receipt.events?.find(e => e.event === 'CredentialIssued');
    return event?.args?.credentialId;
  }
  
  async verifyCredential(credentialId: string): Promise<boolean> {
    return await this.contract.verifyCredential(credentialId);
  }
  
  async getCredentialDetails(credentialId: string) {
    return await this.contract.credentials(credentialId);
  }
}
```

### 4. API Endpoint for Verification

```typescript
// src/app/api/credentials/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { BlockchainService } from "@/lib/blockchain";

export async function POST(req: NextRequest) {
  try {
    const { credentialId } = await req.json();
    
    const blockchain = new BlockchainService();
    const isValid = await blockchain.verifyCredential(credentialId);
    const details = await blockchain.getCredentialDetails(credentialId);
    
    return NextResponse.json({
      success: true,
      verified: isValid,
      credential: {
        studentId: details.studentId,
        universityId: details.universityId,
        type: details.credentialType,
        timestamp: new Date(details.timestamp.toNumber() * 1000),
        isValid: details.isValid
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
```

## Frontend Integration

```tsx
// components/CredentialVerifier.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, CheckCircle, XCircle } from "lucide-react";

export function CredentialVerifier() {
  const [credentialId, setCredentialId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);

  const verifyCredential = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/credentials/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId })
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Enter credential ID"
          value={credentialId}
          onChange={(e) => setCredentialId(e.target.value)}
        />
        <Button onClick={verifyCredential} disabled={verifying}>
          <Shield className="mr-2 h-4 w-4" />
          Verify
        </Button>
      </div>
      
      {result && (
        <div className={`p-4 rounded-lg ${result.verified ? 'bg-green-50' : 'bg-red-50'}`}>
          {result.verified ? (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span>Credential Verified on Blockchain</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              <span>Credential Not Found or Invalid</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Security Considerations

1. **Private Key Management**: Never expose private keys in client-side code
2. **Authorization**: Only authorized universities can issue credentials
3. **Gas Optimization**: Batch operations to minimize transaction costs
4. **Event Monitoring**: Monitor blockchain events for credential issuance/revocation
5. **Backup**: Maintain off-chain backups of credential metadata

## Cost Estimation

- Contract Deployment: ~0.1 MATIC
- Credential Issuance: ~0.001 MATIC per credential
- Verification: Free (read-only operation)

## Testing

```bash
# Run blockchain tests
npx hardhat test

# Deploy to Polygon Mumbai testnet
npx hardhat run scripts/deploy.js --network mumbai
```

## Production Checklist

- [ ] Deploy contract to Polygon mainnet
- [ ] Configure authorized university addresses
- [ ] Set up monitoring and alerts
- [ ] Implement gas price optimization
- [ ] Create backup strategy
- [ ] Document credential schema
- [ ] Set up explorer integration (PolygonScan)