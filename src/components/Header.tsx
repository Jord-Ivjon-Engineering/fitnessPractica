import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { User, LogOut, Languages, ShoppingCart, LayoutDashboard, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { cartCount, clearCart } = useCart();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    clearCart();
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMobileMenuOpen && !target.closest('.mobile-menu-container')) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between mobile-menu-container">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/')}
        >
          <img 
            src="https://fitnesspractica.fra1.cdn.digitaloceanspaces.com/uploads/images/program_1764986739884-572851476.jpg"
            alt="Fitness Practica Logo"
            className="w-8 h-8 object-cover rounded"
          />
          <span className="text-2xl font-bold text-foreground">Fitness Practica</span>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-3 items-center">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setLanguage(language === 'en' ? 'al' : 'en')}
            title={language === 'en' ? t('admin.switchLanguage') : t('admin.switchToEnglish')}
          >
            <Languages className="w-5 h-5 mr-2" />
            <span>{language === 'en' ? 'EN' : 'AL'}</span>
          </Button>
          {isAuthenticated ? (
            <>
              <Button 
                variant="ghost" 
                size="lg"
                onClick={() => navigate('/checkout')}
                className="relative"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
                <span>{t('admin.cart')}</span>
              </Button>
              {user?.role === 'admin' && (
                <Button 
                  variant="ghost" 
                  size="lg"
                  onClick={() => navigate('/admin/dashboard')}
                  title={t('admin.dashboard')}
                >
                  <LayoutDashboard className="w-5 h-5 mr-2" />
                  <span>{t('admin.dashboard')}</span>
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="lg"
                onClick={() => navigate('/profile')}
              >
                <User className="w-5 h-5 mr-2" />
                <span>{user?.name}</span>
              </Button>
              <Button 
                variant="ghost" 
                size="lg"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 mr-2" />
                {t('header.logout')}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="ghost"
                size="lg"
                onClick={() => navigate('/login')}
              >
                {t('header.login')}
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-accent transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg md:hidden">
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
              <Button
                variant="ghost"
                size="lg"
                className="w-full justify-start"
                onClick={() => {
                  setLanguage(language === 'en' ? 'al' : 'en');
                  setIsMobileMenuOpen(false);
                }}
              >
                <Languages className="w-5 h-5 mr-2" />
                <span>{language === 'en' ? 'EN' : 'AL'}</span>
              </Button>
              {isAuthenticated ? (
                <>
                  <Button 
                    variant="ghost" 
                    size="lg"
                    className="w-full justify-start relative"
                    onClick={() => {
                      navigate('/checkout');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    {cartCount > 0 && (
                      <span className="absolute left-8 top-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                    <span>{t('admin.cart')}</span>
                  </Button>
                  {user?.role === 'admin' && (
                    <Button 
                      variant="ghost" 
                      size="lg"
                      className="w-full justify-start"
                      onClick={() => {
                        navigate('/admin/dashboard');
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <LayoutDashboard className="w-5 h-5 mr-2" />
                      <span>{t('admin.dashboard')}</span>
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="lg"
                    className="w-full justify-start"
                    onClick={() => {
                      navigate('/profile');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <User className="w-5 h-5 mr-2" />
                    <span>{user?.name}</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="lg"
                    className="w-full justify-start"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-5 h-5 mr-2" />
                    <span>{t('header.logout')}</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="ghost"
                    size="lg"
                    className="w-full justify-start"
                    onClick={() => {
                      navigate('/login');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    {t('header.login')}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;

