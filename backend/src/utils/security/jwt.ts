import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
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
      expiresIn: (typeof expires !== "undefined" ? expires : "1d") as SignOptions["expiresIn"],
    };
    return jwt.sign(payload, SECRET, opts);
  }

  public static verify<T extends object = TokenClaims>(token: string): T {
    const decoded = jwt.verify(token, SECRET);
    if (typeof decoded === "string") {
      throw new Error("Invalid token");
    }
    return decoded as T;
  }
}


export default Jwt;
