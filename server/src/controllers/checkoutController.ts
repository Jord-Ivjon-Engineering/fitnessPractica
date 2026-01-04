import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { polar, getPolarEnvironment } from '../lib/polar';
import { getFrontendUrl } from '../utils/url';

// Live stream Polar Product IDs mapped to months (both sandbox and production)
const LIVE_STREAM_PRODUCT_IDS_TO_MONTHS: Record<string, number> = {
  // Sandbox
  '7a9fadf7-43ea-4141-8432-964aec8f0f9c': 1,  // 1 month
  'c801b8ca-32a6-4a99-90ad-0deab9837fa8': 2,  // 2 months
  'c8f17a0d-2360-47ab-846a-9cd87c608833': 6,  // 6 months
  'deaf9337-3439-4782-ae7d-f091fb376693': 12, // 12 months
  // Production
  'ec5c52ce-ddfb-4735-bbb8-4a9060a959f6': 1,  // 1 month
  '2d5a7c85-1eba-42f9-adc0-2227e2270d9f': 2,  // 2 months
  'a2e10122-44aa-43fd-a400-3be0afde7499': 6,  // 6 months
  '54dd41a7-6d02-4ac0-a189-6a0415559f1f': 12, // 12 months
};

const LIVE_STREAM_PRODUCT_IDS = Object.keys(LIVE_STREAM_PRODUCT_IDS_TO_MONTHS);

const LIVE_STREAM_PROGRAM_ID = 999;

