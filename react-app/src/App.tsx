import React, { useState, useEffect, useRef, useCallback } from "react";
import c from "classnames";
import Hls from "hls.js";
import Header from "./components/Header";
import VideoGrid from "./components/VideoGrid";
import Sidebar from "./components/Sidebar";
import Slider from "./components/Slider";
// import Timeline from "./components/Timeline";
import Chart from "./components/Chart";
import { timeToSecs } from "./components/utils";
import modes from "./components/modes";
import { debounce, set } from "lodash";
import generateContent from "./api";
import functions from "./functions";

const chartModes = Object.keys(modes.Chart.subModes);

// Interface for timecode objects
interface Timecode {
  time: string;
  text: string;
  objects?: string[];
}

// Interface for the setTimecodes argument
interface SetTimecodesArgs {
  timecodes: Timecode[];
}

// Update setTimecodes function with TypeScript types
const setTimecodes = ({ timecodes }: SetTimecodesArgs): void => {
  setTimecodeList(
    timecodes.map((t) => ({ ...t, text: t.text.replaceAll("\\'", "'") }))
  );
};

// Interface for mode object structure
interface Mode {
  prompt: string | ((arg: string) => string);
  emoji?: string;
  isList?: boolean;
  subModes?: {
    [key: string]: string;
  };
}

// Type for modes object
interface Modes {
  [key: string]: Mode;
}

