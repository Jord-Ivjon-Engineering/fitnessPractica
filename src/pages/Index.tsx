import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { trainingProgramApi, TrainingProgram } from "@/services/api";
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
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [programsLoading, setProgramsLoading] = useState(true);
  const [currentSubtitlePair, setCurrentSubtitlePair] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { language, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();

  const videoUrl = heroVideo;

  // Fetch training programs from database
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setProgramsLoading(true);
        const response = await trainingProgramApi.getAll();
        if (response.data.success) {
          setPrograms(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching programs:', error);
      } finally {
        setProgramsLoading(false);
      }
    };

    fetchPrograms();
  }, []);

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

  // Rotate subtitles every 15 seconds
  // Structure: 0 = subtitle 1 alone, 1 = subtitles 2&3, 2 = subtitles 4&5, 3 = subtitles 6&7, 4 = subtitles 8&9
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentSubtitlePair((prev) => (prev + 1) % 5); // 5 groups total (1 alone + 4 pairs)
        setTimeout(() => {
          setIsAnimating(false);
        }, 50); // Small delay to ensure new content is rendered
      }, 500); // Half of animation duration
    }, 3000); // Rotate every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // Get the subtitles for the current group
  const getSubtitlePair = () => {
    if (currentSubtitlePair === 0) {
      // First one appears alone
      return [t('hero.subtitle.1')];
    } else {
      // Rest appear in pairs
      const baseIndex = (currentSubtitlePair - 1) * 2 + 2; // Start from subtitle 2
      return [
        t(`hero.subtitle.${baseIndex}`),
        t(`hero.subtitle.${baseIndex + 1}`)
      ];
    }
  };

  const planDetails: Record<string, { intervals?: string[]; ageGroups?: Array<{ ageRange: string; intervals: string[] }>; message?: string }> = {
        Boxing: {
          intervals: [
            t('plan.boxing.tuesday'),
            t('plan.boxing.thursday')
          ]
        },
        Spining: {
          intervals: [
            t('plan.spining.monday'),
            t('plan.spining.wednesday'),
            t('plan.spining.friday')
          ]
        },
    CrossFit: { 
      intervals: [
        "Monday: 10:00 AM - 11:00 AM & 17:00 PM - 18:00 PM & 20:00 PM - 21:00 PM",
        "Tuesday: 10:00 AM - 11:00 AM & 17:00 PM - 18:00 PM & 20:00 PM - 21:00 PM",
        "Wednesday: 10:00 AM - 11:00 AM & 17:00 PM - 18:00 PM & 20:00 PM - 21:00 PM",
        "Thursday: 10:00 AM - 11:00 AM & 17:00 PM - 18:00 PM & 20:00 PM - 21:00 PM",
        "Friday: 10:00 AM - 11:00 AM & 17:00 PM - 18:00 PM & 20:00 PM - 21:00 PM",
        "Saturday: 10:00 AM - 11:00 AM & 17:00 PM - 18:00 PM & 20:00 PM - 21:00 PM",
        "Sunday: 10:00 AM - 11:00 AM & 17:00 PM - 18:00 PM & 20:00 PM - 21:00 PM"
      ] 
    },
    Aerobics: { intervals: [
        "Monday: 8:00 AM - 9:00 AM & 18:00 PM - 19:00 PM ",
        "Tuesday: 8:00 AM - 9:00 AM & 18:00 PM - 19:00 PM ",
        "Wednesday: 8:00 AM - 9:00 AM & 18:00 PM - 19:00 PM ",
        "Thursday: 8:00 AM - 9:00 AM & 18:00 PM - 19:00 PM ",
        "Friday: 8:00 AM - 9:00 AM & 18:00 PM - 19:00 PM ",
        "Saturday: 8:00 AM - 9:00 AM & 18:00 PM - 19:00 PM ",
        "Sunday: 8:00 AM - 9:00 AM & 18:00 PM - 19:00 PM "
      ]
    },
    Children: { 
      ageGroups: [
        {
          ageRange: "Ages 4-8",
          intervals: [
            "Tuesday: 17:00 PM - 18:00 PM",
            "Thursday: 17:00 PM - 18:00 PM",
            "Saturday: 10:00 AM - 11:00 AM",
          ]
        },
        {
          ageRange: "Ages 9-12",
          intervals: [
            "Tuesday: 18:00 PM - 19:00 PM",
            "Thursday: 18:00 PM - 19:00 PM",
            "Saturday: 11:00 AM - 12:00 AM",
          ]
        }
      ]
    },
    Pilates: { 
      intervals: [
        "Monday: 8:30 AM - 9:30 AM & 18:00 PM - 19:00 PM",
        "Wednesday: 8:30 AM - 9:30 AM & 18:00 PM - 19:00 PM",
        "Friday: 8:30 AM - 9:30 AM & 18:00 PM - 19:00 PM"
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
          <div className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto space-y-2 overflow-hidden min-h-[120px] md:min-h-[140px] flex flex-col justify-center">
            {getSubtitlePair().map((subtitle, index) => (
              <p 
                key={`${currentSubtitlePair}-${index}`}
                className={`transition-all duration-1000 ease-in-out transform ${
                  isAnimating 
                    ? 'opacity-0 -translate-y-8 scale-95' 
                    : 'opacity-100 translate-y-0 scale-100'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {subtitle}
              </p>
            ))}
          </div>
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { name: "CrossFit", icon: "💪" },
              { name: "Aerobics", icon: "🏃" },
              { name: "Children", icon: "👶" },
              { name: "Boxing", icon: "🥊" },
              { name: "Pilates", icon: "🧘" },
              { name: "Spining", icon: "🚴‍♂️" }
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
                        if (details?.intervals || details?.ageGroups) {
                          setOpenPlan(isOpen ? null : plan.name);
                        }
                      }}
                    >
                      <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{plan.icon}</div>
                      <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                      <div className="w-12 h-1 bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] mx-auto rounded-full mb-4"></div>
                      
                      {details?.message ? (
                        <p className="text-sm text-muted-foreground mt-4">{details.message}</p>
                      ) : (details?.intervals || details?.ageGroups) ? (
                        <div className="mt-4">
                          <div className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center justify-center gap-2">
                            {t('index.viewHours')}
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
                  
                  {isOpen && (details?.intervals || details?.ageGroups) && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-card border border-border shadow-lg rounded-lg z-10">
                      {details?.ageGroups ? (
                        <div className="space-y-4">
                          {details.ageGroups.map((group, groupIndex) => (
                            <div key={groupIndex} className="space-y-2">
                              <h4 className="text-sm font-semibold text-foreground border-b border-border pb-1">
                                {group.ageRange}
                              </h4>
                              {group.intervals.map((interval, index) => (
                                <p key={index} className="text-sm text-muted-foreground text-left pl-2">
                                  {interval}
                                </p>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : details?.intervals ? (
                        <div className="space-y-2">
                          {details.intervals.map((interval, index) => {
                            // Split by comma and render each part on its own line
                            return interval.split(',').map((part, subIndex) => (
                              <p key={index + '-' + subIndex} className="text-sm text-muted-foreground text-left">
                                {part.trim()}
                              </p>
                            ));
                          })}
                        </div>
                      ) : null}
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
          
          {programsLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : programs.length > 0 ? (
            <Carousel className="w-full max-w-5xl mx-auto">
              <CarouselContent>
                {programs.map((program) => {
                  // Map category to fallback images (only used if database image fails)
                  const getFallbackImage = (category: string) => {
                    const categoryLower = category.toLowerCase();
                    if (categoryLower.includes('weight') || categoryLower.includes('fat') || categoryLower.includes('burn')) {
                      return planWeightLoss;
                    } else if (categoryLower.includes('muscle') || categoryLower.includes('strength')) {
                      return planMuscleGrow;
                    } else if (categoryLower.includes('cardio') || categoryLower.includes('endurance')) {
                      return planCardio;
                    } else if (categoryLower.includes('yoga') || categoryLower.includes('stretch') || categoryLower.includes('flexibility')) {
                      return planFlexibility;
                    } else if (categoryLower.includes('functional') || categoryLower.includes('athletic')) {
                      return planFunctional;
                    }
                    return planWeightLoss; // default fallback
                  };

                  // Use database imageUrl if available, otherwise use fallback
                  const fallbackImage = getFallbackImage(program.category);
                  // Ensure price is a number (handle Decimal types from database)
                  const originalPrice = program.price ? Number(program.price) : 0;
                  // Apply 40% discount for program ID 10 (frontend only)
                  const isDiscounted = program.id === 10;
                  const programPrice = isDiscounted ? 30 : originalPrice;

                  return (
                    <CarouselItem key={program.id}>
                      <Card className="overflow-hidden border-border min-h-[520px]">
                        <div className="relative h-[520px]">
                          <img 
                            src={program.imageUrl || fallbackImage} 
                            alt={program.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to default image if database imageUrl fails to load
                              const target = e.target as HTMLImageElement;
                              if (target.src !== fallbackImage) {
                                target.src = fallbackImage;
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                            {isDiscounted && (
                              <div className="inline-block px-4 py-1 mb-3 rounded-full bg-red-600 text-white text-sm font-bold mr-2">
                                40% OFF
                              </div>
                            )}
                            <div className="inline-block px-4 py-1 mb-3 rounded-full bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] text-sm font-semibold">
                              {program.category}
                            </div>
                            <h3 className="text-4xl font-bold mb-2">{program.name}</h3>
                            {program.description && (
                              <p className="text-sm text-white/90 mb-2">{program.description}</p>
                            )}
                            {(program.startDate || program.endDate) && (
                              <div className="text-sm text-white/80 mb-2">
                                {program.startDate && program.endDate ? (
                                  <p>
                                    {new Date(program.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(program.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </p>
                                ) : program.startDate ? (
                                  <p>{t('index.starts')}: {new Date(program.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                ) : program.endDate ? (
                                  <p>{t('index.ends')}: {new Date(program.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                ) : null}
                              </div>
                            )}
                            <div className="mb-4">
                              {isDiscounted && originalPrice > 0 && (
                                <p className="text-sm text-white/70 line-through mb-1">
                                  {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: (program.currency || 'all').toUpperCase(),
                                  }).format(originalPrice)}
                                </p>
                              )}
                              <p className="text-2xl font-semibold">
                                {programPrice > 0 ? (
                                  new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: (program.currency || 'all').toUpperCase(),
                                  }).format(programPrice)
                                ) : 'Free'}
                              </p>
                            </div>
                            <Button 
                              size="lg"
                              className="mt-4 bg-white text-[hsl(14,90%,55%)] hover:bg-white/90"
                              onClick={() => {
                                if (isAuthenticated) {
                                  addToCart({
                                    id: program.name.toLowerCase().replace(/\s+/g, '-'),
                                    programId: program.id,
                                    name: program.name,
                                    category: program.category,
                                    image: program.imageUrl || fallbackImage, // Use database imageUrl if available
                                    price: programPrice,
                                    currency: program.currency || 'all',
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
                  );
                })}
              </CarouselContent>
              <CarouselPrevious className="left-4" />
              <CarouselNext className="right-4" />
            </Carousel>
          ) : (
            <div className="text-center py-24">
              <p className="text-muted-foreground text-lg">{t('index.noPrograms')}</p>
            </div>
          )}
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
                {t('index.about.p1')}
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t('index.about.p2')}
              </p>
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
                <div className="flex items-center justify-center w-12 h-12 rounded-full overflow-hidden">
                  <img 
                    src="https://fitnesspractica.fra1.cdn.digitaloceanspaces.com/uploads/images/WhatsApp%20Image%202025-12-10%20at%2021.30.13.jpeg" 
                    alt="Fitness Practica Location" 
                    className="w-full h-full object-cover" 
                  />
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
                <div className="flex items-center justify-center w-12 h-12 rounded-full overflow-hidden">
                  <img 
                    src="https://fitnesspractica.fra1.cdn.digitaloceanspaces.com/uploads/images/program_1764986739884-572851476.jpg" 
                    alt="Fitness Practica 2 Location" 
                    className="w-full h-full object-cover" 
                  />
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

