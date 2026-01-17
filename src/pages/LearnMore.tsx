import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const LearnMore = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-background pt-24">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back') || 'Back'}
          </Button>
          <h1 className="text-4xl font-bold text-foreground text-center">
            Udhezues Per Instruktoret Mbi Fitness-in Dhe Shendetin
          </h1>
        </div>

        {/* Image Section */}
        <div className="flex justify-center mb-12">
          <div className="w-full max-w-6xl">
            <div className="overflow-hidden rounded-lg shadow-lg">
              <img
                src="https://fitnesspractica.fra1.cdn.digitaloceanspaces.com/uploads/images/Picture%20pro%20max.jpg"
                alt="Fitness Practica"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>

        {/* Text Section */}
        <div className="flex justify-center">
          <div className="w-full max-w-6xl">
            <Card className="p-8">
              <h2 className="text-3xl font-bold mb-6 text-foreground text-center">
                {t('about.image.title')}
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                <p>
                  {t('about.image.paragraph1')}
                </p>
                <p>
                  {t('about.image.paragraph2')}
                </p>
                <p>
                  {t('about.image.paragraph3')}
                </p>
                <p>
                  {t('about.image.paragraph4')}
                </p>
                <p className="text-3xl text-center font-semibold text-foreground mt-8">
                  {t('about.image.author')}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearnMore;
