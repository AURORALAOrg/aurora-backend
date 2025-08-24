export interface ServerSettings {
  serverEnvironment: "PRODUCTION" | "STAGING" | "DEVELOPMENT" | "TEST";
  serverPort: number;
  jwt: {
    issuer: string;
    audience: string;
    algorithm: string;
    privateKey?: string;
    publicKey?: string;
    secretKey?: string; // for HS* algorithms
  };
  bcryptHashingSalt: number;  // rounds
  email: {
    username: string;
    fromAddress: string;
    password: string;
  };
  auroraWebApp: {
    baseUrl: string
  }
}
