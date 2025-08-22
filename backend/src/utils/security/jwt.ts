import jwt, { JwtPayload, Secret, SignOptions, VerifyOptions } from "jsonwebtoken";
import serverSettings from "../../core/config/settings";


export type TokenClaims = JwtPayload & {
  sub?: string;
  id?: string;
  userId?: string;
  role?: string;
};

const SECRET: Secret = serverSettings.jwtSecretKey as string;
class Jwt {
  public static issue(payload: Record<string, unknown>, expires?: string | number) {
    const opts: SignOptions = {
      issuer: serverSettings.jwt.issuer,
      audience: serverSettings.jwt.audience,
      algorithm: serverSettings.jwt.algorithm as jwt.Algorithm, // e.g. "HS256"
      expiresIn: (typeof expires !== "undefined" ? expires : "1d") as SignOptions["expiresIn"],
    };
    return jwt.sign(payload, SECRET, opts);
  }

  public static verify<T extends object = TokenClaims>(token: string): T {
    const vopts: VerifyOptions = {
      issuer: serverSettings.jwt.issuer,
      audience: serverSettings.jwt.audience,
      algorithms: [serverSettings.jwt.algorithm as jwt.Algorithm],
    };
    const decoded = jwt.verify(token, SECRET, vopts);
    if (typeof decoded === "string") throw new Error("Invalid token");
    return decoded as T;
  }
}


export default Jwt;
