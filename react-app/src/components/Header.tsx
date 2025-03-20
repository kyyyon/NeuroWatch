import React from "react";

interface HeaderProps {
  updateGridLayout: (selectedLayout: number) => void;
}

const Header: React.FC<HeaderProps> = ({ updateGridLayout }) => {
  return (
    <div className="bg-gray-800 text-white p-4 text-center">
      {/* <h1 className="text-2xl font-bold">VIDEO PLAYBACK</h1> */}
      <div className="mt-2 flex justify-center space-x-2">
        <button
          onClick={() => updateGridLayout(1)}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          <span className="material-symbols-outlined">
            check_box_outline_blank
          </span>
        </button>
        <button
          onClick={() => updateGridLayout(2)}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          <span className="material-symbols-outlined">window</span>
        </button>
        <button
          onClick={() => updateGridLayout(3)}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          <span className="material-symbols-outlined">grid_on</span>
        </button>
        <button
          onClick={() => updateGridLayout(4)}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          <span className="material-symbols-outlined">
            background_grid_small
          </span>
        </button>
      </div>
    </div>
  );
};

export default Header;
