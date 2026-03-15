from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    enrollment_id = db.Column(db.String(50), unique=True, nullable=False)
    face_encoding = db.Column(db.PickleType, nullable=False)  # face encoding 
    role= db.Column(db.String(20), default='student')  # 'student' and 'admin'
    password_hash = db.Column(db.String(128), nullable=True)  # only for admin users
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        # Hash and store the password
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
      #  """Verify the password against the stored hash."""
        return check_password_hash(self.password_hash, password)

class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref='attendances')