// import * as fs from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const allowedQuestionTypes = ['multiple-choice', 'sentence-builder', 'fill-in-blanks', 'idiom-challenge', 'word-scramble', 'word-matching', 'story-game'];
const allowedEnglishLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

interface ImportResults {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
}

type QuestionType = 'multiple-choice' | 'sentence-builder' | 'fill-in-blanks' | 'idiom-challenge' | 'word-scramble' | 'word-matching' | 'story-game';

const questionTypeStructures: Record<QuestionType, { content: Record<string, string> }> = {
  'multiple-choice': {
    content: {
      question: 'string (required)',
      correctAnswer: 'string (required)',
      wrongAnswers: 'string[] (required, min 2 items)',
      explanation: 'string (required)'
    }
  },
  'sentence-builder': {
    content: {
      sentence: 'string (required)',
      words: 'string[] (required, min 3 items)',
      explanation: 'string (required)'
    }
  },
  'fill-in-blanks': {
    content: {
      sentence: 'string (required)',
      correctAnswer: 'string (required)',
      hint: 'string (optional)',
      explanation: 'string (required)'
    }
  },
  'idiom-challenge': {
    content: {
      idiom: 'string (required)',
      sentence: 'string (required)',
      options: 'string[] (required, min 2 items)',
      correct: 'number (required)',
      explanation: 'string (required)',
      tips: 'string[] (required)'
    }
  },
  'word-scramble': {
    content: {
      word: 'string (required)',
      scrambled: 'string (required)',
      hint: 'string (required)',
      explanation: 'string (required)',
      contextSentence: 'string (required)'
    }
  },
  'word-matching': {
    content: {
      pairs: 'object[] (required, min 3 items with word and match)',
      difficulty: 'string (required)',
      category: 'string (required)'
    }
  },
  'story-game': {
    content: {
      story: 'string (required)',
      questions: 'object[] (required, min 1 item)',
      summary: 'string (required)'
    }
  }
};

const commonMetadataStructure = {
  englishLevel: 'string (required, one of: A1, A2, B1, B2, C1, C2)',
  difficulty: 'string (required)',
  category: 'string (required)',
  subCategory: 'string (required)',
  tags: 'string[] (required)',
  type: 'string (required, one of: multiple-choice, sentence-builder, fill-in-blanks, idiom-challenge, word-scramble, word-matching, story-game)'
};

const gameMetadataStructure = {
  pointsValue: 'number (required)',
  timeLimit: 'number (required)',
  difficultyMultiplier: 'number (required)'
};

function getStructureError(type: QuestionType, field: string): string {
  const structure = questionTypeStructures[type];
  if (!structure) return 'Unknown question type';

  return `\nRequired structure for ${type}:\n${JSON.stringify(structure, null, 2)}\n\nCommon metadata structure:\n${JSON.stringify(commonMetadataStructure, null, 2)}\n\nGame metadata structure:\n${JSON.stringify(gameMetadataStructure, null, 2)}`;
}

