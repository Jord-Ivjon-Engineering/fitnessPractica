import React, { useState } from 'react';
import { Play, Pause } from 'lucide-react';
import '../../styles/Toolbar.css';

interface ToolbarProps {
  onPlayPause: () => void;
  playing: boolean;
  videoTitle: string;
  onTitleChange: (title: string) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onPlayPause,
  playing,
  videoTitle,
  onTitleChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(videoTitle);

  const handleTitleClick = () => {
    setIsEditing(true);
    setTempTitle(videoTitle);
  };

  const handleTitleBlur = () => {
    setIsEditing(false);
    if (tempTitle.trim()) {
      onTitleChange(tempTitle.trim());
    } else {
      setTempTitle(videoTitle);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setTempTitle(videoTitle);
    }
  };

  // Update tempTitle when videoTitle changes externally (e.g., after processing)
  React.useEffect(() => {
    if (!isEditing) {
      setTempTitle(videoTitle);
    }
  }, [videoTitle, isEditing]);

  return (
    <div className="editor-toolbar">
      <div className="toolbar-section">
        <button onClick={onPlayPause} className="toolbar-btn play-btn">
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </div>

      <div className="toolbar-section toolbar-title-section">
        {isEditing ? (
          <input
            type="text"
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="video-title-input"
            autoFocus
          />
        ) : (
          <h2 className="video-title" onClick={handleTitleClick} title="Click to edit">
            {videoTitle}
          </h2>
        )}
      </div>
    </div>
  );
};

export default Toolbar;

