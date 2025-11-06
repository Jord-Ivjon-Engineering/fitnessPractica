import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingCart, Trash2, ArrowLeft } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

const Checkout = () => {
  const { cartItems, removeFromCart, clearCart, cartCount } = useCart();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const handleCompleteOrder = () => {
    // Here you would typically send the order to your backend
    alert('Order completed! (This is a demo)');
    clearCart();
    navigate('/profile');
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
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold">{t('checkout.category')}:</span> {item.category}
                      </p>
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
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-foreground">
                  {t('checkout.total')}:
                </span>
                <span className="text-2xl font-bold text-foreground">
                  {cartCount} {t('checkout.programs')}
                </span>
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/#programs')}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('checkout.backToPrograms')}
                </Button>
                <Button
                  onClick={handleCompleteOrder}
                  className="flex-1 bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] hover:opacity-90"
                >
                  {t('checkout.completeOrder')}
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

