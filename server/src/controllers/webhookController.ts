import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';

export const handlePolarWebhook = async (req: Request, res: Response, next: NextFunction) => {
  // Body will be a Buffer from express.raw()
  const body = req.body instanceof Buffer ? req.body.toString('utf8') : 
                typeof req.body === 'string' ? req.body : 
                JSON.stringify(req.body);
  
  const headers = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v || '']));

  try {
    // Validate webhook signature
    if (!process.env.POLAR_WEBHOOK_SECRET) {
      console.error('POLAR_WEBHOOK_SECRET not configured');
      const error: ApiError = new Error('Webhook secret not configured');
      error.statusCode = 500;
      return next(error);
    }

    const event = validateEvent(
      body,
      headers,
      process.env.POLAR_WEBHOOK_SECRET
    );

    console.log('Webhook received:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.created':
        await handleCheckoutCreated(event.data);
        break;

      case 'checkout.updated':
        await handleCheckoutUpdated(event.data);
        break;

      case 'order.created':
        await handleOrderCreated(event.data);
        break;

      case 'subscription.created':
        await handleSubscriptionCreated(event.data);
        break;

      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data);
        break;

      case 'subscription.canceled':
        await handleSubscriptionCanceled(event.data);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return res.status(202).json({ received: true });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      console.error('Invalid webhook signature');
      const apiError: ApiError = new Error('Invalid signature');
      apiError.statusCode = 403;
      return next(apiError);
    }

    console.error('Webhook processing error:', error);
    const apiError: ApiError = new Error('Webhook processing failed');
    apiError.statusCode = 500;
    return next(apiError);
  }
};

async function handleCheckoutCreated(data: any) {
  console.log('Checkout created:', data.id);
  // Optional: Log checkout creation
}

async function handleCheckoutUpdated(data: any) {
  console.log('Checkout updated:', data.id, data.status);
  
  // Update payment status based on checkout status
  if (data.status === 'completed' || data.status === 'paid') {
    await prisma.payment.updateMany({
      where: {
        polarCheckoutId: data.id,
      },
      data: {
        status: 'completed',
      },
    });
  }
}

async function handleOrderCreated(data: any) {
  console.log('Order created:', data.id);

  const userId = data.customer?.external_id;
  if (!userId) {
    console.error('No external_id in customer data');
    return;
  }

  const userIdNumber = parseInt(userId, 10);
  if (isNaN(userIdNumber)) {
    console.error('Invalid user ID:', userId);
    return;
  }

  // Grant access to purchased programs
  for (const product of data.products || []) {
    // Find program by Polar Product ID
    const program = await prisma.trainingProgram.findUnique({
      where: {
        polarProductId: product.product_id,
      },
    });

    if (!program) {
      console.error(`Program not found for Polar Product ID: ${product.product_id}`);
      continue;
    }

    // Update payment record
    const payment = await prisma.payment.updateMany({
      where: {
        polarCheckoutId: data.checkout_id,
        userId: userIdNumber,
      },
      data: {
        polarOrderId: data.id,
        polarCustomerId: data.customer?.id,
        status: 'completed',
      },
    });

    // Find or create UserProgram
    const paymentRecord = await prisma.payment.findFirst({
      where: {
        polarOrderId: data.id,
        userId: userIdNumber,
      },
    });

    const existingUserProgram = await prisma.userProgram.findFirst({
      where: {
        userId: userIdNumber,
        programId: program.id,
      },
    });

    if (existingUserProgram) {
      // Update existing UserProgram
      await prisma.userProgram.update({
        where: {
          id: existingUserProgram.id,
        },
        data: {
          status: 'active',
          paymentId: paymentRecord?.id || undefined,
        },
      });
    } else {
      // Create new UserProgram
      await prisma.userProgram.create({
        data: {
          userId: userIdNumber,
          programId: program.id,
          status: 'active',
          paymentId: paymentRecord?.id || undefined,
        },
      });
    }
  }

  console.log(`Granted access to user ${userIdNumber}`);
}

async function handleSubscriptionCreated(data: any) {
  console.log('Subscription created:', data.id);

  const userId = data.customer?.external_id;
  if (!userId) {
    console.error('No external_id in customer data');
    return;
  }

  const userIdNumber = parseInt(userId, 10);
  if (isNaN(userIdNumber)) {
    console.error('Invalid user ID:', userId);
    return;
  }

  const productId = data.product?.id;
  if (!productId) {
    console.error('No product ID in subscription data');
    return;
  }

  // Find program by Polar Product ID
  const program = await prisma.trainingProgram.findUnique({
    where: {
      polarProductId: productId,
    },
  });

  if (!program) {
    console.error(`Program not found for Polar Product ID: ${productId}`);
    return;
  }

  // Find or create UserProgram
  const existingUserProgram = await prisma.userProgram.findFirst({
    where: {
      userId: userIdNumber,
      programId: program.id,
    },
  });

  if (existingUserProgram) {
    // Update existing UserProgram
    await prisma.userProgram.update({
      where: {
        id: existingUserProgram.id,
      },
      data: {
        status: 'active',
      },
    });
  } else {
    // Create new UserProgram
    await prisma.userProgram.create({
      data: {
        userId: userIdNumber,
        programId: program.id,
        status: 'active',
      },
    });
  }
}

async function handleSubscriptionUpdated(data: any) {
  console.log('Subscription updated:', data.id, data.status);

  const userId = data.customer?.external_id;
  if (!userId) {
    return;
  }

  const userIdNumber = parseInt(userId, 10);
  if (isNaN(userIdNumber)) {
    return;
  }

  const productId = data.product?.id;
  if (!productId) {
    return;
  }

  const program = await prisma.trainingProgram.findUnique({
    where: {
      polarProductId: productId,
    },
  });

  if (!program) {
    return;
  }

  await prisma.userProgram.updateMany({
    where: {
      userId: userIdNumber,
      programId: program.id,
    },
    data: {
      status: data.status === 'active' ? 'active' : 'inactive',
    },
  });
}

async function handleSubscriptionCanceled(data: any) {
  console.log('Subscription canceled:', data.id);

  const userId = data.customer?.external_id;
  if (!userId) {
    return;
  }

  const userIdNumber = parseInt(userId, 10);
  if (isNaN(userIdNumber)) {
    return;
  }

  const productId = data.product?.id;
  if (!productId) {
    return;
  }

  const program = await prisma.trainingProgram.findUnique({
    where: {
      polarProductId: productId,
    },
  });

  if (!program) {
    return;
  }

  await prisma.userProgram.updateMany({
    where: {
      userId: userIdNumber,
      programId: program.id,
    },
    data: {
      status: 'canceled',
    },
  });
}

