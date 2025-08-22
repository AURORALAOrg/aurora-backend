import jwt, { JwtPayload, Secret, SignOptions, VerifyOptions } from "jsonwebtoken";
import serverSettings from "../../core/config/settings";


export type TokenClaims = JwtPayload & {
  sub?: string;
  id?: string;
  userId?: string;
  role?: string;
};

const isSymmetric = /^HS/.test(serverSettings.jwt.algorithm);
const SIGNING_KEY: Secret = isSymmetric
  ? (serverSettings.jwtSecretKey as string)
  : (serverSettings.jwt.privateKey as string);
const VERIFY_KEY: Secret = isSymmetric
  ? (serverSettings.jwtSecretKey as string)
  : (serverSettings.jwt.publicKey as string);

export class Jwt {
  public static issue(payload: Record<string, unknown> | TokenClaims, expires?: SignOptions["expiresIn"]): string {
    const opts: SignOptions = {
      issuer: serverSettings.jwt.issuer,
      audience: serverSettings.jwt.audience,
      algorithm: serverSettings.jwt.algorithm as jwt.Algorithm,
      expiresIn: (typeof expires !== "undefined" ? expires : "1d") as SignOptions["expiresIn"],
    };
    if (!SIGNING_KEY) throw new Error('JWT misconfiguration: missing signing key');
    return jwt.sign(payload, SIGNING_KEY, opts);
  }

  public static verify<T extends JwtPayload = TokenClaims>(token: string): T {
    const vopts: VerifyOptions = {
      issuer: serverSettings.jwt.issuer,
      audience: serverSettings.jwt.audience,
      algorithms: [serverSettings.jwt.algorithm as jwt.Algorithm],
    };
    if (!VERIFY_KEY) throw new Error('JWT misconfiguration: missing verification key');
    const decoded = jwt.verify(token, VERIFY_KEY, vopts);
    return decoded as T;
  }
}


export default Jwt;
