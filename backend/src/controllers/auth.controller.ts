import { Request, Response } from "express"
import asyncHandler from "../middlewares/async"
import { SuccessResponse, BadRequestResponse } from "../core/api/ApiResponse"
import { BadRequestError } from "../core/api/ApiError"
import UserService from "../services/user.service"
import Jwt from "../utils/security/jwt"
import WalletService from "../services/wallet.service"
import serverSettings from "../core/config/settings"
import EmailNotifier from "../utils/service/emailNotifier"
import Bcrypt from "../utils/security/bcrypt"
import { StrKey } from "@stellar/stellar-sdk"

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, walletAddress } = req.body

  const existingUser = await UserService.readUserByEmail(email)
  if (existingUser) throw new BadRequestError("Email already registered")

  if (!StrKey.isValidEd25519PublicKey(walletAddress)) {
    throw new BadRequestError("Invalid Stellar public key format. Expected a valid G... address")
  }

  const existingWallet = await WalletService.readWalletByWalletAddress(walletAddress)
  if (existingWallet) throw new BadRequestError("Wallet address already registered")

  const hashedPassword = await Bcrypt.hashPassword(password)

  const result = await UserService.registerUser({
    email,
    hashedPassword,
    firstName,
    lastName,
    walletAddress,
  })

  await WalletService.createWallet(result.id, walletAddress)

  const verificationToken = Jwt.issue({ userId: result.id }, "1d")

  const verificationLink = `${serverSettings.auroraWebApp.baseUrl}/verify-email?token=${verificationToken}`
  EmailNotifier.sendAccountActivationEmail(email, verificationLink)

  const userResponse = {
    id: result.id,
    email: result.email,
    firstName: result.firstName,
    lastName: result.lastName,
    isEmailVerified: result.isEmailVerified,
    createdAt: result.createdAt,
    status: result.status,
  }

  return new SuccessResponse(
    "Registration successful. Please verify your email.",
    { user: userResponse }
  ).send(res)
})

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { token } = req.query
    if (!token || typeof token !== "string") {
      throw new BadRequestError("Verification token is required")
    }

    const decoded = Jwt.verify(token)
    const userId = (decoded as any).payload.userId

    const updatedUser = await UserService.activateEmail(userId)
    if (!updatedUser) throw new BadRequestError("User not found")

    return new SuccessResponse("Email verified successfully", {}).send(res)
  } catch (err) {
    console.log(err)
    throw new BadRequestError("Invalid token")
  }
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body

  const user = await UserService.readUserByEmail(email)
  if (!user) throw new BadRequestError("Invalid credentials")
  if (!user.isEmailVerified) {
    throw new BadRequestError("Email not verified. Please verify your email first.")
  }

  const isPasswordValid = await Bcrypt.compare(password, user.password)
  if (!isPasswordValid) throw new BadRequestError("Invalid credentials")

  const token = Jwt.issue({ id: user.id }, "1d")

  const userResponse = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    status: user.status,
  }

  return new SuccessResponse("Login successful", {
    user: userResponse,
    token,
  }).send(res)
})
