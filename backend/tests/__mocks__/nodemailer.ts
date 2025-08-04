export const createTransporter = jest.fn().mockReturnValue({
  sendMail: jest.fn().mockResolvedValue({ messageId: "test-message-id" }),
});

export default {
  createTransporter,
};
