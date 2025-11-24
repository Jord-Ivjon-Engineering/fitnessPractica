import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, Mail, Phone, Calendar, Dumbbell, Edit2, LogOut, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { profileApi, UserProfile, UserProgram, trainingProgramApi } from "@/services/api";
import { Loader2 } from "lucide-react";

const Profile = () => {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [programs, setPrograms] = useState<UserProgram[]>([]);
  const [expandedProgramId, setExpandedProgramId] = useState<number | null>(null);
  const [programVideos, setProgramVideos] = useState<Record<number, { id: number; programId: number; url: string; title: string | null; createdAt: string }[]>>({});
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

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
  }, [user, isLoading, navigate]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const handleProgramClick = async (userProgram: UserProgram) => {
    const progId = userProgram.program?.id;
    if (!progId) return;

    // toggle expand
    if (expandedProgramId === progId) {
      setExpandedProgramId(null);
      setPlayingUrl(null);
      return;
    }

    setExpandedProgramId(progId);

    // fetch videos if not loaded
    if (!programVideos[progId]) {
      try {
        const resp = await trainingProgramApi.getVideos(progId);
        if (resp && resp.data && resp.data.data) {
          setProgramVideos(prev => ({ ...prev, [progId]: resp.data.data }));
          const first = resp.data.data[0];
          if (first) setPlayingUrl(first.url.startsWith('http') ? first.url : `${API_URL}${first.url.startsWith('/') ? '' : '/'}${first.url}`);
        }
      } catch (err) {
        console.error('Error fetching program videos', err);
      }
    } else {
      const v = programVideos[progId];
      const first = v && v[0];
      if (first) setPlayingUrl(first.url.startsWith('http') ? first.url : `${API_URL}${first.url.startsWith('/') ? '' : '/'}${first.url}`);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await profileApi.getProfile();
      if (response.data.success) {
        setProfile(response.data.data);
        setEditName(response.data.data.name);
        setEditPhone(response.data.data.phone || "");
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
        setPrograms(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching programs:", error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const response = await profileApi.updateProfile({
        name: editName,
        phone: editPhone || undefined,
      });
      if (response.data.success) {
        setProfile(response.data.data);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
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
            <h1 className="text-4xl font-bold text-foreground">My Profile</h1>
          </div>
          <p className="text-muted-foreground">Manage your account and view your purchased programs</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="md:col-span-1">
            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Profile Information</h2>
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
                      Name
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
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdateProfile}
                      className="bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] hover:opacity-90"
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setEditName(profile?.name || "");
                        setEditPhone(profile?.phone || "");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="text-foreground font-semibold">{profile?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-foreground font-semibold">{profile?.email}</p>
                    </div>
                  </div>
                  {profile?.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="text-foreground font-semibold">{profile.phone}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Member Since</p>
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
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </Card>
          </div>

          {/* Purchased Programs */}
          <div className="md:col-span-2">
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-6">My Programs</h2>
              
              {programs.length === 0 ? (
                <div className="text-center py-12">
                  <Dumbbell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg mb-2">No programs purchased yet</p>
                  <p className="text-muted-foreground text-sm mb-4">
                    Browse our plans and training programs to get started!
                  </p>
                  <Button
                    onClick={() => {
                      navigate("/#programs");
                    }}
                    className="bg-gradient-to-r from-[hsl(14,90%,55%)] to-[hsl(25,95%,53%)] hover:opacity-90"
                  >
                    Browse Programs
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {programs.map((userProgram) => (
                    <Card
                      key={userProgram.id}
                      className={`p-6 border-border hover:shadow-lg transition-shadow ${userProgram.program?.imageUrl ? 'cursor-pointer' : ''}`}
                        onClick={() => handleProgramClick(userProgram)}
                        title={userProgram.program?.imageUrl ? 'Open attached media' : 'View program details'}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Dumbbell className="w-6 h-6 text-primary" />
                            <h3 className="text-xl font-bold text-foreground">
                              {userProgram.plan?.name || userProgram.program?.name || "Unknown Program"}
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
                                      Program Dates: {formatDate(userProgram.program.startDate)} - {formatDate(userProgram.program.endDate)}
                                    </p>
                                  ) : userProgram.program.startDate ? (
                                    <p>Starts: {formatDate(userProgram.program.startDate)}</p>
                                  ) : userProgram.program.endDate ? (
                                    <p>Ends: {formatDate(userProgram.program.endDate)}</p>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>Purchased: {formatDate(userProgram.purchasedAt)}</span>
                            </div>
                            {userProgram.expiresAt && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>
                                  Expires: {formatDate(userProgram.expiresAt)}
                                </span>
                              </div>
                            )}
                          </div>
                          {/* Video list and player when expanded */}
                          {expandedProgramId === userProgram.program?.id && (
                            <div className="mt-4">
                              {playingUrl ? (
                                <div className="mb-4">
                                  <video src={playingUrl} controls className="w-full max-h-80" />
                                </div>
                              ) : null}

                              <div className="space-y-2">
                                {(programVideos[userProgram.program?.id || 0] || []).map((v) => {
                                  const full = v.url.startsWith('http') ? v.url : `${API_URL}${v.url.startsWith('/') ? '' : '/'}${v.url}`;
                                  return (
                                    <div key={v.id} className="flex items-center justify-between bg-muted p-2 rounded">
                                      <div>
                                        <div className="font-semibold">{v.title || v.url.split('/').pop()}</div>
                                        <div className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button onClick={() => setPlayingUrl(full)}>Play</Button>
                                        <Button variant="outline" onClick={() => window.open(full, '_blank')}>Open</Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
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
    </div>
  );
};

export default Profile;

