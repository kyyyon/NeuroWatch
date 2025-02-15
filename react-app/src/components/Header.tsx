import React from "react";

interface HeaderProps {
  updateGridLayout: (selectedLayout: number) => void;
}

const Header: React.FC<HeaderProps> = ({ updateGridLayout }) => {
  return (
    <div className="bg-gray-800 text-white p-4 text-center">
      <h1 className="text-2xl font-bold">VIDEO PLAYBACK</h1>
      <div className="mt-2 flex justify-center space-x-2">
        <button
          onClick={() => updateGridLayout(1)}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <button
          onClick={() => updateGridLayout(2)}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16M8 6v12M16 6v12"
            />
          </svg>
        </button>
        <button
          onClick={() => updateGridLayout(3)}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16M8 6v12M12 6v12M16 6v12"
            />
          </svg>
        </button>
        <button
          onClick={() => updateGridLayout(4)}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16M8 6v12M12 6v12M16 6v12M20 6v12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Header;