function validateQuestion(questionData: any): void {
  const { content, metadata, gameMetadata } = questionData;

  // Check for missing required fields
  if (!content) throw new Error('Missing required field: content');
  if (!metadata) throw new Error('Missing required field: metadata');
  if (!gameMetadata) throw new Error('Missing required field: gameMetadata');

  // Convert underscores to hyphens in type for consistency
  if (metadata.type) {
    metadata.type = metadata.type.replace(/_/g, '-');
  }

  // Validate question type
  if (!allowedQuestionTypes.includes(metadata.type)) {
    throw new Error(`Invalid question type: ${metadata.type}. Allowed types: ${allowedQuestionTypes.join(', ')}`);
  }

  // Validate English level
  if (!allowedEnglishLevels.includes(metadata.englishLevel)) {
    throw new Error(`Invalid English level: ${metadata.englishLevel}. Allowed levels: ${allowedEnglishLevels.join(', ')}`);
  }

  // Validate content based on question type
  switch (metadata.type) {
    case 'multiple-choice':
      if (!content.question) throw new Error('Missing required field: content.question');
      if (!content.correctAnswer) throw new Error('Missing required field: content.correctAnswer');
      if (!Array.isArray(content.wrongAnswers)) throw new Error('content.wrongAnswers must be an array');
      if (content.wrongAnswers.length < 2) throw new Error('content.wrongAnswers must have at least 2 items');
      if (!content.explanation) throw new Error('Missing required field: content.explanation');
      break;

    case 'sentence-builder':
      if (!content.sentence) throw new Error('Missing required field: content.sentence');
      if (!Array.isArray(content.words)) throw new Error('content.words must be an array');
      if (content.words.length < 3) throw new Error('content.words must have at least 3 items');
      if (!content.explanation) throw new Error('Missing required field: content.explanation');
      break;

    case 'fill-in-blanks':
      if (!content.sentence) throw new Error('Missing required field: content.sentence');
      if (!content.correctAnswer) throw new Error('Missing required field: content.correctAnswer');
      if (!content.explanation) throw new Error('Missing required field: content.explanation');
      break;

    case 'idiom-challenge':
      if (!content.idiom) throw new Error('Missing required field: content.idiom');
      if (!content.sentence) throw new Error('Missing required field: content.sentence');
      if (!Array.isArray(content.options)) throw new Error('content.options must be an array');
      if (content.options.length < 2) throw new Error('content.options must have at least 2 items');
      if (typeof content.correct !== 'number') throw new Error('content.correct must be a number');
      if (!Array.isArray(content.tips)) throw new Error('content.tips must be an array');
      if (!content.explanation) throw new Error('Missing required field: content.explanation');
      break;

    case 'word-scramble':
      if (!content.word) throw new Error('Missing required field: content.word');
      if (!content.scrambled) throw new Error('Missing required field: content.scrambled');
      if (!content.hint) throw new Error('Missing required field: content.hint');
      if (!content.explanation) throw new Error('Missing required field: content.explanation');
      if (!content.contextSentence) throw new Error('Missing required field: content.contextSentence');
      break;

    case 'word-matching':
      if (!Array.isArray(content.pairs)) throw new Error('content.pairs must be an array');
      if (content.pairs.length < 3) throw new Error('content.pairs must have at least 3 items');
      for (const pair of content.pairs) {
        if (!pair.word) throw new Error('Missing required field: pair.word');
        if (!pair.match) throw new Error('Missing required field: pair.match');
      }
      if (!content.difficulty) throw new Error('Missing required field: content.difficulty');
      if (!content.category) throw new Error('Missing required field: content.category');
      break;

    case 'story-game':
      if (!content.story) throw new Error('Missing required field: content.story');
      if (!Array.isArray(content.questions)) throw new Error('content.questions must be an array');
      if (content.questions.length < 1) throw new Error('content.questions must have at least 1 item');
      for (const question of content.questions) {
        if (!question.question) throw new Error('Missing required field: question.question');
        if (!Array.isArray(question.options)) throw new Error('question.options must be an array');
        if (question.options.length < 2) throw new Error('question.options must have at least 2 items');
        if (typeof question.correct !== 'number') throw new Error('question.correct must be a number');
        if (!question.explanation) throw new Error('Missing required field: question.explanation');
      }
      if (!content.summary) throw new Error('Missing required field: content.summary');
      break;
  }

  // Validate game metadata
  if (typeof gameMetadata.pointsValue !== 'number') {
    throw new Error('gameMetadata.pointsValue must be a number');
  }
  if (typeof gameMetadata.timeLimit !== 'number') {
    throw new Error('gameMetadata.timeLimit must be a number');
  }
  if (typeof gameMetadata.difficultyMultiplier !== 'number') {
    throw new Error('gameMetadata.difficultyMultiplier must be a number');
  }
}

