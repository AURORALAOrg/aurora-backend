import { Transporter } from "nodemailer"

const mockTransporter: Partial<Transporter> = {
  sendMail: jest.fn().mockResolvedValue({
    messageId: "test-message-id",
    response: "OK",
  }),
  verify: jest.fn().mockResolvedValue(true),
}

const createTransporter = jest.fn().mockReturnValue(mockTransporter)

export default {
  createTransporter,
} 