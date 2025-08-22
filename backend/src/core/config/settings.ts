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
    BCRYPT_SALT_ROUNDS: Joi.number()
      .required()
      .description("Bcrypt Salt Rounds"),
    EMAIL_USERNAME: Joi.string().required().description("Email username"),
    EMAIL_PASSWORD: Joi.string().required().description("Email password"),
    EMAIL_FROM_ADDRESS: Joi.string()
      .required()
      .description("Sender email address"),
    AURORA_WEB_APP_BASE_URL: Joi.string()
      .required()
      .description("Base URL for Aurora Web App"),
    DEEPSEEK_API_KEY: Joi.string()
      .required()
      .description("DeepSeek API Key"),
    DEEPSEEK_MODEL: Joi.string()
      .default("deepseek-chat")
      .description("DeepSeek Model to use"),
    DEEPSEEK_API_BASE: Joi.string()
      .default("https://api.deepseek.com/v1")
      .description("DeepSeek API Base URL"),
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
  bcryptHashingSalt: envVars.BCRYPT_SALT_ROUNDS,
  auroraWebApp: {
    baseUrl: envVars.AURORA_WEB_APP_BASE_URL,
  },
  email: {
    username: envVars.EMAIL_USERNAME,
    password: envVars.EMAIL_PASSWORD,
    fromAddress: envVars.EMAIL_FROM_ADDRESS,
  },
  deepseek: {
    apiKey: envVars.DEEPSEEK_API_KEY,
    model: envVars.DEEPSEEK_MODEL,
    apiBase: envVars.DEEPSEEK_API_BASE,
  },
};

export default serverSettings;
