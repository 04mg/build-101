---
name: motion-video
description: Create programmatic motion graphics, product launch teasers, kinetic typography, and animated demo videos using Remotion (React/TypeScript) or web animations. Use whenever the user asks for motion video, product promo, animated explainer, or social media video clip.
---

# Motion Video & Programmatic Animation Skill

Create high-fidelity motion graphics, product demo videos, animated title sequences, and social media reels programmatically using React and Remotion.

## Quick Workflow

### 1. Scaffolding a Video Project
To start a new Remotion motion video:
```bash
npx create-video@latest --yes --blank --no-tailwind video-promo
cd video-promo
npm install
```

To run the interactive browser preview with timeline & hot-reloading:
```bash
npm start
```
This opens Remotion Studio at `http://localhost:3000`. Keep this running so changes can be previewed immediately.

### 2. Core Remotion Concepts
- **`<Composition>`**: Defines a video canvas (id, component, durationInFrames, fps, width, height).
  - Common dimensions:
    - 16:9 Landscape (YouTube/Presentations): `1920x1080` (fps: 30 or 60)
    - 9:16 Portrait (TikTok/Reels/Shorts): `1080x1920` (fps: 30 or 60)
    - 1:1 Square (Feed): `1080x1080`
- **`useCurrentFrame()`**: Returns the current integer frame index.
- **`interpolate(frame, inputRange, outputRange, options)`**: Linear interpolation for smooth transitions.
- **`spring({ frame, fps, config })`**: Physics-based bounce and easing.
- **`<Sequence from={startFrame} durationInFrames={length}>`**: Places scenes/elements on the timeline.
- **`<Series>`**: Automatically sequences scenes one after another.

### 3. Example: Kinetic Product Intro Card
```tsx
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const ProductIntro = ({ title = "Hackathon Product", tag = "Built with TrailBase" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.5 },
  });

  const opacity = interpolate(frame, [0, 15], [0, 1]);
  const tagY = interpolate(frame, [15, 35], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill className="bg-slate-950 flex flex-col items-center justify-center text-white font-sans">
      <div style={{ transform: `scale(${titleScale})`, opacity }} className="text-7xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
        {title}
      </div>
      <div style={{ transform: `translateY(${tagY}px)`, opacity: interpolate(frame, [15, 30], [0, 1]) }} className="text-2xl mt-4 text-slate-400">
        {tag}
      </div>
    </AbsoluteFill>
  );
};
```

### 4. Rendering Video to MP4
To export the final MP4 file:
```bash
npx remotion render Root CompositionName out/video.mp4
```

### 5. Sound & Multimedia
Use `<Audio src={staticFile("voiceover.mp3")} />` and `<OffthreadVideo src={...} />` for smooth composition without audio sync drift.
