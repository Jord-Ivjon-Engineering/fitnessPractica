import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SuperAdminDashboard = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showGif, setShowGif] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) {
      return;
    }

    // Check if user is authenticated and is super_admin
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'super_admin') {
      navigate('/');
      return;
    }
  }, [user, isAuthenticated, isLoading, navigate]);

  // Load Tenor embed script when GIF is shown
  useEffect(() => {
    if (showGif) {
      // Check if script already exists
      const existingScript = document.querySelector('script[src="https://tenor.com/embed.js"]');
      
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://tenor.com/embed.js';
        script.async = true;
        document.body.appendChild(script);
      }
    }
  }, [showGif]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-8">
      {!showGif && (
        <button
          onClick={() => setShowGif(true)}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
        >
          💵
        </button>
      )}
      
      {showGif && (
        <>
          {/* Hidden SoundCloud player for audio only */}
          <iframe
            width="1"
            height="1"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A1035226240&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true"
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }}
          />
          
          <div className="tenor-gif-embed" 
               data-postid="7494927" 
               data-share-method="host" 
               data-aspect-ratio="1.78295" 
               data-width="100%">
            <a href="https://tenor.com/view/party-jewish-dancing-gif-7494927">Party Jewish GIF</a>from <a href="https://tenor.com/search/party-gifs">Party GIFs</a>
          </div>
        </>
      )}
    </div>
  );
};

export default SuperAdminDashboard;

