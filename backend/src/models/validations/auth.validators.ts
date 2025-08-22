import Joi from "joi";

// Password complexity regex patterns
const passwordRegex = {
  minLength: /.{8,}/, // Minimum 8 characters
  uppercase: /[A-Z]/, // At least one uppercase letter
  lowercase: /[a-z]/, // At least one lowercase letter
  number: /\d/, // At least one number
  special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, // At least one special character
};

// Custom password validation function
const passwordValidation = (value: string, helpers: any) => {
  const errors = [];
  
  if (!passwordRegex.minLength.test(value)) {
    errors.push("at least 8 characters long");
  }
  if (!passwordRegex.uppercase.test(value)) {
    errors.push("at least one uppercase letter");
  }
  if (!passwordRegex.lowercase.test(value)) {
    errors.push("at least one lowercase letter");
  }
  if (!passwordRegex.number.test(value)) {
    errors.push("at least one number");
  }
  if (!passwordRegex.special.test(value)) {
    errors.push("at least one special character (!@#$%^&*()_+-=[]{}|;':\",./<>?)");
  }
  
  if (errors.length > 0) {
    return helpers.error('string.pattern.base', { 
      message: `Password must contain ${errors.join(", ")}` 
    });
  }
  
  return value;
};

export const registerValidation = {
  body: Joi.object().keys({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    password: Joi.string().custom(passwordValidation).required().messages({
      "any.required": "Password is required",
    }),
    firstName: Joi.string().required().messages({
      "any.required": "First name is required",
    }),
    lastName: Joi.string().required().messages({
      "any.required": "Last name is required",
    }),
    walletAddress: Joi.string().required().messages({
      "any.required": "Wallet address is required",
    }),
  }),
};

export const loginValidation = {
  body: Joi.object().keys({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    password: Joi.string().required().messages({
      "any.required": "Password is required",
    }),
    deviceToken: Joi.string().optional(),
    appVersion: Joi.string().optional(),
  }),
};

export const verifyEmailValidation = {
  query: Joi.object().keys({
    token: Joi.string().required().messages({
      "any.required": "Verification token is required",
    }),
  }),
};

export const forgotPasswordValidation = {
  body: Joi.object().keys({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
  }),
};

export const resetPasswordValidation = {
  body: Joi.object().keys({
    token: Joi.string().required().messages({
      "any.required": "Reset token is required",
    }),
    newPassword: Joi.string().custom(passwordValidation).required().messages({
      "any.required": "New password is required",
    }),
  }),
};

export const verifyWalletValidation = {
  body: Joi.object().keys({
    walletAddress: Joi.string().required().messages({
      "any.required": "Wallet address is required",
    }),
    signature: Joi.string().required().messages({
      "any.required": "Signature is required",
    }),
  }),
};
