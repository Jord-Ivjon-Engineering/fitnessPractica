import React from 'react';
import { Sparkles, Film, Layers } from 'lucide-react';
import { Effect, TimelineClip } from '../AdvancedVideoEditor';
import '../../styles/EffectsPanel.css';

interface EffectsPanelProps {
  selectedClip: string | null;
  clips: TimelineClip[];
  onEffectAdd: (clipId: string, effect: Effect) => void;
}

const EffectsPanel: React.FC<EffectsPanelProps> = ({
  selectedClip,
  clips,
  onEffectAdd,
}) => {
  const filters = [
    { id: 'brightness', name: 'Brightness', params: { value: 1 } },
    { id: 'contrast', name: 'Contrast', params: { value: 1 } },
    { id: 'saturation', name: 'Saturation', params: { value: 1 } },
    { id: 'blur', name: 'Blur', params: { radius: 0 } },
    { id: 'grayscale', name: 'Grayscale', params: { amount: 0 } },
  ];

  const transitions = [
    { id: 'fade', name: 'Fade In/Out' },
    { id: 'slide', name: 'Slide' },
    { id: 'zoom', name: 'Zoom' },
    { id: 'wipe', name: 'Wipe' },
  ];

  const animations = [
    { id: 'bounce', name: 'Bounce' },
    { id: 'fade', name: 'Fade' },
    { id: 'slide', name: 'Slide' },
    { id: 'zoom', name: 'Zoom' },
  ];

  const handleAddFilter = (filterId: string) => {
    if (selectedClip) {
      const filter = filters.find(f => f.id === filterId);
      if (filter) {
        onEffectAdd(selectedClip, {
          id: `filter-${Date.now()}`,
          type: 'filter',
          name: filter.name,
          params: filter.params,
        });
      }
    }
  };

  const handleAddTransition = (transitionId: string) => {
    if (selectedClip) {
      const transition = transitions.find(t => t.id === transitionId);
      if (transition) {
        onEffectAdd(selectedClip, {
          id: `transition-${Date.now()}`,
          type: 'transition',
          name: transition.name,
          params: {},
        });
      }
    }
  };

  const handleAddAnimation = (animationId: string) => {
    if (selectedClip) {
      const animation = animations.find(a => a.id === animationId);
      if (animation) {
        onEffectAdd(selectedClip, {
          id: `animation-${Date.now()}`,
          type: 'animation',
          name: animation.name,
          params: {},
        });
      }
    }
  };

  if (!selectedClip) {
    return (
      <div className="effects-panel-empty">
        <Layers size={48} />
        <p>Select a clip to add effects</p>
      </div>
    );
  }

  const selectedClipData = clips.find(c => c.id === selectedClip);

  return (
    <div className="effects-panel">
      <div className="effects-section">
        <h3>
          <Sparkles size={18} /> Filters
        </h3>
        <div className="effects-grid">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => handleAddFilter(filter.id)}
              className="effect-item"
            >
              {filter.name}
            </button>
          ))}
        </div>
      </div>

      <div className="effects-section">
        <h3>
          <Film size={18} /> Transitions
        </h3>
        <div className="effects-grid">
          {transitions.map((transition) => (
            <button
              key={transition.id}
              onClick={() => handleAddTransition(transition.id)}
              className="effect-item"
            >
              {transition.name}
            </button>
          ))}
        </div>
      </div>

      <div className="effects-section">
        <h3>
          <Layers size={18} /> Animations
        </h3>
        <div className="effects-grid">
          {animations.map((animation) => (
            <button
              key={animation.id}
              onClick={() => handleAddAnimation(animation.id)}
              className="effect-item"
            >
              {animation.name}
            </button>
          ))}
        </div>
      </div>

      {selectedClipData && selectedClipData.effects && selectedClipData.effects.length > 0 && (
        <div className="effects-section">
          <h3>Applied Effects</h3>
          <div className="applied-effects">
            {selectedClipData.effects.map((effect) => (
              <div key={effect.id} className="applied-effect">
                <span>{effect.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EffectsPanel;