const App: React.FC = () => {
  const [activeVideo, setActiveVideo] = useState<number | undefined>(undefined);
  const [activeVidUrl, setActiveVidUrl] = useState(null);
  const [vidUrl, setVidUrl] = useState<string | null>(null);
  const [file, setFile] = useState(null);
  const [timecodeList, setTimecodeList] = useState<
    { time: string; text: string; objects?: string[] }[]
  >([]);
  const [requestedTimecode, setRequestedTimecode] = useState<number | null>(
    null
  );
  const [selectedMode, setSelectedMode] = useState(Object.keys(modes)[0]);
  const [activeMode, setActiveMode] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [chartMode, setChartMode] = useState(chartModes[0]);
  const [chartPrompt, setChartPrompt] = useState("");
  const [chartLabel, setChartLabel] = useState("");
  const [masterVideo, setMasterVideo] = useState<HTMLVideoElement | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [syncInterval, setSyncInterval] = useState<NodeJS.Timeout | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hlsInstances, setHlsInstances] = useState<{ [key: number]: any }>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [today, setToday] = useState<string>("");
  const [sliderValue, setSliderValue] = useState(0); // Add state for slider value
  const sliderRef = useRef<HTMLInputElement>(null);
  const masterVideoSet = useRef(false);
  const scrollRef = useRef();
  const isCustomMode = selectedMode === "Custom";
  const isChartMode = selectedMode === "Chart";
  const isCustomChartMode = isChartMode && chartMode === "Custom";
  const hasSubMode = isCustomMode || isChartMode;

  const [theme] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );

  useEffect(() => {
    (window as any).hlsInstances = hlsInstances;
  }, [hlsInstances]);
  useEffect(() => {
    const todayDate = new Date().toLocaleDateString("en-CA", {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    console.log(`Setting today's date: ${todayDate}`);
    setToday(todayDate);
  }, []);

  useEffect(() => {
    if (today) {
      console.log(`Today's date: ${today}`);
      updateGridLayout(2);
      initializeCamerasForDate(today);
    }
  }, [today]);
  //this
  useEffect(() => {
    if (activeVideo && hlsInstances[activeVideo]) {
      const hls = hlsInstances[activeVideo];

      // Convert playlist.m3u8 to recordings.mp4
      const convertedUrl = hls.url?.replace(/playlist\.m3u8$/, "recording.mp4");

      // Set initial URL with converted path
      setActiveVidUrl(convertedUrl);

      // Listen for manifest loading events
      const onManifestLoading = () => {
        const newUrl = hls.url?.replace(/playlist\.m3u8$/, "recording.mp4");
        setActiveVidUrl(newUrl);
      };

      // Listen for level loading events
      const onLevelLoading = () => {
        const newUrl = hls.url?.replace(/playlist\.m3u8$/, "recording.mp4");
        setActiveVidUrl(newUrl);
      };

      hls.on(Hls.Events.MANIFEST_LOADING, onManifestLoading);
      hls.on(Hls.Events.LEVEL_LOADING, onLevelLoading);

      return () => {
        // Clean up event listeners
        hls.off(Hls.Events.MANIFEST_LOADING, onManifestLoading);
        hls.off(Hls.Events.LEVEL_LOADING, onLevelLoading);
      };
    }
  }, [activeVideo, hlsInstances]);

  const setTimecodes = ({ timecodes }) =>
    setTimecodeList(
      timecodes.map((t) => ({ ...t, text: t.text.replaceAll("\\'", "'") }))
    );

  const onModeSelect = async (mode: string): Promise<void> => {
    setActiveMode(mode);
    setIsLoading(true);
    setChartLabel(chartPrompt);
    console.log("onModeSelect", mode, chartMode, chartPrompt);
    const promptText = isCustomMode
      ? (modes[mode] as Mode).prompt(customPrompt)
      : isChartMode
      ? (modes[mode] as Mode).prompt(
          isCustomChartMode ? chartPrompt : modes[mode].subModes![chartMode]
        )
      : (modes[mode] as Mode).prompt;

    const resp = await generateContent({
      text:
        typeof promptText === "function"
          ? promptText(customPrompt)
          : promptText,
      file,
      functionDeclarations: functions({
        set_timecodes: setTimecodes,
        set_timecodes_with_objects: setTimecodes,
        set_timecodes_with_numeric_values: ({ timecodes }: SetTimecodesArgs) =>
          setTimecodeList(timecodes),
      }),
    });

    const call = resp.functionCalls()[0];

    if (call) {
      const handlers = {
        set_timecodes: setTimecodes,
        set_timecodes_with_objects: setTimecodes,
        set_timecodes_with_numeric_values: ({ timecodes }: SetTimecodesArgs) =>
          setTimecodeList(timecodes),
      };

      handlers[call.name as keyof typeof handlers](call.args);
    }

    setIsLoading(false);
    if (scrollRef.current) {
      (scrollRef.current as Element).scrollTo({ top: 0 });
    }
  };

  const uploadVideo = async () => {
    setIsLoadingVideo(true);

    // URL of the video file
    const videoUrl = activeVidUrl;

    try {
      if (!videoUrl) throw new Error("Video URL is null");

      // Fetch the video as a blob
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error("Failed to fetch video");

      const blob = await response.blob(); // Convert response to a Blob
      const file = new File([blob], "recording.mp4", { type: blob.type });

      setVidUrl(URL.createObjectURL(blob)); // Preview video

      // Prepare FormData for upload
      const formData = new FormData();
      formData.append("video", file);

      // Upload to API
      const resp = await (
        await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
      ).json();

      setFile(resp.data);
      checkProgress(resp.data.name);
    } catch (error) {
      console.error("Error uploading video:", error);
    } finally {
      setIsLoadingVideo(false);
    }
  };

  interface ProgressResponse {
    progress: {
      state: "ACTIVE" | "FAILED" | "COMPLETED";
    };
  }

  const checkProgress = async (fileId: string): Promise<void> => {
    const resp: ProgressResponse = await (
      await fetch("/api/progress", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId }),
      })
    ).json();

    if (resp.progress.state === "ACTIVE") {
      setIsLoadingVideo(false);
    } else if (resp.progress.state === "FAILED") {
      setVideoError(true);
    } else {
      setTimeout(() => checkProgress(fileId), 1000);
    }
  };

  const handleDateChange = (newDate: Date | undefined) => {
    setSelectedDate(newDate);
    if (newDate) {
      const formattedDate = newDate.toLocaleDateString("en-CA");
      setToday(formattedDate);
    }
  };

  const updateGridLayout = (selectedLayout: number) => {
    const videoGrid = document.getElementById("video-grid");
    if (videoGrid) {
      videoGrid.style.gridTemplateColumns = `repeat(${selectedLayout}, 1fr)`;
      videoGrid.style.gridTemplateRows = `repeat(${selectedLayout}, 1fr)`;
    }
  };

  const debouncedHandleSliderChange = debounce((value: number) => {
    setSliderValue(value); // Update slider value state
    syncVideosToTime(value, today);
  }, 100); // Adjust the delay as needed

  const syncVideosToTime = (currentTime: number, today: string) => {
    // Parse today (YYYY-MM-DD) into a local Date object
    const [year, month, day] = today.split("-").map(Number);

    // Create a Date object at midnight in local time
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);

    // Add the milliseconds from currentTime (treating it as ms since midnight)
    date.setMilliseconds(date.getMilliseconds() + currentTime);

    if (isNaN(date.getTime())) {
      console.error("Invalid date:", date);
      return;
    }
    seekToProgramDateTime(date);
    // updateTimelinePlayhead(currentTime / 1000); // Convert milliseconds to seconds for the timeline
  };

  const seekToProgramDateTime = async (selectedDate: Date) => {
    const seekToFragment = (
      hls: any,
      videoElement: HTMLVideoElement,
      selectedDate: Date
    ) => {
      if (!hls.levels || !hls.levels[hls.currentLevel]) {
        console.error("HLS levels or current level is not available.");
        return;
      }

      const fragments = hls.levels[hls.currentLevel].details.fragments;
      if (!fragments) {
        console.error("HLS fragments are not available.");
        return;
      }

      let closestFragment = null;
      let minDiff = Infinity;
      fragments.forEach((fragment: any) => {
        const fragDate = new Date(fragment.programDateTime);
        const diff = Math.abs(fragDate - selectedDate);
        if (diff < minDiff) {
          minDiff = diff;
          closestFragment = fragment;
        }
      });

      if (closestFragment) {
        videoElement.currentTime = closestFragment.start;
      }
    };

    const loadPlaylistAndSeek = async (
      cameraIndex: number,
      selectedDate: Date
    ) => {
      const playlistUrls = await getRecordingsForDate(
        cameraIndex,
        selectedDate.toLocaleDateString("en-CA", {
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
      );

      if (playlistUrls.length === 0) {
        console.error(
          `No recordings found for Camera ${cameraIndex} on ${
            selectedDate.toISOString().split("T")[0]
          }`
        );
        return;
      }

      let closestPlaylistIndex = 0;
      let minDiff = Infinity;

      playlistUrls.forEach((url, index) => {
        const match = url.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/);
        if (match) {
          const [datePart, timePart] = match[1].split("_");
          const [year, month, day] = datePart.split("-").map(Number);
          const [hours, minutes, seconds] = timePart.split("-").map(Number);

          const urlDate = new Date(
            year,
            month - 1,
            day,
            hours,
            minutes,
            seconds
          );
          const nextHourDate = new Date(urlDate);
          nextHourDate.setHours(nextHourDate.getHours() + 1);

          if (selectedDate >= urlDate && selectedDate < nextHourDate) {
            const diff = Math.abs(urlDate.valueOf() - selectedDate.valueOf());
            if (diff < minDiff) {
              minDiff = diff;
              closestPlaylistIndex = index;
            }
          }
        }
      });

      const hls = hlsInstances[cameraIndex];
      const videoElement = document.getElementById(
        `video-${cameraIndex}`
      ) as HTMLVideoElement;

      if (hls.url !== playlistUrls[closestPlaylistIndex]) {
        // Store current index for future reference
        hls.currentPlaylistIndex = closestPlaylistIndex;
        hls.playlistUrls = playlistUrls; // Store full playlist

        hls.loadSource(playlistUrls[closestPlaylistIndex]);
        hls.attachMedia(videoElement);
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
          hls.startLoad(minDiff / 1000);
          videoElement.play().catch(console.error);
        });
      } else {
        seekToFragment(hls, videoElement, selectedDate);
      }
    };

    Object.keys(hlsInstances).forEach((key) => {
      loadPlaylistAndSeek(Number(key), selectedDate);
    });
  };

  const toggleCamera = (cameraIndex: number) => {
    const videoElement = document.getElementById(
      `video-${cameraIndex}`
    ) as HTMLVideoElement;
    if (videoElement) {
      videoElement.style.display =
        videoElement.style.display === "none" ? "block" : "none";

      if (
        videoElement === masterVideo &&
        videoElement.style.display === "none"
      ) {
        const firstVisibleVideo = document.querySelector(
          'video:not([style*="display: none"])'
        ) as HTMLVideoElement;
        if (firstVisibleVideo) {
          setMasterVideo(firstVisibleVideo);
        }
      }
    }
  };

  const togglePlaybackControls = (cameraIndex: number) => {
    const videoElement = document.getElementById(
      `video-${cameraIndex}`
    ) as HTMLVideoElement;
    const checkbox = document.getElementById(
      `cam${cameraIndex}-controls-toggle`
    ) as HTMLInputElement;

    if (checkbox.checked) {
      videoElement.removeAttribute("controls");
      if (videoElement === masterVideo) {
        const firstVisibleVideo = document.querySelector(
          'video:not([style*="display: none"])'
        ) as HTMLVideoElement;
        if (firstVisibleVideo) {
          setMasterVideo(firstVisibleVideo);
        }
      }
    } else {
      if (!masterVideo) setMasterVideo(videoElement);
      videoElement.setAttribute("controls", "true");
    }
  };

  const initializeCamerasForDate = async (date: string) => {
    for (let i = 1; i <= 4; i++) {
      const playlistUrls = await getRecordingsForDate(i, date);
      if (playlistUrls.length > 0) {
        initializeHlsPlayback(i, playlistUrls);
        // console.log(playlistUrls);
      }
    }
  };

  const getRecordingsForDate = async (
    cameraIndex: number,
    date: string
  ): Promise<string[]> => {
    try {
      const response = await fetch(
        `http://localhost:3000/recordings/cam${cameraIndex}/`
      );
      const text = await response.text();
      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(text, "text/html");
      // console.log("getRecordingsforDate:", date);
      const links = Array.from(htmlDoc.querySelectorAll("a"));
      const directories = links
        .map((a) => a.textContent.trim())
        .filter((name) => name.startsWith(date))
        .map((name) => name.replace(/\/$/, ""))
        .sort();

      return directories.map(
        (dir) =>
          `http://localhost:3000/recordings/cam${cameraIndex}/${dir}/playlist.m3u8`
      );
    } catch (error) {
      console.error(
        `Error fetching recordings for Camera ${cameraIndex}:`,
        error
      );
      return [];
    }
  };

  const initializeHlsPlayback = async (
    cameraIndex: number,
    playlistUrls: string[]
  ) => {
    const videoElement = document.getElementById(
      `video-${cameraIndex}`
    ) as HTMLVideoElement;
    const hls = new Hls({
      enableWorker: true,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      autoStartLoad: true,
      startPosition: 0,
    });

    let currentIndex = 0;

    const loadPlaylist = async (index: number) => {
      hls.loadSource(playlistUrls[index]);
      hls.attachMedia(videoElement);

      // Fetch and display the duration of the playlist
      const duration = await fetchPlaylistDuration(playlistUrls[index]);
      const listItem = document.createElement("li");
      listItem.textContent = `${playlistUrls[index]} - ${duration} seconds`;
      listItem.style.cursor = "pointer";
      listItem.onclick = () => {
        console.log(hls.url, playlistUrls[index]);
        if (hls.url !== playlistUrls[index]) {
          hls.loadSource(playlistUrls[index]);
          // hls.attachMedia(videoElement);
          videoElement.play().catch(console.error);
        }
      };
      // document
      //   .getElementById(`cam${cameraIndex}-playlists`)
      //   ?.appendChild(listItem);
    };

    videoElement.addEventListener("ended", () => {
      currentIndex++;
      if (currentIndex < playlistUrls.length) {
        loadPlaylist(currentIndex); // Load next video on end
      }
    });

    loadPlaylist(currentIndex); // Start with the first video

    setHlsInstances((prev) => ({ ...prev, [cameraIndex]: hls }));

    // Set the first video as the master video
    if (!masterVideoSet.current) {
      console.log(`Setting master video to camera ${cameraIndex}`);
      setMasterVideo(videoElement);
      masterVideoSet.current = true;
    }
  };

  const fetchPlaylistDuration = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const text = await response.text();
      const lines = text.split("\n");
      let duration = 0;

      lines.forEach((line) => {
        if (line.startsWith("#EXTINF:")) {
          const lineDuration = parseFloat(line.split(":")[1]);
          duration += lineDuration;
        }
      });

      return duration.toFixed(2);
    } catch (error) {
      console.error(`Error fetching playlist duration for ${url}:`, error);
      return "Unknown";
    }
  };

  const togglePlay = useCallback(() => {
    const videos = document.querySelectorAll("video");
    videos.forEach((video) => {
      if (isPlaying) {
        video.pause();
      } else {
        video.play().catch(console.error);
      }
    });
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const formatTime = (ms: number) => {
    const date = new Date(ms);

    let hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const seconds = date.getUTCSeconds();
    const milliseconds = date.getUTCMilliseconds();

    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // Convert 0 to 12 for 12-hour format

    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")} ${ampm}`;
  };
  return (
    <main className={`${theme} h-screen flex flex-col`}>
      <Header updateGridLayout={updateGridLayout} />
      <div className="flex w-full overflow-x-hidden flex-1">
        <div className="flex-1 flex flex-col">
          <div className="flex flex-1 flex-grow">
            {true && (
              <>
                <div className={c("modeSelector", { hide: !showSidebar })}>
                  {hasSubMode ? (
                    <>
                      <div>
                        {isCustomMode ? (
                          <>
                            <h2>Custom prompt:</h2>
                            <textarea
                              placeholder="Type a custom prompt..."
                              value={customPrompt}
                              onChange={(e) => setCustomPrompt(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  onModeSelect(selectedMode);
                                }
                              }}
                              rows="5"
                            />
                          </>
                        ) : (
                          <>
                            <h2>Chart this video by:</h2>

                            <div className="modeList">
                              {chartModes.map((mode) => (
                                <button
                                  key={mode}
                                  className={c("button", {
                                    active: mode === chartMode,
                                  })}
                                  onClick={() => setChartMode(mode)}
                                >
                                  {mode}
                                </button>
                              ))}
                            </div>
                            <textarea
                              className={c({ active: isCustomChartMode })}
                              placeholder="Or type a custom prompt..."
                              value={chartPrompt}
                              onChange={(e) => setChartPrompt(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  onModeSelect(selectedMode);
                                }
                              }}
                              onFocus={() => setChartMode("Custom")}
                              rows="2"
                            />
                          </>
                        )}
                        <button
                          className="button generateButton"
                          onClick={() => onModeSelect(selectedMode)}
                          disabled={
                            (isCustomMode && !customPrompt.trim()) ||
                            (isChartMode &&
                              isCustomChartMode &&
                              !chartPrompt.trim())
                          }
                        >
                          ▶️ Generate
                        </button>
                      </div>
                      <div className="backButton">
                        <button
                          onClick={() => setSelectedMode(Object.keys(modes)[0])}
                        >
                          <span className="icon">chevron_left</span>
                          Back
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <h2>Explore this video via:</h2>
                        <div className="modeList">
                          {Object.entries(modes).map(([mode, { emoji }]) => (
                            <button
                              key={mode}
                              className={c("button", {
                                active: mode === selectedMode,
                              })}
                              onClick={() => setSelectedMode(mode)}
                            >
                              <span className="emoji">{emoji}</span> {mode}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          className="button generateButton"
                          onClick={() => uploadVideo()}
                        >
                          ▶️ Upload
                        </button>
                        <button
                          className="button generateButton"
                          onClick={() => onModeSelect(selectedMode)}
                        >
                          ▶️ Generate
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <button
                  className="collapseButton"
                  onClick={() => setShowSidebar(!showSidebar)}
                >
                  <span className="icon">
                    {showSidebar ? "chevron_left" : "chevron_right"}
                  </span>
                </button>
              </>
            )}
            <div className="videoPlayer">
              <VideoGrid
                activeVideo={activeVideo}
                setActiveVideo={setActiveVideo}
              />
              <div className="videoControls">
                <Slider
                  ref={sliderRef}
                  onValueChange={debouncedHandleSliderChange}
                />
                <div className="videoTime">
                  <button>
                    <span className="icon" onClick={togglePlay}>
                      {isPlaying ? "pause" : "play_arrow"}
                    </span>
                  </button>
                  {formatTime(sliderValue)} / {formatTime(86400000 - 1)}
                </div>
              </div>
            </div>
          </div>
          <div className="h-[30%]">
            <div className={c("tools", { inactive: !vidUrl })}>
              <section
                className={c("output", { ["mode" + activeMode]: activeMode })}
                ref={scrollRef}
              >
                {isLoadingVideo ? "yes" : "no"}
                {playbackRate}
                {isLoading ? (
                  <div className="loading">
                    Waiting for model<span>...</span>
                  </div>
                ) : timecodeList ? (
                  activeMode === "Table" ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Description</th>
                          <th>Objects</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timecodeList.map(({ time, text, objects }, i) => (
                          <tr
                            key={i}
                            role="button"
                            onClick={() =>
                              setRequestedTimecode(timeToSecs(time))
                            }
                          >
                            <td>
                              <time>{time}</time>
                            </td>
                            <td>{text}</td>
                            <td>{objects.join(", ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : activeMode === "Chart" ? (
                    <Chart
                      data={timecodeList}
                      yLabel={chartLabel}
                      jumpToTimecode={setRequestedTimecode}
                    />
                  ) : activeMode && modes[activeMode].isList ? (
                    <ul>
                      {timecodeList.map(({ time, text }, i) => (
                        <li key={i} className="outputItem">
                          <button
                            onClick={() =>
                              setRequestedTimecode(timeToSecs(time))
                            }
                          >
                            <time>{time}</time>
                            <p className="text">{text}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    timecodeList.map(({ time, text }, i) => (
                      <>
                        <span
                          key={i}
                          className="sentence"
                          role="button"
                          onClick={() => setRequestedTimecode(timeToSecs(time))}
                        >
                          <time>{time}</time>
                          <span>{text}</span>
                        </span>{" "}
                      </>
                    ))
                  )
                ) : null}
              </section>
            </div>
          </div>
        </div>
        <Sidebar
          toggleCamera={toggleCamera}
          togglePlaybackControls={togglePlaybackControls}
          onDateChange={handleDateChange}
        />
      </div>
    </main>
  );
};

export default App;
