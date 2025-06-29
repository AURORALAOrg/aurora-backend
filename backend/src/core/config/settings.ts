import dotenv from "dotenv"
import path from "path"
import Joi from "joi"

dotenv.config({ path: path.join(__dirname, "../../../.env") })

const envVarsSchema = Joi.object()
  .keys({
    SERVER_ENVIRONMENT: Joi.string().valid("PRODUCTION", "STAGING", "DEVELOPMENT", "TEST").required(),
    SERVER_PORT: Joi.number().default(8000),
    JWT_SECRET_KEY: Joi.string().required().description("JWT Secret Key"),
    BCRYPT_SALT_ROUNDS: Joi.number().required().description("Bcrypt Salt Rounds"),
    EMAIL_USERNAME: Joi.string().required().description("Email username"),
    EMAIL_PASSWORD: Joi.string().required().description("Email password"),
    EMAIL_FROM_ADDRESS: Joi.string().required().description("Sender email address"),
    AURORA_WEB_APP_BASE_URL: Joi.string().required().description("Base URL for Aurora Web App"),
    OPENAI_API_KEY: Joi.string().required().description("OpenAI API Key"),
    OPENAI_MODEL: Joi.string().default("gpt-3.5-turbo").description("OpenAI Model to use"),
    OPENAI_MAX_TOKENS: Joi.number().default(500).description("Maximum tokens for OpenAI responses"),
    CHAT_RATE_LIMIT_WINDOW: Joi.number()
      .default(900000)
      .description("Chat rate limit window in milliseconds (15 minutes)"),
    CHAT_RATE_LIMIT_MAX: Joi.number().default(20).description("Maximum chat requests per window"),
  })
  .unknown()

const { value: envVars, error } = envVarsSchema.validate(process.env)

if (error) {
  throw new Error(`Config validation error: ${error.message}`)
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
  openai: {
    apiKey: envVars.OPENAI_API_KEY,
    model: envVars.OPENAI_MODEL,
    maxTokens: envVars.OPENAI_MAX_TOKENS,
  },
  chat: {
    rateLimitWindow: envVars.CHAT_RATE_LIMIT_WINDOW,
    rateLimitMax: envVars.CHAT_RATE_LIMIT_MAX,
  },
}

export default serverSettings
