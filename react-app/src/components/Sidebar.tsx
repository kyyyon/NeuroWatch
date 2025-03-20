import React, { useState } from "react";
import { Calendar } from "@/components/ui/calendar";

interface SidebarProps {
  toggleCamera: (cameraIndex: number) => void;
  togglePlaybackControls: (cameraIndex: number) => void;
  onDateChange?: (date: Date | undefined) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  toggleCamera,
  togglePlaybackControls,
  onDateChange,
}) => {
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  const [theme] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );

  React.useEffect(() => {
    if (onDateChange) {
      onDateChange(date);
    }
  }, [date, onDateChange]);

  return (
    <div className="modeSelector w-64 text-white p-4 b-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Cameras</h3>
        <ul>
          {[1, 2, 3, 4].map((i) => (
            <li key={i}>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  value={`cam${i}`}
                  checked
                  className="mr-2"
                  onChange={() => toggleCamera(i)}
                />{" "}
                CAM {i}
              </label>
              <ul id={`cam${i}-playlists`} className="ml-4 text-sm"></ul>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Calendar</h3>
        <div id="calendar" className="bg-gray-600 p-2 rounded">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className={`${theme} rounded-md border shadow`}
          />
        </div>
      </div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Hide Playback Controls</h3>
        <ul>
          {[1, 2, 3, 4].map((i) => (
            <li key={i}>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  id={`cam${i}-controls-toggle`}
                  className="mr-2"
                  onChange={() => togglePlaybackControls(i)}
                />{" "}
                CAM {i} Controls
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
