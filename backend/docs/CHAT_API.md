# Chat API Documentation

## Overview

The Chat API provides AI-powered conversation practice functionality for language learners. It integrates with OpenAI to generate contextual responses based on the user's practice level and conversation type.

## Authentication

All chat endpoints (except health check) require JWT authentication via the `Authorization` header:

\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

## Rate Limiting

Chat endpoints are rate-limited to prevent abuse:
- **Window**: 15 minutes (900,000ms)
- **Limit**: 20 requests per window per IP
- **Response**: 429 Too Many Requests when limit exceeded

## Endpoints

### POST /api/v1/chat/ai

Generate an AI response for conversation practice.

**Request Body:**
\`\`\`json
{
  "message": "Hello, I want to practice English conversation",
  "conversationContext": [
    {
      "role": "user",
      "content": "Hi there!",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "role": "assistant", 
      "content": "Hello! How can I help you practice today?",
      "timestamp": "2024-01-15T10:30:05Z"
    }
  ],
  "practiceLevel": "B1",
  "conversationType": "general",
  "userLanguage": "en"
}
\`\`\`

**Parameters:**
- `message` (required): User's message (1-1000 characters)
- `conversationContext` (optional): Array of previous messages (max 20)
- `practiceLevel` (required): One of A1, A2, B1, B2, C1, C2
- `conversationType` (optional): general, business, travel, academic, casual (default: general)
- `userLanguage` (optional): en, es, fr, de, it, pt (default: en)

**Success Response (200):**
\`\`\`json
{
  "success": true,
  "message": "Chat response generated successfully",
  "data": {
    "response": "Hello! I'd be happy to help you practice English...",
    "conversationId": "uuid-string",
    "timestamp": "2024-01-15T10:30:00Z",
    "tokensUsed": 75,
    "practiceLevel": "B1",
    "conversationType": "general"
  }
}
\`\`\`

### GET /api/v1/chat/starters

Get conversation starter suggestions based on practice level and type.

**Query Parameters:**
- `practiceLevel` (optional): A1, A2, B1, B2, C1, C2 (default: B1)
- `conversationType` (optional): general, business, travel, academic, casual (default: general)

**Success Response (200):**
\`\`\`json
{
  "success": true,
  "message": "Conversation starters retrieved successfully",
  "data": {
    "starters": [
      "What are your hobbies and interests?",
      "Can you tell me about your typical day?",
      "What kind of music do you enjoy?"
    ],
    "practiceLevel": "B1",
    "conversationType": "general"
  }
}
\`\`\`

### GET /api/v1/chat/health

Health check endpoint (no authentication required).

**Success Response (200):**
\`\`\`json
{
  "success": true,
  "message": "Chat service is healthy",
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "service": "chat",
    "version": "1.0.0"
  }
}
\`\`\`

## Error Responses

### 400 Bad Request
\`\`\`json
{
  "success": false,
  "message": "Message cannot be empty"
}
\`\`\`

### 401 Unauthorized
\`\`\`json
{
  "success": false,
  "message": "Unauthorized - No token provided"
}
\`\`\`

### 429 Too Many Requests
\`\`\`json
{
  "success": false,
  "message": "Too many chat requests, please try again later."
}
\`\`\`

### 500 Internal Server Error
\`\`\`json
{
  "success": false,
  "message": "Failed to generate AI response"
}
\`\`\`

## Practice Levels

- **A1**: Beginner - Simple vocabulary and basic grammar
- **A2**: Elementary - Everyday expressions and simple sentences  
- **B1**: Intermediate - Clear standard language on familiar topics
- **B2**: Upper-Intermediate - Complex texts and abstract topics
- **C1**: Advanced - Implicit meaning and flexible language use
- **C2**: Proficient - Nuanced expression and sophisticated language

## Conversation Types

- **general**: Everyday conversation topics
- **business**: Professional and workplace scenarios
- **travel**: Travel-related situations and cultural exchanges
- **academic**: Educational topics and formal discussions
- **casual**: Informal, friendly conversations

## Usage Tips

1. **Context Management**: Include recent conversation history for better continuity
2. **Level Appropriate**: Choose the right practice level for optimal learning
3. **Rate Limits**: Be mindful of the 20 requests per 15-minute limit
4. **Error Handling**: Always handle potential API errors gracefully
5. **Token Usage**: Monitor token usage for cost management

## Security Features

- JWT authentication required
- Input sanitization and validation
- Rate limiting to prevent abuse
- Secure OpenAI API key management
- Response content sanitization
