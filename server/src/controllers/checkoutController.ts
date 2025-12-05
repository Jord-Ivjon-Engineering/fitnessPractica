import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { polar } from '../lib/polar';

// Create Polar checkout session
export const createCheckout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      return next(error);
    }

    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      const error: ApiError = new Error('productIds array is required');
      error.statusCode = 400;
      return next(error);
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const error: ApiError = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    // Validate products exist and get their Polar Product IDs
    const programs = await prisma.trainingProgram.findMany({
      where: {
        polarProductId: { in: productIds },
      },
    });

    if (programs.length !== productIds.length) {
      const error: ApiError = new Error('One or more products not found');
      error.statusCode = 400;
      return next(error);
    }

    // Calculate total amount
    const totalAmount = programs.reduce((sum, program) => {
      return sum + (program.price ? Number(program.price) : 0);
    }, 0);

    // Create Polar checkout session
    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    
    const checkout = await polar.checkouts.create({
      products: productIds,
      customerEmail: user.email,
      externalCustomerId: userId.toString(),
      successUrl: `${frontendUrl}/checkout/success?checkout_id={CHECKOUT_ID}`,
      metadata: {
        userId: userId.toString(),
        source: 'fitness-practica',
      },
    });

    // Create payment record in database
    const payment = await prisma.payment.create({
      data: {
        userId: userId,
        amount: totalAmount,
        currency: programs[0]?.currency?.toUpperCase() || 'ALL',
        status: 'pending',
        programId: programs.length === 1 ? programs[0].id : null,
        polarCheckoutId: checkout.id,
      },
    });

    res.json({
      success: true,
      data: {
        url: checkout.url,
        checkoutId: checkout.id,
        paymentId: payment.id,
      },
    });
  } catch (error: any) {
    console.error('Checkout creation error:', error);
    const apiError: ApiError = new Error(error.message || 'Failed to create checkout');
    apiError.statusCode = 500;
    next(apiError);
  }
};

// Verify checkout status and grant access if completed
export const verifyCheckout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;

    if (!userId) {
      const error: ApiError = new Error('User not authenticated');
      error.statusCode = 401;
      return next(error);
    }

    const { checkoutId } = req.params;

    if (!checkoutId) {
      const error: ApiError = new Error('checkoutId is required');
      error.statusCode = 400;
      return next(error);
    }

    // Get checkout from Polar
    const checkout = await polar.checkouts.get({ id: checkoutId });

    // Find payment record
    const payment = await prisma.payment.findFirst({
      where: {
        polarCheckoutId: checkoutId,
        userId,
      },
    });

    if (!payment) {
      const error: ApiError = new Error('Payment not found');
      error.statusCode = 404;
      return next(error);
    }

    // If checkout is completed/paid and payment is still pending, grant access
    // Check status as string since TypeScript types may not match exactly
    const checkoutStatus = String(checkout.status).toLowerCase();
    if ((checkoutStatus === 'completed' || checkoutStatus === 'paid' || checkoutStatus === 'succeeded') && payment.status === 'pending') {
      // Get products from checkout - Polar checkout object should have products array
      const checkoutAny = checkout as any;
      const products = checkoutAny.products || checkoutAny.product_ids || [];
      
      let orderId = null;
      let customerId = null;
      
      // Try to get order if available
      try {
        if (checkoutAny.order_id) {
          orderId = checkoutAny.order_id;
          // Try to get order details (may not be available immediately)
          try {
            const order = await (polar as any).orders?.get?.({ id: checkoutAny.order_id });
            if (order) {
              customerId = order.customer?.id || null;
              // Use products from order if available (more reliable)
              if (order.products && order.products.length > 0) {
                products.length = 0; // Clear and use order products
                products.push(...order.products.map((p: any) => p.product_id || p.id));
              }
            }
          } catch (err) {
            // Order not available yet, use checkout products
            console.log('Order not available yet, using checkout products');
          }
        }
      } catch (error) {
        console.log('Error fetching order:', error);
      }
      
      // Grant access to all products
      if (products.length > 0) {
        for (const productItem of products) {
          // Handle both string product IDs and product objects
          const productId = typeof productItem === 'string' 
            ? productItem 
            : (productItem.product_id || productItem.id);
          
          if (!productId) continue;
          
          // Find program by Polar Product ID
          const program = await prisma.trainingProgram.findUnique({
            where: {
              polarProductId: productId,
            },
          });

          if (program) {
            // Find or create UserProgram
            const existingUserProgram = await prisma.userProgram.findFirst({
              where: {
                userId: userId,
                programId: program.id,
              },
            });

            if (!existingUserProgram) {
              // Create new UserProgram
              await prisma.userProgram.create({
                data: {
                  userId: userId,
                  programId: program.id,
                  status: 'active',
                  paymentId: payment.id,
                },
              });
              console.log(`Granted access to program ${program.id} for user ${userId}`);
            } else {
              // Update existing UserProgram
              await prisma.userProgram.update({
                where: {
                  id: existingUserProgram.id,
                },
                data: {
                  status: 'active',
                  paymentId: payment.id,
                },
              });
            }
          } else {
            console.warn(`Program not found for Polar Product ID: ${productId}`);
          }
        }

        // Update payment record
        await prisma.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: 'completed',
            polarOrderId: orderId,
            polarCustomerId: customerId || checkoutAny.customer?.id || null,
          },
        });
      } else {
        // No products found, just update payment status
        // Access will be granted on next verification when products are available
        await prisma.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: (checkoutStatus === 'completed' || checkoutStatus === 'paid' || checkoutStatus === 'succeeded') ? 'completed' : 'pending',
          },
        });
      }
    }

    // Reload payment with updated status
    const updatedPayment = await prisma.payment.findUnique({
      where: { id: payment.id },
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

    res.json({
      success: true,
      data: {
        checkout: {
          id: checkout.id,
          status: checkout.status,
          customerEmail: checkout.customerEmail,
          customerName: checkout.customerName,
        },
        payment: {
          id: updatedPayment!.id,
          status: updatedPayment!.status,
          amount: updatedPayment!.amount,
          currency: updatedPayment!.currency,
          program: updatedPayment!.program,
        },
      },
    });
  } catch (error: any) {
    console.error('Checkout verification error:', error);
    const apiError: ApiError = new Error(error.message || 'Failed to verify checkout');
    apiError.statusCode = 500;
    next(apiError);
  }
};

