from flask import Flask, request, jsonify
from flask_cors import CORS
from config import ADMIN_SECRET_KEY, SECRET_KEY
from model import db, User, Attendance
import face_recognition
import numpy as np
import base64
from io import BytesIO
from PIL import Image
import os
from datetime import datetime,timedelta
import jwt
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash



app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = SECRET_KEY   # use a strong key in production
JWT_EXPIRATION_HOURS = 24

#  Define a constant for the time window (e.g., 5 minutes)
DUPLICATE_WINDOW_MINUTES = 5
# data base confermation
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///attendance.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Known faces cache
known_face_encodings = []
known_face_ids = []

def load_known_faces():
    global known_face_encodings, known_face_ids
    users = User.query.all()
    known_face_encodings = [np.frombuffer(u.face_encoding, dtype=np.float64) for u in users]
    known_face_ids = [u.id for u in users]

# Initialize database and load known faces
with app.app_context():
    db.create_all()
    load_known_faces()

# ------------------------- APIs -------------------------

@app.route('/api/enroll', methods=['POST'])
def enroll():
    data = request.get_json()
    name = data['name']
    enrollment_id = data['enrollment_id']
    image_data = data['image']

   # ---------- DUPLICATE ENROLLMENT CHECK ----------
    # Check if enrollment_id already exists
    existing_user = User.query.filter_by(enrollment_id=enrollment_id).first()
    if existing_user:
        return jsonify({
            'success': False,
            'message': 'Enrollment ID already exists. Please go to Mark Attendance.'
        }), 400  # 400 Bad Request
    # ------------------------------------------------
    try:
        img_str = image_data.split(',')[1]
        img_bytes = base64.b64decode(img_str)
        img = Image.open(BytesIO(img_bytes))
        img = np.array(img)
    except:
        return jsonify({'success': False, 'message': 'Invalid image'})

    face_encodings = face_recognition.face_encodings(img)
    if len(face_encodings) == 0:
        return jsonify({'success': False, 'message': 'No face detected'})

    encoding = face_encodings[0]

    user = User(name=name, enrollment_id=enrollment_id, face_encoding=encoding.tobytes())
    db.session.add(user)
    db.session.commit()

    load_known_faces()  # Cache update

    return jsonify({'success': True, 'message': 'User enrolled successfully'})


@app.route('/api/recognize', methods=['POST'])
def a():
    data = request.get_json()
    image_data = data['image']

    try:
        img_str = image_data.split(',')[1]
        img_bytes = base64.b64decode(img_str)
        img = Image.open(BytesIO(img_bytes))
        img = np.array(img)
    except:
        return jsonify({'success': False, 'message': 'Invalid image'})

    face_locations = face_recognition.face_locations(img)
    face_encodings = face_recognition.face_encodings(img, face_locations)

    if len(face_encodings) == 0:
        return jsonify({'success': False, 'message': 'No face detected'})

    face_encoding = face_encodings[0]
    matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.5)
    face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)

    if len(face_distances) > 0:
        best_match_index = np.argmin(face_distances)
        if matches[best_match_index]:
            user_id = known_face_ids[best_match_index]
            confidence = 1 - face_distances[best_match_index]

            if confidence > 0.5:
                 # ---------- DUPLICATE ATTENDANCE CHECK ----------
                # Get the most recent attendance record for this user
                last_attendance = Attendance.query.filter_by(user_id=user_id)\
                                   .order_by(Attendance.timestamp.desc())\
                                   .first()
                if last_attendance and (datetime.utcnow() - last_attendance.timestamp) < timedelta(minutes=DUPLICATE_WINDOW_MINUTES):
                    return jsonify({
                        'success': False,
                        'message': f'Attendance already marked within the last {DUPLICATE_WINDOW_MINUTES} minutes.'
                    })
                # mark attendence 
                attendance = Attendance(user_id=user_id)
                db.session.add(attendance)
                db.session.commit()
                user = User.query.get(user_id)
                 # ---------- Generate JWT token for student ----------
                payload = {
                    'user_id': user.id,
                    'role': user.role,   # This will be 'student'
                    'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
                }
                token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

                user = User.query.get(user_id)
                return jsonify({
                    'success': True,
                    'token': token,
                    'name': user.name,
                    'enrollment_id': user.enrollment_id,
                    'role': user.role, 
                    'confidence': float(confidence)
                })

    return jsonify({'success': False, 'message': 'Unknown face'})


@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    records = Attendance.query.order_by(Attendance.timestamp.desc()).all()
    result = []
    for rec in records:
        result.append({
            'id': rec.id,
            'user_id': rec.user_id,
            'name': rec.user.name,
            'enrollment_id': rec.user.enrollment_id,
            'timestamp': rec.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        })
    return jsonify(result)

