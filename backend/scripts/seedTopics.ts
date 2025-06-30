import { PrismaClient, Status } from "@prisma/client"

enum TopicCategory {
  DAILY_LIFE = "DAILY_LIFE",
  TRAVEL = "TRAVEL",
  TECHNOLOGY = "TECHNOLOGY",
  CULTURE = "CULTURE",
  WORK_BUSINESS = "WORK_BUSINESS",
}

enum EnglishLevel {
  A1 = "A1",
  A2 = "A2",
  B1 = "B1",
  B2 = "B2",
  C1 = "C1",
  C2 = "C2",
}
import { v4 as uuidv4 } from "uuid"

const prisma = new PrismaClient()

const topicsData = [
  // A1 Level Topics
  {
    name: "Greetings & Introductions",
    description: "Learn basic greetings and how to introduce yourself",
    category: TopicCategory.DAILY_LIFE,
    englishLevel: EnglishLevel.A1,
    prompts: [
      { text: "Hello! What is your name?", type: "starter", difficulty: "A1" },
      { text: "Nice to meet you! Where are you from?", type: "follow_up", difficulty: "A1" },
      { text: "You meet someone new at a coffee shop. Introduce yourself.", type: "scenario", difficulty: "A1" },
    ],
    keywords: [
      {
        word: "hello",
        definition: "A greeting used when meeting someone",
        example: "Hello, how are you?",
        difficulty: "basic",
      },
      { word: "name", definition: "What someone is called", example: "My name is John.", difficulty: "basic" },
      { word: "nice", definition: "Pleasant or good", example: "Nice to meet you!", difficulty: "basic" },
    ],
    objectives: [
      {
        skill: "speaking",
        description: "Practice basic greeting phrases",
        examples: ["Hello, my name is...", "Nice to meet you"],
      },
      {
        skill: "vocabulary",
        description: "Learn common greeting words",
        examples: ["hello", "goodbye", "please", "thank you"],
      },
    ],
  },
  {
    name: "Family & Relationships",
    description: "Talk about family members and relationships",
    category: TopicCategory.DAILY_LIFE,
    englishLevel: EnglishLevel.A1,
    prompts: [
      { text: "Tell me about your family.", type: "starter", difficulty: "A1" },
      { text: "Do you have any brothers or sisters?", type: "follow_up", difficulty: "A1" },
      { text: "Describe your family to a new friend.", type: "scenario", difficulty: "A1" },
    ],
    keywords: [
      {
        word: "family",
        definition: "Parents, children, and relatives",
        example: "I love my family.",
        difficulty: "basic",
      },
      { word: "mother", definition: "Female parent", example: "My mother is kind.", difficulty: "basic" },
      { word: "father", definition: "Male parent", example: "My father works hard.", difficulty: "basic" },
    ],
    objectives: [
      {
        skill: "vocabulary",
        description: "Learn family member names",
        examples: ["mother", "father", "sister", "brother"],
      },
      {
        skill: "speaking",
        description: "Describe family relationships",
        examples: ["I have two sisters", "My father is tall"],
      },
    ],
  },

  // A2 Level Topics
  {
    name: "Daily Routines",
    description: "Discuss daily activities and schedules",
    category: TopicCategory.DAILY_LIFE,
    englishLevel: EnglishLevel.A2,
    prompts: [
      { text: "What do you usually do in the morning?", type: "starter", difficulty: "A2" },
      { text: "What time do you go to bed?", type: "follow_up", difficulty: "A2" },
      { text: "Describe your typical weekday to someone.", type: "scenario", difficulty: "A2" },
    ],
    keywords: [
      {
        word: "routine",
        definition: "Regular activities done daily",
        example: "My morning routine includes coffee.",
        difficulty: "intermediate",
      },
      {
        word: "schedule",
        definition: "A plan of activities and times",
        example: "My work schedule is busy.",
        difficulty: "intermediate",
      },
    ],
    objectives: [
      {
        skill: "grammar",
        description: "Use present simple for routines",
        examples: ["I wake up at 7 AM", "She goes to work by bus"],
      },
      {
        skill: "vocabulary",
        description: "Learn time expressions",
        examples: ["in the morning", "at night", "every day"],
      },
    ],
  },

  // B1 Level Topics
  {
    name: "Travel & Tourism",
    description: "Discuss travel experiences and plans",
    category: TopicCategory.TRAVEL,
    englishLevel: EnglishLevel.B1,
    prompts: [
      { text: "What's the most interesting place you've visited?", type: "starter", difficulty: "B1" },
      { text: "Where would you like to travel next and why?", type: "follow_up", difficulty: "B1" },
      { text: "You're planning a trip with friends. Discuss your destination.", type: "scenario", difficulty: "B1" },
    ],
    keywords: [
      {
        word: "destination",
        definition: "The place you are traveling to",
        example: "Paris is a popular destination.",
        difficulty: "intermediate",
      },
      {
        word: "itinerary",
        definition: "A planned route or journey",
        example: "Our itinerary includes three cities.",
        difficulty: "intermediate",
      },
    ],
    objectives: [
      {
        skill: "speaking",
        description: "Express travel preferences and experiences",
        examples: ["I prefer beach destinations", "The trip was amazing"],
      },
      {
        skill: "grammar",
        description: "Use past tenses for experiences",
        examples: ["I have been to Italy", "We visited the museum"],
      },
    ],
  },

  // B2 Level Topics
  {
    name: "Technology & Society",
    description: "Discuss the impact of technology on modern life",
    category: TopicCategory.TECHNOLOGY,
    englishLevel: EnglishLevel.B2,
    prompts: [
      { text: "How has social media changed the way we communicate?", type: "starter", difficulty: "B2" },
      { text: "What are the benefits and drawbacks of remote work?", type: "follow_up", difficulty: "B2" },
      { text: "Debate whether smartphones make us more or less social.", type: "scenario", difficulty: "B2" },
    ],
    keywords: [
      {
        word: "innovation",
        definition: "New ideas or methods",
        example: "Technological innovation drives progress.",
        difficulty: "advanced",
      },
      {
        word: "connectivity",
        definition: "The state of being connected",
        example: "Internet connectivity is essential today.",
        difficulty: "advanced",
      },
    ],
    objectives: [
      {
        skill: "speaking",
        description: "Express complex opinions and arguments",
        examples: ["On one hand..., on the other hand...", "I believe that..."],
      },
      {
        skill: "vocabulary",
        description: "Use advanced technology terms",
        examples: ["artificial intelligence", "digital transformation"],
      },
    ],
  },

  // C1 Level Topics
  {
    name: "Global Issues & Environment",
    description: "Discuss complex global challenges and environmental concerns",
    category: TopicCategory.CULTURE,
    englishLevel: EnglishLevel.C1,
    prompts: [
      { text: "What role should governments play in addressing climate change?", type: "starter", difficulty: "C1" },
      { text: "How can individuals contribute to environmental sustainability?", type: "follow_up", difficulty: "C1" },
      {
        text: "Participate in a panel discussion about renewable energy policies.",
        type: "scenario",
        difficulty: "C1",
      },
    ],
    keywords: [
      {
        word: "sustainability",
        definition: "Meeting present needs without compromising future generations",
        example: "Environmental sustainability is crucial.",
        difficulty: "advanced",
      },
      {
        word: "mitigation",
        definition: "Action to reduce severity of something",
        example: "Climate change mitigation requires global effort.",
        difficulty: "advanced",
      },
    ],
    objectives: [
      {
        skill: "speaking",
        description: "Engage in sophisticated debates",
        examples: ["Furthermore...", "Conversely...", "It could be argued that..."],
      },
      {
        skill: "grammar",
        description: "Use complex sentence structures",
        examples: ["Were it not for...", "Had we acted sooner..."],
      },
    ],
  },

  // Business Topics
  {
    name: "Job Interviews",
    description: "Practice common job interview scenarios",
    category: TopicCategory.WORK_BUSINESS,
    englishLevel: EnglishLevel.B1,
    prompts: [
      { text: "Tell me about yourself and your experience.", type: "starter", difficulty: "B1" },
      { text: "What are your strengths and weaknesses?", type: "follow_up", difficulty: "B1" },
      {
        text: "You're interviewing for your dream job. Answer the interviewer's questions.",
        type: "scenario",
        difficulty: "B1",
      },
    ],
    keywords: [
      {
        word: "qualifications",
        definition: "Skills and experience for a job",
        example: "I have the right qualifications for this position.",
        difficulty: "intermediate",
      },
      {
        word: "achievement",
        definition: "Something accomplished successfully",
        example: "My greatest achievement was leading the project.",
        difficulty: "intermediate",
      },
    ],
    objectives: [
      {
        skill: "speaking",
        description: "Present yourself professionally",
        examples: ["I am experienced in...", "My background includes..."],
      },
      {
        skill: "vocabulary",
        description: "Use business and career terms",
        examples: ["leadership", "teamwork", "problem-solving"],
      },
    ],
  },
]

async function seedTopics() {
  console.log("🌱 Starting topic seeding...")

  try {
    // Clear existing topics
    await prisma.topic.deleteMany({})
    console.log("🗑️  Cleared existing topics")

    // Insert new topics
    for (const topicData of topicsData) {
      await prisma.topic.create({
        data: {
          id: uuidv4(),
          ...topicData,
          status: Status.ACTIVE,
        },
      })
    }

    console.log(`✅ Successfully seeded ${topicsData.length} topics`)

    // Display summary
    const summary = await prisma.topic.groupBy({
      by: ["englishLevel", "category"],
      _count: true,
    })

    console.log("\n📊 Topic Summary:")
    summary.forEach((item) => {
      console.log(`   ${item.englishLevel.toUpperCase()} - ${item.category}: ${item._count} topics`)
    })
  } catch (error) {
    console.error("❌ Error seeding topics:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed function
if (require.main === module) {
  seedTopics()
    .then(() => {
      console.log("🎉 Topic seeding completed successfully!")
      process.exit(0)
    })
    .catch((error) => {
      console.error("💥 Topic seeding failed:", error)
      process.exit(1)
    })
}

export default seedTopics
