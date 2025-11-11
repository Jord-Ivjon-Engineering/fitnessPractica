import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover' as const,
});

// Create Stripe checkout session
export const createCheckoutSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      return next(error);
    }

    const { programIds } = req.body;

    if (!programIds || !Array.isArray(programIds) || programIds.length === 0) {
      const error: ApiError = new Error('programIds array is required');
      error.statusCode = 400;
      return next(error);
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      const error: ApiError = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    // Convert programIds to numbers and filter out invalid values
    const numericProgramIds = programIds
      .map((id: string | number) => parseInt(String(id)))
      .filter((id: number) => !isNaN(id) && id > 0);

    if (numericProgramIds.length === 0) {
      const error: ApiError = new Error('Invalid program IDs provided');
      error.statusCode = 400;
      return next(error);
    }

    // Fetch programs from database
    const programs = await prisma.trainingProgram.findMany({
      where: {
        id: { in: numericProgramIds },
      },
    });

    if (programs.length !== numericProgramIds.length) {
      const foundIds = programs.map(p => p.id);
      const missingIds = numericProgramIds.filter(id => !foundIds.includes(id));
      console.error('Program lookup failed:', {
        requested: numericProgramIds,
        found: foundIds,
        missing: missingIds,
      });
      const error: ApiError = new Error(
        `One or more programs not found. Requested IDs: ${numericProgramIds.join(', ')}, Found: ${foundIds.join(', ')}, Missing: ${missingIds.join(', ')}`
      );
      error.statusCode = 404;
      return next(error);
    }

    // Calculate total amount
    let totalAmount = 0;
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const program of programs) {
      if (!program.price) {
        const error: ApiError = new Error(`Program ${program.name} does not have a price`);
        error.statusCode = 400;
        return next(error);
      }

      const priceInCents = Math.round(Number(program.price) * 100);
      totalAmount += priceInCents;

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: program.name,
            description: program.category,
            images: program.imageUrl ? [program.imageUrl] : undefined,
          },
          unit_amount: priceInCents,
        },
        quantity: 1,
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout?canceled=true`,
      customer_email: user.email,
      metadata: {
        userId: userId.toString(),
        programIds: JSON.stringify(programIds),
      },
    });

    // Save payment record in database
    const payment = await prisma.payment.create({
      data: {
        userId,
        stripeSessionId: session.id,
        amount: totalAmount / 100,
        currency: 'usd',
        status: 'pending',
        programId: programs.length === 1 ? programs[0].id : null,
      },
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
        paymentId: payment.id,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Handle Stripe webhook
export const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    const error: ApiError = new Error('Missing stripe-signature header');
    error.statusCode = 400;
    return next(error);
  }

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    const error: ApiError = new Error(`Webhook Error: ${err.message}`);
    error.statusCode = 400;
    return next(error);
  }

  try {
    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Find payment record
      const payment = await prisma.payment.findUnique({
        where: { stripeSessionId: session.id },
      });

      if (!payment) {
        console.error('Payment record not found for session:', session.id);
        return res.status(404).json({ error: 'Payment not found' });
      }

      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'completed',
          stripePaymentId: session.payment_intent as string,
        },
      });

      // Parse program IDs from metadata
      const programIds = JSON.parse(session.metadata?.programIds || '[]');
      const userId = parseInt(session.metadata?.userId || '0');

      // Create UserProgram records for each purchased program
      for (const programIdStr of programIds) {
        const programId = parseInt(programIdStr);

        // Check if user already has this program
        const existing = await prisma.userProgram.findFirst({
          where: {
            userId,
            programId,
            status: 'active',
          },
        });

        if (!existing) {
          await prisma.userProgram.create({
            data: {
              userId,
              programId,
              status: 'active',
              paymentId: payment.id,
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
            },
          });
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    next(error);
  }
};

// Get payment status
export const getPaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      return next(error);
    }

    const { sessionId } = req.params;

    if (!sessionId) {
      const error: ApiError = new Error('sessionId is required');
      error.statusCode = 400;
      return next(error);
    }

    // Find payment record
    const payment = await prisma.payment.findFirst({
      where: {
        stripeSessionId: sessionId,
        userId,
      },
      include: {
        program: {
          select: {
            id: true,
            name: true,
            category: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!payment) {
      const error: ApiError = new Error('Payment not found');
      error.statusCode = 404;
      return next(error);
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

