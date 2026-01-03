import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { polar, getPolarEnvironment } from '../lib/polar';
import { getFrontendUrl } from '../utils/url';

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

    const { productIds, cartItems } = req.body;

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
    // Some products (like live streams) may have direct polarProductId without being in database
    const programs = await prisma.trainingProgram.findMany({
      where: {
        polarProductId: { in: productIds },
      },
    });

    // Calculate total amount from programs found in database
    // For products not in database (like live streams), Polar will handle validation and pricing
    let totalAmount = programs.reduce((sum, program) => {
      return sum + (program.price ? Number(program.price) : 0);
    }, 0);

    // Note: If productIds.length > programs.length, some products are direct Polar products
    // (not in database). Polar will handle validation and pricing for those.

    // Create Polar checkout session
    // Get frontend URL from request origin to handle both www and non-www versions
    const frontendUrl = getFrontendUrl(req);
    
    let checkout;
    try {
      checkout = await polar.checkouts.create({
        products: productIds,
        customerEmail: user.email,
        externalCustomerId: userId.toString(),
        successUrl: `${frontendUrl}/checkout/success?checkout_id={CHECKOUT_ID}`,
        metadata: {
          userId: userId.toString(),
          source: 'fitness-practica',
        },
      });
    } catch (polarError: any) {
      // Handle Polar API 401 errors (invalid/expired token)
      if (polarError.statusCode === 401 || polarError.status === 401) {
        const errorBody = typeof polarError.body === 'string' 
          ? JSON.parse(polarError.body) 
          : polarError.body;
        
        const errorMessage = errorBody?.error_description || errorBody?.error || 'Invalid or expired access token';
        
        console.error('❌ Polar API Authentication Error:', {
          status: 401,
          error: errorBody?.error || 'invalid_token',
          description: errorMessage,
          message: 'POLAR_ACCESS_TOKEN is invalid, expired, or revoked. Please generate a new token from https://polar.sh/settings/tokens and update the POLAR_ACCESS_TOKEN environment variable.'
        });
        
        const error: ApiError = new Error(
          'Polar API authentication failed. The access token is invalid, expired, or revoked. ' +
          'Please contact the administrator to update the POLAR_ACCESS_TOKEN in the server configuration.'
        );
        error.statusCode = 503; // Service Unavailable - indicates server configuration issue
        return next(error);
      }
      
      // Handle Polar API errors specifically
      if (polarError.statusCode === 422 || polarError.body) {
        const errorBody = typeof polarError.body === 'string' 
          ? JSON.parse(polarError.body) 
          : polarError.body;
        
        if (errorBody?.detail && Array.isArray(errorBody.detail)) {
          const productErrors = errorBody.detail.filter((d: any) => 
            d.loc && d.loc.includes('products') && d.msg && d.msg.includes('does not exist')
          );
          
          if (productErrors.length > 0) {
            const missingProducts = productErrors.map((e: any) => e.input).join(', ');
            const programNames = programs
              .filter((p: any) => productIds.includes(p.polarProductId || ''))
              .map((p: any) => p.name)
              .join(', ');
            
            const error: ApiError = new Error(
              `Product(s) do not exist in Polar: ${missingProducts}. ` +
              `Affected programs: ${programNames}. ` +
              `Please verify the Polar Product IDs in your database match products in your Polar dashboard.`
            );
            error.statusCode = 400;
            return next(error);
          }
        }
      }
      
      // Re-throw to be caught by outer catch
      throw polarError;
    }

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
    apiError.statusCode = error.statusCode || 500;
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
    const { cartItems } = req.body || {}; // Get cart items from request body (for live streams with months)

    if (!checkoutId) {
      const error: ApiError = new Error('checkoutId is required');
      error.statusCode = 400;
      return next(error);
    }

    // Get checkout from Polar
    let checkout;
    try {
      checkout = await polar.checkouts.get({ id: checkoutId });
    } catch (polarError: any) {
      // Handle Polar API 401 errors (invalid/expired token)
      if (polarError.statusCode === 401 || polarError.status === 401) {
        const errorBody = typeof polarError.body === 'string' 
          ? JSON.parse(polarError.body) 
          : polarError.body;
        
        console.error('❌ Polar API Authentication Error:', {
          status: 401,
          error: errorBody?.error || 'invalid_token',
          description: errorBody?.error_description || 'Invalid or expired access token',
          message: 'POLAR_ACCESS_TOKEN is invalid, expired, or revoked. Please generate a new token from https://polar.sh/settings/tokens and update the POLAR_ACCESS_TOKEN environment variable.'
        });
        
        const error: ApiError = new Error(
          'Polar API authentication failed. The access token is invalid, expired, or revoked. ' +
          'Please contact the administrator to update the POLAR_ACCESS_TOKEN in the server configuration.'
        );
        error.statusCode = 503; // Service Unavailable - indicates server configuration issue
        return next(error);
      }
      throw polarError;
    }

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
            // This is a live stream or product not in database
            // Check if we have cart item data with months for live streams
            const cartItem = cartItems?.find((item: any) => 
              item.polarProductId === productId
            );
            
            if (cartItem?.months) {
              // Find or create "Live Stream" program entry
              let liveStreamProgram = await prisma.trainingProgram.findFirst({
                where: {
                  name: 'Live Stream',
                },
              });
              
              if (!liveStreamProgram) {
                // Create the Live Stream program if it doesn't exist
                liveStreamProgram = await prisma.trainingProgram.create({
                  data: {
                    name: 'Live Stream',
                    category: 'Live Training',
                    description: 'Live streaming access',
                    price: null,
                    currency: 'eur',
                  },
                });
                console.log(`Created Live Stream program with ID: ${liveStreamProgram.id}`);
              }
              
              // Create UserProgram for live stream with expiration date
              const expiresAt = new Date();
              expiresAt.setMonth(expiresAt.getMonth() + cartItem.months);
              
              // Check if user already has this live stream
              const existingUserProgram = await prisma.userProgram.findFirst({
                where: {
                  userId: userId,
                  programId: liveStreamProgram.id,
                  status: 'active',
                },
              });
              
              if (existingUserProgram) {
                // Update existing live stream subscription
                await prisma.userProgram.update({
                  where: {
                    id: existingUserProgram.id,
                  },
                  data: {
                    status: 'active',
                    expiresAt: expiresAt,
                    paymentId: payment.id,
                  },
                });
                console.log(`Updated live stream subscription for user ${userId}, expires at ${expiresAt}`);
              } else {
                // Create new live stream subscription
                await prisma.userProgram.create({
                  data: {
                    userId: userId,
                    programId: liveStreamProgram.id, // Use Live Stream program ID
                    status: 'active',
                    expiresAt: expiresAt,
                    paymentId: payment.id,
                  },
                });
                console.log(`Granted live stream access to user ${userId} for ${cartItem.months} months, expires at ${expiresAt}`);
              }
            } else {
              console.warn(`Program not found for Polar Product ID: ${productId}`);
            }
          }
        }

        // Update payment record with actual amount from Polar
        // Get the actual amount from checkout or order (for live streams not in database)
        let actualAmount = Number(payment.amount);
        let actualCurrency = payment.currency;
        
        // Try to get amount from order if available
        if (orderId) {
          try {
            const order = await (polar as any).orders?.get?.({ id: orderId });
            if (order && order.amount) {
              // Polar amounts are in cents, convert to decimal
              actualAmount = order.amount / 100;
              actualCurrency = order.currency?.toUpperCase() || actualCurrency;
            }
          } catch (err) {
            // If order not available, try checkout
            if (checkoutAny.amount) {
              actualAmount = checkoutAny.amount / 100;
              actualCurrency = checkoutAny.currency?.toUpperCase() || actualCurrency;
            }
          }
        } else if (checkoutAny.amount) {
          // Fallback to checkout amount
          actualAmount = checkoutAny.amount / 100;
          actualCurrency = checkoutAny.currency?.toUpperCase() || actualCurrency;
        }
        
        await prisma.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: 'completed',
            amount: actualAmount,
            currency: actualCurrency,
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

// Get Polar environment (sandbox or production)
export const getPolarEnv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const environment = getPolarEnvironment();
    res.json({
      success: true,
      data: {
        environment,
      },
    });
  } catch (error) {
    next(error);
  }
};

