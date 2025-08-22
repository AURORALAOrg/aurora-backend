// Mock implementation of nodemailer
import { jest } from '@jest/globals';

const sendMailMock = jest.fn().mockImplementation(() => {
  return Promise.resolve({
    messageId: 'mock-message-id',
    response: 'mock-response'
  });
});

const verifyMock = jest.fn().mockImplementation(() => {
  return Promise.resolve(true);
});

const mockTransport = {
  sendMail: sendMailMock,
  verify: verifyMock
};

const nodemailer = {
  createTransport: jest.fn().mockReturnValue(mockTransport)
};

export default nodemailer;
export const createTransport = nodemailer.createTransport;
