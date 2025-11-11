import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Check if programs already exist
  const existingPrograms = await prisma.trainingProgram.findMany();
  if (existingPrograms.length > 0) {
    console.log('✅ Training programs already exist. Skipping seed.');
    return;
  }

  // Create training programs
  const programs = [
    {
      name: 'Fat Burn Program',
      category: 'Weight Loss',
      description: 'Intensive weight loss program designed to help you burn fat and achieve your fitness goals.',
      price: 49.99,
      imageUrl: null,
    },
    {
      name: 'Strength Builder',
      category: 'Muscle Growth',
      description: 'Build muscle and strength with our comprehensive strength training program.',
      price: 59.99,
      imageUrl: null,
    },
    {
      name: 'Cardio Blast',
      category: 'Endurance',
      description: 'High-intensity cardio training to improve your cardiovascular fitness and endurance.',
      price: 44.99,
      imageUrl: null,
    },
    {
      name: 'Yoga & Stretch',
      category: 'Flexibility',
      description: 'Improve flexibility and relaxation with our yoga and stretching program.',
      price: 39.99,
      imageUrl: null,
    },
    {
      name: 'Functional Fitness',
      category: 'Athletic Performance',
      description: 'Athletic performance training to improve your functional movement and overall fitness.',
      price: 54.99,
      imageUrl: null,
    },
  ];

  for (const program of programs) {
    await prisma.trainingProgram.create({
      data: program,
    });
    console.log(`✅ Created program: ${program.name}`);
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

