import { Keypair } from "@stellar/stellar-sdk";

/**
 * Generate a unique valid Stellar wallet address for testing
 */
export function generateUniqueWalletAddress(): string {
  const keypair = Keypair.random();
  return keypair.publicKey();
}

/**
 * Generate multiple unique wallet addresses
 */
export function generateUniqueWalletAddresses(count: number): string[] {
  return Array.from({ length: count }, () => generateUniqueWalletAddress());
}