// Get months from Polar Product ID
function getMonthsFromProductId(productId: string): number | null {
  return LIVE_STREAM_PRODUCT_IDS_TO_MONTHS[productId] || null;
}

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

    // Determine programId for payment
    // If we have exactly one program, use it
    // Otherwise, try to get programId from cartItems if available
    // Also check if any productIds are live stream product IDs
    let paymentProgramId: number | null = null;
    
    // First check if any productIds are live stream product IDs
    const hasLiveStream = productIds.some(id => LIVE_STREAM_PRODUCT_IDS.includes(id));
    if (hasLiveStream && productIds.length === 1) {
      // If only one product and it's a live stream, ensure program 999 exists and use it
      await prisma.trainingProgram.upsert({
        where: { id: LIVE_STREAM_PROGRAM_ID },
        update: {}, // Don't update if exists
        create: {
          id: LIVE_STREAM_PROGRAM_ID,
          name: 'Live Stream',
          category: 'Live Training',
          description: 'Live streaming access',
          price: null,
          currency: 'eur',
        },
      });
      paymentProgramId = LIVE_STREAM_PROGRAM_ID;
      console.log(`Using programId ${paymentProgramId} for live stream payment`);
    } else if (programs.length === 1) {
      paymentProgramId = programs[0].id;
    } else if (cartItems && cartItems.length === 1 && cartItems[0].programId) {
      // If single cart item with programId, use it (even if program not found by polarProductId)
      paymentProgramId = cartItems[0].programId;
      console.log(`Using programId ${paymentProgramId} from cartItems for payment`);
    } else if (cartItems && cartItems.length > 0) {
      // For multiple items, if all have the same programId, use it
      const programIds = cartItems.map((item: any) => item.programId).filter(Boolean);
      if (programIds.length > 0 && new Set(programIds).size === 1) {
        paymentProgramId = programIds[0] as number;
        console.log(`Using programId ${paymentProgramId} from cartItems (all items have same programId) for payment`);
      }
    }

    // Create payment record in database
    const payment = await prisma.payment.create({
      data: {
        userId: userId,
        amount: totalAmount,
        currency: programs[0]?.currency?.toUpperCase() || 'ALL',
        status: 'pending',
        programId: paymentProgramId,
        polarCheckoutId: checkout.id,
      },
    });
    
    console.log(`💳 Created payment ${payment.id} with programId: ${paymentProgramId || 'null'}, checkoutId: ${checkout.id}`);

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

    console.log('verifyCheckout called:', { checkoutId, userId, cartItemsCount: cartItems?.length || 0 });

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

    // If checkout is completed/paid, grant access (even if payment is already completed but user_programs don't exist)
    // Check status as string since TypeScript types may not match exactly
    const checkoutStatus = String(checkout.status).toLowerCase();
    const isCheckoutCompleted = checkoutStatus === 'completed' || checkoutStatus === 'paid' || checkoutStatus === 'succeeded';
    
    // Check if user_programs already exist for this payment
    const existingUserPrograms = await prisma.userProgram.findMany({
      where: {
        paymentId: payment.id,
      },
    });
    
    // Grant access if checkout is completed and either:
    // 1. Payment is still pending, OR
    // 2. Payment is completed but no user_programs exist yet (access wasn't granted previously)
    if (isCheckoutCompleted && (payment.status === 'pending' || existingUserPrograms.length === 0)) {
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
      
      console.log('Processing checkout:', { 
        checkoutStatus, 
        paymentStatus: payment.status, 
        productsCount: products.length,
        cartItemsCount: cartItems?.length || 0 
      });

      // Track which program IDs were processed to update payment.programId
      // Declare outside if/else so it's accessible in both branches
      const processedProgramIds: number[] = [];

      // Grant access to all products
      if (products.length > 0) {
        for (const productItem of products) {
          // Handle both string product IDs and product objects
          const productId = typeof productItem === 'string' 
            ? productItem 
            : (productItem.product_id || productItem.id);
          
          if (!productId) continue;
          
          // Check if this is a live stream product ID
          const isLiveStream = LIVE_STREAM_PRODUCT_IDS.includes(productId);
          
          if (isLiveStream) {
            // Ensure live stream program exists
            await prisma.trainingProgram.upsert({
              where: { id: LIVE_STREAM_PROGRAM_ID },
              update: {}, // Don't update if exists
              create: {
                id: LIVE_STREAM_PROGRAM_ID,
                name: 'Live Stream',
                category: 'Live Training',
                description: 'Live streaming access',
                price: null,
                currency: 'eur',
              },
            });
            console.log(`🎥 Detected live stream product ID: ${productId}, using program ID ${LIVE_STREAM_PROGRAM_ID}`);
            processedProgramIds.push(LIVE_STREAM_PROGRAM_ID);
            
            // Get months from cart item or from product ID mapping
            const cartItem = cartItems?.find((item: any) => 
              item.polarProductId === productId
            );
            const months = cartItem?.months || getMonthsFromProductId(productId) || 1;
            
            console.log(`📅 Live stream months: ${months} (from ${cartItem?.months ? 'cartItem' : 'productId mapping'})`);
            
            // Create UserProgram for live stream with expiration date
            // Add months to current date, keeping the same day and time
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + months);
            expiresAt.setHours(23, 59, 59, 999); // End of day
            
            // Check if user already has this live stream
            const existingUserProgram = await prisma.userProgram.findFirst({
              where: {
                userId: userId,
                programId: LIVE_STREAM_PROGRAM_ID,
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
              console.log(`✅ Updated live stream subscription for user ${userId}, expires at ${expiresAt}`);
            } else {
              // Create new live stream subscription
              await prisma.userProgram.create({
                data: {
                  userId: userId,
                  programId: LIVE_STREAM_PROGRAM_ID,
                  status: 'active',
                  expiresAt: expiresAt,
                  paymentId: payment.id,
                },
              });
              console.log(`✅ Granted live stream access to user ${userId} for ${months} months, expires at ${expiresAt}`);
            }
            continue; // Skip the regular program lookup
          }
          
          // Find program by Polar Product ID
          let program = await prisma.trainingProgram.findUnique({
            where: {
              polarProductId: productId,
            },
          });

          // If program not found, try to find by checking if payment already has a programId
          // This handles cases where the product was purchased but the polarProductId doesn't match
          if (!program && payment.programId) {
            program = await prisma.trainingProgram.findUnique({
              where: {
                id: payment.programId,
              },
            });
            if (program) {
              console.log(`Found program ${program.id} from payment.programId for Polar Product ${productId}`);
            }
          }

          if (program) {
            processedProgramIds.push(program.id);
            
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
              console.log(`✅ Granted access to program ${program.id} for user ${userId}`);
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
              console.log(`✅ Updated access to program ${program.id} for user ${userId}`);
            }
          } else {
            // This is a live stream or product not in database
            // Check if we have cart item data with months for live streams
            const cartItem = cartItems?.find((item: any) => 
              item.polarProductId === productId
            );
            
            // Check if this is a live stream product ID (even if cartItem doesn't have months)
            const isLiveStreamProduct = LIVE_STREAM_PRODUCT_IDS.includes(productId);
            const monthsFromProductId = getMonthsFromProductId(productId);
            
            if (cartItem?.months || isLiveStreamProduct) {
              // Use program ID 999 for live streams
              // Ensure it exists first
              await prisma.trainingProgram.upsert({
                where: { id: 999 },
                update: {},
                create: {
                  id: 999,
                  name: 'Live Stream',
                  category: 'Live Training',
                  description: 'Live streaming access',
                  price: null,
                  currency: 'eur',
                },
              });
              const LIVE_STREAM_PROGRAM_ID = 999;
              processedProgramIds.push(LIVE_STREAM_PROGRAM_ID);
              
              // Get months from cart item or from product ID mapping
              const months = cartItem?.months || monthsFromProductId || 1;
              console.log(`📅 Live stream months: ${months} (from ${cartItem?.months ? 'cartItem' : 'productId mapping'}) for productId ${productId}`);
              
              // Create UserProgram for live stream with expiration date
              // Add months to current date, keeping the same day and time
              const expiresAt = new Date();
              expiresAt.setMonth(expiresAt.getMonth() + months);
              expiresAt.setHours(23, 59, 59, 999); // End of day
              
              // Check if user already has this live stream
              const existingUserProgram = await prisma.userProgram.findFirst({
                where: {
                  userId: userId,
                  programId: LIVE_STREAM_PROGRAM_ID,
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
                console.log(`✅ Updated live stream subscription for user ${userId}, expires at ${expiresAt}`);
              } else {
                // Create new live stream subscription
                await prisma.userProgram.create({
                  data: {
                    userId: userId,
                    programId: LIVE_STREAM_PROGRAM_ID,
                    status: 'active',
                    expiresAt: expiresAt,
                    paymentId: payment.id,
                  },
                });
                console.log(`✅ Granted live stream access to user ${userId} for ${months} months, expires at ${expiresAt}`);
              }
            } else {
              // If no program found and no cartItem, try to use payment.programId if available
              if (payment.programId) {
                const programFromPayment = await prisma.trainingProgram.findUnique({
                  where: { id: payment.programId },
                });
                
                if (programFromPayment) {
                  processedProgramIds.push(programFromPayment.id);
                  
                  const existingUserProgram = await prisma.userProgram.findFirst({
                    where: {
                      userId: userId,
                      programId: programFromPayment.id,
                    },
                  });

                  if (!existingUserProgram) {
                    await prisma.userProgram.create({
                      data: {
                        userId: userId,
                        programId: programFromPayment.id,
                        status: 'active',
                        paymentId: payment.id,
                      },
                    });
                    console.log(`✅ Created user_program from payment.programId ${programFromPayment.id} for user ${userId}`);
                  } else {
                    await prisma.userProgram.update({
                      where: { id: existingUserProgram.id },
                      data: {
                        status: 'active',
                        paymentId: payment.id,
                      },
                    });
                    console.log(`✅ Updated user_program from payment.programId ${programFromPayment.id} for user ${userId}`);
                  }
                } else {
                  console.warn(`⚠️ Program not found for Polar Product ID: ${productId}, no cartItem with months, and payment.programId ${payment.programId} doesn't exist`);
                }
              } else {
                console.warn(`⚠️ Program not found for Polar Product ID: ${productId} and no cartItem with months found`);
              }
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
        
        // Update payment with programId if we processed exactly one program
        const updateData: any = {
          status: 'completed',
          amount: actualAmount,
          currency: actualCurrency,
          polarOrderId: orderId,
          polarCustomerId: customerId || checkoutAny.customer?.id || null,
        };
        
        // Set programId if we have exactly one program, or if it's a live stream (999)
        if (processedProgramIds.length === 1) {
          updateData.programId = processedProgramIds[0];
        } else if (processedProgramIds.length > 0 && processedProgramIds.includes(999)) {
          // If live stream is one of the programs, set it
          updateData.programId = 999;
        } else if (processedProgramIds.length === 0 && payment.programId) {
          // If no programs were processed but payment.programId exists, keep it
          updateData.programId = payment.programId;
          console.log(`🔄 Keeping payment.programId ${payment.programId} since no programs were processed`);
        }
        
        await prisma.payment.update({
          where: {
            id: payment.id,
          },
          data: updateData,
        });
        
        console.log(`✅ Updated payment ${payment.id} with status completed, programId: ${updateData.programId || 'null'}`);
        
        // Final check: if no user_programs were created but payment.programId exists, create one now
        if (processedProgramIds.length === 0 && updateData.programId) {
          console.log(`🔄 No user_programs created from products, but payment.programId is ${updateData.programId}, creating user_program now`);
          const programFromPayment = await prisma.trainingProgram.findUnique({
            where: { id: updateData.programId },
          });
          
          if (programFromPayment) {
            const existingUserProgram = await prisma.userProgram.findFirst({
              where: {
                userId: userId,
                programId: programFromPayment.id,
              },
            });

            if (!existingUserProgram) {
              await prisma.userProgram.create({
                data: {
                  userId: userId,
                  programId: programFromPayment.id,
                  status: 'active',
                  paymentId: payment.id,
                },
              });
              console.log(`✅ Created user_program from payment.programId ${programFromPayment.id} (final fallback)`);
            } else {
              await prisma.userProgram.update({
                where: { id: existingUserProgram.id },
                data: {
                  status: 'active',
                  paymentId: payment.id,
                },
              });
              console.log(`✅ Updated user_program from payment.programId ${programFromPayment.id} (final fallback)`);
            }
          } else {
            console.warn(`⚠️ payment.programId ${updateData.programId} doesn't exist in database - cannot create user_program`);
          }
        }
        
        // If no user_programs were created but payment.programId exists, create one now
        if (processedProgramIds.length === 0 && payment.programId) {
          console.log(`🔄 No user_programs created yet, but payment.programId exists (${payment.programId}), creating user_program now`);
          const programFromPayment = await prisma.trainingProgram.findUnique({
            where: { id: payment.programId },
          });
          
          if (programFromPayment) {
            const existingUserProgram = await prisma.userProgram.findFirst({
              where: {
                userId: userId,
                programId: programFromPayment.id,
              },
            });

            if (!existingUserProgram) {
              await prisma.userProgram.create({
                data: {
                  userId: userId,
                  programId: programFromPayment.id,
                  status: 'active',
                  paymentId: payment.id,
                },
              });
              console.log(`✅ Created user_program from payment.programId ${programFromPayment.id} (after payment update)`);
            } else {
              await prisma.userProgram.update({
                where: { id: existingUserProgram.id },
                data: {
                  status: 'active',
                  paymentId: payment.id,
                },
              });
              console.log(`✅ Updated user_program from payment.programId ${programFromPayment.id} (after payment update)`);
            }
          }
        }
      } else {
        // No products found in checkout, but check cartItems for live streams
        // Also check if payment.programId exists as fallback
        console.log('⚠️ No products found in checkout, checking cartItems and payment.programId');
        
        // First, try to use payment.programId if it exists
        if (payment.programId && processedProgramIds.length === 0) {
          const programFromPayment = await prisma.trainingProgram.findUnique({
            where: { id: payment.programId },
          });
          
          if (programFromPayment) {
            processedProgramIds.push(programFromPayment.id);
            
            const existingUserProgram = await prisma.userProgram.findFirst({
              where: {
                userId: userId,
                programId: programFromPayment.id,
              },
            });

            if (!existingUserProgram) {
              await prisma.userProgram.create({
                data: {
                  userId: userId,
                  programId: programFromPayment.id,
                  status: 'active',
                  paymentId: payment.id,
                },
              });
              console.log(`✅ Created user_program from payment.programId ${programFromPayment.id} for user ${userId}`);
            } else {
              await prisma.userProgram.update({
                where: { id: existingUserProgram.id },
                data: {
                  status: 'active',
                  paymentId: payment.id,
                },
              });
              console.log(`✅ Updated user_program from payment.programId ${programFromPayment.id} for user ${userId}`);
            }
          }
        }
        
        if (cartItems && cartItems.length > 0) {
          // Process cartItems directly (for cases where products aren't in checkout response)
          for (const cartItem of cartItems) {
            // Check if this is a live stream (by months or by product ID)
            const monthsFromProductId = cartItem.polarProductId ? getMonthsFromProductId(cartItem.polarProductId) : null;
            if ((cartItem.months || monthsFromProductId) && cartItem.polarProductId) {
              // This is a live stream
              // Ensure it exists first
              await prisma.trainingProgram.upsert({
                where: { id: 999 },
                update: {},
                create: {
                  id: 999,
                  name: 'Live Stream',
                  category: 'Live Training',
                  description: 'Live streaming access',
                  price: null,
                  currency: 'eur',
                },
              });
              const LIVE_STREAM_PROGRAM_ID = 999;
              processedProgramIds.push(LIVE_STREAM_PROGRAM_ID);
              
              // Get months from cart item or from product ID mapping
              const months = cartItem.months || monthsFromProductId || 1;
              console.log(`📅 Live stream months (cartItems): ${months} for productId ${cartItem.polarProductId}`);
              
              // Add months to current date, keeping the same day and time
              const expiresAt = new Date();
              expiresAt.setMonth(expiresAt.getMonth() + months);
              expiresAt.setHours(23, 59, 59, 999); // End of day
              
              const existingUserProgram = await prisma.userProgram.findFirst({
                where: {
                  userId: userId,
                  programId: LIVE_STREAM_PROGRAM_ID,
                  status: 'active',
                },
              });
              
              if (existingUserProgram) {
                await prisma.userProgram.update({
                  where: { id: existingUserProgram.id },
                  data: {
                    status: 'active',
                    expiresAt: expiresAt,
                    paymentId: payment.id,
                  },
                });
                console.log(`✅ Updated live stream from cartItems for user ${userId}`);
              } else {
                await prisma.userProgram.create({
                  data: {
                    userId: userId,
                    programId: LIVE_STREAM_PROGRAM_ID,
                    status: 'active',
                    expiresAt: expiresAt,
                    paymentId: payment.id,
                  },
                });
                console.log(`✅ Created live stream from cartItems for user ${userId}`);
              }
            } else if (cartItem.programId) {
              // Regular program from cartItems
              processedProgramIds.push(cartItem.programId);
              
              const existingUserProgram = await prisma.userProgram.findFirst({
                where: {
                  userId: userId,
                  programId: cartItem.programId,
                },
              });
              
              if (!existingUserProgram) {
                await prisma.userProgram.create({
                  data: {
                    userId: userId,
                    programId: cartItem.programId,
                    status: 'active',
                    paymentId: payment.id,
                  },
                });
                console.log(`✅ Created user_program from cartItems for program ${cartItem.programId}`);
              } else {
                await prisma.userProgram.update({
                  where: { id: existingUserProgram.id },
                  data: {
                    status: 'active',
                    paymentId: payment.id,
                  },
                });
                console.log(`✅ Updated user_program from cartItems for program ${cartItem.programId}`);
              }
            }
          }
          
          // Update payment with programId if we processed exactly one program
          const updateData: any = {
            status: (checkoutStatus === 'completed' || checkoutStatus === 'paid' || checkoutStatus === 'succeeded') ? 'completed' : 'pending',
          };
          
          if (processedProgramIds.length === 1) {
            updateData.programId = processedProgramIds[0];
          } else if (processedProgramIds.length > 0 && processedProgramIds.includes(999)) {
            updateData.programId = 999;
          }
          
          await prisma.payment.update({
            where: { id: payment.id },
            data: updateData,
          });
          
          console.log(`✅ Updated payment from cartItems, programId: ${updateData.programId || 'null'}`);
        } else {
          // No products found and no cartItems, but check if payment.programId exists as last resort
          if (payment.programId && processedProgramIds.length === 0) {
            const programFromPayment = await prisma.trainingProgram.findUnique({
              where: { id: payment.programId },
            });
            
            if (programFromPayment) {
              processedProgramIds.push(programFromPayment.id);
              
              const existingUserProgram = await prisma.userProgram.findFirst({
                where: {
                  userId: userId,
                  programId: programFromPayment.id,
                },
              });

              if (!existingUserProgram) {
                await prisma.userProgram.create({
                  data: {
                    userId: userId,
                    programId: programFromPayment.id,
                    status: 'active',
                    paymentId: payment.id,
                  },
                });
                console.log(`✅ Created user_program from payment.programId ${programFromPayment.id} (last resort) for user ${userId}`);
              } else {
                await prisma.userProgram.update({
                  where: { id: existingUserProgram.id },
                  data: {
                    status: 'active',
                    paymentId: payment.id,
                  },
                });
                console.log(`✅ Updated user_program from payment.programId ${programFromPayment.id} (last resort) for user ${userId}`);
              }
            }
          }
          
          // Update payment status
          const updateData: any = {
            status: (checkoutStatus === 'completed' || checkoutStatus === 'paid' || checkoutStatus === 'succeeded') ? 'completed' : 'pending',
          };
          
          // Update programId if we found one
          if (processedProgramIds.length === 1) {
            updateData.programId = processedProgramIds[0];
          }
          
          await prisma.payment.update({
            where: {
              id: payment.id,
            },
            data: updateData,
          });
          
          if (processedProgramIds.length === 0) {
            console.log('⚠️ No products, cartItems, or payment.programId found - only updated payment status');
          } else {
            console.log(`✅ Updated payment and created user_program from payment.programId (last resort)`);
          }
        }
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

