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
    REMINDER_ENABLED: Joi.boolean()
      .default(true)
      .description("Enable reminder emails"),
    CRON_SCHEDULE: Joi.string()
      .default("0 2 * * *")
      .description("CRON schedule for reminder job"),
    REMINDER_MAX_RETRIES: Joi.number()
      .default(2)
      .description("Maximum retries for failed email reminders"),
    REMINDER_RETRY_INTERVAL_HOURS: Joi.number()
      .default(24)
      .description("Hours between email retry attempts"),
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
  reminders: {
    enabled: envVars.REMINDER_ENABLED,
    cronSchedule: envVars.CRON_SCHEDULE,
    maxRetries: envVars.REMINDER_MAX_RETRIES,
    retryIntervalHours: envVars.REMINDER_RETRY_INTERVAL_HOURS,
  },
};

export default serverSettings;
