import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Phone, Mail, Dumbbell } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// Import images from assets
import heroImage from "@/assets/gym-hero.jpg";
import aboutImage from "@/assets/gym-about.jpg";
import planWeightLoss from "@/assets/plan-weight-loss.jpg";
import planMuscleGrow from "@/assets/plan-muscle-grow.jpg";
import planCardio from "@/assets/plan-cardio.jpg";
import planFlexibility from "@/assets/plan-flexibility.jpg";
import planFunctional from "@/assets/plan-functional.jpg";

const Index = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { language, t } = useLanguage();

  const planDetails: Record<string, { intervals?: string[]; message?: string }> = {
    Individual: { intervals: ["Monday - Friday: 5:00 AM - 11:00 PM", "Saturday - Sunday: 7:00 AM - 9:00 PM"] },
    Instructor: { message: "Contact our gym" },
    Children: { intervals: ["Monday - Friday: 5:00 AM - 11:00 PM", "Saturday - Sunday: 7:00 AM - 9:00 PM"] },
    Pilates: { intervals: ["Monday - Friday: 5:00 AM - 11:00 PM", "Saturday - Sunday: 7:00 AM - 9:00 PM"] },
    Boxing: { intervals: ["Monday - Friday: 5:00 AM - 11:00 PM", "Saturday - Sunday: 7:00 AM - 9:00 PM"] },
  };

  return (
    <div className="min-h-screen bg-background">

      {/* Hero Banner */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden pt-0">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(14,90%,55%,0.95)] to-[hsl(25,95%,53%,0.9)]"></div>
        </div>
        <div className="relative z-10 text-center px-4">
          <h1 className="text-7xl md:text-8xl font-bold text-white mb-6 tracking-tight">
            {t('hero.title')}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
            {t('hero.subtitle')}
          </p>
          <Button 
            size="lg" 
            className="bg-white text-[hsl(14,90%,55%)] hover:bg-white/90 text-lg px-8 py-6 transition-all shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)]"
          >
            {t('hero.button')}
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent"></div>
      </section>

      {/* Plans Section */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-foreground mb-4">{t('section.plans.title')}</h2>
            <p className="text-xl text-muted-foreground">{t('section.plans.subtitle')}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { name: "Individual", icon: "💪" },
              { name: "Instructor", icon: "🏋️" },
              { name: "Children", icon: "👶" },
              { name: "Pilates", icon: "🧘" },
              { name: "Boxing", icon: "🥊" }
            ].map((plan) => (
              <Card 
                key={plan.name} 
                className="p-6 text-center hover:shadow-xl transition-all hover:scale-105 bg-card border-border cursor-pointer group"
                onClick={() => setSelectedPlan(plan.name)}
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{plan.icon}</div>
                <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                <div className="w-12 h-1 bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] mx-auto rounded-full"></div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Training Programs Slideshow */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-foreground mb-4">{t('section.programs.title')}</h2>
            <p className="text-xl text-muted-foreground">{t('section.programs.subtitle')}</p>
          </div>
          
          <Carousel className="w-full max-w-5xl mx-auto">
            <CarouselContent>
              {[
                { image: planWeightLoss, name: "Fat Burn Program", category: "Weight Loss" },
                { image: planMuscleGrow, name: "Strength Builder", category: "Muscle Growth" },
                { image: planCardio, name: "Cardio Blast", category: "Endurance" },
                { image: planFlexibility, name: "Yoga & Stretch", category: "Flexibility" },
                { image: planFunctional, name: "Functional Fitness", category: "Athletic Performance" }
              ].map((program) => (
                <CarouselItem key={program.name}>
                  <Card className="overflow-hidden border-border">
                    <div className="relative h-96">
                      <img 
                        src={program.image} 
                        alt={program.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                        <div className="inline-block px-4 py-1 mb-3 rounded-full bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] text-sm font-semibold">
                          {program.category}
                        </div>
                        <h3 className="text-4xl font-bold mb-2">{program.name}</h3>
                        <Button 
                          size="lg"
                          className="mt-4 bg-white text-[hsl(14,90%,55%)] hover:bg-white/90"
                        >
                          {t('button.learnMore')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </Carousel>
        </div>
      </section>

      {/* About Section */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src={aboutImage} 
                alt="Modern gym facility" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-6">
              <h2 className="text-5xl font-bold text-foreground">
                {language === 'en' ? (
                  <>
                    Your Fitness
                    <span className="block bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] bg-clip-text text-transparent">
                      Transformation
                    </span>
                  </>
                ) : (
                  <>
                    <span className="block bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] bg-clip-text text-transparent">
                      {t('section.about.title')}
                    </span>
                    {t('section.about.title2')}
                  </>
                )}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                At Fitness Practica, we believe fitness is more than just working out—it's a lifestyle. 
                Our state-of-the-art facilities are equipped with the latest training equipment, 
                expert trainers, and a supportive community to help you reach your peak performance.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Whether you're a beginner starting your fitness journey or an experienced athlete 
                pushing your limits, we provide personalized training programs, group classes, 
                and nutritional guidance tailored to your unique goals.
              </p>
              <Button 
                size="lg"
                className="bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] hover:opacity-90 transition-opacity shadow-[0_10px_40px_-10px_hsl(14,90%,55%,0.3)]"
              >
                {t('button.learnMore')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Locations Section */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-foreground mb-4">{t('section.locations.title')}</h2>
            <p className="text-xl text-muted-foreground">{t('section.locations.subtitle')}</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Location 1 */}
            <Card className="p-8 space-y-6 hover:shadow-xl transition-shadow bg-card border-border">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)]">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Fitness Practica</h3>
                  <p className="text-muted-foreground">Rruga Skender Luarasi, Tiranë, Albania</p>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden h-64 border border-border">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2996.6400645203357!2d19.80488417643704!3d41.316693200376655!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x135030ff6f8574a1%3A0x18a1d0f2d565f9e5!2sFitness%20Practica!5e0!3m2!1sen!2s!4v1762311187205!5m2!1sen!2s"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </Card>

            {/* Location 2 */}
            <Card className="p-8 space-y-6 hover:shadow-xl transition-shadow bg-card border-border">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)]">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Fitness Practica 2</h3>
                  <p className="text-muted-foreground">Rruga Anton Lufi, Tiranë, Albania</p>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden h-64 border border-border">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2996.6014316063843!2d19.801920976437003!3d41.31753350032463!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x13503100686b0dad%3A0x4972b57d74017da7!2sFitness%20Practica%202!5e0!3m2!1sen!2s!4v1762311049147!5m2!1sen!2s"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
                
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12 px-4">
        <div className="container mx-auto max-w-6xl">
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
                  <span className="text-background/90">info@fitnesspractica.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary" />
                  <span className="text-background/90">+1 (555) 123-4567</span>
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
          </div>
        </div>
      </footer>

      {/* Plan Details Dialog */}
      <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPlan}</DialogTitle>
            <DialogDescription>
              {selectedPlan && planDetails[selectedPlan]?.message ? (
                <div className="text-center py-8">
                  <p className="text-lg font-semibold text-foreground">{planDetails[selectedPlan].message}</p>
                </div>
              ) : (
                <div className="py-4">
                  <p className="mb-4 text-foreground font-semibold">Available Hours:</p>
                  <div className="space-y-2">
                    {selectedPlan && planDetails[selectedPlan]?.intervals?.map((interval) => (
                      <p key={interval} className="text-foreground">
                        {interval}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;

