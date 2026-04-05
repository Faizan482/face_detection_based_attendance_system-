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
from liveness import detect_blinks
from datetime import date
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO
from flask import send_file

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

    # Check if enrollment_id already exists
    existing_user = User.query.filter_by(enrollment_id=enrollment_id).first()
    if existing_user:
        return jsonify({
            'success': False,
            'message': 'Enrollment ID already exists. Please go to Mark Attendance.'
        }), 400

    try:
        img_str = image_data.split(',')[1]
        img_bytes = base64.b64decode(img_str)
        img = Image.open(BytesIO(img_bytes))
        img = np.array(img)
    except:
        return jsonify({'success': False, 'message': 'Invalid image'}), 400

    face_encodings = face_recognition.face_encodings(img)
    if len(face_encodings) == 0:
        return jsonify({'success': False, 'message': 'No face detected'}), 400

    encoding = face_encodings[0]

    # ----- NEW: Check if this face already exists in the database -----
    if known_face_encodings:
        matches = face_recognition.compare_faces(known_face_encodings, encoding, tolerance=0.5)
        if any(matches):
            # Find the first matching user
            match_index = matches.index(True)
            existing_user_id = known_face_ids[match_index]
            existing_user = User.query.get(existing_user_id)
            return jsonify({
                'success': False,
                'message': f'Face already registered to {existing_user.name} (Enrollment ID: {existing_user.enrollment_id}). Please use that account.'
            }), 400
    # ----------------------------------------------------------------

    user = User(name=name, enrollment_id=enrollment_id, face_encoding=encoding.tobytes())
    db.session.add(user)
    db.session.commit()

    load_known_faces()  # Refresh cache

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

@app.route('/api/attendance/student/<string:enrollment_id>', methods=['GET'])
@admin_required
def get_student_attendance(enrollment_id):
    user = User.query.filter_by(enrollment_id=enrollment_id).first()
    if not user:
        return jsonify({'success': False, 'message': 'Student not found'}), 404

    records = Attendance.query.filter_by(user_id=user.id).order_by(Attendance.timestamp.desc()).all()
    attendance_list = [{
        'id': r.id,
        'timestamp': r.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    } for r in records]
    return jsonify({
        'name': user.name,
        'enrollment_id': user.enrollment_id,
        'enrollment_date': user.created_at.strftime('%Y-%m-%d'),
        'attendance': attendance_list
    })

# Admin endpoint to delete a user (and their attendance records)
@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    # Prevent admin from deleting themselves
    if user.id == request.user_id:
        return jsonify({'success': False, 'message': 'You cannot delete your own account'}), 400

    # With cascade set, this automatically deletes all related attendance records
    db.session.delete(user)
    db.session.commit()

    # Reload face recognition cache
    load_known_faces()

    return jsonify({'success': True, 'message': 'User and all attendance records deleted successfully'})

#liveness detection endpoint
@app.route('/api/recognize_liveness', methods=['POST'])
def recognize_liveness():
    data = request.get_json()
    frames_data = data.get('frames', [])

    print(f"📥 Received {len(frames_data)} frames from frontend")

    if not frames_data:
        return jsonify({'success': False, 'message': 'No frames provided'}), 400

    frames = []
    for idx, img_data in enumerate(frames_data):
        try:
            img_str = img_data.split(',')[1]
            img_bytes = base64.b64decode(img_str)
            img = Image.open(BytesIO(img_bytes))
            img = np.array(img)
            frames.append(img)
        except Exception as e:
            print(f"⚠️ Frame {idx} decode error: {e}")
            continue

    print(f"🖼️ Decoded {len(frames)} frames")
    if frames:
        print(f"🔍 First frame shape: {frames[0].shape}")

    if len(frames) == 0:
        return jsonify({'success': False, 'message': 'Could not decode frames'}), 400

    # Liveness detection
    from liveness import detect_blinks
    live = detect_blinks(frames, ear_threshold=0.18, consecutive_frames=2)
    print(f"👁️ Liveness result: {live}")

    if not live:
        return jsonify({'success': False, 'message': 'Liveness check failed. Please blink.'})

    # Face recognition on the last frame
    face_encodings = face_recognition.face_encodings(frames[-1])
    if len(face_encodings) == 0:
        return jsonify({'success': False, 'message': 'No face detected in final frame'})

    face_encoding = face_encodings[0]
    matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.5)
    face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)

    if len(face_distances) > 0:
        best_match_index = np.argmin(face_distances)
        if matches[best_match_index]:
            user_id = known_face_ids[best_match_index]
            confidence = 1 - face_distances[best_match_index]

            if confidence > 0.5:
                # Duplicate check
                last_attendance = Attendance.query.filter_by(user_id=user_id)\
                                   .order_by(Attendance.timestamp.desc()).first()
                if last_attendance and (datetime.utcnow() - last_attendance.timestamp) < timedelta(minutes=DUPLICATE_WINDOW_MINUTES):
                    return jsonify({
                        'success': False,
                        'message': f'Attendance already marked within the last {DUPLICATE_WINDOW_MINUTES} minutes.'
                    })

                # Mark attendance
                attendance = Attendance(user_id=user_id)
                db.session.add(attendance)
                db.session.commit()
                user = User.query.get(user_id)

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
                    'name': user.name,
                    'enrollment_id': user.enrollment_id,
                    'role': user.role,
                    'confidence': float(confidence)
                })

    return jsonify({'success': False, 'message': 'Unknown face'})

