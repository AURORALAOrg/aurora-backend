module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testMatch: ["**/tests/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  transformIgnorePatterns: ["<rootDir>/node_modules/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^nodemailer$": "<rootDir>/tests/__mocks__/nodemailer.ts",
  },
};
