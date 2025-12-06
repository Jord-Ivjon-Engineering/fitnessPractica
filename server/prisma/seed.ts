import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Data for TrainingProgram (id: 10)
const trainingProgramData = {
  id: 10,
  name: 'Rezistence & Tonifikim & Renie Peshe',
  category: 'Endurance ', // Trailing space is preserved as per SQL data
  description: 'Ky program përbëhet nga 3 video, të cilat do të kryhen 3 herë në javë për një periudhë njëmujore efektive.Për rezultate optimale në tonifikim, ndiqni ritmin e ushtrimeve të paraqitura në video.\n📌 Programi është me kohë të limituar dhe do të jetë i vlefshëm nga 5/12/2025 deri më 15/01/2026, vetëm për pjesëmarrësit aktivë.\n\nMënyra më e mirë e ndjekjes së programit:\n— 3 herë në javë, sipas këtij ritmi të rekomanduar:\n✔️ E hënë – E mërkurë – E premte\nose\n✔️ E martë – E enjte – E shtunë\n\n⚠️ KUJDES!\nNëse keni probleme kardiake, ju rekomandohet që të ulni ritmin e ushtrimeve me rreth 20%-30% krahasuar me ritmin e videos.',
  imageUrl: 'https://fitnesspractica.fra1.cdn.digitaloceanspaces.com/uploads/images/Rezistence.jpeg',
  // Using exact timestamps from SQL INSERT
  createdAt: new Date('2025-12-02T21:01:48.473Z'), 
  updatedAt: new Date('2025-12-05T16:02:45.859Z'),
  price: 300.00,
  endDate: new Date('2026-01-15T00:00:00.000Z'),
  startDate: new Date('2025-12-05T00:00:00.000Z'),
  videoUrl: null,
  currency: 'eur', 
  polarProductId: '25ef87cd-b0a0-42d4-bdff-c2c5db32e6b4',
};

