import { Request, Response } from "express";
import { Keypair, StrKey } from "@stellar/stellar-sdk";
import asyncHandler from "../middlewares/async";
import { SuccessResponse } from "../core/api/ApiResponse";
import { BadRequestError } from "../core/api/ApiError";
import WalletService from "../services/wallet.service";

export const generateWalletChallenge = asyncHandler(
  async (req: Request, res: Response) => {
    const { walletAddress } = req.body;

    
    if (!StrKey.isValidEd25519PublicKey(walletAddress)) {
      throw new BadRequestError("Invalid Stellar public key format. Expected a valid G... address");
    }

    const nonce = Math.floor(Math.random() * 1000000).toString();

    const message = `Verify ownership of wallet address ${walletAddress} for AURORA Platform. Nonce: ${nonce}`;

    // Store the challenge in the database
    await WalletService.storeWalletChallenge(walletAddress, message, nonce);

    return new SuccessResponse("Challenge generated successfully", {
      message,
      walletAddress,
    }).send(res);
  }
);


export const verifyWalletSignature = asyncHandler(
  async (req: Request, res: Response) => {
    const { walletAddress, signature } = req.body;
    const userId = res.locals.account.id;

    // Get the wallet from the database
    const wallet = await WalletService.readWalletByWalletAddress(walletAddress);

    if (!wallet) {
      throw new BadRequestError("Wallet address not found");
    }

    if (wallet.userId !== userId) {
      throw new BadRequestError(
        "Wallet address does not belong to authenticated user"
      );
    }

    // Get the challenge from the database
    const challenge = await WalletService.getWalletChallenge(walletAddress);

    if (!challenge) {
      throw new BadRequestError(
        "No active challenge found for this wallet address"
      );
    }

    try {
      
      const keypair = Keypair.fromPublicKey(walletAddress);
      const messageBuffer = Buffer.from(challenge.message, 'utf8');
      const signatureBuffer = Buffer.from(signature, 'base64');
      
      const isValid = keypair.verify(messageBuffer, signatureBuffer);
      
      if (!isValid) {
        throw new BadRequestError("Invalid signature");
      }

      // Mark the wallet as verified
      await WalletService.verifyWallet(walletAddress);

      // Remove the challenge after verification
      await WalletService.removeWalletChallenge(walletAddress);

      return new SuccessResponse("Wallet verified successfully", {
        walletAddress,
        verified: true,
      }).send(res);
    } catch (error) {
      console.error("Wallet verification error:", error);
      throw new BadRequestError("Failed to verify wallet signature");
    }
  }
);