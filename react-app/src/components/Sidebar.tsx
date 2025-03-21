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
  const [checkedCameras, setCheckedCameras] = useState([1, 2, 3, 4]);

  const [theme] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );

  React.useEffect(() => {
    if (onDateChange) {
      onDateChange(date);
    }
  }, [date, onDateChange]);

  return (
    <div className="rightSidebar min-w-32 text-white p-4 b-4 overflow-y-auto overflow-x-hidden">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Cameras</h3>
        <ul>
          {[1, 2, 3, 4].map((i) => (
            <li key={i}>
              <label className="flex items-center gap-[15px]">
                <input
                  type="checkbox"
                  value={`cam${i}`}
                  checked={checkedCameras.includes(i)}
                  className="mr-2"
                  onChange={() => {
                    setCheckedCameras((prev) =>
                      prev.includes(i)
                        ? prev.filter((cam) => cam !== i)
                        : [...prev, i]
                    );
                    toggleCamera(i);
                  }}
                />{" "}
                CAM {i}
              </label>
              <ul id={`cam${i}-playlists`} className="ml-4 text-sm"></ul>
            </li>
          ))}
        </ul>
      </div>
      <div className="mb-6 flex flex-col gap-2 ">
        <h3 className="text-lg font-semibold mb-2">Calendar</h3>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className={`${theme} rounded-md border shadow place-self-center`}
        />
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
