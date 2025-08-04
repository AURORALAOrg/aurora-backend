import { Request, Response } from "express";
import asyncHandler from "../middlewares/async";
import { SuccessResponse, BadRequestResponse } from "../core/api/ApiResponse";
import { BadRequestError, InternalError } from "../core/api/ApiError";
import UserService from "../services/user.service";
import Jwt from "../utils/security/jwt";
import WalletService from "../services/wallet.service";
import serverSettings from "../core/config/settings";
import EmailNotifier from "../utils/service/emailNotifier";
import Bcrypt from "../utils/security/bcrypt";
import { StrKey } from "@stellar/stellar-sdk";
import logger from "../core/config/logger";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, walletAddress } = req.body;

  logger.info(`Registration attempt for email: ${email}`);

  const existingUser = await UserService.readUserByEmail(email);
  if (existingUser) {
    logger.warn(`Registration attempt with existing email: ${email}`);
    throw new BadRequestError("Email already registered");
  }

  if (!StrKey.isValidEd25519PublicKey(walletAddress)) {
    logger.warn(
      `Registration attempt with invalid wallet address: ${walletAddress} for email: ${email}`
    );
    throw new BadRequestError("Invalid Stellar wallet address");
  }

  const existingWallet =
    await WalletService.readWalletByWalletAddress(walletAddress);
  if (existingWallet) {
    logger.warn(
      `Registration attempt with existing wallet address: ${walletAddress} for email: ${email}`
    );
    throw new BadRequestError("Wallet address already registered");
  }

  const hashedPassword = await Bcrypt.hashPassword(password);

  try {
    logger.info(`Starting atomic registration transaction for email: ${email}`);

    // Single atomic transaction that creates both user and wallet
    const result = await UserService.registerUser({
      email,
      hashedPassword,
      firstName,
      lastName,
      walletAddress,
    });

    logger.info(
      `Registration transaction completed successfully for email: ${email}, user ID: ${result.id}`
    );

    // Email notification only after successful transaction completion
    const verificationToken = Jwt.issue({ userId: result.id }, "1d");
    const verificationLink = `${serverSettings.auroraWebApp.baseUrl}/verify-email?token=${verificationToken}`;

    logger.debug(`Generated verification link for user ID: ${result.id}`);

    // Email notification failures are logged but don't affect registration success
    try {
      logger.info(`Sending activation email to: ${email}`);
      await EmailNotifier.sendAccountActivationEmail(email, verificationLink);
      logger.info(`Activation email sent successfully to: ${email}`);
    } catch (emailError) {
      // Log detailed email error but don't fail the registration
      logger.error(`Failed to send activation email to: ${email}`, {
        error:
          emailError instanceof Error ? emailError.message : String(emailError),
        stack: emailError instanceof Error ? emailError.stack : undefined,
        userId: result.id,
        verificationLink,
      });

      // Continue with successful response even if email fails
      logger.warn(
        `Registration successful but email notification failed for: ${email}`
      );
    }

    const userResponse = {
      id: result.id,
      email: result.email,
      firstName: result.firstName,
      lastName: result.lastName,
      isEmailVerified: result.isEmailVerified,
      createdAt: result.createdAt,
      status: result.status,
    };

    logger.info(`Registration completed successfully for email: ${email}`);

    return new SuccessResponse(
      "Registration successful. Please verify your email.",
      { user: userResponse }
    ).send(res);
  } catch (error) {
    // Handle transaction failures with proper error logging and user-friendly messages
    logger.error(`Registration failed for email: ${email}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestData: {
        email,
        firstName,
        lastName,
        walletAddress,
      },
    });

    // Re-throw the error to maintain existing error handling behavior
    // The UserService already provides user-friendly error messages
    throw error;
  }
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    logger.info(
      `Email verification attempt with token: ${token ? "provided" : "missing"}`
    );

    if (!token || typeof token !== "string") {
      logger.warn("Email verification attempted without token");
      throw new BadRequestError("Verification token is required");
    }

    const decoded = Jwt.verify(token);
    const userId = (decoded as any).payload.userId;

    logger.info(`Email verification for user ID: ${userId}`);

    const updatedUser = await UserService.activateEmail(userId);
    if (!updatedUser) {
      logger.warn(
        `Email verification failed - user not found for ID: ${userId}`
      );
      throw new BadRequestError("User not found");
    }

    logger.info(
      `Email verification completed successfully for user ID: ${userId}`
    );

    return new SuccessResponse("Email verified successfully", {}).send(res);
  } catch (err) {
    logger.error("Email verification failed", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      token: req.query.token ? "provided" : "missing",
    });

    throw new BadRequestError("Invalid token");
  }
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  logger.info(`Login attempt for email: ${email}`);

  const user = await UserService.readUserByEmail(email);
  if (!user) {
    logger.warn(`Login attempt with non-existent email: ${email}`);
    throw new BadRequestError("Invalid credentials");
  }

  if (!user.isEmailVerified) {
    logger.warn(`Login attempt with unverified email: ${email}`);
    throw new BadRequestError(
      "Email not verified. Please verify your email first."
    );
  }

  const isPasswordValid = await Bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    logger.warn(`Login attempt with invalid password for email: ${email}`);
    throw new BadRequestError("Invalid credentials");
  }

  const token = Jwt.issue({ id: user.id }, "1d");

  const userResponse = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    status: user.status,
  };

  logger.info(`Login successful for email: ${email}, user ID: ${user.id}`);

  return new SuccessResponse("Login successful", {
    user: userResponse,
    token,
  }).send(res);
});
