import React, { useState, useEffect, forwardRef } from "react";

interface SliderProps {
  onValueChange?: (value: number) => void;
}

const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ onValueChange }, ref) => {
    const [sliderValue, setSliderValue] = useState(0);
    const [selectedDateTime, setSelectedDateTime] = useState("");
    const [scrubberTime, setScrubberTime] = useState(0);
    const currentPercent = (sliderValue / 86400000) * 100;

    useEffect(() => {
      const date = new Date(sliderValue);
      const formattedTime = date.toISOString().substr(11, 12);
      setSelectedDateTime(formattedTime);
    }, [sliderValue]);

    const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseInt(event.target.value, 10);
      setSliderValue(newValue);
      onValueChange?.(newValue);
    };

    return (
      <div className="videoScrubber w-full">
        <input
          style={{ "--pct": `${currentPercent}%` } as React.CSSProperties}
          type="range"
          min="0"
          max="86399999"
          value={sliderValue}
          onChange={handleSliderChange}
          className="w-full"
          ref={ref}
        />
      </div>
    );
  }
);

export default Slider;
