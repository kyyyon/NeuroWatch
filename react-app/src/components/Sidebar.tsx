import React from "react";

interface SidebarProps {
  toggleCamera: (cameraIndex: number) => void;
  togglePlaybackControls: (cameraIndex: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  toggleCamera,
  togglePlaybackControls,
}) => {
  return (
    <div className="w-64 bg-gray-700 text-white p-4">
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
        <div id="calendar" className="bg-gray-600 p-2 rounded"></div>
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
