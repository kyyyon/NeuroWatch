import cv2
import numpy as np
import threading
import os
import time
from datetime import datetime
import subprocess
import json

# Load configuration from JSON file
def load_config():
    config_path = os.path.join(os.path.dirname(__file__), 'appconfig.json')
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: Configuration file not found at {config_path}")
        exit(1)
    except json.JSONDecodeError:
        print("Error: Invalid JSON in configuration file")
        exit(1)

# Load configuration
config = load_config()
recordings_dir = config['recordings_dir']
rtsp_urls = config['rtsp_urls']

# Boolean flags for recording each camera
record_flags = [True, True, True, True]  # Enable recording for all cameras

# Boolean flags for overlay display for each camera
overlay_flags = [True, True, True, True]  # Enable overlay for all cameras by default

# Global variables to store frames and locks for each stream
num_streams = len(rtsp_urls)
frames = [None] * 4  # Always keep 4 slots for a 2x2 grid
locks = [threading.Lock() for _ in range(4)]
default_frame = np.zeros((480, 640, 3), dtype=np.uint8)  # Black frame

# Events to signal when each camera is ready
camera_ready_events = [threading.Event() for _ in range(4)]

# Maximum duration for splitting recordings (in seconds)
MAX_DURATION = 60 * 10  # 1 hour in seconds

# Frame counters for debugging
frame_counters = [0] * 4  # Tracks the number of frames captured for each camera
last_print_time = time.time()  # Tracks the last time debug info was printed

# Function to round FPS to the nearest multiple of 5
def round_fps(fps):
    return round(fps / 5) * 5

# Function to measure FPS for a camera
def measure_fps(cap, index):
    start_time = time.time()
    frame_count = 0

    while time.time() - start_time < 5:  # Measure for 5 seconds
        ret, frame = cap.read()
        if not ret:
            print(f"Failed to fetch frame from stream {index + 1} during FPS measurement")
            return 30  # Default to 30 FPS if measurement fails

        frame_count += 1

    measured_fps = frame_count / 5  # Calculate FPS
    rounded_fps = round_fps(measured_fps)  # Round to the nearest multiple of 5
    print(f"Measured FPS for camera {index + 1}: {measured_fps}, rounded to {rounded_fps}")
    return rounded_fps

# Function to start ffmpeg process for HLS recording
def start_ffmpeg_process(output_dir, width, height, fps):
    # Ensure the output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # HLS segment and playlist filenames
    segment_filename = os.path.join(output_dir, "segment_%03d.ts")
    playlist_filename = os.path.join(output_dir, "playlist.m3u8")

    # MP4 filename
    mp4_filename = os.path.join(output_dir, "recording.mp4")

    # Calculate keyframe interval based on FPS
    keyframe_interval = int(fps * 10)  # 10-second keyframe interval

    command = [
        'ffmpeg',
        '-y',  # Overwrite output files
        '-f', 'rawvideo',  # Input format
        '-pix_fmt', 'bgr24',  # Pixel format
        '-s', f'{width}x{height}',  # Frame size
        '-r', str(fps),  # Frame rate
        '-i', '-',  # Input from stdin

        # Suppress logs
        '-loglevel', 'quiet',

        # Video encoding settings for HLS
        '-c:v', 'libx264',  # Video codec
        '-preset', 'fast',  # Encoding speed/quality tradeoff
        '-crf', '23',  # Constant Rate Factor (quality)
        '-g', str(keyframe_interval),  # Keyframe interval
        '-keyint_min', str(keyframe_interval),  # Minimum keyframe interval
        '-force_key_frames', f"expr:gte(t,n_forced*10)",  # Force keyframes every 10 seconds

        # HLS output settings
        '-f', 'hls',  # Output format (HLS)
        '-hls_time', '10',  # Segment duration (10 seconds)
        '-hls_list_size', '0',  # Keep all segments in the playlist
        '-hls_segment_type', 'mpegts',  # Segment format
        '-hls_segment_filename', segment_filename,  # Segment filenames
        '-hls_flags', 'program_date_time+split_by_time',  # Enable program date time for precise seeking
        '-start_at_zero',  # Ensures consistent timestamps starting from zero
        playlist_filename,  # Playlist filename

        # Video encoding settings for MP4
        '-vf', 'scale=854:480',  # Scale to 480p
        '-r', '30',  # Frame rate for MP4
        '-c:v', 'libx264',  # Video codec
        '-preset', 'fast',  # Encoding speed/quality tradeoff
        '-crf', '23',  # Constant Rate Factor (quality)
        '-movflags', 'faststart',  # Optimize for streaming
        mp4_filename  # MP4 filename
    ]

    return subprocess.Popen(command, stdin=subprocess.PIPE)

