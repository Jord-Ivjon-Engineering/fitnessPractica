import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'al';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Translations
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header
    'header.login': 'Login',
    'header.signup': 'Sign Up',
    'header.logout': 'Logout',
    'header.profile': 'Profile',
    
    // Hero
    'hero.title': 'Fitness Practica',
    'hero.subtitle': 'Transform your body, elevate your mind, achieve your goals',
    'hero.button': 'Start Your Journey',
    
    // Sections
    'section.plans.title': 'Choose Your Plan',
    'section.plans.subtitle': 'Find the perfect fit for your fitness journey',
    'section.programs.title': 'Training Programs',
    'section.programs.subtitle': 'Specialized programs designed for your goals',
    'section.about.title': 'Your Fitness',
    'section.about.title2': 'Transformation',
    'section.locations.title': 'Our Locations',
    'section.locations.subtitle': 'Find us at one of our convenient locations',
    
    // Footer
    'footer.tagline': 'Transform your life through fitness',
    'footer.contact': 'Contact Us',
    'footer.hours': 'Hours',
    'footer.hours.weekdays': 'Monday - Friday: 5:00 AM - 11:00 PM',
    'footer.hours.weekend': 'Saturday - Sunday: 7:00 AM - 9:00 PM',
    'footer.copyright': '© 2024 Fitness Practica. All rights reserved.',
    
    // Checkout
    'checkout.title': 'Checkout',
    'checkout.empty': 'Your cart is empty',
    'checkout.emptyMessage': 'Add some programs to your cart to get started!',
    'checkout.program': 'Program',
    'checkout.category': 'Category',
    'checkout.remove': 'Remove',
    'checkout.total': 'Total',
    'checkout.programs': 'programs',
    'checkout.completeOrder': 'Complete Order',
    'checkout.backToPrograms': 'Back to Programs',
    
    // Buttons
    'button.learnMore': 'Learn More',
    'button.browsePrograms': 'Browse Programs',
    'button.loginToPurchase': 'Log in to purchase',
    'button.continue': 'Continue',
    'button.addToCart': 'Add to Cart',
  },
  al: {
    // Header
    'header.login': 'Hyr',
    'header.signup': 'Regjistrohu',
    'header.logout': 'Dil',
    'header.profile': 'Profili',
    
    // Hero
    'hero.title': 'Fitness Practica',
    'hero.subtitle': 'Transformo trupin, ngritë mendjen, arritë qëllimet',
    'hero.button': 'Fillo Udhëtimin Tënd',
    
    // Sections
    'section.plans.title': 'Zgjidh Planin Tënd',
    'section.plans.subtitle': 'Gjej përshtatjen e përsosur për udhëtimin tënd të fitnesit',
    'section.programs.title': 'Programe Trajnimi',
    'section.programs.subtitle': 'Programe të specializuara të dizajnuara për qëllimet e tua',
    'section.about.title': 'Transformimi',
    'section.about.title2': 'i Fitnesit Tënd',
    'section.locations.title': 'Lokacionet Tona',
    'section.locations.subtitle': 'Na gjej në një nga lokacionet tona të përshtatshme',
    
    // Footer
    'footer.tagline': 'Transformo jetën përmes fitnesit',
    'footer.contact': 'Kontakto',
    'footer.hours': 'Orët',
    'footer.hours.weekdays': 'E Hënë - E Premte: 5:00 - 23:00',
    'footer.hours.weekend': 'E Shtunë - E Dielë: 7:00 - 21:00',
    'footer.copyright': '© 2024 Fitness Practica. Të gjitha të drejtat e rezervuara.',
    
    // Checkout
    'checkout.title': 'Blerje',
    'checkout.empty': 'Shporta juaj është e zbrazët',
    'checkout.emptyMessage': 'Shtoni disa programe në shportën tuaj për të filluar!',
    'checkout.program': 'Programi',
    'checkout.category': 'Kategoria',
    'checkout.remove': 'Hiq',
    'checkout.total': 'Totali',
    'checkout.programs': 'programe',
    'checkout.completeOrder': 'Përfundo Porosinë',
    'checkout.backToPrograms': 'Kthehu te Programet',
    
    // Buttons
    'button.learnMore': 'Më Shumë',
    'button.browsePrograms': 'Shfleto Programet',
    'button.loginToPurchase': 'Hyr për të blerë',
    'button.continue': 'Vazhdo',
    'button.addToCart': 'Shto në Shportë',
  },
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language;
    return saved || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

