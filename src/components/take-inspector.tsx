"use client";

import { useRef, useState } from "react";
import { Film, Pause, Play, StepBack, StepForward } from "lucide-react";
import { Button } from "@/components/ui/button";

export type InspectorLabels = {
  play: string;
  pause: string;
  back: string;
  forward: string;
  zoomHint: string;
  frames: string;
  hideFrames: string;
};

const STEP_SECONDS = 0.5;
const STRIP_FRAMES = 8;

// A video take with the controls needed to check it frame by frame: half-second
// stepping, zoom on the spot you tap, and a strip of stills made with media
// fragments (`#t=`), so no server-side frame extraction is needed.
export function TakeInspector({
  src,
  seconds,
  labels,
}: {
  src: string;
  seconds: number | null;
  labels: InspectorLabels;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(seconds ?? 0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const [strip, setStrip] = useState(false);

  const step = (delta: number) => {
    const element = video.current;

    if (!element) return;

    element.pause();
    element.currentTime = Math.min(Math.max(0, element.currentTime + delta), duration || element.duration || 0);
  };

  const togglePlay = () => {
    const element = video.current;

    if (!element) return;

    if (element.paused) {
      void element.play();
    } else {
      element.pause();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative aspect-[9/16] cursor-zoom-in overflow-hidden bg-black"
        onClick={(event) => {
          if (zoom) {
            setZoom(null);
            return;
          }

          const box = event.currentTarget.getBoundingClientRect();
          const x = Math.round(((event.clientX - box.left) / box.width) * 100);
          const y = Math.round(((event.clientY - box.top) / box.height) * 100);

          setZoom(`${x}% ${y}%`);
        }}
        title={labels.zoomHint}
      >
        <video
          className="size-full object-contain transition-transform duration-200"
          muted
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          playsInline
          preload="metadata"
          ref={video}
          src={src}
          style={zoom ? { transform: "scale(2.2)", transformOrigin: zoom } : undefined}
        />
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 font-mono text-[11px] text-white">
          {time.toFixed(2)}s{zoom ? " · 2.2×" : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Button aria-label={playing ? labels.pause : labels.play} onClick={togglePlay} size="sm" type="button" variant="secondary">
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </Button>
        <Button aria-label={labels.back} onClick={() => step(-STEP_SECONDS)} size="sm" type="button" variant="secondary">
          <StepBack className="size-3.5" />
          <span className="font-mono text-[11px]">{labels.back}</span>
        </Button>
        <Button aria-label={labels.forward} onClick={() => step(STEP_SECONDS)} size="sm" type="button" variant="secondary">
          <span className="font-mono text-[11px]">{labels.forward}</span>
          <StepForward className="size-3.5" />
        </Button>
        <Button className="ml-auto" onClick={() => setStrip((open) => !open)} size="sm" type="button" variant={strip ? "default" : "secondary"}>
          <Film className="size-3.5" />
          <span className="text-[11px]">{strip ? labels.hideFrames : labels.frames}</span>
        </Button>
      </div>

      {strip && duration > 0 ? (
        <div className="grid grid-cols-4 gap-1">
          {Array.from({ length: STRIP_FRAMES }, (_, index) => {
            const at = ((index + 0.5) / STRIP_FRAMES) * duration;

            return (
              <button
                className="relative aspect-[9/16] overflow-hidden rounded-md bg-black"
                key={index}
                onClick={() => {
                  const element = video.current;

                  if (element) {
                    element.pause();
                    element.currentTime = at;
                  }
                }}
                type="button"
              >
                <video className="size-full object-cover" muted playsInline preload="auto" src={`${src}#t=${at.toFixed(2)}`} />
                <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 font-mono text-[10px] text-white">{at.toFixed(1)}s</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
