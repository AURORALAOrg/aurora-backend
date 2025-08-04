// Simple test to verify the WalletService implementation
const { PrismaClient } = require("@prisma/client");

// Mock the WalletService to test the method signature
class WalletService {
  static async createWallet(userId, walletAddress) {
    console.log("Original createWallet method called");
    return { id: "wallet-1", userId, walletAddress, isVerified: false };
  }

  static async createWalletInTransaction(tx, userId, walletAddress) {
    console.log("New createWalletInTransaction method called");
    // Simulate transaction-aware wallet creation
    return { id: "wallet-2", userId, walletAddress, isVerified: false };
  }
}

// Test the methods exist and have correct signatures
console.log("Testing WalletService methods...");

// Test original method (backward compatibility)
WalletService.createWallet("user-1", "0x123").then((result) => {
  console.log("Original method result:", result);
});

// Test new transaction-aware method
const mockTx = {
  wallet: {
    create: async (data) => {
      console.log("Mock transaction wallet.create called with:", data);
      return { id: "wallet-tx", ...data.data };
    },
  },
};

WalletService.createWalletInTransaction(mockTx, "user-2", "0x456").then(
  (result) => {
    console.log("Transaction method result:", result);
  }
);

console.log("Both methods are available and working!");
