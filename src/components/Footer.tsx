import { Dumbbell, Mail, Phone, Instagram, Facebook } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-foreground text-background py-12 w-full">
      <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16">
        <div className="grid md:grid-cols-4 gap-8 items-start">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Dumbbell className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold">Fitness Practica</span>
            </div>
            <p className="text-background/70">{t('footer.tagline')}</p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.contact')}</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <span className="text-background/90">info.fitnesspractica@gmail.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary" />
                <span className="text-background/90">+355 69 444 6072</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary" />
                <span className="text-background/90">+355 69 688 4328</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.hours')}</h4>
            <div className="space-y-2 text-background/90">
              <p>{t('footer.hours.weekdays')}</p>
              <p>{t('footer.hours.weekend')}</p>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.socials')}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Instagram className="w-5 h-5 text-primary" />
                  <a 
                    href="https://share.google/96Q68eScJeoDZip8o" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-background/90 hover:text-primary transition-colors"
                  >
                    Fitness Practica
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Instagram className="w-5 h-5 text-primary" />
                  <a 
                    href="https://share.google/9Zw553mh4wxMn0CGs" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-background/90 hover:text-primary transition-colors"
                  >
                    Fitness Practica 2
                  </a>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Facebook className="w-5 h-5 text-primary" />
                  <a 
                    href="https://www.facebook.com/people/Fitness-Practica/100063785340752/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-background/90 hover:text-primary transition-colors"
                  >
                    Fitness Practica
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Facebook className="w-5 h-5 text-primary" />
                  <a 
                    href="https://www.facebook.com/p/Fitness-Practica-2-61558785475053/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-background/90 hover:text-primary transition-colors"
                  >
                    Fitness Practica 2
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-background/20 text-center text-background/70">
          <p>{t('footer.copyright')}</p>
          <p>Powered By: IJ Technologies</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