// Data for ProgramVideo (id: 86-92)
// NOTE: exercises_data is parsed from JSON string to a JSON object as required by the Prisma schema (type Json).
const programVideosData = [
  {
    id: 86,
    programId: 10,
    url: 'https://fitnesspractica.fra1.cdn.digitaloceanspaces.com/uploads/edited_1764868232453.mp4',
    title: 'rezistence tonifikim renie peshe',
    createdAt: new Date('2025-12-04T17:16:50.060Z'),
    exercisesData: JSON.parse('{"breaks": [{\"endTime\": 31, \"duration\": 1, \"startTime\": 30, \"nextExerciseName\": \"Pushim\"}, {\"endTime\": 61, \"duration\": 1, \"startTime\": 60, \"nextExerciseName\": \"Pushim\"}, {\"endTime\": 64, \"duration\": 1, \"startTime\": 63, \"nextExerciseName\": \"Ushtrimi 3\"}, {\"endTime\": 119, \"duration\": 1, \"startTime\": 118, \"nextExerciseName\": \"Ushtrimi 5\"}, {\"endTime\": 146, \"duration\": 1, \"startTime\": 145, \"nextExerciseName\": \"Pushim\"}, {\"endTime\": 149, \"duration\": 1, \"startTime\": 148, \"nextExerciseName\": \"Ushtrimi 6\"}, {\"endTime\": 175, \"duration\": 1, \"startTime\": 174, \"nextExerciseName\": \"Ushtrimi 7\"}, {\"endTime\": 210, \"duration\": 1, \"startTime\": 209, \"nextExerciseName\": \"Ushtrimi 8\"}, {\"endTime\": 235, \"duration\": 1, \"startTime\": 234, \"nextExerciseName\": \"Ushttrimi 9\"}, {\"endTime\": 254, \"duration\": 1, \"startTime\": 253, \"nextExerciseName\": \"Ushtrimi 10\"}, {\"endTime\": 279, \"duration\": 1, \"startTime\": 278, \"nextExerciseName\": \"Ushtrimi 11\"}, {\"endTime\": 305, \"duration\": 1, \"startTime\": 304, \"nextExerciseName\": \"Pushim\"}, {\"endTime\": 312, \"duration\": 1, \"startTime\": 311, \"nextExerciseName\": \"Ushtrimi 12\"}, {\"endTime\": 346, \"duration\": 1, \"startTime\": 345, \"nextExerciseName\": \"Pushim\"}, {\"endTime\": 357, \"duration\": 1, \"startTime\": 356, \"nextExerciseName\": \"Ushtrimi 13\"}, {\"endTime\": 441, \"duration\": 1, \"startTime\": 440, \"nextExerciseName\": \"Pushim\"}, {\"endTime\": 447, \"duration\": 1, \"startTime\": 446, \"nextExerciseName\": \"Ushtrimi 14\"}, {\"endTime\": 484, \"duration\": 1, \"startTime\": 483, \"nextExerciseName\": \"Pushim\"}, {\"endTime\": 492, \"duration\": 1, \"startTime\": 491, \"nextExerciseName\": \"Ushtrimi 15\"}, {\"endTime\": 516, \"duration\": 1, \"startTime\": 515, \"nextExerciseName\": \"Pushim\"}, {\"endTime\": 521, \"duration\": 1, \"startTime\": 520, \"nextExerciseName\": \"Ushtrimi 16\"}, {\"endTime\": 553, \"duration\": 1, \"startTime\": 552, \"nextExerciseName\": \"Ushtrimi 17\"}, {\"endTime\": 586, \"duration\": 1, \"startTime\": 585, \"nextExerciseName\": \"Pushim\"}, {\"endTime\": 597, \"duration\": 1, \"startTime\": 596, \"nextExerciseName\": \"Ushtrimi 18\"}, {\"endTime\": 640, \"duration\": 1, \"startTime\": 639, \"nextExerciseName\": \"Ushtrimi 19\"}, {\"endTime\": 661, \"duration\": 3, \"startTime\": 658, \"nextExerciseName\": \"Pushim\"}, {\"endTime\": 666, \"duration\": 1, \"startTime\": 665, \"nextExerciseName\": \"Ushtrimi 20\"}], \"exercises\": [{\"name\": \"Ushtrimi 1\", \"endTime\": 30, \"startTime\": 10}, {\"name\": \"Pushim\", \"endTime\": 35, \"startTime\": 31}, {\"name\": \"Ushtrimi 2\", \"endTime\": 60, \"startTime\": 35}, {\"name\": \"Pushim\", \"endTime\": 63, \"startTime\": 61}, {\"name\": \"Ushtrimi 3\", \"endTime\": 88, \"startTime\": 64}, {\"name\": \"Ushtrimi 4\", \"endTime\": 118, \"startTime\": 88}, {\"name\": \"Ushtrimi 5\", \"endTime\": 145, \"startTime\": 119}, {\"name\": \"Pushim\", \"endTime\": 148, \"startTime\": 146}, {\"name\": \"Ushtrimi 6\", \"endTime\": 174, \"startTime\": 149}, {\"name\": \"Ushtrimi 7\", \"endTime\": 209, \"startTime\": 175}, {\"name\": \"Ushtrimi 8\", \"endTime\": 234, \"startTime\": 210}, {\"name\": \"Ushttrimi 9\", \"endTime\": 253, \"startTime\": 235}, {\"name\": \"Ushtrimi 10\", \"endTime\": 278, \"startTime\": 254}, {\"name\": \"Ushtrimi 11\", \"endTime\": 304, \"startTime\": 279}, {\"name\": \"Pushim\", \"endTime\": 311, \"startTime\": 305}, {\"name\": \"Ushtrimi 12\", \"endTime\": 345, \"startTime\": 312}, {\"name\": \"Pushim\", \"endTime\": 356, \"startTime\": 346}, {\"name\": \"Ushtrimi 13\", \"endTime\": 440, \"startTime\": 357}, {\"name\": \"Pushim\", \"endTime\": 446, \"startTime\": 441}, {\"name\": \"Ushtrimi 14\", \"endTime\": 483, \"startTime\": 447}, {\"name\": \"Pushim\", \"endTime\": 491, \"startTime\": 484}, {\"name\": \"Ushtrimi 15\", \"endTime\": 515, \"startTime\": 492}, {\"name\": \"Pushim\", \"endTime\": 520, \"startTime\": 516}, {\"name\": \"Ushtrimi 16\", \"endTime\": 552, \"startTime\": 521}, {\"name\": \"Ushtrimi 17\", \"endTime\": 585, \"startTime\": 553}, {\"name\": \"Pushim\", \"endTime\": 596, \"startTime\": 586}, {\"name\": \"Ushtrimi 18\", \"endTime\": 639, \"startTime\": 597}, {\"name\": \"Ushtrimi 19\", \"endTime\": 658, \"startTime\": 640}, {\"name\": \"Pushim\", \"endTime\": 665, \"startTime\": 661}, {\"name\": \"Ushtrimi 20\", \"endTime\": 706, \"startTime\": 666}, {\"name\": \"Ushtrimi 21\", \"endTime\": 736, \"startTime\": 706}]')
  },
  {
    id: 87,
    programId: 10,
    url: 'https://fitnesspractica.fra1.cdn.digitaloceanspaces.com/uploads/edited_1764870597727.mp4',
    title: 'rezistence tonifikim renie peshe ',
    createdAt: new Date('2025-12-04T17:53:00.425Z'),
    exercisesData: JSON.parse('{"breaks": [{\"endTime\": 48, \"duration\": 1, \"startTime\": 47, \"nextExerciseName\": \"Ushtrimi 2\"}, {\"endTime\": 78, \"duration\": 1, \"startTime\": 77, \"nextExerciseName\": \"Ushtrimi 3\"}, {\"endTime\": 107, \"duration\": 2, \"startTime\": 105, \"nextExerciseName\": \"Ushtrimi 4\"}, {\"endTime\": 137, \"duration\": 1, \"startTime\": 136, \"nextExerciseName\": \"Ushtrimi 5\"}, {\"endTime\": 168, \"duration\": 1, \"startTime\": 167, \"nextExerciseName\": \"Ushtrimi 6\"}, {\"endTime\": 197, \"duration\": 1, \"startTime\": 196, \"nextExerciseName\": \"Ushtrimi 7\"}, {\"endTime\": 287, \"duration\": 1, \"startTime\": 286, \"nextExerciseName\": \"Pushim\"}, {\"endTime\": 298, \"duration\": 1, \"startTime\": 297, \"nextExerciseName\": \"Ushtrimi 9\"}, {\"endTime\": 327, \"duration\": 1, \"startTime\": 326, \"nextExerciseName\": \"Ushtrimi 10\"}, {\"endTime\": 357, \"duration\": 1, \"startTime\": 356, \"nextExerciseName\": \"Ushtrimi 11\"}, {\"endTime\": 391, \"duration\": 1, \"startTime\": 390, \"nextExerciseName\": \"Ushtrimi 12\"}, {\"endTime\": 417, \"duration\": 1, \"startTime\": 416, \"nextExerciseName\": \"Ushtrimi 13\"}, {\"endTime\": 446, \"duration\": 1, \"startTime\": 445, \"nextExerciseName\": \"Ushtrimi 14\"}, {\"endTime\": 479, \"duration\": 1, \"startTime\": 478, \"nextExerciseName\": \"Ushtrimi 15\"}, {\"endTime\": 506, \"duration\": 1, \"startTime\": 505, \"nextExerciseName\": \"Ushtrimi 16\"}], \"exercises\": [{\"name\": \"Ushtrimi 1\", \"endTime\": 47, \"startTime\": 0}, {\"name\": \"Ushtrimi 2\", \"endTime\": 77, \"startTime\": 48}, {\"name\": \"Ushtrimi 3\", \"endTime\": 105, \"startTime\": 78}, {\"name\": \"Ushtrimi 4\", \"endTime\": 136, \"startTime\": 107}, {\"name\": \"Ushtrimi 5\", \"endTime\": 167, \"startTime\": 137}, {\"name\": \"Ushtrimi 6\", \"endTime\": 196, \"startTime\": 168}, {\"name\": \"Ushtrimi 7\", \"endTime\": 226, \"startTime\": 197}, {\"name\": \"Ushtrimi 8\", \"endTime\": 286, \"startTime\": 226}, {\"name\": \"Pushim\", \"endTime\": 297, \"startTime\": 287}, {\"name\": \"Ushtrimi 9\", \"endTime\": 326, \"startTime\": 298}, {\"name\": \"Ushtrimi 10\", \"endTime\": 356, \"startTime\": 327}, {\"name\": \"Ushtrimi 11\", \"endTime\": 386, \"startTime\": 357}, {\"name\": \"Pushim\", \"endTime\": 390, \"startTime\": 386}, {\"name\": \"Ushtrimi 12\", \"endTime\": 416, \"startTime\": 391}, {\"name\": \"Ushtrimi 13\", \"endTime\": 445, \"startTime\": 417}, {\"name\": \"Ushtrimi 14\", \"endTime\": 478, \"startTime\": 446}, {\"name\": \"Ushtrimi 15\", \"endTime\": 505, \"startTime\": 479}, {\"name\": \"Ushtrimi 16\", \"endTime\": 536, \"startTime\": 506}]')
  },
  {
    id: 88,
    programId: 10,
    url: 'https://fitnesspractica.fra1.cdn.digitaloceanspaces.com/uploads/edited_1764872358553.mp4',
    title: 'body step ',
    createdAt: new Date('2025-12-04T18:29:55.514Z'),
    exercisesData: JSON.parse('{"breaks": [], "exercises": [{"name": "Start", "endTime": 5, "startTime": 0}]}')
  },
  {
    id: 89,
    programId: 10,
    url: 'https://fitnesspractica.fra1.cdn.digitaloceanspaces.com/uploads/edited_1764873024711.mp4',
    title: 'body step',
    createdAt: new Date('2025-12-04T18:30:48.065Z'),
    exercisesData: JSON.parse('{"breaks": [], "exercises": [{"name": "Start", "endTime": 5, "startTime": 0}]}')
  },
  {
    id: 90,
    programId: 10,
    url: 'https://fitnesspractica.fra1.cdn.digitaloceanspaces.com/uploads/edited_1764873073985.mp4',
    title: 'body step ',
    createdAt: new Date('2025-12-04T18:31:33.563Z'),
    exercisesData: JSON.parse('{"breaks": [], "exercises": [{"name": "Start", "endTime": 5, "startTime": 0}]}')
  },
  {
    id: 91,
    programId: 10,
    url: 'https://fitnesspractica.fra1.cdn.digitaloceanspaces.com/uploads/edited_1764873228847.mp4',
    title: 'full body',
    createdAt: new Date('2025-12-04T18:37:42.158Z'),
    exercisesData: JSON.parse('{"breaks": [], "exercises": [{"name": "Start", "endTime": 5, "startTime": 0}]}')
  },
  {
    id: 92,
    programId: 10,
    url: 'https://fitnesspractica.fra1.cdn.digitaloceanspaces.com/uploads/edited_1764943763175.mp4',
    title: 'full body ',
    createdAt: new Date('2025-12-05T14:11:41.553Z'),
    exercisesData: JSON.parse('{"breaks": [], "exercises": [{"name": "Start", "endTime": 5, "startTime": 0}]}')
  },
];

