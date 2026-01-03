import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Target } from "lucide-react";
import { useEffect } from "react";

const AboutUs = () => {
  const { t } = useLanguage();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-background pt-24">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 text-foreground">
            {t('about.title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('about.subtitle')}
          </p>
        </div>

        {/* Mission Section */}
        <Card className="p-8 mb-12">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-primary/10 rounded-lg">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4 text-foreground">
                {t('about.mission.title')}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t('about.mission.description')}
              </p>
            </div>
          </div>
        </Card>

        {/* Photos and Boxes Section */}
        <div className="mb-12 flex justify-center">
          <div className="w-[90%] max-w-6xl">
            {/* Mobile: Photo 1, Box 1, Photo 2, Box 2 */}
            {/* Desktop: Photos on top row, Boxes on bottom row */}
            <div className="flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-12">
              {/* Vullnet Photo - Mobile: 1st, Desktop: top-left */}
              <div className="overflow-hidden rounded-lg shadow-lg aspect-[3/4] border-8 border-red-500">
                <img
                  src="https://fitnesspractica.fra1.digitaloceanspaces.com/uploads/images/Vullneti.jpeg"
                  alt="Vullnet Manushi"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              
              {/* Vullnet Box - Mobile: 2nd, Desktop: bottom-left */}
              <Card className="p-8 hover:shadow-lg transition-shadow md:row-start-2">
                <h3 className="text-2xl font-bold mb-4 text-foreground text-center">
                  Vullnet Manushi
                </h3>
                <div className="text-lg text-muted-foreground leading-relaxed space-y-3">
                  <div dangerouslySetInnerHTML={{ __html: t('about.box1.description') }} />
                </div>
              </Card>

              {/* Marlind Photo - Mobile: 3rd, Desktop: top-right */}
              <div className="overflow-hidden rounded-lg shadow-lg aspect-[3/4] border-8 border-red-500 md:row-start-1 md:col-start-2">
                <img
                  src="https://fitnesspractica.fra1.digitaloceanspaces.com/uploads/images/Marlindi.jpeg"
                  alt="Marlind Manushi"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Marlind Box - Mobile: 4th, Desktop: bottom-right */}
              <Card className="p-8 hover:shadow-lg transition-shadow md:row-start-2 md:col-start-2">
                <h3 className="text-2xl font-bold mb-4 text-foreground text-center">
                  Marlind Manushi
                </h3>
                <div className="text-lg text-muted-foreground leading-relaxed space-y-3">
                  <div dangerouslySetInnerHTML={{ __html: t('about.box2.description') }} />
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Story Section */}
        <Card className="p-8">
          <h2 className="text-3xl font-bold mb-6 text-foreground">
            {t('about.story.title')}
          </h2>
          <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
            <p>{t('about.story.paragraph1')}</p>
            <p>{t('about.story.paragraph2')}</p>
            <p>{t('about.story.paragraph3')}</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AboutUs;

