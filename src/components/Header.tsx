import { Button } from "@/components/ui/button";
import { Dumbbell, User, LogOut, Languages } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/')}
        >
          <Dumbbell className="w-8 h-8 text-primary" />
          <span className="text-2xl font-bold text-foreground">Fitness Practica</span>
        </div>
        <div className="flex gap-3 items-center">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setLanguage(language === 'en' ? 'al' : 'en')}
            title={language === 'en' ? 'Switch to Albanian' : 'Kalo në Anglisht'}
          >
            <Languages className="w-5 h-5 mr-2" />
            <span className="hidden md:inline">{language === 'en' ? 'EN' : 'AL'}</span>
          </Button>
          {isAuthenticated ? (
            <>
              <Button 
                variant="ghost" 
                size="lg"
                onClick={() => navigate('/profile')}
              >
                <User className="w-5 h-5 mr-2" />
                <span className="hidden md:inline">{user?.name}</span>
              </Button>
              <Button 
                variant="ghost" 
                size="lg"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
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
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] hover:opacity-90 transition-opacity shadow-[0_10px_40px_-10px_hsl(14,90%,55%,0.3)]"
                onClick={() => navigate('/signup')}
              >
                {t('header.signup')}
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;

