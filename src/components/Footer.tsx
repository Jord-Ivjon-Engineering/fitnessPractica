import { Dumbbell, Mail, Phone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-foreground text-background py-12 w-full">
      <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16">
        <div className="grid md:grid-cols-3 gap-8 items-start">
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
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.hours')}</h4>
            <div className="space-y-2 text-background/90">
              <p>{t('footer.hours.weekdays')}</p>
              <p>{t('footer.hours.weekend')}</p>
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

