# Remotion Video Editor

This project includes a full-featured Remotion video editor for creating workout videos with timers, text overlays, and image overlays.

## Features

- **Timeline Editor**: Mark exercises with start/end times
- **Overlay Editor**: Add timers, text, and image overlays with visual positioning
- **Remotion Editor**: Full Remotion-based preview and export system
- **Real-time Preview**: See your edits in real-time
- **Multiple Export Options**: FFmpeg backend or Remotion CLI

## Remotion Compositions

### 1. WorkoutVideo
For exercise-based editing with automatic break detection and exercise previews.

**Props:**
- `videoUrl`: URL of the base video
- `exercises`: Array of exercises with start/end times
- `previews`: Array of preview clips for exercises

### 2. OverlayVideo
For overlay-based editing with custom timers, text, and images.

**Props:**
- `videoUrl`: URL of the base video
- `overlays`: Array of overlay objects

## Using Remotion Studio

1. Start Remotion Studio:
```bash
npm run remotion:studio
```

2. Open your browser to the Remotion Studio interface
3. Select a composition (WorkoutVideo or OverlayVideo)
4. Edit props and preview in real-time
5. Render directly from Studio

## Server-Side Rendering

For production video rendering, use the Remotion CLI:

```bash
npm run remotion:render WorkoutVideo output.mp4 '{"videoUrl":"...","exercises":[...],"duration":300}'
```

Or use the render script directly:

```bash
tsx scripts/render-video.ts OverlayVideo output.mp4 '{"videoUrl":"...","overlays":[...],"duration":300}'
```

## Overlay Types

### Timer Overlay
```typescript
{
  type: 'timer',
  startTime: 0,
  endTime: 30,
  x: 50, // 0-100 percentage
  y: 10, // 0-100 percentage
  timerType: 'countdown' | 'elapsed',
  timerFormat: 'MM:SS' | 'SS',
  fontSize: 48,
  fontColor: '#FFFFFF',
  backgroundColor: 'rgba(0,0,0,0.7)'
}
```

### Text Overlay
```typescript
{
  type: 'text',
  startTime: 0,
  endTime: 30,
  x: 50,
  y: 50,
  text: 'Exercise Name',
  fontSize: 48,
  fontColor: '#FFFFFF',
  backgroundColor: 'rgba(0,0,0,0.6)'
}
```

### Image Overlay
```typescript
{
  type: 'image',
  startTime: 0,
  endTime: 30,
  x: 50,
  y: 50,
  imageUrl: 'https://example.com/image.png',
  width: 200,
  height: 200
}
```

## Configuration

Remotion configuration is in `remotion.config.ts`:
- Video codec: H.264
- Quality: CRF 18 (high quality)
- Format: MP4

## Integration

The Remotion editor is integrated into the Admin Dashboard:
1. Go to Admin Dashboard → Create/Edit Program
2. Navigate to "Video Editor" step
3. Select "Remotion Editor" mode
4. Preview and export your video

## Dependencies

- `remotion`: Core Remotion library
- `@remotion/player`: Client-side player
- `@remotion/cli`: CLI tools for rendering
- `@remotion/renderer`: Server-side rendering (install separately if needed)

## Notes

- Remotion rendering is CPU-intensive and best done server-side
- For quick previews, use the Remotion Player component
- For production exports, use the FFmpeg backend or Remotion CLI
- Video URLs must be accessible from the rendering environment

