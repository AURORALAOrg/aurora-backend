import dotenv from "dotenv";
import path from "path";
import Joi from "joi";

dotenv.config();

const envVarsSchema = Joi.object()
  .keys({
    SERVER_ENVIRONMENT: Joi.string()
      .valid("PRODUCTION", "STAGING", "DEVELOPMENT", "TEST")
      .required(),
    SERVER_PORT: Joi.number().default(8000),
    JWT_SECRET_KEY: Joi.string().required().description("JWT Secret Key"),
    JWT_ISSUER: Joi.string().default("aurora"),
    JWT_AUDIENCE: Joi.string().default("aurora-users"),
    JWT_ALGORITHM: Joi.string()
      .valid("HS256", "HS384", "HS512", "RS256", "RS384", "RS512", "ES256", "ES384", "PS256", "PS384", "PS512")
      .default("HS256"),
    JWT_PRIVATE_KEY: Joi.string().when('JWT_ALGORITHM', {
      is: Joi.string().pattern(/^(RS|ES|PS)/),
      then: Joi.required().description("JWT private key (PEM) for asymmetric algorithms"),
      otherwise: Joi.forbidden()
    }),
    JWT_PUBLIC_KEY: Joi.string().when('JWT_ALGORITHM', {
      is: Joi.string().pattern(/^(RS|ES|PS)/),
      then: Joi.required().description("JWT public key (PEM) for asymmetric algorithms"),
      otherwise: Joi.forbidden()
    }),
    BCRYPT_SALT_ROUNDS: Joi.number().integer().min(4).max(15)
      .required()
      .description("Bcrypt Salt Rounds"),
    EMAIL_USERNAME: Joi.string().required().description("Email username"),
    EMAIL_PASSWORD: Joi.string().required().description("Email password"),
    EMAIL_FROM_ADDRESS: Joi.string().email()
      .required()
      .description("Sender email address"),
    AURORA_WEB_APP_BASE_URL: Joi.string().uri({ scheme: ['http','https'] })
      .required()
      .description("Base URL for Aurora Web App"),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const serverSettings = {
  serverEnvironment: envVars.SERVER_ENVIRONMENT,
  serverPort: envVars.SERVER_PORT,
  jwtSecretKey: envVars.JWT_SECRET_KEY,
  jwt: {
    issuer: envVars.JWT_ISSUER as string,
    audience: envVars.JWT_AUDIENCE as string,
    algorithm: envVars.JWT_ALGORITHM as string,
    privateKey: envVars.JWT_PRIVATE_KEY as string | undefined,
    publicKey: envVars.JWT_PUBLIC_KEY as string | undefined,
  },
  bcryptHashingSalt: envVars.BCRYPT_SALT_ROUNDS,
  auroraWebApp: {
    baseUrl: envVars.AURORA_WEB_APP_BASE_URL,
  },
  email: {
    username: envVars.EMAIL_USERNAME,
    password: envVars.EMAIL_PASSWORD,
    fromAddress: envVars.EMAIL_FROM_ADDRESS,
  },
};

export default serverSettings;