# end point for search and filter 

@app.route('/api/attendance/filter', methods=['GET'])
def filter_attendance():
    search_term = request.args.get('search', '').strip()

    query = Attendance.query.join(User)

    if search_term:
        query = query.filter(
            (User.name.contains(search_term)) | (User.enrollment_id.contains(search_term))
        )

    records = query.order_by(Attendance.timestamp.desc()).all()

    result = []
    for rec in records:
        result.append({
            'id': rec.id,
            'user_id': rec.user_id,
            'name': rec.user.name,
            'enrollment_id': rec.user.enrollment_id,
            'timestamp': rec.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        })
    return jsonify(result)


## ------------------------- Authentication & Authorization -------------------------
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'message': 'Token missing'}), 401
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            request.user_id = payload['user_id']
            request.user_role = payload['role']
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'message': 'Token missing'}), 401
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            if payload.get('role') != 'admin':
                return jsonify({'success': False, 'message': 'Admin access required'}), 403
            request.user_id = payload['user_id']
            request.user_role = payload['role']
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated

## Admin login endpoint 
@app.route('/api/login', methods=['POST'])
def login():
    try:

         # Ensure we get JSON, if not, return 400
        if not request.is_json:
            return jsonify({'success': False, 'message': 'Request must be JSON'}), 400

        data = request.get_json()
        enrollment_id = data.get('enrollment_id')
        password = data.get('password')

        print(f"Login attempt: enrollment_id='{enrollment_id}', password='{password}'")

        if not enrollment_id or not password:
            return jsonify({'success': False, 'message': 'Missing credentials'}), 400

        user = User.query.filter_by(enrollment_id=enrollment_id).first()
        print(f"User from DB: {user}")

        if not user or not user.password_hash:
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

        if not user.check_password(password):
            print("Password check failed")
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

        # Generate JWT token
        payload = {
            'user_id': user.id,
            'role': user.role,
            'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
        }
        token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

        return jsonify({
            'success': True,
            'token': token,
            'user': {
                'id': user.id,
                'name': user.name,
                'enrollment_id': user.enrollment_id,
                'role': user.role
            }
        })
    except Exception as e:
        print(" Exception in login:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Server error'}), 500

# Admin signup (with secret code)

@app.route('/api/admin/signup', methods=['POST'])
def admin_signup():
    data = request.get_json()
    name = data.get('name')
    enrollment_id = data.get('enrollment_id')
    password = data.get('password')
    secret_code = data.get('secret_code')

    # Secret code – use environment variable or hardcode (change this!)
    ADMIN_SECRET = os.environ.get(ADMIN_SECRET_KEY) or ADMIN_SECRET_KEY

    if not all([name, enrollment_id, password, secret_code]):
        return jsonify({'success': False, 'message': 'All fields required'}), 400

    if secret_code != ADMIN_SECRET:
        return jsonify({'success': False, 'message': 'Invalid secret code'}), 403

    # Check if user already exists
    existing = User.query.filter_by(enrollment_id=enrollment_id).first()
    if existing:
        return jsonify({'success': False, 'message': 'Enrollment ID already exists'}), 400

    # Create admin user with dummy face encoding (since admin may not use face)
    dummy_encoding = np.zeros(128, dtype=np.float64).tobytes()
    admin = User(
        name=name,
        enrollment_id=enrollment_id,
        face_encoding=dummy_encoding,
        role='admin'
    )
    admin.set_password(password)
    db.session.add(admin)
    db.session.commit()

    # Reload cache
    load_known_faces()

    return jsonify({'success': True, 'message': 'Admin created successfully'})


## returns all users – only accessible by admin

@app.route('/api/users', methods=['GET'])
@admin_required
def get_users():
    users = User.query.all()
    result = []
    for u in users:
        result.append({
            'id': u.id,
            'name': u.name,
            'enrollment_id': u.enrollment_id,
            'role': u.role,
            'has_password': u.password_hash is not None
        })
    return jsonify(result)


#indiviual attendence record for student

@app.route('/api/attendance/me', methods=['GET'])
@token_required
def get_my_attendance():
    # request.user_id from token_required decorator
    records = Attendance.query.filter_by(user_id=request.user_id).order_by(Attendance.timestamp.desc()).all()
    result = []
    for rec in records:
        result.append({
            'id': rec.id,
            'timestamp': rec.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        })
    return jsonify(result)








if __name__ == '__main__':
    app.run(debug=True, port=5000)