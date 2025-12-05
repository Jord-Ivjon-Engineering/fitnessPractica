# Polar.sh Checkout Integration Setup Guide

This guide outlines the steps needed to complete the Polar.sh checkout integration outside of the code.

## ✅ Code Implementation Complete

The following has been implemented:
- ✅ Prisma schema updated with Polar fields (`polarProductId`, `polarOrderId`, `polarCustomerId`)
- ✅ Polar client library (`server/src/lib/polar.ts`)
- ✅ Checkout API endpoint (`/api/checkout`)
- ✅ Checkout verification endpoint (`/api/checkout/verify/:checkoutId`) - Grants access without webhooks
- ✅ Frontend checkout flow (`src/pages/Checkout.tsx`)
- ✅ Success page (`src/pages/CheckoutSuccess.tsx`) - Polls and verifies payment
- ✅ API service integration

**Note:** This implementation does NOT use webhooks. Access is granted when the user is redirected to the success page and the checkout is verified.

## 📋 Steps Required Outside Code

### 1. Polar.sh Dashboard Setup

#### A. Create Account
1. Go to [polar.sh](https://polar.sh) and create an account
2. Complete organization setup

#### B. Create Products
1. Navigate to **Products** in the Polar dashboard
2. For each training program in your database:
   - Click **Create Product**
   - Enter product name (match your program name)
   - Set price (in cents, e.g., $49.00 = 4900)
   - Configure product details
   - **Copy the Product ID** (format: `prod_xxxxx`)
3. Update your database with Polar Product IDs:
   ```sql
   UPDATE training_programs 
   SET polar_product_id = 'prod_xxxxx' 
   WHERE id = <program_id>;
   ```
   Or use Prisma Studio:
   ```bash
   cd server
   npm run prisma:studio
   ```

#### C. Generate Access Token
1. Go to **Settings → Tokens**
2. Click **Create Token**
3. Copy the access token (format: `polar_at_xxxxx`)
4. Add to your `.env` file:
   ```env
   POLAR_ACCESS_TOKEN=polar_at_xxxxx
   ```

#### D. Webhook Configuration (Optional - Not Required)
**Note:** This implementation does NOT require webhooks. Access is granted when the checkout is verified on the success page.

If you want to use webhooks in the future:
1. Go to **Settings → Webhooks**
2. Click **Create Webhook**
3. Set webhook URL:
   - **Development**: `http://localhost:3001/api/webhooks/polar` (use ngrok)
   - **Production**: `https://yourdomain.com/api/webhooks/polar`
4. Select events to listen for
5. Copy the webhook secret and add to `.env`:
   ```env
   POLAR_WEBHOOK_SECRET=whsec_xxxxx
   ```
6. Uncomment webhook routes in `server/src/index.ts`

### 2. Environment Variables Setup

Update your `server/.env` file with the following:

```env
# Polar.sh Configuration
POLAR_ACCESS_TOKEN=polar_at_xxxxxxxxxxxxx
# POLAR_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # Optional - not needed if not using webhooks

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:5173
# Or in production:
# FRONTEND_URL=https://yourdomain.com
```

### 3. Database Migration

Run Prisma migration to add Polar fields:

```bash
cd server
npm run prisma:generate
npm run prisma:migrate dev --name add_polar_fields
```

Or if using `prisma db push`:

```bash
cd server
npm run prisma:generate
npm run prisma:push
```

### 4. Update Training Programs with Polar Product IDs

You need to link each training program in your database to a Polar product:

**Option A: Using Prisma Studio (Recommended)**
```bash
cd server
npm run prisma:studio
```
Then manually update each program's `polarProductId` field.

**Option B: Using SQL**
```sql
UPDATE training_programs 
SET polar_product_id = 'prod_xxxxx' 
WHERE id = <program_id>;
```

**Option C: Create a migration script**
Create `server/scripts/update-polar-ids.ts`:
```typescript
import prisma from '../src/config/database';

const programMappings = [
  { programId: 1, polarProductId: 'prod_xxxxx' },
  { programId: 2, polarProductId: 'prod_yyyyy' },
  // Add more mappings
];

async function updatePolarIds() {
  for (const mapping of programMappings) {
    await prisma.trainingProgram.update({
      where: { id: mapping.programId },
      data: { polarProductId: mapping.polarProductId },
    });
    console.log(`Updated program ${mapping.programId}`);
  }
}

updatePolarIds()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### 5. Testing the Integration

#### A. Test Checkout Flow
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
   - Add programs to cart
   - Go to checkout page
   - Click "Proceed to Checkout"
   - You should be redirected to Polar checkout page
   - Use test card: `4242 4242 4242 4242`
   - Complete payment
   - Should redirect to `/checkout/success`

#### B. Verify Payment Processing
1. After completing payment, check the success page
2. The page will automatically verify the checkout and grant access
3. Verify `UserProgram` records are created in database
4. Verify `Payment` records are updated with Polar IDs
5. Check that user can access purchased programs in their profile

### 6. Production Deployment

#### A. Update Environment Variables
- Set `POLAR_ACCESS_TOKEN` to production token
- Set `FRONTEND_URL` to your production domain
- Webhook secret not needed if not using webhooks

#### B. Test Production Flow
1. Test with real payment (small amount)
2. Verify webhook receives events
3. Verify database updates correctly
4. Verify user access is granted

### 7. Monitoring & Maintenance

#### A. Monitor Checkout Flow
- Monitor server logs for checkout verification
- Check that users are granted access after payment
- Monitor for any verification failures

#### B. Handle Edge Cases
- Failed payments: Users should see error message
- Partial payments: Handle multiple products in one checkout
- Refunds: Implement refund handling if needed
- Subscription cancellations: Already handled in webhook

### 8. Troubleshooting

#### Issue: Checkout fails with "Invalid products"
**Solution**: Ensure all programs have `polarProductId` set in database

#### Issue: UserProgram not created after payment
**Solution**:
- Check checkout verification logs
- Verify the success page is calling the verify endpoint
- Check that checkout status is "completed" or "paid"
- Verify `external_customer_id` matches user ID format
- Check that program exists with matching `polarProductId`
- Try refreshing the success page (it will retry verification)

#### Issue: Redirect URL incorrect
**Solution**: 
- Verify `FRONTEND_URL` environment variable
- Check success URL in checkout creation

## 📝 Important Notes

1. **Never expose `POLAR_ACCESS_TOKEN` to frontend** - Keep it server-side only
2. **No webhooks required** - Access is granted when checkout is verified on success page
3. **Store `external_customer_id` as user ID** - Links Polar customers to your users
4. **Test thoroughly** - Use Polar test mode before going live
5. **Success page polls for completion** - Automatically retries if payment is still processing
6. **Handle errors gracefully** - Show user-friendly error messages
7. **Verification happens on success page** - User must complete redirect for access to be granted

## 🔗 Useful Links

- [Polar.sh Documentation](https://polar.sh/docs)
- [Polar.sh Dashboard](https://polar.sh)
- [Polar.sh API Reference](https://api.polar.sh/docs)

## ✅ Checklist

- [ ] Created Polar.sh account
- [ ] Created products in Polar dashboard
- [ ] Copied Product IDs
- [ ] Generated Access Token
- [ ] Updated `.env` file with access token
- [ ] Ran database migration
- [ ] Updated programs with Polar Product IDs
- [ ] Tested checkout flow locally
- [ ] Verified access is granted after payment
- [ ] Deployed to production
- [ ] Tested production flow
- [ ] Set up monitoring/alerts

---

**Need Help?**
- Check Polar.sh documentation
- Review server logs for errors
- Verify environment variables are set correctly
- Ensure database schema is up to date

