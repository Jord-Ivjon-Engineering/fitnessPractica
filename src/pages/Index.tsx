import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
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
import heroVideo from "@/assets/viedo.mp4";
const Index = () => {
  const [videoError, setVideoError] = useState(false);
  const [openPlan, setOpenPlan] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { language, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();

  const videoUrl = heroVideo;

  // Handle hash navigation to scroll to specific sections
  useEffect(() => {
    if (location.hash) {
      const elementId = location.hash.substring(1); // Remove the # symbol
      setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
          // Account for fixed header height
          const headerOffset = 80; // Adjust based on your header height
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });
        }
      }, 300); // Give time for page to load
    }
  }, [location.hash]);

  const planDetails: Record<string, { intervals?: string[]; message?: string }> = {
    Individual: { 
      intervals: [
        "Monday: 5:00 AM - 11:00 PM",
        "Tuesday: 5:00 AM - 11:00 PM",
        "Wednesday: 5:00 AM - 11:00 PM",
        "Thursday: 5:00 AM - 11:00 PM",
        "Friday: 5:00 AM - 11:00 PM",
        "Saturday: 7:00 AM - 9:00 PM",
        "Sunday: 7:00 AM - 9:00 PM"
      ] 
    },
    Instructor: { message: "Contact our gym" },
    Children: { 
      intervals: [
        "Monday: 5:00 AM - 11:00 PM",
        "Tuesday: 5:00 AM - 11:00 PM",
        "Wednesday: 5:00 AM - 11:00 PM",
        "Thursday: 5:00 AM - 11:00 PM",
        "Friday: 5:00 AM - 11:00 PM",
        "Saturday: 7:00 AM - 9:00 PM",
        "Sunday: 7:00 AM - 9:00 PM"
      ] 
    },
    Pilates: { 
      intervals: [
        "Monday: 5:00 AM - 11:00 PM",
        "Tuesday: 5:00 AM - 11:00 PM",
        "Wednesday: 5:00 AM - 11:00 PM",
        "Thursday: 5:00 AM - 11:00 PM",
        "Friday: 5:00 AM - 11:00 PM",
        "Saturday: 7:00 AM - 9:00 PM",
        "Sunday: 7:00 AM - 9:00 PM"
      ] 
    },
  };

  return (
    <div className="min-h-screen bg-background">

      {/* Hero Banner */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden pt-0">
        {/* Video Background */}
        <div className="absolute inset-0">
          {videoUrl && !videoError ? (
            <video
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
              poster={heroImage}
              onError={() => setVideoError(true)}
             src={videoUrl}
            />
          ) : (
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${heroImage})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(14,90%,55%,0.4)] to-[hsl(25,95%,53%,0.35)]"></div>
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
            className="bg-white text-[hsl(14, 100.00%, 80.20%)] hover:bg-white/90 text-lg px-8 py-6 transition-all shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)]"
            onClick={() => {
              const element = document.getElementById("plans");
              if (element) {
                const headerOffset = 80;
                const elementPosition = element.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({
                  top: offsetPosition,
                  behavior: "smooth"
                });
              }
            }}
          >
            {t('hero.button')}
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent"></div>
      </section>

      {/* Plans Section */}
      <section id="plans" className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-foreground mb-4">{t('section.plans.title')}</h2>
            <p className="text-xl text-muted-foreground">{t('section.plans.subtitle')}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[
              { name: "Individual", icon: "💪" },
              { name: "Instructor", icon: "🏋️" },
              { name: "Children", icon: "👶" },
              { name: "Pilates", icon: "🧘" }
            ].map((plan) => {
              const details = planDetails[plan.name];
              const isOpen = openPlan === plan.name;
              return (
                <div key={plan.name} className="relative">
                  <Card 
                    className="p-6 text-center hover:shadow-xl transition-all bg-card border-border group"
                  >
                    <div 
                      className="cursor-pointer"
                      onClick={() => {
                        if (details?.intervals) {
                          setOpenPlan(isOpen ? null : plan.name);
                        }
                      }}
                    >
                      <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{plan.icon}</div>
                      <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                      <div className="w-12 h-1 bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] mx-auto rounded-full mb-4"></div>
                      
                      {details?.message ? (
                        <p className="text-sm text-muted-foreground mt-4">{details.message}</p>
                      ) : details?.intervals ? (
                        <div className="mt-4">
                          <div className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center justify-center gap-2">
                            View Hours
                            <svg 
                              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </Card>
                  
                  {details?.intervals && isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-card border border-border shadow-lg rounded-lg z-10">
                      <div className="space-y-2">
                        {details.intervals.map((interval, index) => (
                          <p key={index} className="text-sm text-muted-foreground text-left">
                            {interval}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Training Programs Slideshow */}
      <section id="programs" className="py-24 px-4 bg-muted/30">
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
                          onClick={() => {
                            if (isAuthenticated) {
                              addToCart({
                                id: program.name.toLowerCase().replace(/\s+/g, '-'),
                                name: program.name,
                                category: program.category,
                                image: program.image,
                              });
                            } else {
                              navigate('/login');
                            }
                          }}
                        >
                          {isAuthenticated ? t('button.addToCart') : t('button.loginToPurchase')}
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
    </div>
  );
};

export default Index;