async function upsertQuestion(questionData: any, createdBy: string) {
  // First try to find an existing question with the same content and metadata
  const existingQuestion = await prisma.question.findFirst({
    where: {
      AND: [
        {
          content: {
            equals: questionData.content
          }
        },
        {
          metadata: {
            equals: questionData.metadata
          }
        }
      ]
    }
  });

  if (existingQuestion) {
    return prisma.question.update({
      where: { id: existingQuestion.id },
      data: {
        content: questionData.content,
        metadata: questionData.metadata,
        gameMetadata: questionData.gameMetadata,
        updatedAt: new Date()
      }
    });
  }

  return prisma.question.create({
    data: {
      content: questionData.content,
      metadata: questionData.metadata,
      gameMetadata: questionData.gameMetadata,
      createdBy,
      status: 'ACTIVE'
    }
  });
}

async function importQuestions(filePath: string, createdBy: string): Promise<ImportResults> {
  const dataPath = path.join(__dirname, filePath);
  const ext = path.extname(dataPath);
  let questions: any[] = [];

  try {
    const fileContent = await fs.readFile(dataPath, 'utf-8');

    if (ext === '.json') {
      questions = JSON.parse(fileContent);
    } else if (ext === '.txt') {
      questions = fileContent
        .split(/\n\s*\n/) // split by empty lines
        .map(block => block.trim())
        .filter(Boolean)
        .map(block => JSON.parse(block));
    } else {
      throw new Error('Unsupported file type. Please use .json or .txt');
    }
  } catch (err) {
    throw new Error(`Failed to read or parse file: ${err}`);
  }

  const results: ImportResults = {
    total: questions.length,
    successful: 0,
    failed: 0,
    errors: []
  };

  console.log(`Starting import of ${questions.length} questions...`);

  for (const [index, questionData] of questions.entries()) {
    try {
      validateQuestion(questionData);
      await upsertQuestion(questionData, createdBy);
      results.successful++;

      // Log progress every 10 questions
      if ((index + 1) % 10 === 0) {
        console.log(`Progress: ${index + 1}/${questions.length} questions processed`);
      }
    } catch (error: any) {
      results.failed++;
      const errorMessage = `Question ${index + 1}: ${error.message}`;
      results.errors.push(errorMessage);
      console.error(errorMessage);
    }
  }

  return results;
}

async function deleteQuestions(type?: string, level?: string): Promise<{ deleted: number }> {
  const where: any = {};

  if (type) {
    where.metadata = {
      path: ['type'],
      equals: type
    };
  }

  if (level) {
    where.metadata = {
      ...where.metadata,
      path: ['englishLevel'],
      equals: level
    };
  }

  const result = await prisma.question.deleteMany({
    where
  });

  return { deleted: result.count };
}

async function main(): Promise<void> {
  const command = process.argv[2];
  const filePath = process.argv[3];
  const createdBy = process.argv[4];
  const type = process.argv[5];
  const level = process.argv[6];

  if (command === 'delete') {
    try {
      const result = await deleteQuestions(type, level);
      console.log(`Successfully deleted ${result.deleted} questions`);
      if (type) console.log(`Type: ${type}`);
      if (level) console.log(`Level: ${level}`);
    } catch (error: any) {
      console.error('Error deleting questions:', error.message || error);
      process.exit(1);
    }
    return;
  }

  if (!filePath || !createdBy) {
    console.error('Usage:');
    console.error('  Import questions:');
    console.error('    ts-node importQuestions.ts import <questions.json|questions.txt> <createdBy>');
    console.error('  Delete questions:');
    console.error('    ts-node importQuestions.ts delete [type] [level]');
    console.error('    Example: ts-node importQuestions.ts delete multiple-choice A1');
    process.exit(1);
  }

  try {
    const results = await importQuestions(filePath, createdBy);
    console.log('\nImport Summary:');
    console.log('---------------');
    console.log(`Total questions: ${results.total}`);
    console.log(`Successfully imported: ${results.successful}`);
    console.log(`Failed: ${results.failed}`);

    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach(error => console.log(`- ${error}`));
    }
  } catch (error: any) {
    console.error('Fatal error:', error.message || error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });