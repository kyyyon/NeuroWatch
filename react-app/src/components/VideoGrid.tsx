import React from "react";
import c from "classnames";

interface VideoGridProps {
  activeVideo: number | undefined;
  setActiveVideo: (id: number) => void;
}

const VideoGrid: React.FC<VideoGridProps> = ({
  activeVideo,
  setActiveVideo,
}) => {
  return (
    <div
      id="video-grid"
      className="grid grid-cols-2 gap-1 min-h-0 flex-1 bg-black"
    >
      {[1, 2, 3, 4].map((i) => (
        <button
          key={i}
          className={c("relative w-full h-full", {
            "ring-3 ring-blue-500": i === activeVideo,
          })}
          onClick={() => setActiveVideo(i)}
        >
          <video
            id={`video-${i}`}
            className="absolute w-full h-full object-fill"
          />
        </button>
      ))}
    </div>
  );
};

export default VideoGrid;