# Function to capture frames and record video
def capture_and_record(rtsp_url, index):
    global frame_counters

    cap = cv2.VideoCapture(rtsp_url)
    if not cap.isOpened():
        print(f"Failed to open stream {index + 1}")
        camera_ready_events[index].set()  # Signal that this camera is ready (but failed)
        return
    
    # Measure FPS for this camera
    recording_fps = measure_fps(cap, index)
    
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    resolution_text = f"{width}x{height}"
    fps_text = f"FPS: {recording_fps}"
    
    # Signal that this camera is ready
    camera_ready_events[index].set()
    
    # Create a subdirectory for the camera (e.g., cam1, cam2, etc.)
    camera_dir = os.path.join(recordings_dir, f"cam{index + 1}")
    os.makedirs(camera_dir, exist_ok=True)
    
    # Initialize the first recording directory immediately
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    output_dir = os.path.join(camera_dir, timestamp)
    print(f"Starting recording for camera {index + 1} at {recording_fps} FPS. Output directory: {output_dir}")
    ffmpeg_process = start_ffmpeg_process(output_dir, width, height, recording_fps)
    
    # Add tracking for last split time
    last_split_time = time.time()
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print(f"Failed to fetch frame from stream {index + 1}")
            break

        frame_counters[index] += 1

        if overlay_flags[index]:
            cv2.putText(frame, resolution_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(frame, fps_text, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        with locks[index]:
            frames[index] = frame
        
        if record_flags[index]:
            current_time = datetime.now()
            current_minute = current_time.minute
            elapsed_time = time.time() - last_split_time

            # Primary check: Try to split at exact hour marks
            max_duration_minutes = MAX_DURATION // 60
            should_split = False

            if current_minute % max_duration_minutes == 0 and current_time.second == 0:
                should_split = True
            # Fallback: If we somehow missed the exact mark, split when exceeding max duration
            elif elapsed_time >= MAX_DURATION:
                print(f"Fallback split triggered for camera {index + 1} after exceeding duration")
                should_split = True

            if should_split:
                if ffmpeg_process is not None:
                    ffmpeg_process.stdin.close()
                    ffmpeg_process.wait()
                    print(f"Recording for camera {index + 1} split at {current_time.strftime('%Y-%m-%d %H:%M:%S')}")
                
                timestamp = current_time.strftime("%Y-%m-%d_%H-%M-%S")
                output_dir = os.path.join(camera_dir, timestamp)
                print(f"Starting new recording for camera {index + 1} at {recording_fps} FPS. Output directory: {output_dir}")
                ffmpeg_process = start_ffmpeg_process(output_dir, width, height, recording_fps)
                last_split_time = time.time()  # Reset the split timer
            
            if ffmpeg_process is not None:
                ffmpeg_process.stdin.write(frame.tobytes())
    
    cap.release()
    if ffmpeg_process is not None:
        ffmpeg_process.stdin.close()
        ffmpeg_process.wait()

# Function to start the HTTP server
def start_http_server():
    # Start the HTTP server as a subprocess
    subprocess.run(["python", "host.py"])

# Start threads for capturing and recording
threads = []
for i, url in enumerate(rtsp_urls):
    thread = threading.Thread(target=capture_and_record, args=(url, i))
    thread.daemon = True
    thread.start()
    threads.append(thread)

# Start the HTTP server in a separate thread
http_server_thread = threading.Thread(target=start_http_server)
http_server_thread.daemon = True
http_server_thread.start()

# Wait for all cameras to be ready
for event in camera_ready_events:
    event.wait()

# Create a window to display the grid
cv2.namedWindow("RTSP Grid", cv2.WINDOW_NORMAL)

# Start an infinite loop to continuously display frames
while True:
    with locks[0], locks[1], locks[2], locks[3]:
        display_frames = [frames[i] if frames[i] is not None else default_frame for i in range(4)]
        
        if num_streams == 1:
            grid = display_frames[0]
        else:
            top_row = np.hstack((cv2.resize(display_frames[0], (640, 480)), cv2.resize(display_frames[1], (640, 480))))
            bottom_row = np.hstack((cv2.resize(display_frames[2], (640, 480)), cv2.resize(display_frames[3], (640, 480))))
            grid = np.vstack((top_row, bottom_row))
        
        cv2.imshow("RTSP Grid", grid)

    # Print frame counters every 5 seconds for debugging
    current_time = time.time()
    if current_time - last_print_time >= 5:
        print(f"Frame counts: Cam1={frame_counters[0]}, Cam2={frame_counters[1]}, Cam3={frame_counters[2]}, Cam4={frame_counters[3]}")
        last_print_time = current_time

    # Add a small delay to free up CPU for other threads
    time.sleep(0.01)  # 10ms delay

    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):
        break
    elif key == ord('1'):
        overlay_flags[0] = not overlay_flags[0]
    elif key == ord('2'):
        overlay_flags[1] = not overlay_flags[1]
    elif key == ord('3'):
        overlay_flags[2] = not overlay_flags[2]
    elif key == ord('4'):
        overlay_flags[3] = not overlay_flags[3]

cv2.destroyAllWindows()