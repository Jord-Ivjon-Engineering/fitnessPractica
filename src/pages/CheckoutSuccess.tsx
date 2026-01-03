import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { checkoutApi } from "@/services/api";

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const checkoutId = searchParams.get("checkout_id");
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { cartItems } = useCart();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"success" | "error" | "pending">("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!checkoutId) {
      setStatus("error");
      setErrorMessage("No checkout ID provided");
      setLoading(false);
      return;
    }

    // Verify checkout status with retry logic
    const verifyCheckout = async (retryCount = 0) => {
      try {
        // Pass cart items for live stream months information
        const cartItemsData = cartItems.map(item => ({
          id: item.id,
          polarProductId: item.polarProductId,
          programId: item.programId,
          months: item.months,
        }));
        const response = await checkoutApi.verifyCheckout(checkoutId, { cartItems: cartItemsData });
        
        if (response.data.success) {
          const checkoutStatus = response.data.data.checkout.status;
          const paymentStatus = response.data.data.payment.status;
          
          if (checkoutStatus === "completed" || checkoutStatus === "paid" || paymentStatus === "completed") {
            setStatus("success");
            setLoading(false);
            // Automatically redirect to profile after successful payment
            setTimeout(() => {
              navigate("/profile");
            }, 2000); // 2 second delay to show success message
          } else if (checkoutStatus === "open" || checkoutStatus === "pending") {
            // Retry up to 5 times with increasing delays
            if (retryCount < 5) {
              const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
              setTimeout(() => {
                verifyCheckout(retryCount + 1);
              }, delay);
            } else {
              setStatus("pending");
              setLoading(false);
            }
          } else {
            setStatus("error");
            setErrorMessage("Payment was not completed");
            setLoading(false);
          }
        } else {
          setStatus("error");
          setErrorMessage("Failed to verify checkout");
          setLoading(false);
        }
      } catch (error: any) {
        console.error("Checkout verification error:", error);
        // Retry on network errors
        if (retryCount < 3 && error.code !== 'ERR_NETWORK') {
          const delay = 2000 * (retryCount + 1);
          setTimeout(() => {
            verifyCheckout(retryCount + 1);
          }, delay);
        } else {
          setStatus("error");
          setErrorMessage(error.response?.data?.error || "Failed to verify checkout");
          setLoading(false);
        }
      }
    };

    verifyCheckout();
  }, [checkoutId, isAuthenticated, navigate, cartItems]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 px-4 flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Verifying Payment</h2>
          <p className="text-muted-foreground">Please wait while we confirm your payment...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <Card className="p-8 text-center">
          {status === "success" && (
            <>
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-foreground mb-4">Payment Successful!</h1>
              <p className="text-lg text-muted-foreground mb-6">
                Thank you for your purchase. Redirecting you to your profile...
              </p>
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            </>
          )}

          {status === "pending" && (
            <>
              <Loader2 className="w-20 h-20 animate-spin text-primary mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-foreground mb-4">Payment Processing</h1>
              <p className="text-lg text-muted-foreground mb-6">
                Your payment is being processed. This may take a few moments.
              </p>
              <Button
                onClick={() => navigate("/profile")}
                variant="outline"
              >
                Go to Profile
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-foreground mb-4">Payment Failed</h1>
              <p className="text-lg text-muted-foreground mb-6">
                {errorMessage || "There was an issue processing your payment. Please try again."}
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Button
                  onClick={() => navigate("/checkout")}
                  className="bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] hover:opacity-90"
                >
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/#programs")}
                >
                  Back to Programs
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CheckoutSuccess;

