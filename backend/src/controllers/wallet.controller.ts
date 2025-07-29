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

    const wallet = await WalletService.readWalletByWalletAddress(walletAddress);

    if (!wallet) {
      throw new BadRequestError("Wallet address not found");
    }

    if (wallet.userId !== userId) {
      throw new BadRequestError(
        "Wallet address does not belong to authenticated user"
      );
    }

 
    const challenge = await WalletService.getWalletChallenge(walletAddress);

    if (!challenge) {
      throw new BadRequestError(
        "No active challenge found for this wallet address"
      );
    }

    try {
      
      let keypair;
      try {
        keypair = Keypair.fromPublicKey(walletAddress);
      } catch (err) {
        throw new BadRequestError("Invalid Stellar public key. Unable to construct Keypair.");
      }

     
      if (!/^[A-Za-z0-9+/=]+$/.test(signature)) {
        throw new BadRequestError("Signature is not valid base64 format.");
      }
      let signatureBuffer;
      try {
        signatureBuffer = Buffer.from(signature, 'base64');
      } catch (err) {
        throw new BadRequestError("Failed to decode signature from base64.");
      }
      const messageBuffer = Buffer.from(challenge.message, 'utf8');

      let isValid = false;
      try {
        isValid = keypair.verify(messageBuffer, signatureBuffer);
      } catch (err) {
        throw new BadRequestError("Signature verification failed: " + (err instanceof Error ? err.message : 'Unknown error'));
      }
      if (!isValid) {
        throw new BadRequestError("Invalid signature: signature does not match the message and public key.");
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
      if (error instanceof BadRequestError) {
        // Already a handled, specific error
        throw error;
      }
      console.error("Wallet verification unexpected error:", error);
      throw new BadRequestError("Unexpected error during wallet verification.");
    }
  }
);