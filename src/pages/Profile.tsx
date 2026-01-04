import { useState, useEffect } from "react";
import CountryCodeSelector from "@/components/CountryCodeSelector";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, Mail, Phone, Calendar, Dumbbell, Edit2, LogOut, Clock, Lock, ExternalLink, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { profileApi, UserProfile, UserProgram, trainingProgramApi } from "@/services/api";
import { Loader2 } from "lucide-react";
import VideoModal from "@/components/VideoModal";
import { useLanguage } from "@/contexts/LanguageContext";

// Declare Telegram widget types
declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthUser) => void;
  }
}

interface TelegramAuthUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

const TELEGRAM_CHANNEL_URL = 'https://t.me/+9E6XqWmWsfo5MjM0';
const LIVE_STREAM_PROGRAM_ID = 999;
// Strip @ symbol if present - Telegram Login Widget expects username without @
const TELEGRAM_BOT_USERNAME = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'your_bot_username').replace(/^@/, '');

const Profile = () => {
  const { user, logout, isLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [programs, setPrograms] = useState<UserProgram[]>([]);
  const [expandedProgramId, setExpandedProgramId] = useState<number | null>(null);
  const [programVideos, setProgramVideos] = useState<Record<number, { id: number; programId: number; url: string; title: string | null; createdAt: string; exercisesData?: any }[]>>({});
  const [videoProgress, setVideoProgress] = useState<Record<number, Record<number, number>>>({});
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCountryCode, setEditCountryCode] = useState("+355"); // Default to Albania
    // Country codes (copy from Signup)
    const countryCodes = [
      { code: "+355", country: "Albania", flag: "🇦🇱", isoCode: "AL" },
      { code: "+213", country: "Algeria", flag: "🇩🇿", isoCode: "DZ" },
      { code: "+374", country: "Armenia", flag: "🇦🇲", isoCode: "AM" },
      { code: "+54", country: "Argentina", flag: "🇦🇷", isoCode: "AR" },
      { code: "+61", country: "Australia", flag: "🇦🇺", isoCode: "AU" },
      { code: "+43", country: "Austria", flag: "🇦🇹", isoCode: "AT" },
      { code: "+994", country: "Azerbaijan", flag: "🇦🇿", isoCode: "AZ" },
      { code: "+973", country: "Bahrain", flag: "🇧🇭", isoCode: "BH" },
      { code: "+880", country: "Bangladesh", flag: "🇧🇩", isoCode: "BD" },
      { code: "+375", country: "Belarus", flag: "🇧🇾", isoCode: "BY" },
      { code: "+32", country: "Belgium", flag: "🇧🇪", isoCode: "BE" },
      { code: "+591", country: "Bolivia", flag: "🇧🇴", isoCode: "BO" },
      { code: "+387", country: "Bosnia", flag: "🇧🇦", isoCode: "BA" },
      { code: "+55", country: "Brazil", flag: "🇧🇷", isoCode: "BR" },
      { code: "+673", country: "Brunei", flag: "🇧🇳", isoCode: "BN" },
      { code: "+359", country: "Bulgaria", flag: "🇧🇬", isoCode: "BG" },
      { code: "+855", country: "Cambodia", flag: "🇰🇭", isoCode: "KH" },
      { code: "+1", country: "Canada", flag: "🇨🇦", isoCode: "CA" },
      { code: "+56", country: "Chile", flag: "🇨🇱", isoCode: "CL" },
      { code: "+86", country: "China", flag: "🇨🇳", isoCode: "CN" },
      { code: "+57", country: "Colombia", flag: "🇨🇴", isoCode: "CO" },
      { code: "+506", country: "Costa Rica", flag: "🇨🇷", isoCode: "CR" },
      { code: "+385", country: "Croatia", flag: "🇭🇷", isoCode: "HR" },
      { code: "+357", country: "Cyprus", flag: "🇨🇾", isoCode: "CY" },
      { code: "+420", country: "Czech Republic", flag: "🇨🇿", isoCode: "CZ" },
      { code: "+45", country: "Denmark", flag: "🇩🇰", isoCode: "DK" },
      { code: "+593", country: "Ecuador", flag: "🇪🇨", isoCode: "EC" },
      { code: "+20", country: "Egypt", flag: "🇪🇬", isoCode: "EG" },
      { code: "+503", country: "El Salvador", flag: "🇸🇻", isoCode: "SV" },
      { code: "+372", country: "Estonia", flag: "🇪🇪", isoCode: "EE" },
      { code: "+358", country: "Finland", flag: "🇫🇮", isoCode: "FI" },
      { code: "+33", country: "France", flag: "🇫🇷", isoCode: "FR" },
      { code: "+995", country: "Georgia", flag: "🇬🇪", isoCode: "GE" },
      { code: "+49", country: "Germany", flag: "🇩🇪", isoCode: "DE" },
      { code: "+233", country: "Ghana", flag: "🇬🇭", isoCode: "GH" },
      { code: "+30", country: "Greece", flag: "🇬🇷", isoCode: "GR" },
      // ... (add more as needed)
    ];
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [isLinkingTelegram, setIsLinkingTelegram] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [telegramError, setTelegramError] = useState("");
  const [telegramSuccess, setTelegramSuccess] = useState("");
  const [fullscreenVideoUrl, setFullscreenVideoUrl] = useState<string | null>(null);
  const [fullscreenVideoTitle, setFullscreenVideoTitle] = useState<string>('');
  const [fullscreenVideoId, setFullscreenVideoId] = useState<number | undefined>(undefined);
  const [fullscreenProgramId, setFullscreenProgramId] = useState<number | undefined>(undefined);
  const [fullscreenVideoInitialProgress, setFullscreenVideoInitialProgress] = useState<number | undefined>(undefined);

  const handleTelegramAuth = async (telegramUser: TelegramAuthUser) => {
    try {
      setTelegramError("");
      setTelegramSuccess("");

      // Send the full auth data to backend for verification
      const response = await profileApi.linkTelegram({
        telegramAuthData: telegramUser,
      });

      if (response.data.success) {
        setTelegramSuccess("Telegram account linked successfully!");
        setProfile(response.data.data);
        setTelegramUsername(response.data.data.telegramUsername || "");
        setTelegramId(response.data.data.telegramId || "");
        setIsLinkingTelegram(false);
        setTimeout(() => {
          setTelegramSuccess("");
        }, 3000);
      }
    } catch (error: any) {
      setTelegramError(error.response?.data?.error?.message || "Failed to link Telegram account");
    }
  };

  useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) {
      return;
    }

    if (!user) {
      navigate("/login");
      return;
    }
    fetchProfile();
    fetchPrograms();

    // Set up Telegram Login Widget callback
    window.onTelegramAuth = handleTelegramAuth;

    // Cleanup
    return () => {
      window.onTelegramAuth = undefined;
    };
  }, [user, isLoading, navigate]);

  // Separate effect for loading Telegram widget when dialog opens
  useEffect(() => {
    if (!isLinkingTelegram) {
      return;
    }

    // Load Telegram widget when dialog is opened
    const loadTelegramWidget = () => {
      const container = document.getElementById('telegram-login-container');
      if (!container) {
        return;
      }

      // Clear container first to remove any existing widget
      container.innerHTML = '';
      
      // Check if bot username is configured
      if (!TELEGRAM_BOT_USERNAME || TELEGRAM_BOT_USERNAME === 'your_bot_username') {
        container.innerHTML = '<p style="color: hsl(var(--destructive)); font-size: 0.875rem; padding: 0.5rem;">Telegram bot username not configured. Please set VITE_TELEGRAM_BOT_USERNAME in your environment variables (without @ symbol).</p>';
        return;
      }

      // Check if we're on localhost - Telegram Login Widget doesn't work with localhost
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname === '';
      
      if (isLocalhost) {
        container.innerHTML = `
          <div style="padding: 1rem; background: hsl(var(--muted)); border-radius: 0.5rem; margin-bottom: 1rem;">
            <p style="color: hsl(var(--muted-foreground)); font-size: 0.875rem; margin-bottom: 0.5rem;">
              <strong>Note:</strong> Telegram Login Widget requires a public domain and doesn't work with localhost.
            </p>
            <p style="color: hsl(var(--muted-foreground)); font-size: 0.875rem; margin-bottom: 0.5rem;">
              For development, please use the <strong>Manual Entry</strong> option below, or use a tunnel service like <a href="https://ngrok.com" target="_blank" rel="noopener noreferrer" style="color: hsl(var(--primary)); text-decoration: underline;">ngrok</a> to get a public URL.
            </p>
            <p style="color: hsl(var(--muted-foreground)); font-size: 0.875rem;">
              In production, the Telegram Login Widget will work automatically.
            </p>
          </div>
        `;
        return;
      }
      
      // Create script element for Telegram widget
      // Add timestamp to force reload each time dialog opens
      const timestamp = Date.now();
      const script = document.createElement('script');
      script.src = `https://telegram.org/js/telegram-widget.js?22&t=${timestamp}`;
      script.async = true;
      script.setAttribute('data-telegram-login', TELEGRAM_BOT_USERNAME);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');
      
      // Handle script load errors
      script.onerror = () => {
        container.innerHTML = '<p style="color: hsl(var(--destructive)); font-size: 0.875rem; padding: 0.5rem;">Failed to load Telegram widget. Please check your internet connection and ensure VITE_TELEGRAM_BOT_USERNAME is set correctly. Also verify your domain is whitelisted in BotFather.</p>';
      };
      
      container.appendChild(script);
      
      // Log for debugging
      console.log('Loading Telegram widget with bot username:', TELEGRAM_BOT_USERNAME);
    };

    // Wait for dialog to be fully rendered (longer delay for dialog)
    const timer = setTimeout(loadTelegramWidget, 300);

    return () => {
      clearTimeout(timer);
      // Clean up widget when dialog closes
      const container = document.getElementById('telegram-login-container');
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [isLinkingTelegram]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const handleProgramClick = async (userProgram: UserProgram) => {
    const progId = userProgram.program?.id;
    if (!progId) return;

    // toggle expand
    if (expandedProgramId === progId) {
      setExpandedProgramId(null);
      return;
    }

    setExpandedProgramId(progId);

    // fetch videos if not loaded
    if (!programVideos[progId]) {
      try {
        const resp = await trainingProgramApi.getVideos(progId);
        if (resp && resp.data && resp.data.data) {
          // Hide placeholder/blank videos from users
          const visible = resp.data.data.filter((v: any) => typeof v.url === 'string' && v.url.trim() !== '');
          setProgramVideos(prev => ({ ...prev, [progId]: visible }));
        }
      } catch (err) {
        console.error('Error fetching program videos', err);
      }
    }

    // Fetch video progress for this program
    try {
      const progressResp = await trainingProgramApi.getVideoProgress(progId);
      if (progressResp && progressResp.data && progressResp.data.data) {
        const progressMap: Record<number, number> = {};
        progressResp.data.data.forEach((p: any) => {
          progressMap[p.videoId] = p.watchedPercentage;
        });
        setVideoProgress(prev => ({ ...prev, [progId]: progressMap }));
      }
    } catch (err) {
      console.error('Error fetching video progress', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await profileApi.getProfile();
      if (response.data.success) {
        setProfile(response.data.data);
        setEditName(response.data.data.name);
        // Split phone into country code and number if possible
        const phone = response.data.data.phone || "";
        const found = countryCodes.find(c => phone.startsWith(c.code));
        if (found) {
          setEditCountryCode(found.code);
          setEditPhone(phone.slice(found.code.length));
        } else {
          setEditCountryCode("+355");
          setEditPhone(phone);
        }
        // Set Telegram fields
        setTelegramUsername(response.data.data.telegramUsername || "");
        setTelegramId(response.data.data.telegramId || "");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await profileApi.getUserPrograms();
      if (response.data.success) {
        // Filter out programs where both plan and program are null (deleted programs)
        const validPrograms = response.data.data.filter(
          (userProgram: UserProgram) => userProgram.plan || userProgram.program
        );
        setPrograms(validPrograms);
      }
    } catch (error) {
      console.error("Error fetching programs:", error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const response = await profileApi.updateProfile({
        name: editName,
        phone: editCountryCode + editPhone || undefined,
      });
      if (response.data.success) {
        setProfile(response.data.data);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleUpdatePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    // Validation
    if (!currentPassword) {
      setPasswordError(t('profile.currentPasswordRequired'));
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(t('profile.passwordTooShort'));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError(t('profile.passwordsNotMatch'));
      return;
    }

    try {
      const response = await profileApi.updatePassword({
        currentPassword,
        newPassword,
      });
      
      if (response.data.success) {
        setPasswordSuccess(t('profile.passwordUpdated'));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setTimeout(() => {
          setIsChangingPassword(false);
          setPasswordSuccess("");
        }, 2000);
      }
    } catch (error: any) {
      setPasswordError(error.response?.data?.error?.message || t('profile.passwordUpdateFailed'));
    }
  };

  const handleLinkTelegram = async () => {
    setTelegramError("");
    setTelegramSuccess("");

    // Validation
    if (!telegramUsername && !telegramId) {
      setTelegramError("Please enter either Telegram username or ID");
      return;
    }

    // Validate username format if provided
    if (telegramUsername) {
      const cleanUsername = telegramUsername.replace('@', '').trim();
      if (cleanUsername.length < 5) {
        setTelegramError("Telegram username must be at least 5 characters");
        return;
      }
      setTelegramUsername(cleanUsername);
    }

    // Validate ID format if provided
    if (telegramId) {
      const idNum = parseInt(telegramId, 10);
      if (isNaN(idNum) || idNum <= 0) {
        setTelegramError("Telegram ID must be a valid positive number");
        return;
      }
    }

    try {
      const response = await profileApi.linkTelegram({
        telegramUsername: telegramUsername || undefined,
        telegramId: telegramId || undefined,
      });
      
      if (response.data.success) {
        setTelegramSuccess("Telegram account linked successfully!");
        setProfile(response.data.data);
        setTelegramUsername(response.data.data.telegramUsername || "");
        setTelegramId(response.data.data.telegramId || "");
        setTimeout(() => {
          setIsLinkingTelegram(false);
          setTelegramSuccess("");
          setTelegramError("");
        }, 2000);
      }
    } catch (error: any) {
      setTelegramError(error.response?.data?.error?.message || "Failed to link Telegram account");
    }
  };

  const handleUpdateEmail = async () => {
    setEmailError("");
    setEmailSuccess("");

    // Validation
    if (!newEmail) {
      setEmailError(t('profile.invalidEmail'));
      return;
    }

    if (!emailPassword) {
      setEmailError(t('profile.currentPasswordRequired'));
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError(t('profile.invalidEmail'));
      return;
    }

    try {
      const response = await profileApi.updateEmail({
        newEmail,
        currentPassword: emailPassword,
      });
      
      if (response.data.success && response.data.data) {
        setEmailSuccess(t('profile.emailUpdated'));
        setProfile(response.data.data);
        setNewEmail("");
        setEmailPassword("");
        setTimeout(() => {
          setIsChangingEmail(false);
          setEmailSuccess("");
        }, 2000);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message;
      if (errorMsg?.includes('already in use')) {
        setEmailError(t('profile.emailAlreadyExists'));
      } else if (errorMsg?.includes('Invalid email')) {
        setEmailError(t('profile.invalidEmail'));
      } else {
        setEmailError(errorMsg || t('profile.emailUpdateFailed'));
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getProgramStatus = (startDate: string | null, endDate: string | null) => {
    if (!startDate && !endDate) {
      return null; // No dates, no status
    }

    const now = new Date();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    // If start date exists and hasn't come yet
    if (start && now < start) {
      return { text: 'Not Available Yet', status: 'upcoming' };
    }

    // If end date exists and has passed
    if (end && now > end) {
      return { text: 'Finished', status: 'finished' };
    }

    // If we have dates and we're within the range, or if we only have start date and it's passed
    if ((start && now >= start && (!end || now <= end)) || (start && now >= start && !end)) {
      return { text: 'Active', status: 'active' };
    }

    // If we only have end date and it hasn't passed
    if (end && now <= end && !start) {
      return { text: 'Active', status: 'active' };
    }

    return null;
  };

  // Show loading while auth is initializing or profile is loading
  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">{t('profile.title')}</h1>
          </div>
          <p className="text-muted-foreground">{t('profile.subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="md:col-span-1">
            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">{t('profile.information')}</h2>
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      {t('profile.name')}
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      {t('profile.phone')}
                    </label>
                    <div className="flex gap-2">
                      <CountryCodeSelector
                        countries={countryCodes}
                        value={editCountryCode}
                        onChange={setEditCountryCode}
                      />
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder={t('signup.phonePlaceholder')}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdateProfile}
                      className="bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] hover:opacity-90"
                    >
                      {t('common.save')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setEditName(profile?.name || "");
                        // Reset country code and phone
                        if (profile?.phone) {
                          const found = countryCodes.find(c => profile.phone!.startsWith(c.code));
                          if (found) {
                            setEditCountryCode(found.code);
                            setEditPhone(profile.phone!.slice(found.code.length));
                          } else {
                            setEditCountryCode("+355");
                            setEditPhone(profile.phone!);
                          }
                        } else {
                          setEditCountryCode("+355");
                          setEditPhone("");
                        }
                      }}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('profile.name')}</p>
                      <p className="text-foreground font-semibold">{profile?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('profile.email')}</p>
                      <p className="text-foreground font-semibold">{profile?.email}</p>
                    </div>
                  </div>
                  {profile?.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t('profile.phone')}</p>
                        <p className="text-foreground font-semibold">{profile.phone}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('profile.memberSince')}</p>
                      <p className="text-foreground font-semibold">
                        {profile?.createdAt ? formatDate(profile.createdAt) : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsChangingEmail(!isChangingEmail)}
              >
                <Mail className="w-4 h-4 mr-2" />
                {t('profile.changeEmail')}
              </Button>

              {isChangingEmail && (
                <div className="space-y-4 pt-4 border-t border-border">
                  {emailError && (
                    <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                      {emailError}
                    </div>
                  )}
                  {emailSuccess && (
                    <div className="bg-green-100 text-green-800 p-3 rounded-md text-sm">
                      {emailSuccess}
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      {t('profile.newEmail')}
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={t('profile.newEmailPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      {t('profile.currentPassword')}
                    </label>
                    <input
                      type="password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={t('profile.currentPasswordPlaceholder')}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdateEmail}
                      className="flex-1 bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] hover:opacity-90"
                    >
                      {t('common.save')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsChangingEmail(false);
                        setNewEmail("");
                        setEmailPassword("");
                        setEmailError("");
                        setEmailSuccess("");
                      }}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsChangingPassword(!isChangingPassword)}
              >
                <Lock className="w-4 h-4 mr-2" />
                {t('profile.changePassword')}
              </Button>

              {isChangingPassword && (
                <div className="space-y-4 pt-4 border-t border-border">
                  {passwordError && (
                    <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                      {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div className="bg-green-100 text-green-800 p-3 rounded-md text-sm">
                      {passwordSuccess}
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      {t('profile.currentPassword')}
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={t('profile.currentPasswordPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      {t('profile.newPassword')}
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={t('profile.newPasswordPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      {t('profile.confirmNewPassword')}
                    </label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={t('profile.confirmNewPasswordPlaceholder')}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdatePassword}
                      className="flex-1 bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] hover:opacity-90"
                    >
                      {t('common.save')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmNewPassword("");
                        setPasswordError("");
                        setPasswordSuccess("");
                      }}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsLinkingTelegram(true)}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {profile?.telegramUsername || profile?.telegramId ? 'Update Telegram' : 'Link Telegram'}
              </Button>

              <Dialog open={isLinkingTelegram} onOpenChange={setIsLinkingTelegram}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {profile?.telegramUsername || profile?.telegramId ? 'Update Telegram Account' : 'Link Telegram Account'}
                    </DialogTitle>
                    <DialogDescription>
                      Connect your Telegram account to receive updates and access exclusive content.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {telegramError && (
                      <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                        {telegramError}
                      </div>
                    )}
                    {telegramSuccess && (
                      <div className="bg-green-100 text-green-800 p-3 rounded-md text-sm">
                        {telegramSuccess}
                      </div>
                    )}

                    {profile?.telegramUsername && (
                      <div className="text-sm text-muted-foreground mb-4">
                        Currently linked: {profile.telegramUsername}
                        {profile.telegramId && ` (ID: ${profile.telegramId})`}
                      </div>
                    )}

                    {/* Telegram Login Widget */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-3 block">
                          Login with Telegram (Recommended)
                        </label>
                        <div 
                          id="telegram-login-container"
                          className="flex justify-center min-h-[40px]"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Click the button above to authenticate with Telegram. Your account will be automatically linked.
                        </p>
                      </div>

                      <div className="relative flex items-center">
                        <div className="flex-grow border-t border-border"></div>
                        <span className="px-3 text-xs text-muted-foreground">OR</span>
                        <div className="flex-grow border-t border-border"></div>
                      </div>

                      {/* Manual Entry Fallback */}
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Manual Entry (Alternative)
                        </label>
                        <div className="space-y-3">
                          <div>
                            <input
                              type="text"
                              value={telegramUsername}
                              onChange={(e) => setTelegramUsername(e.target.value)}
                              className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="@username"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Telegram username
                            </p>
                          </div>

                          <div>
                            <input
                              type="text"
                              value={telegramId}
                              onChange={(e) => setTelegramId(e.target.value)}
                              className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="123456789"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Telegram ID - Find by messaging @userinfobot
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsLinkingTelegram(false);
                        setTelegramUsername(profile?.telegramUsername || "");
                        setTelegramId(profile?.telegramId || "");
                        setTelegramError("");
                        setTelegramSuccess("");
                      }}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      onClick={handleLinkTelegram}
                      disabled={!telegramUsername && !telegramId}
                    >
                      {t('common.save')} (Manual)
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('header.logout')}
              </Button>
            </Card>
          </div>

          {/* Purchased Programs */}
          <div className="md:col-span-2">
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-6">{t('profile.myPrograms')}</h2>
              
              {programs.length === 0 ? (
                <div className="text-center py-12">
                  <Dumbbell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg mb-2">{t('profile.noPrograms')}</p>
                  <p className="text-muted-foreground text-sm mb-4">
                    Browse our plans and training programs to get started!
                  </p>
                  <Button
                    onClick={() => {
                      navigate("/#programs");
                    }}
                    className="bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] hover:opacity-90"
                  >
                    {t('button.browsePrograms')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {programs.map((userProgram) => (
                    <Card
                      key={userProgram.id}
                      className={`p-6 border-border hover:shadow-lg transition-shadow ${userProgram.program?.imageUrl ? 'cursor-pointer' : ''}`}
                        onClick={() => handleProgramClick(userProgram)}
                        title={userProgram.program?.imageUrl ? t('profile.openMedia') : t('profile.viewDetails')}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Dumbbell className="w-6 h-6 text-primary" />
                            <h3 className="text-xl font-bold text-foreground">
                              {userProgram.plan?.name || userProgram.program?.name || t('profile.unknownProgram')}
                            </h3>
                            {userProgram.program && (() => {
                              const programStatus = getProgramStatus(userProgram.program.startDate, userProgram.program.endDate);
                              return programStatus ? (
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    programStatus.status === "active"
                                      ? "bg-green-100 text-green-800"
                                      : programStatus.status === "upcoming"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {programStatus.text}
                                </span>
                              ) : (
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    userProgram.status === "active"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {userProgram.status}
                                </span>
                              );
                            })()}
                            {!userProgram.program && (
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  userProgram.status === "active"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {userProgram.status}
                              </span>
                            )}
                          </div>
                          
                          {userProgram.plan && (
                            <p className="text-muted-foreground mb-2">
                              {userProgram.plan.description || "No description available"}
                            </p>
                          )}
                          
                          {userProgram.program && (
                            <div className="mb-2">
                              <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] text-white text-sm font-semibold mr-2">
                                {userProgram.program.category}
                              </span>
                              {userProgram.program.description && (
                                <p className="text-muted-foreground mt-2">
                                  {userProgram.program.description}
                                </p>
                              )}
                              {(userProgram.program.startDate || userProgram.program.endDate) && (
                                <div className="mt-2 text-sm text-muted-foreground">
                                  {userProgram.program.startDate && userProgram.program.endDate ? (
                                    <p>
                                      {t('profile.programDates')}: {formatDate(userProgram.program.startDate)} - {formatDate(userProgram.program.endDate)}
                                    </p>
                                  ) : userProgram.program.startDate ? (
                                    <p>{t('index.starts')}: {formatDate(userProgram.program.startDate)}</p>
                                  ) : userProgram.program.endDate ? (
                                    <p>{t('index.ends')}: {formatDate(userProgram.program.endDate)}</p>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{t('profile.purchased')}: {formatDate(userProgram.purchasedAt)}</span>
                            </div>
                            {userProgram.expiresAt && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>
                                  {t('profile.expires')}: {formatDate(userProgram.expiresAt)}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Telegram channel button for live stream */}
                          {userProgram.programId === LIVE_STREAM_PROGRAM_ID && (
                            <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                              <div className="relative group">
                                <Button
                                  onClick={() => {
                                    if (profile?.telegramId || profile?.telegramUsername) {
                                      window.open(TELEGRAM_CHANNEL_URL, '_blank', 'noopener,noreferrer');
                                    }
                                  }}
                                  disabled={!profile?.telegramId && !profile?.telegramUsername}
                                  className={`${
                                    profile?.telegramId || profile?.telegramUsername
                                      ? 'bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] hover:opacity-90 text-white font-semibold'
                                      : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-60'
                                  }`}
                                  title={!profile?.telegramId && !profile?.telegramUsername ? t('button.linkTelegramFirst') : ''}
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  {t('button.openTelegramChannel')}
                                </Button>
                                {!profile?.telegramId && !profile?.telegramUsername && (
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                    {t('button.linkTelegramFirst')}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Program videos list with progress and conditional Continue buttons */}
                          {expandedProgramId === userProgram.program?.id && (() => {
                            const videos = programVideos[userProgram.program?.id || 0] || [];
                            
                            // Helper function to normalize title for comparison
                            const normalizeTitle = (title: string | null) => {
                              return (title || 'Untitled').trim().toLowerCase();
                            };
                            
                            // Group videos by normalized title to assign day numbers
                            const titleToDayMap: Record<string, number> = {};
                            let dayCounter = 1;
                            
                            videos.forEach((video) => {
                              const normalizedTitle = normalizeTitle(video.title);
                              if (!titleToDayMap[normalizedTitle]) {
                                titleToDayMap[normalizedTitle] = dayCounter++;
                              }
                            });
                            
                            return (
                              <div className="mt-4 space-y-4">
                                <Button
                                  className="w-full bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] hover:opacity-90 text-white font-semibold py-2"
                                  onClick={() => {
                                    const progresses = videoProgress[userProgram.program?.id || 0] || {};
                                    if (videos.length === 0) return;
                                    
                                    // Find the first unlocked video that's not completed
                                    let target = null;
                                    for (let i = 0; i < videos.length; i++) {
                                      const currentProgress = progresses[videos[i].id] || 0;
                                      const isCompleted = currentProgress >= 90;
                                      
                                      // Check if this video is unlocked (first video or previous is completed)
                                      const isFirstVideo = i === 0;
                                      const previousProgress = i > 0 ? (progresses[videos[i - 1].id] || 0) : 100;
                                      const isPreviousCompleted = previousProgress >= 90;
                                      const isUnlocked = isFirstVideo || isPreviousCompleted;
                                      
                                      if (isUnlocked && !isCompleted) {
                                        target = videos[i];
                                        break;
                                      }
                                    }
                                    
                                    // If all unlocked videos are completed, show the first video
                                    if (!target) {
                                      target = videos[0];
                                    }
                                    
                                    const full = target.url.startsWith('http') ? target.url : `${API_URL}${target.url.startsWith('/') ? '' : '/'}${target.url}`;
                                    const prog = progresses[target.id] || 0;
                                    const normalizedTargetTitle = normalizeTitle(target.title);
                                    const dayNumber = titleToDayMap[normalizedTargetTitle];
                                    const titleText = target.title || `Exercises for Day ${dayNumber}`;
                                    setFullscreenVideoUrl(full);
                                    setFullscreenVideoTitle(titleText);
                                    setFullscreenVideoId(target.id);
                                    setFullscreenProgramId(userProgram.program?.id);
                                    setFullscreenVideoInitialProgress(prog);
                                  }}
                                >{t('profile.startProgram')}</Button>

                                <div className="space-y-2">
                                  {videos.map((v, index) => {
                                    const progress = videoProgress[userProgram.program?.id || 0]?.[v.id] || 0;
                                    const isStarted = progress > 0 && progress < 90;
                                    const isCompleted = progress >= 90;
                                    
                                    // Check if previous video is completed (for sequential unlock)
                                    const isFirstVideo = index === 0;
                                    const previousVideo = index > 0 ? videos[index - 1] : null;
                                    const previousProgress = previousVideo ? (videoProgress[userProgram.program?.id || 0]?.[previousVideo.id] || 0) : 100;
                                    const isPreviousCompleted = previousProgress >= 90;
                                    const isUnlocked = isFirstVideo || isPreviousCompleted;
                                    
                                    // Get day number from grouped titles using normalized comparison
                                    const normalizedTitle = normalizeTitle(v.title);
                                    const dayNumber = titleToDayMap[normalizedTitle];
                                    const fullTitle = v.title 
                                      ? `Day ${dayNumber} - ${v.title}` 
                                      : `Day ${dayNumber}`;
                                    
                                    // Truncate title if longer than 70 characters
                                    const displayTitle = fullTitle.length > 70 
                                      ? fullTitle.substring(0, 70) + '...' 
                                      : fullTitle;
                                    
                                    return (
                                      <div 
                                        key={v.id} 
                                        className={`p-3 bg-muted rounded flex items-center justify-between ${isUnlocked ? 'cursor-pointer hover:bg-muted/80' : 'opacity-60 cursor-not-allowed'} transition-colors`}
                                        onClick={() => {
                                          if (!isUnlocked) return;
                                          const full = v.url.startsWith('http') ? v.url : `${API_URL}${v.url.startsWith('/') ? '' : '/'}${v.url}`;
                                          setFullscreenVideoUrl(full);
                                          setFullscreenVideoTitle(v.title || `Exercises for Day ${dayNumber}`);
                                          setFullscreenVideoId(v.id);
                                          setFullscreenProgramId(userProgram.program?.id);
                                          setFullscreenVideoInitialProgress(progress);
                                        }}
                                      >
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              {!isUnlocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                                              <span 
                                                className="font-semibold truncate text-sm"
                                                title={fullTitle.length > 40 ? fullTitle : undefined}
                                              >
                                                {displayTitle}
                                              </span>
                                            </div>
                                            <span className="text-xs text-muted-foreground ml-2">{Math.round(progress)}%</span>
                                          </div>
                                          <div className="w-full bg-gray-300 dark:bg-gray-700 h-2 rounded mt-2 overflow-hidden">
                                            <div
                                              className={`${isCompleted ? 'bg-green-500' : 'bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)]'} h-full transition-all`}
                                              style={{ width: `${Math.min(100, Math.round(progress))}%` }}
                                            ></div>
                                          </div>
                                          <div className="text-[10px] mt-1 text-muted-foreground">
                                            {!isUnlocked ? t('profile.videoLocked') : isCompleted ? t('profile.videoCompleted') : isStarted ? t('profile.videoInProgress') : t('profile.videoNotStarted')}
                                          </div>
                                        </div>
                                        <div className="ml-3" onClick={(e) => e.stopPropagation()}>
                                          {isStarted && isUnlocked && (
                                            <Button
                                              size="sm"
                                              onClick={() => {
                                                const full = v.url.startsWith('http') ? v.url : `${API_URL}${v.url.startsWith('/') ? '' : '/'}${v.url}`;
                                                setFullscreenVideoUrl(full);
                                                setFullscreenVideoTitle(v.title || `Exercises for Day ${dayNumber}`);
                                                setFullscreenVideoId(v.id);
                                                setFullscreenProgramId(userProgram.program?.id);
                                                setFullscreenVideoInitialProgress(progress);
                                              }}
                                            >{t('profile.continue')}</Button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {(videos.length === 0) && (
                                    <p className="text-xs text-muted-foreground">{t('profile.noVideos')}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Fullscreen video modal */}
      <VideoModal
        isOpen={fullscreenVideoUrl !== null}
        videoUrl={fullscreenVideoUrl || ''}
        videoTitle={fullscreenVideoTitle}
        videoId={fullscreenVideoId}
        programId={fullscreenProgramId}
        initialProgressPercent={fullscreenVideoInitialProgress}
        allVideos={fullscreenProgramId ? programVideos[fullscreenProgramId] : undefined}
        videoProgress={fullscreenProgramId ? videoProgress[fullscreenProgramId] : undefined}
        exercisesData={fullscreenVideoId && fullscreenProgramId 
          ? (programVideos[fullscreenProgramId]?.find(v => v.id === fullscreenVideoId)?.exercisesData || null)
          : null}
        onVideoSelect={(newVideoId, newUrl, newTitle, progress) => {
          setFullscreenVideoUrl(newUrl);
          setFullscreenVideoTitle(newTitle);
          setFullscreenVideoId(newVideoId);
          setFullscreenVideoInitialProgress(progress);
        }}
        onProgressUpdate={(videoId, progress) => {
          // Update the video progress state in real-time
          if (fullscreenProgramId) {
            setVideoProgress(prev => ({
              ...prev,
              [fullscreenProgramId]: {
                ...(prev[fullscreenProgramId] || {}),
                [videoId]: progress
              }
            }));
          }
        }}
        onClose={() => {
          setFullscreenVideoUrl(null);
          setFullscreenVideoTitle('');
          setFullscreenVideoId(undefined);
          setFullscreenProgramId(undefined);
          setFullscreenVideoInitialProgress(undefined);
        }}
      />
    </div>
  );
};

export default Profile;

