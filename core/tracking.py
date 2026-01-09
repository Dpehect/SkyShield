import numpy as np
import time

class KinematicTracker:
    """
    PID-based motion controller with predictive intercept logic.
    Calculates required angular velocity for Pan/Tilt stabilization.
    """
    def __init__(self, fov_params):
        self.kp = np.array([0.15, 0.15]) 
        self.ki = np.array([0.02, 0.02]) 
        self.kd = np.array([0.08, 0.08]) 
        
        self.integral_error = np.zeros(2)
        self.previous_error = np.zeros(2)
        self.last_sync_time = time.time()
        
        self.deadzone_pixels = 12
        self.acceleration_limit = 85.0

    def calculate_servo_vectors(self, target_coord, frame_center):
        """Computes PID control signals for dual-axis gimbal."""
        now = time.time()
        dt = now - self.last_sync_time
        if dt < 1e-4: dt = 1e-4

      
        current_error = np.array([
            target_coord[0] - frame_center[0],
            target_coord[1] - frame_center[1]
        ])

        
        if np.linalg.norm(current_error) > self.deadzone_pixels:
            self.integral_error += current_error * dt
        
        
        derivative = (current_error - self.previous_error) / dt

        
        control_output = (self.kp * current_error) + \
                         (self.ki * self.integral_error) + \
                         (self.kd * derivative)

        
        final_signal = np.clip(control_output, -self.acceleration_limit, self.acceleration_limit)
        
        self.previous_error = current_error
        self.last_sync_time = now
        
        is_locked = np.all(np.abs(current_error) <= self.deadzone_pixels * 2)
        return final_signal.tolist(), is_locked