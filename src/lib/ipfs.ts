import { NFTStorage, File } from "nft.storage";

const TOKEN = process.env.NFT_STORAGE_TOKEN;

function getClient() {
  if (!TOKEN) {
    console.warn("NFT_STORAGE_TOKEN is not set. IPFS upload will be skipped.");
    return null as unknown as NFTStorage;
  }
  return new NFTStorage({ token: TOKEN });
}

export async function uploadJSONToIPFS(name: string, data: unknown): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const file = new File([blob], name.endsWith('.json') ? name : `${name}.json`, { type: "application/json" });
  const cid = await client.storeBlob(blob);
  return cid ? `ipfs://${cid}` : null;
}