#daily attendance report for admin

@app.route('/api/attendance/daily', methods=['GET'])
@admin_required
def get_daily_attendance():
    target_date_str = request.args.get('date', date.today().isoformat())
    try:
        target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date format'}), 400

    students = User.query.filter_by(role='student').all()
    start = datetime.combine(target_date, datetime.min.time())
    end = datetime.combine(target_date, datetime.max.time())
    attendance_records = Attendance.query.filter(Attendance.timestamp.between(start, end)).all()
    present_user_ids = set(rec.user_id for rec in attendance_records)

    result = []
    for student in students:
        rec = next((r for r in attendance_records if r.user_id == student.id), None)
        result.append({
            'id': student.id,
            'name': student.name,
            'enrollment_id': student.enrollment_id,
            'present': student.id in present_user_ids,
            'timestamp': rec.timestamp.strftime('%Y-%m-%d %H:%M:%S') if rec else None
        })
    return jsonify(result)

# ---------- Manual Attendance Override ----------
@app.route('/api/attendance/manual', methods=['POST'])
@admin_required
def manual_attendance():
    data = request.get_json()
    enrollment_id = data.get('enrollment_id')
    if not enrollment_id:
        return jsonify({'success': False, 'message': 'Enrollment ID required'}), 400

    user = User.query.filter_by(enrollment_id=enrollment_id).first()
    if not user:
        return jsonify({'success': False, 'message': 'Student not found'}), 404

    # Optional duplicate check (same as recognition)
    last_attendance = Attendance.query.filter_by(user_id=user.id).order_by(Attendance.timestamp.desc()).first()
    if last_attendance and (datetime.utcnow() - last_attendance.timestamp) < timedelta(minutes=DUPLICATE_WINDOW_MINUTES):
        return jsonify({'success': False, 'message': f'Attendance already marked within last {DUPLICATE_WINDOW_MINUTES} minutes'}), 400

    attendance = Attendance(user_id=user.id)
    db.session.add(attendance)
    db.session.commit()
    return jsonify({'success': True, 'message': f'Attendance marked for {user.name}'})

# ---------- PDF Export ----------
@app.route('/api/attendance/export/pdf', methods=['GET'])
@admin_required
def export_attendance_pdf():
    records = Attendance.query.order_by(Attendance.timestamp.desc()).all()
    data = [[str(rec.id), rec.user.name, rec.user.enrollment_id, rec.timestamp.strftime('%Y-%m-%d %H:%M:%S')] for rec in records]

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))
    elements = []

    styles = getSampleStyleSheet()
    title = Paragraph("Attendance Records", styles['Title'])
    elements.append(title)
    elements.append(Spacer(1, 12))

    table_data = [['ID', 'Name', 'Enrollment ID', 'Timestamp']] + data
    table = Table(table_data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.grey),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('GRID', (0,0), (-1,-1), 1, colors.black),
    ]))
    elements.append(table)

    doc.build(elements)
    buffer.seek(0)
    return send_file(buffer, as_attachment=True, download_name='attendance_report.pdf', mimetype='application/pdf')


if __name__ == '__main__':
    app.run(debug=True, port=5000)