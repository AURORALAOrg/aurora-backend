import serverSettings from "../../core/config/settings";

const bcrypt = require("bcrypt");

class Bcrypt {

    public static async hashPassword( password: string): Promise<string> {
        const rounds: number = serverSettings.bcryptHashingSalt;
        if (!Number.isInteger(rounds) || rounds < 4 || rounds > 15) {
            throw new Error(`Invalid bcrypt salt rounds: ${rounds}`);
        }

        return await bcrypt.hash(password, rounds);
    }
    
    public static async compare( value: string, hashedValue: string): Promise<boolean> {
        return await bcrypt.compare(value, hashedValue);
    }
}

export default Bcrypt;