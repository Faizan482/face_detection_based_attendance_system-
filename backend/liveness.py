import dlib
import cv2
import numpy as np
from scipy.spatial import distance as dist

PREDICTOR_PATH = "shape_predictor_68_face_landmarks.dat"

detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor(PREDICTOR_PATH)

def eye_aspect_ratio(eye):
    A = dist.euclidean(eye[1], eye[5])
    B = dist.euclidean(eye[2], eye[4])
    C = dist.euclidean(eye[0], eye[3])
    ear = (A + B) / (2.0 * C)
    return ear

def detect_blinks(frames, ear_threshold=0.2, consecutive_frames=3):
    left_eye_indices = list(range(36, 42))
    right_eye_indices = list(range(42, 48))

    blink_counter = 0
    total_blinks = 0
    face_found_count = 0
    ear_values = []

    for frame in frames:
        gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
        faces = detector(gray, 1)   # upsample once for better detection
        if len(faces) == 0:
            continue
        face_found_count += 1

        face = faces[0]
        shape = predictor(gray, face)
        shape = np.array([[p.x, p.y] for p in shape.parts()])

        left_eye = shape[left_eye_indices]
        right_eye = shape[right_eye_indices]

        left_ear = eye_aspect_ratio(left_eye)
        right_ear = eye_aspect_ratio(right_eye)
        ear = (left_ear + right_ear) / 2.0
        ear_values.append(ear)

        if ear < ear_threshold:
            blink_counter += 1
        else:
            if blink_counter >= consecutive_frames:
                total_blinks += 1
            blink_counter = 0

    print(f"Frames with face: {face_found_count} out of {len(frames)}")
    print(f"Ear values (first 10): {ear_values[:10]}")
    print(f"Total blinks detected: {total_blinks}")

    return total_blinks > 0