# Fitness Practica Backend API

Backend API server for Fitness Practica built with Node.js, Express, TypeScript, Prisma, and MySQL.

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Set Up MySQL Database

1. Create a MySQL database:
```sql
CREATE DATABASE fitness_practica;
```

2. Update the `.env` file with your MySQL credentials:
```env
DATABASE_URL="mysql://username:password@localhost:3306/fitness_practica?schema=public"
```

If you don't have a `.env` file, copy `env.example.txt` to `.env` and update it.

### 3. Initialize Prisma

```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema to database (creates tables)
npm run prisma:push
```

Alternatively, you can use migrations:
```bash
npm run prisma:migrate
```

### 4. Start the Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

The server will run on `http://localhost:3001`

## API Endpoints

### Health Check
- `GET /api/health` - Check if API is running

### Plans
- `GET /api/plans` - Get all plans
- `GET /api/plans/:id` - Get plan by ID
- `POST /api/plans` - Create new plan
- `PUT /api/plans/:id` - Update plan
- `DELETE /api/plans/:id` - Delete plan

### Members
- `GET /api/members` - Get all members
- `GET /api/members/:id` - Get member by ID
- `POST /api/members` - Create new member
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member

### Locations
- `GET /api/locations` - Get all locations
- `GET /api/locations/:id` - Get location by ID
- `POST /api/locations` - Create new location
- `PUT /api/locations/:id` - Update location
- `DELETE /api/locations/:id` - Delete location

## Prisma Studio

To view and manage your database data visually:

```bash
npm run prisma:studio
```

This opens Prisma Studio at `http://localhost:5555`

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   └── database.ts       # Prisma client configuration
│   ├── controllers/
│   │   ├── planController.ts
│   │   ├── memberController.ts
│   │   └── locationController.ts
│   ├── middleware/
│   │   └── errorHandler.ts   # Error handling middleware
│   ├── routes/
│   │   ├── plans.ts
│   │   ├── members.ts
│   │   └── locations.ts
│   └── index.ts              # Main server file
├── prisma/
│   └── schema.prisma         # Database schema
├── package.json
└── tsconfig.json
```

## Environment Variables

- `DATABASE_URL` - MySQL connection string
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - Secret key for JWT tokens (for future auth)
- `CORS_ORIGIN` - Allowed CORS origin (default: http://localhost:5173)

