import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingCart, Trash2, ArrowLeft, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { paymentApi } from "@/services/api";

const Checkout = () => {
  const { cartItems, removeFromCart, clearCart, cartCount } = useCart();
  const { t } = useLanguage();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Check for payment success (Stripe redirect)
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const canceled = searchParams.get('canceled');

    // Wait for auth to finish loading before processing payment verification
    if (isLoading) {
      return;
    }

    if (sessionId && !canceled) {
      // Payment was successful, verify it
      // Only verify if user is authenticated
      if (isAuthenticated) {
        verifyPayment(sessionId);
      } else {
        // User not authenticated but has session_id - redirect to login with return URL
        const returnUrl = `/checkout?session_id=${sessionId}`;
        navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      }
    } else if (canceled) {
      setPaymentStatus('error');
    }
  }, [searchParams, isLoading, isAuthenticated, navigate]);

  const verifyPayment = async (sessionId: string) => {
    try {
      setLoading(true);
      const response = await paymentApi.getPaymentStatus(sessionId);
      if (response.data.success && response.data.data.status === 'completed') {
        setPaymentStatus('success');
        clearCart();
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setPaymentStatus('error');
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      // If authentication failed, redirect to login with return URL
      if (error.response?.status === 401) {
        const returnUrl = `/checkout?session_id=${sessionId}`;
        navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      } else {
        setPaymentStatus('error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Redirect to login if not authenticated (but only if not handling Stripe redirect)
  useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) {
      return;
    }

    const sessionId = searchParams.get('session_id');
    // If we have a session_id, we're handling a Stripe redirect - don't redirect yet
    // The payment verification effect will handle it
    if (!isAuthenticated && !sessionId) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate, searchParams]);

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 px-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not authenticated and no Stripe redirect, don't render (will redirect)
  if (!isAuthenticated && !searchParams.get('session_id')) {
    return null;
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.price || 0);
    }, 0);
  };

  const handleCheckout = async () => {
    try {
      setLoading(true);
      
      // Get program IDs from cart items
      const programIds = cartItems
        .filter(item => item.programId)
        .map(item => item.programId!);

      if (programIds.length === 0) {
        alert('No valid programs in cart');
        setLoading(false);
        return;
      }

      // Create Stripe checkout session
      const response = await paymentApi.createCheckoutSession({ programIds });
      
      if (response.data.success && response.data.data.url) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.data.url;
      } else {
        alert('Failed to create checkout session');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      alert(error.response?.data?.error || 'Failed to process payment');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">{t('checkout.title')}</h1>
          </div>
        </div>

        {cartItems.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">{t('checkout.empty')}</h2>
            <p className="text-muted-foreground mb-6">{t('checkout.emptyMessage')}</p>
            <Button
              onClick={() => navigate('/#programs')}
              className="bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] hover:opacity-90"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('checkout.backToPrograms')}
            </Button>
          </Card>
        ) : (
          <>
            <div className="space-y-4 mb-8">
              {cartItems.map((item) => (
                <Card key={item.id} className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-foreground mb-1">{item.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        <span className="font-semibold">{t('checkout.category')}:</span> {item.category}
                      </p>
                      {item.price !== undefined && (
                        <p className="text-lg font-semibold text-foreground">
                          ${item.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('checkout.remove')}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Summary */}
            <Card className="p-6 bg-muted/30">
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-foreground">
                    {t('checkout.total')}:
                  </span>
                  <span className="text-2xl font-bold text-foreground">
                    ${calculateTotal().toFixed(2)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {cartCount} {cartCount === 1 ? 'program' : 'programs'}
                </div>
              </div>

              {paymentStatus === 'success' && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-green-800 dark:text-green-200">
                    Payment successful! Redirecting to profile...
                  </span>
                </div>
              )}

              {paymentStatus === 'error' && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="text-red-800 dark:text-red-200">
                    Payment failed or was canceled. Please try again.
                  </span>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/#programs')}
                  className="flex-1"
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('checkout.backToPrograms')}
                </Button>
                <Button
                  onClick={handleCheckout}
                  className="flex-1 bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] hover:opacity-90"
                  disabled={loading || paymentStatus === 'success'}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Proceed to Payment'
                  )}
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Checkout;

