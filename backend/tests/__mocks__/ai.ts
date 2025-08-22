// Mock implementation of the ai package
export const generateText = jest.fn().mockImplementation(() => 
  Promise.resolve({ text: "Mocked AI response" })
);
