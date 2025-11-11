# Stripe Payment Integration Setup Guide

This guide will help you set up Stripe payments for your fitness app.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Your backend and frontend servers running

## Step 1: Database Migration

First, update your database schema to include the new Payment model and price field:

```bash
cd server
npm run prisma:generate
npm run prisma:push
```

Or if you prefer migrations:

```bash
npm run prisma:migrate
```

## Step 2: Get Stripe API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Secret key** (starts with `sk_test_` for test mode or `sk_live_` for production)
3. Add it to your `server/.env` file as `STRIPE_SECRET_KEY`

## Step 3: Configure Environment Variables

Update your `server/.env` file with the following:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
FRONTEND_URL=http://localhost:5173
```

## Step 4: Set Up Stripe Webhook (For Production)

For local development, you can use Stripe CLI to forward webhooks:

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3001/api/payment/webhook`
4. Copy the webhook signing secret (starts with `whsec_`) and add it to your `.env` file

For production:
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Set the URL to: `https://your-domain.com/api/payment/webhook`
4. Select the event: `checkout.session.completed`
5. Copy the webhook signing secret and add it to your production `.env`

## Step 5: Add Training Programs to Database

You need to add the training programs to your database with prices. You can do this via:

1. **Prisma Studio** (recommended for testing):
   ```bash
   cd server
   npm run prisma:studio
   ```
   Then manually add programs with their prices.

2. **SQL directly**:
   ```sql
   INSERT INTO training_programs (name, category, description, image_url, price, created_at, updated_at)
   VALUES 
   ('Fat Burn Program', 'Weight Loss', 'Intensive weight loss program', NULL, 49.99, NOW(), NOW()),
   ('Strength Builder', 'Muscle Growth', 'Build muscle and strength', NULL, 59.99, NOW(), NOW()),
   ('Cardio Blast', 'Endurance', 'High-intensity cardio training', NULL, 44.99, NOW(), NOW()),
   ('Yoga & Stretch', 'Flexibility', 'Improve flexibility and relaxation', NULL, 39.99, NOW(), NOW()),
   ('Functional Fitness', 'Athletic Performance', 'Athletic performance training', NULL, 54.99, NOW(), NOW());
   ```

3. **API endpoint** (if you create one):
   You can create a POST endpoint to add programs programmatically.

## Step 6: Update Program IDs in Frontend

The frontend currently uses hardcoded program IDs (1-5). Make sure these match your database:

1. Check your database program IDs
2. Update `src/pages/Index.tsx` with the correct IDs:
   ```typescript
   { image: planWeightLoss, name: "Fat Burn Program", category: "Weight Loss", programId: 1, price: 49.99 },
   // ... update programId to match your database
   ```

## Step 7: Test the Integration

1. Start your backend server:
   ```bash
   cd server
   npm run dev
   ```

2. Start your frontend:
   ```bash
   npm run dev
   ```

3. Test the flow:
   - Log in to your app
   - Add a program to cart
   - Go to checkout
   - Click "Proceed to Payment"
   - Use Stripe test card: `4242 4242 4242 4242`
   - Use any future expiry date, any CVC, and any ZIP code
   - Complete the payment
   - You should be redirected back and see the program in your profile

## How It Works

1. **User adds program to cart**: Program ID and price are stored in cart context
2. **User clicks "Proceed to Payment"**: Frontend calls `/api/payment/create-checkout-session` with program IDs
3. **Backend creates Stripe session**: 
   - Fetches programs from database
   - Creates Stripe checkout session
   - Saves payment record with "pending" status
   - Returns checkout URL
4. **User completes payment on Stripe**: Stripe redirects back to your app
5. **Stripe sends webhook**: Backend receives `checkout.session.completed` event
6. **Backend processes webhook**:
   - Updates payment status to "completed"
   - Creates UserProgram records for purchased programs
7. **User sees success**: Frontend verifies payment and redirects to profile

## Troubleshooting

### Payment not completing
- Check that webhook is properly configured
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check server logs for webhook errors
- Use Stripe Dashboard to see webhook events

### Programs not appearing in profile
- Check that UserProgram records were created in database
- Verify webhook was received and processed
- Check payment status in database

### Checkout session not creating
- Verify `STRIPE_SECRET_KEY` is correct
- Check that programs exist in database with prices
- Verify user is authenticated

## Security Notes

- Never commit `.env` files with real API keys
- Use test keys for development
- Switch to live keys only in production
- Always verify webhook signatures
- Use HTTPS in production

## Next Steps

- Add program management UI for admins
- Implement program expiration logic
- Add email notifications for purchases
- Add refund functionality
- Implement subscription-based programs