async function main() {
  console.log('Seeding database with data from FINAL.sql...');

  // 1. Seed 'training_programs' table
  const upsertProgramData = {
    ...trainingProgramData,
    price: new prisma.Decimal(trainingProgramData.price),
  };
  
  await prisma.trainingProgram.upsert({
    where: { id: trainingProgramData.id },
    update: upsertProgramData,
    create: upsertProgramData,
  });
  console.log(`Upserted Training Program with ID ${trainingProgramData.id}`);

  // 2. Seed 'program_videos' table
  for (const video of programVideosData) {
    await prisma.programVideo.upsert({
      where: { id: video.id },
      update: {
        programId: video.programId,
        url: video.url,
        title: video.title,
        createdAt: video.createdAt,
        exercisesData: video.exercisesData,
      },
      create: {
        id: video.id,
        programId: video.programId,
        url: video.url,
        title: video.title,
        createdAt: video.createdAt,
        exercisesData: video.exercisesData,
      },
    });
    console.log(`Upserted Program Video with ID ${video.id}`);
  }

  // 3. Placeholder for other tables
  // Note: The SQL dump did not contain INSERT statements for the following tables.
  console.log('\n--- Other Tables (No Seed Data Provided in SQL) ---');
  console.log('Skipping seed for: users, plans, members, locations, payments, user_programs, video_progress.');
  console.log('If you wish to seed these tables, please provide their respective INSERT statements.');

  console.log('\nSeeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });