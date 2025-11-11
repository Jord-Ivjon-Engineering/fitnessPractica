# How to Get a Domain for Your Fitness App

## For Local Development (No Domain Needed!)

You don't need a domain for local development. Use **Stripe CLI** to forward webhooks to your local server:

### Setup Stripe CLI for Local Development

1. **Install Stripe CLI**:
   - Windows: Download from https://github.com/stripe/stripe-cli/releases
   - Or use package manager: `winget install stripe.stripe-cli`
   - Mac: `brew install stripe/stripe-cli/stripe`
   - Linux: See https://stripe.com/docs/stripe-cli

2. **Login to Stripe**:
   ```bash
   stripe login
   ```
   This will open your browser to authenticate.

3. **Forward Webhooks to Your Local Server**:
   ```bash
   stripe listen --forward-to localhost:3001/api/payment/webhook
   ```

4. **Copy the Webhook Secret**:
   The CLI will output something like:
   ```
   > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
   ```
   Copy this and add it to your `server/.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

5. **Keep the CLI Running**:
   Leave this terminal window open while developing. It will forward all webhook events to your local server.

**That's it!** No domain needed for local development.

---

## For Production (When You Deploy)

When you're ready to deploy your app to production, you'll need a real domain. Here are your options:

### Option 1: Free Domain Services

1. **Freenom** (https://www.freenom.com)
   - Free `.tk`, `.ml`, `.ga`, `.cf` domains
   - Good for testing, but not recommended for production

2. **GitHub Pages** (if using static frontend)
   - Free subdomain: `yourusername.github.io`
   - Only works for static sites

### Option 2: Free Hosting with Subdomains

1. **Vercel** (https://vercel.com) - **Recommended for React apps**
   - Free hosting with custom domain support
   - Automatic HTTPS
   - Free subdomain: `your-app.vercel.app`
   - Can connect your own domain later

2. **Netlify** (https://netlify.com)
   - Free hosting with custom domain
   - Free subdomain: `your-app.netlify.app`

3. **Railway** (https://railway.app) - **Good for full-stack apps**
   - Free tier available
   - Provides subdomain: `your-app.railway.app`

4. **Render** (https://render.com)
   - Free tier for backend
   - Provides subdomain: `your-app.onrender.com`

### Option 3: Buy a Domain

1. **Popular Domain Registrars**:
   - **Namecheap** (https://www.namecheap.com) - ~$10-15/year
   - **Google Domains** (https://domains.google) - ~$12/year
   - **Cloudflare** (https://www.cloudflare.com/products/registrar) - At-cost pricing
   - **GoDaddy** (https://www.godaddy.com) - Often has deals

2. **Steps to Buy**:
   - Search for your desired domain name
   - Add to cart and checkout
   - Complete purchase
   - Domain will be yours for 1 year (renewable)

### Option 4: Use a Subdomain from Your Hosting Provider

Most hosting providers give you a free subdomain:
- Vercel: `your-app.vercel.app`
- Netlify: `your-app.netlify.app`
- Railway: `your-app.railway.app`

You can use these subdomains directly with Stripe webhooks!

---

## Setting Up Stripe Webhook for Production

Once you have your domain/subdomain:

1. **Deploy Your Backend**:
   - Make sure your backend is accessible at: `https://your-domain.com`
   - Your webhook endpoint will be: `https://your-domain.com/api/payment/webhook`

2. **Configure Stripe Webhook**:
   - Go to https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - Enter your webhook URL: `https://your-domain.com/api/payment/webhook`
   - Select events: `checkout.session.completed`
   - Click "Add endpoint"

3. **Get Webhook Secret**:
   - After creating the endpoint, click on it
   - Find "Signing secret" and click "Reveal"
   - Copy the secret (starts with `whsec_`)
   - Add to your production `.env`:
     ```env
     STRIPE_WEBHOOK_SECRET=whsec_your_production_secret
     ```

4. **Update Environment Variables**:
   ```env
   FRONTEND_URL=https://your-frontend-domain.com
   STRIPE_SECRET_KEY=sk_live_your_live_key  # Use live key in production!
   STRIPE_WEBHOOK_SECRET=whsec_your_production_secret
   ```

---

## Quick Start: Deploy to Vercel (Easiest Option)

### Frontend (React App):

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```
   Follow the prompts. Your app will be live at `your-app.vercel.app`

### Backend (Node.js/Express):

1. **Create `vercel.json`** in your `server` folder:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "src/index.ts",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "src/index.ts"
       }
     ]
   }
   ```

2. **Deploy**:
   ```bash
   cd server
   vercel
   ```

3. **Set Environment Variables**:
   - Go to Vercel dashboard → Your project → Settings → Environment Variables
   - Add all your `.env` variables

4. **Get Your Backend URL**:
   - Vercel will give you a URL like: `your-backend.vercel.app`
   - Use this for your webhook: `https://your-backend.vercel.app/api/payment/webhook`

---

## Testing Your Webhook

### Local Testing:
```bash
# Terminal 1: Start your backend
cd server
npm run dev

# Terminal 2: Forward Stripe webhooks
stripe listen --forward-to localhost:3001/api/payment/webhook

# Terminal 3: Test a webhook event
stripe trigger checkout.session.completed
```

### Production Testing:
1. Make a test purchase on your live site
2. Check Stripe Dashboard → Webhooks → Your endpoint → Events
3. You should see the `checkout.session.completed` event

---

## Summary

- **Local Development**: Use Stripe CLI - no domain needed ✅
- **Production Testing**: Use free subdomain from Vercel/Netlify/Railway
- **Production**: Buy a domain ($10-15/year) or use hosting provider's subdomain
- **Easiest Path**: Deploy to Vercel (free), use their subdomain, configure Stripe webhook

Need help with a specific hosting provider? Let me know!

