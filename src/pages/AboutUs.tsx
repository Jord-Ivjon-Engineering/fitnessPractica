import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Dumbbell, Target, Users, Heart, Award, TrendingUp } from "lucide-react";

const AboutUs = () => {
  const { t } = useLanguage();

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

        {/* Values Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8 text-foreground">
            {t('about.values.title')}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <Dumbbell className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">
                {t('about.values.excellence.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('about.values.excellence.description')}
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">
                {t('about.values.community.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('about.values.community.description')}
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">
                {t('about.values.dedication.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('about.values.dedication.description')}
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">
                {t('about.values.quality.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('about.values.quality.description')}
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">
                {t('about.values.progress.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('about.values.progress.description')}
              </p>
            </Card>
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

