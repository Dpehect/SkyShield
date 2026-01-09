import cv2
import yaml
import time
import threading
import queue
import logging
import os
import sys
import numpy as np
from datetime import datetime
from collections import deque

# High-Level Module Imports
try:
    from core.vision import DroneDetector
    from core.tracking import KinematicTracker
    from core.defense import DefenseProtocol
except ImportError as e:
    print(f"[ERROR] Dependency missing: {e}. Please verify the 'core' directory structure.")
    sys.exit(1)

class SkyShieldKernel:
    """
    SkyShield Command and Control (C2) Kernel.
    Synchronizes neural inference, kinematic tracking, and engagement protocols.
    """
    def __init__(self, config_path="config.yaml"):
        self._initialize_logging()
        self.config = self._load_configuration(config_path)
        
        # Operational State Management
        self.is_operational = True
        self.system_status = "BOOTING"
        self.is_target_locked = False
        self.is_engagement_active = False
        self.frame_counter = 0
        self.uptime_start = time.time()
        
        # Data Pipelines and Telemetry Buffers
        self.video_buffer = queue.Queue(maxsize=15)
        self.telemetry_log = deque(maxlen=150)
        self.fps_averager = deque(maxlen=50)
        
        # Subsystem Initialization
        self._execute_boot_sequence()

    def _initialize_logging(self):
        """Sets up the enterprise-grade logging infrastructure."""
        if not os.path.exists('logs'):
            os.makedirs('logs')
        
        session_id = datetime.now().strftime('%Y%m%d_%H%M%S')
        log_path = f"logs/skyshield_session_{session_id}.log"
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
            handlers=[logging.FileHandler(log_path), logging.StreamHandler()]
        )
        self.logger = logging.getLogger("C2_Kernel")
        self.logger.info("Kernel logging initialized successfully.")

    def _load_configuration(self, path):
        """Securely loads system parameters from YAML manifest."""
        try:
            with open(path, 'r') as stream:
                manifest = yaml.safe_load(stream)
                self.logger.info(f"System manifest loaded from {path}.")
                return manifest
        except Exception as e:
            self.logger.error(f"Configuration fault: {e}. Falling back to hardcoded defaults.")
            return self._get_fallback_params()

    def _get_fallback_params(self):
        """Provides fail-safe default parameters."""
        return {
            'camera': {'source': 0, 'resolution': [1280, 720]},
            'inference': {'confidence_floor': 0.75},
            'countermeasures': {'trigger_pin': 21, 'safety_interlock': True}
        }

    def _execute_boot_sequence(self):
        """Sequential loading of hardware and software abstraction layers."""
        try:
            self.logger.info("Loading Neural Weights and Hardware Drivers...")
            self.detector = DroneDetector("models/drone_model.pt")
            self.tracker = KinematicTracker({'x': [0.15, 0.01, 0.08], 'y': [0.15, 0.01, 0.08]})
            self.effector = DefenseProtocol(self.config['countermeasures']['trigger_pin'])
            
            self.system_status = "READY"
            self.logger.info("SkyShield Kernel Status: READY_FOR_OPERATIONS")
        except Exception as e:
            self.system_status = "CRITICAL_FAULT"
            self.logger.critical(f"Boot sequence failed: {e}")

    def capture_stream_worker(self):
        """High-priority I/O thread for frame acquisition."""
        stream_src = self.config['camera']['source']
        capture_device = cv2.VideoCapture(stream_src)
        
        capture_device.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        capture_device.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        while self.is_operational:
            success, raw_frame = capture_device.read()
            if not success:
                self.logger.error("Optical stream interrupted. Retrying...")
                time.sleep(2)
                continue
            
            if not self.video_buffer.full():
                self.video_buffer.put(raw_frame)
            else:
                try: self.video_buffer.get_nowait() # Drop stale frame
                except: pass
        
        capture_device.release()

    def _orchestrate_logic(self, frame):
        """Executes the primary tactical decision-making cycle."""
        threat_data = self.detector.analyze_scene(frame)
        
        if threat_data:
            # Execute Kinematic Intercept Logic
            frame_center = (frame.shape[1] // 2, frame.shape[0] // 2)
            vector_output, locked = self.tracker.calculate_servo_vectors(threat_data['centroid'], frame_center)
            
            self.is_target_locked = locked
            
            # Engagement Authorization
            if locked:
                self.is_engagement_active = self.effector.verify_fire_permission(
                    threat_data['score'], 
                    "OPERATIONAL" # Could be toggled to "SAFE" via config
                )
            else:
                self.is_engagement_active = False
            
            return threat_data
        
        self.is_target_locked = False
        self.is_engagement_active = False
        return None

    def _render_tactical_hud(self, frame, threat, fps):
        """Renders military-grade Heads-Up Display for situational awareness."""
        h, w, _ = frame.shape
        cx, cy = w // 2, h // 2

        # Reticle and Optical Crosshair
        cv2.line(frame, (cx - 50, cy), (cx + 50, cy), (0, 255, 0), 1)
        cv2.line(frame, (cx, cy - 50), (cx, cy + 50), (0, 255, 0), 1)
        cv2.circle(frame, (cx, cy), 180, (0, 255, 0), 1)

        # Telemetry Dashboard
        overlay = frame.copy()
        cv2.rectangle(overlay, (20, 20), (320, 180), (15, 15, 15), -1)
        frame = cv2.addWeighted(overlay, 0.6, frame, 0.4, 0)
        
        stat_color = (0, 255, 0) if self.system_status == "READY" else (0, 0, 255)
        cv2.putText(frame, f"SYS_MODE: {self.system_status}", (40, 50), 1, 1.2, stat_color, 2)
        cv2.putText(frame, f"REALTIME_FPS: {fps:.1f}", (40, 80), 1, 1, (200, 200, 200), 1)
        cv2.putText(frame, f"PROC_LATENCY: {int(1000/fps if fps>0 else 0)}ms", (40, 110), 1, 1, (200, 200, 200), 1)
        
        engage_status = "DEPLOYED" if self.is_engagement_active else "HOLD_FIRE"
        engage_color = (0, 0, 255) if self.is_engagement_active else (0, 255, 0)
        cv2.putText(frame, f"EFFECTOR: {engage_status}", (40, 140), 1, 1, engage_color, 2)

        # Threat Identification Rendering
        if threat:
            x1, y1, x2, y2 = threat['box']
            threat_color = (0, 0, 255) if self.is_target_locked else (0, 255, 255)
            
            # Tracking Box
            cv2.rectangle(frame, (x1, y1), (x2, y2), threat_color, 2)
            cv2.putText(frame, f"TRK_ID: AERIAL_THREAT_CONF_{int(threat['score']*100)}%", 
                        (x1, y1-15), 1, 0.9, threat_color, 2)
            
            if self.is_target_locked:
                cv2.putText(frame, ">>> TARGET ACQUIRED <<<", (cx-180, cy+250), 2, 1.2, (0,0,255), 3)

        return frame

    def execute_operational_cycle(self):
        """Orchestrates the primary operational lifecycle."""
        self.logger.info("Initializing SkyShield Real-Time Cycle...")
        
        # Launch I/O Thread
        io_thread = threading.Thread(target=self.capture_stream_worker, daemon=True)
        io_thread.start()

        time_anchor = time.time()

        try:
            while self.is_operational:
                if not self.video_buffer.empty():
                    active_frame = self.video_buffer.get()
                    
                    # Performance Metrics
                    time_delta = time.time() - time_anchor
                    fps = 1 / time_delta if time_delta > 0 else 0
                    time_anchor = time.time()
                    self.fps_averager.append(fps)
                    smoothed_fps = sum(self.fps_averager) / len(self.fps_averager)

                    # Neural Analysis and Tactical Logic
                    threat_assessment = self._orchestrate_logic(active_frame)

                    # Augmented Reality HUD Rendering
                    output_frame = self._render_tactical_hud(active_frame, threat_assessment, smoothed_fps)

                    # Visualization
                    cv2.imshow("SKYSHIELD TACTICAL C2 INTERFACE v1.0", output_frame)

                if cv2.waitKey(1) & 0xFF == ord('q'):
                    self.logger.info("Deactivation signal received via user console.")
                    self.is_operational = False

        except Exception as kernel_fault:
            self.logger.error(f"Kernel Panic: {kernel_fault}")
        finally:
            self._shutdown_protocol()

    def _shutdown_protocol(self):
        """Securely terminates hardware connections and clears memory."""
        self.is_operational = False
        cv2.destroyAllWindows()
        self.logger.info("Kernel cleanup complete. All subsystems offline.")

if __name__ == "__main__":
    # SkyShield Entry Point
    kernel_instance = SkyShieldKernel("config.yaml")
    kernel_instance.execute_operational_cycle()