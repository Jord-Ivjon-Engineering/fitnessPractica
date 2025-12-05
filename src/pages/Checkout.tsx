import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingCart, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { checkoutApi, trainingProgramApi, TrainingProgram } from "@/services/api";

const Checkout = () => {
  const { cartItems, removeFromCart, clearCart, cartCount } = useCart();
  const { t } = useLanguage();
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [programs, setPrograms] = useState<Record<number, TrainingProgram>>({});

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Fetch program details to get Polar Product IDs
  useEffect(() => {
    const fetchPrograms = async () => {
      if (cartItems.length === 0) return;

      try {
        const programIds = cartItems
          .map(item => item.programId)
          .filter((id): id is number => id !== undefined);

        if (programIds.length === 0) return;

        const response = await trainingProgramApi.getAll();
        if (response.data.success) {
          const programsMap: Record<number, TrainingProgram> = {};
          response.data.data.forEach((program) => {
            if (programIds.includes(program.id)) {
              programsMap[program.id] = program;
            }
          });
          setPrograms(programsMap);
        }
      } catch (error) {
        console.error('Error fetching programs:', error);
      }
    };

    if (isAuthenticated && cartItems.length > 0) {
      fetchPrograms();
    }
  }, [cartItems, isAuthenticated]);

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.price || 0);
    }, 0);
  };

  const handleCheckout = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Get Polar Product IDs from programs
    const productIds = cartItems
      .map(item => {
        if (item.programId && programs[item.programId]) {
          return programs[item.programId].polarProductId;
        }
        return null;
      })
      .filter((id): id is string => id !== null && id !== undefined);

    if (productIds.length === 0) {
      alert('No valid products found. Please ensure programs have Polar Product IDs configured.');
      return;
    }

    setCheckoutLoading(true);
    try {
      const response = await checkoutApi.createCheckout({ productIds });
      
      if (response.data.success && response.data.data.url) {
        // Clear cart and redirect to Polar checkout
        clearCart();
        window.location.href = response.data.data.url;
      } else {
        alert('Failed to create checkout. Please try again.');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(error.response?.data?.error || 'Failed to create checkout. Please try again.');
    } finally {
      setCheckoutLoading(false);
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
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: (item.currency || 'all').toUpperCase(),
                          }).format(item.price)}
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
                    {cartItems.length > 0 && cartItems[0].currency ? (
                      new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: cartItems[0].currency.toUpperCase(),
                      }).format(calculateTotal())
                    ) : (
                      `${calculateTotal().toFixed(2)} ALL`
                    )}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {cartCount} {cartCount === 1 ? t('checkout.program') : t('checkout.programs')}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Button
                  onClick={handleCheckout}
                  disabled={checkoutLoading || cartItems.length === 0}
                  className="w-full bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Proceed to Checkout'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/#programs')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('checkout.backToPrograms')}
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
