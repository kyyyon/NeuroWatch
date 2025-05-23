// Copyright 2024 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { useEffect, useRef, useState, JSX } from "react";
import { scaleBand, scaleLinear } from "d3-scale";
import { max, min } from "d3-array";
import { line } from "d3-shape";
import { timeToSecs } from "./utils";

interface ChartProps {
  data: Array<{
    time: string;
    value: number;
  }>;
  yLabel: string;
  jumpToTimecode: (seconds: number) => void;
}

interface DataPoint {
  time: string;
  value: number;
}

export default function Chart({
  data,
  yLabel,
  jumpToTimecode,
}: ChartProps): JSX.Element {
  const chartRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(1);
  const [height, setHeight] = useState<number>(1);
  const margin = 55;
  const xMax = width;
  const yMax = height - margin;

  const xScale = scaleBand<string>()
    .range([margin + 10, xMax])
    .domain(data.map((d) => d.time))
    .padding(0.2);

  const vals = data.map((d) => d.value);
  const yScale = scaleLinear()
    .domain([min(vals) || 0, max(vals) || 0])
    .nice()
    .range([yMax, margin]);

  const yTicks = yScale.ticks(Math.floor(height / 70));

  const lineGen = line<DataPoint>()
    .x((d) => xScale(d.time) || 0)
    .y((d) => yScale(d.value));

  useEffect(() => {
    const setSize = () => {
      if (chartRef.current) {
        setWidth(chartRef.current.clientWidth);
        setHeight(chartRef.current.clientHeight);
      }
    };

    setSize();
    window.addEventListener("resize", setSize);
    return () => window.removeEventListener("resize", setSize);
  }, []);

  return (
    <svg className="lineChart" ref={chartRef as any}>
      <g className="axisLabels" transform={`translate(0 ${0})`}>
        {yTicks.map((tick: number) => {
          const y = yScale(tick);
          return (
            <g key={tick} transform={`translate(0 ${y})`}>
              <text x={margin - 10} dy="0.25em" textAnchor="end">
                {tick}
              </text>
            </g>
          );
        })}
      </g>

      <g
        className="axisLabels timeLabels"
        transform={`translate(0 ${yMax + 40})`}
      >
        {data.map(({ time }, i) => (
          <text
            key={i}
            x={xScale(time)}
            role="button"
            onClick={() => jumpToTimecode(timeToSecs(time))}
          >
            {time.length > 5 ? time.replace(/^00:/, "") : time}
          </text>
        ))}
      </g>

      <g>
        <path d={lineGen(data) || ""} />
      </g>

      <g>
        {data.map(({ time, value }, i) => (
          <g key={i} className="dataPoint">
            <circle cx={xScale(time)} cy={yScale(value)} r={4} />
            <text x={xScale(time)} y={yScale(value) - 12}>
              {value}
            </text>
          </g>
        ))}
      </g>

      <text
        className="axisTitle"
        x={margin}
        y={-width + margin}
        transform="rotate(90)"
      >
        {yLabel}
      </text>
    </svg>
  );
}
