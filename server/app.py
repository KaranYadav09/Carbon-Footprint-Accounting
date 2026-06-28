import os
import tempfile
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from services import (
    process_bill_image, 
    ACTIVITY_EMISSION_FACTORS, 
    get_scope_for_activity,
    ACTIVITY_SCOPES
)
from ai_recommendations import get_ai_recommendations
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required, JWTManager, get_jwt, verify_jwt_in_request
from dotenv import load_dotenv
from pathlib import Path
from flask import send_from_directory
from flask_mail import Mail, Message

# Load .env file - try server directory first, then parent (root) directory
env_path_server = Path(__file__).parent / '.env'
env_path_root = Path(__file__).parent.parent / '.env'

if env_path_server.exists():
    load_dotenv(dotenv_path=env_path_server)
    print(f"Loaded .env from: {env_path_server}")
elif env_path_root.exists():
    load_dotenv(dotenv_path=env_path_root)
    print(f"Loaded .env from: {env_path_root}")
else:
    # Try default location (current directory)
    load_dotenv()
    print("Loaded .env from default location")

print("SECRET KEY LOADED:", "YES" if os.getenv("JWT_SECRET_KEY") else "NO")
print("GEMINI_API_KEY LOADED:", "YES" if os.getenv("GEMINI_API_KEY") else "NO")
print("OPENAI_API_KEY LOADED:", "YES" if os.getenv("OPENAI_API_KEY") else "NO")
# --- App Configuration ---
app = Flask(__name__)
db_url = os.environ.get('DATABASE_URL', 'sqlite:///ecotrace.db')
# Supabase/Heroku starts with postgres://, SQLAlchemy requires postgresql://
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///ecotrace.db"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Print database connection for verification
db_host = db_url.split('@')[-1] if '@' in db_url else 'local file'
print(f"--- Database Connection: {'Supabase/Postgres' if 'postgresql' in db_url else 'SQLite'} ({db_host}) ---")

app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY")
app.config['UPLOAD_FOLDER'] = os.path.join(tempfile.gettempdir(), 'uploads')
db = SQLAlchemy(app)
CORS(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# --- Mail Configuration ---
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', 'True') == 'True'
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER', os.environ.get('MAIL_USERNAME'))
mail = Mail(app)

def send_email(subject, recipients, body=None, html=None):
    """Safely send an email without crashing if config is missing"""
    if not app.config.get('MAIL_USERNAME'):
         print(f"EMAIL SKIPPED (No Config): {subject} -> {recipients}")
         return False
    try:
        msg = Message(subject, recipients=recipients)
        if body: msg.body = body
        if html: msg.html = html
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Mail send error: {e}")
        return False

def upload_to_supabase(file_path, filename, bucket="uploads"):
    import requests
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        return None
        
    try:
        with open(file_path, 'rb') as f:
            file_content = f.read()
            
        # Guess content type
        content_type = "image/jpeg"
        if filename.lower().endswith(('.png')): content_type = "image/png"
        elif filename.lower().endswith(('.pdf')): content_type = "application/pdf"
            
        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": content_type
        }
        
        clean_url = url.rstrip('/')
        upload_url = f"{clean_url}/storage/v1/object/{bucket}/{filename}"
        
        res = requests.post(upload_url, headers=headers, data=file_content)
        if res.status_code == 200:
             return f"{clean_url}/storage/v1/object/public/{bucket}/{filename}"
        else:
             print(f"Supabase Upload Fail: {res.status_code} - {res.text}")
             return None
    except Exception as e:
        print(f"Supabase Upload Exception: {e}")
        return None

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# A simple emission factor (kg CO2e per kwh).
EMISSION_FACTOR_kwh = 0.82

# --- Database Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='student')
    # Profile fields
    name = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    department = db.Column(db.String(100), nullable=True)
    student_id = db.Column(db.String(50), nullable=True)
    phone_number = db.Column(db.String(20), nullable=True)
    profile_picture = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='pending') # pending, approved, rejected
    
    # Eco Stats
    eco_points = db.Column(db.Integer, default=0)
    trees_planted = db.Column(db.Integer, default=0)
    co2_saved_kg = db.Column(db.Float, default=0.0)
    events_attended = db.Column(db.Integer, default=0)
    
    activities = db.relationship('ActivityLog', backref='owner', lazy=True)

    def __init__(self, username, password_hash, role='student', name=None, email=None, department=None, student_id=None, phone_number=None, profile_picture=None, eco_points=0, trees_planted=0, co2_saved_kg=0.0, events_attended=0, status='pending'):
        self.username = username
        self.password_hash = password_hash
        self.role = role
        self.name = name
        self.email = email
        self.department = department
        self.student_id = student_id
        self.phone_number = phone_number
        self.profile_picture = profile_picture
        self.eco_points = eco_points
        self.trees_planted = trees_planted
        self.co2_saved_kg = co2_saved_kg
        self.events_attended = events_attended
        self.status = status if role == 'student' else 'approved'

class ActivityLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    activity_type = db.Column(db.String(80), nullable=False)
    usage_kwh = db.Column(db.Float, nullable=False)
    calculated_co2e_kg = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    metadata_info = db.Column(db.Text, nullable=True)

    def __init__(self, activity_type, usage_kwh, calculated_co2e_kg, user_id, metadata_info=None):
        self.activity_type = activity_type
        self.usage_kwh = usage_kwh
        self.calculated_co2e_kg = calculated_co2e_kg
        self.user_id = user_id
        self.metadata_info = metadata_info

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    read = db.Column(db.Boolean, default=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, user_id, message):
        self.user_id = user_id
        self.message = message

class Challenge(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    reward_points = db.Column(db.Integer, default=100)
    goal_value = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    start_date = db.Column(db.String(50))
    end_date = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ChallengeParticipant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    challenge_id = db.Column(db.Integer, db.ForeignKey('challenge.id'), nullable=False)
    progress = db.Column(db.Float, default=0.0)
    completed = db.Column(db.Boolean, default=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

# --- Auth Endpoints ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    name = data.get('name')
    email = data.get('email')
    department = data.get('department')
    student_id = data.get('student_id')
    phone_number = data.get('phone_number')
    
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409
    
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(
        username=username,
        password_hash=hashed_password,
        name=name,
        email=email,
        department=department,
        student_id=student_id,
        phone_number=phone_number
    )
    db.session.add(new_user)
    db.session.commit()
    
    # Send Welcome Email
    if email:
        send_email(
            subject="EcoTrace Registration Received",
            recipients=[email],
            body=f"Hello {name or username},\n\nYour registration for EcoTrace has been received and is awaiting admin approval."
        )
        
    return jsonify({"message": "Registration successful. Please wait for admin approval."}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username, password = data.get('username'), data.get('password')
    user = User.query.filter_by(username=username).first()
    if user and bcrypt.check_password_hash(user.password_hash, password):
        # Check Status
        if user.status == 'pending':
            return jsonify({"error": "Your account is awaiting admin approval."}), 403
        if user.status == 'rejected':
            return jsonify({"error": "Your registration was rejected by the admin."}), 403

        additional_claims = {"role": user.role}
        # --- FIX: Convert user.id to a string before creating the token ---
        access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
        return jsonify(access_token=access_token)
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        # Return success for security reasons (ignore existence checks)
        return jsonify({"message": "If that email exists in our system, we have sent a reset link to it."}), 200
        
    # Generate token
    expires = timedelta(minutes=15)
    reset_token = create_access_token(identity=str(user.id), additional_claims={"reset_password": True}, expires_delta=expires)
    
    # Use Origin header for dynamic reset URLs
    origin = request.headers.get('Origin') or "http://localhost:5173"
    reset_url = f"{origin}/reset-password?token={reset_token}"
    
    subject = "EcoTrace Password Reset"
    body = f"Hello {user.name or user.username},\n\nYou requested a password reset. Click the link below to set a new password:\n\n{reset_url}\n\nThis link will expire in 15 minutes."
    
    send_email(subject=subject, recipients=[user.email], body=body)
    
    return jsonify({"message": "If that email exists in our system, we have sent a reset link to it."}), 200

@app.route('/api/reset-password/<string:token>', methods=['POST'])
def reset_password(token):
    from flask_jwt_extended import decode_token
    try:
        decoded = decode_token(token)
        is_reset = decoded.get('reset_password')
        
        if not is_reset:
            return jsonify({"error": "Invalid token type"}), 400
            
        user_id = decoded['sub']
        user = User.query.get(user_id)
        if not user:
             return jsonify({"error": "User no longer exists"}), 404
             
        data = request.get_json()
        new_password = data.get('password')
        if not new_password or len(new_password) < 8:
            return jsonify({"error": "Password must be at least 8 characters long"}), 400
            
        hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')
        user.password_hash = hashed_password
        db.session.commit()
        
        return jsonify({"message": "Password reset successful! You can now log in."}), 200
    except Exception as e:
        return jsonify({"error": "Invalid or expired reset token"}), 400

# --- Admin Bill Processing Endpoint ---
@app.route('/api/process-bill', methods=['POST'])
@jwt_required()
def upload_and_process_bill():
    if get_jwt().get('role').strip() != 'admin':
        return jsonify({"error": "Admin access required"}), 403

    current_user_id = get_jwt_identity()
    if 'bill' not in request.files: return jsonify({"error": "No file part"}), 400
    file = request.files['bill']
    if file.filename == '': return jsonify({"error": "No selected file"}), 400
    
    if file:
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(file.filename))
        file.save(filepath)
        result = process_bill_image(filepath)
        if "error" in result: return jsonify(result), 400
        
        try:
            import json
            data = result['extracted_data']
            emissions = result['emissions_calculation']
            metadata = result.get('metadata', {})
            
            new_log = ActivityLog(
                activity_type=data['activity_type'],
                usage_kwh=data.get('usage_value', data.get('usage_kwh', 0)),
                calculated_co2e_kg=emissions['calculated_co2e_kg'],
                user_id=current_user_id,
                metadata_info=json.dumps(metadata) if metadata else None
            )
            db.session.add(new_log)
            db.session.commit()
            return jsonify({"message": f"Bill processed and saved as log #{new_log.id}"}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": "Failed to save data to the database."}), 500
            
    return jsonify({"error": "Invalid file"}), 400

# --- Endpoint to fetch activity logs ---
@app.route('/api/activities', methods=['GET'])
@jwt_required()
def get_activities():
    try:
        claims = get_jwt()
        user_id = get_jwt_identity()
        days = request.args.get('days')

        if claims.get('role') == 'admin':
            query = ActivityLog.query
        else:
            query = ActivityLog.query.filter_by(user_id=user_id)
            
        if days:
            try:
                days_int = int(days)
                cutoff_date = datetime.utcnow() - timedelta(days=days_int)
                query = query.filter(ActivityLog.timestamp >= cutoff_date)
            except ValueError:
                pass # Ignore invalid days param

        since = request.args.get('since')
        if since:
            try:
                # Expect ISO format from frontend (e.g. 2024-01-01T00:00:00.000Z)
                # Removing 'Z' if present as datetime.fromisoformat might not handle it in older python versions without replacement
                since_date = datetime.fromisoformat(since.replace('Z', '+00:00'))
                # Ensure naive datetime if DB is naive, or timezone aware if DB is aware. 
                # SQLite usually stores naive. detailed handling might be needed based on DB config.
                # For now assuming UTC comparison.
                query = query.filter(ActivityLog.timestamp >= since_date.replace(tzinfo=None)) 
            except ValueError:
                pass 

        logs = query.order_by(ActivityLog.timestamp.desc()).all()

        def get_unit_for_activity(activity):
            act = activity.lower()
            if 'electricity' in act: return 'kWh'
            if 'water' in act: return 'KL'
            if 'fuel' in act or 'petrol' in act or 'diesel' in act: return 'L'
            if 'png' in act: return 'SCM'
            if 'lpg' in act: return 'cylinders'
            return 'units'

        import json
        formatted_logs = []
        for log in logs:
            meta = {}
            if log.metadata_info:
                try: meta = json.loads(log.metadata_info)
                except: pass
                
            formatted_logs.append({
                "id": log.id,
                "activity_type": log.activity_type.capitalize(),
                "usage": f"{log.usage_kwh} {get_unit_for_activity(log.activity_type)}",
                "raw_usage_kwh": log.usage_kwh,
                "raw_co2e_kg": log.calculated_co2e_kg,
                "co2e": f"{log.calculated_co2e_kg} kg",
                "timestamp": log.timestamp.isoformat() + 'Z', # Force UTC interpretation
                "uploaded_by": log.owner.username if log.owner else "Unknown User",
                "metadata": meta
            })
        return jsonify(formatted_logs), 200
    except Exception as e:
        print(f"Error fetching activities: {e}")
        return jsonify({"error": str(e)}), 500

# --- Endpoint to CREATE an activity log (for Admins and Users) ---
@app.route('/api/activities', methods=['POST'])
@jwt_required()
def add_activity():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body cannot be empty."}), 400

    activity_type = data.get('activity_type')
    usage_kwh_str = data.get('usage_kwh') or data.get('usage_value')
    user_id = data.get('user_id')

    current_user_id = str(get_jwt_identity())
    role = get_jwt().get('role', '').strip()

    if role != 'admin' and str(user_id) != current_user_id:
        return jsonify({"error": "You can only add activities for your own account"}), 403

    if not all([activity_type, usage_kwh_str, user_id]):
        return jsonify({"error": "Missing required fields: activity_type, usage_kwh/usage_value, user_id"}), 422

    try:
        usage_kwh = float(usage_kwh_str)
    except (ValueError, TypeError):
        return jsonify({"error": "'usage_kwh' must be a valid number."}), 422
    
    if not User.query.get(user_id):
        return jsonify({"error": f"User with id {user_id} not found."}), 404

    try:
        from services import normalize_activity_type
        norm_type = normalize_activity_type(activity_type)
        # Lookup factor from centralized services mapping
        # Default to electricity factor if not found to avoid breaking changes
        factor = ACTIVITY_EMISSION_FACTORS.get(norm_type, 0.82)
        calculated_co2e = usage_kwh * factor

        new_log = ActivityLog(
            activity_type=activity_type,
            usage_kwh=usage_kwh,
            calculated_co2e_kg=round(calculated_co2e, 4),
            user_id=user_id
        )
        db.session.add(new_log)
        db.session.commit()
        return jsonify({"message": f"Activity '{activity_type}' logged successfully."}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "An internal server error occurred while saving."}), 500

# --- Endpoint to update an activity log ---
@app.route('/api/activities/<int:log_id>', methods=['PUT'])
@jwt_required()
def update_activity(log_id):
    if get_jwt().get('role').strip() != 'admin':
        return jsonify({"error": "Admin access required"}), 403
        
    log = ActivityLog.query.get(log_id)
    if not log:
        return jsonify({"error": "Activity not found"}), 404
        
    data = request.get_json()
    if 'usage_kwh' in data:
        log.usage_kwh = float(data['usage_kwh'])
    if 'co2e_kg' in data:
        log.calculated_co2e_kg = float(data['co2e_kg'])
        
    try:
        db.session.commit()
        return jsonify({"message": "Activity updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update activity"}), 500

# --- Notification Endpoints ---
@app.route('/api/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    try:
        user_id = get_jwt_identity()
        notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.timestamp.desc()).limit(10).all()
        
        result = [{
            "id": n.id,
            "message": n.message,
            "read": n.read,
            "timestamp": n.timestamp.isoformat() + 'Z'
        } for n in notifications]
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": "Could not fetch notifications"}), 500

@app.route('/api/notifications/<int:notif_id>/read', methods=['PUT'])
@jwt_required()
def mark_notification_read(notif_id):
    try:
        user_id = get_jwt_identity()
        notif = Notification.query.get(notif_id)
        if not notif or str(notif.user_id) != str(user_id):
            return jsonify({"error": "Notification not found"}), 404
            
        notif.read = True
        db.session.commit()
        return jsonify({"message": "Notification marked as read"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update notification"}), 500

# --- Challenge Endpoints ---
@app.route('/api/challenges', methods=['GET'])
@jwt_required()
def get_challenges():
    try:
         user_id = int(get_jwt_identity())
         challenges = Challenge.query.all()
         joined = ChallengeParticipant.query.filter_by(user_id=user_id).all()
         joined_map = {j.challenge_id: j for j in joined}
         
         result = []
         for c in challenges:
              p = joined_map.get(c.id)
              result.append({
                  "id": c.id,
                  "title": c.title,
                  "description": c.description,
                  "reward_points": c.reward_points,
                  "goal_value": c.goal_value,
                  "category": c.category,
                  "start_date": c.start_date,
                  "end_date": c.end_date,
                  "joined": p is not None,
                  "progress": p.progress if p else 0,
                  "completed": p.completed if p else False
              })
         return jsonify(result), 200
    except Exception as e:
         return jsonify({"error": "Could not fetch challenges"}), 500

@app.route('/api/challenges/<int:id>/join', methods=['POST'])
@jwt_required()
def join_challenge(id):
    try:
        user_id = int(get_jwt_identity())
        challenge = Challenge.query.get(id)
        if not challenge:
             return jsonify({"error": "Challenge not found"}), 404
             
        existing = ChallengeParticipant.query.filter_by(user_id=user_id, challenge_id=id).first()
        if existing:
             return jsonify({"message": "Already joined"}), 200
             
        p = ChallengeParticipant(user_id=user_id, challenge_id=id)
        db.session.add(p)
        db.session.commit()
        return jsonify({"message": "Joined challenge successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to join challenge"}), 500

# --- Endpoint to fetch all users (for Admin Dashboard dropdown) ---
@app.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    if get_jwt().get('role').strip() != 'admin':
        return jsonify({"error": "Admin access required"}), 403

    try:
        users = User.query.all()
        user_list = [{"id": user.id, "username": user.username} for user in users]
        return jsonify(user_list), 200
    except Exception as e:
        return jsonify({"error": "Could not fetch users."}), 500

# --- Admin User Management Endpoints (Approvals) ---

@app.route('/api/admin/users/pending', methods=['GET'])
@jwt_required()
def get_pending_users():
    if get_jwt().get('role').strip() != 'admin':
        return jsonify({"error": "Admin access required"}), 403
    
    try:
        pending_users = User.query.filter_by(status='pending').all()
        user_list = [{
            "id": user.id,
            "username": user.username,
            "name": user.name,
            "email": user.email,
            "department": user.department,
            "student_id": user.student_id,
            "phone_number": user.phone_number,
            "joined_at": "Today" # You might want to add created_at to User model later
        } for user in pending_users]
        return jsonify(user_list), 200
    except Exception as e:
        return jsonify({"error": "Could not fetch pending users."}), 500

@app.route('/api/admin/users/<int:user_id>/approve', methods=['PUT'])
@jwt_required()
def approve_user_registration(user_id):
    if get_jwt().get('role').strip() != 'admin':
        return jsonify({"error": "Admin access required"}), 403
        
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    try:
        user.status = 'approved'
        
        # Add Notification
        notif = Notification(user_id=user.id, message="Your account has been approved by the admin!")
        db.session.add(notif)
        
        db.session.commit()
        
        # Send Email
        if user.email:
            send_email(
                subject="EcoTrace Account Approved",
                recipients=[user.email],
                body=f"Hello {user.name or user.username},\n\nYour EcoTrace account has been approved! You can now log in."
            )
            
        return jsonify({"message": f"User {user.username} approved successfully."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to approve user."}), 500

@app.route('/api/admin/users/<int:user_id>/reject', methods=['PUT'])
@jwt_required()
def reject_user_registration(user_id):
    if get_jwt().get('role').strip() != 'admin':
        return jsonify({"error": "Admin access required"}), 403
        
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    try:
        user.status = 'rejected'
        db.session.commit()
        return jsonify({"message": f"User {user.username} rejected."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to reject user."}), 500

# --- Endpoint to get user profile ---
@app.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        profile_data = {
            "id": user.id,
            "username": user.username,
            "name": user.name,
            "email": user.email,
            "department": user.department,
            "student_id": user.student_id,
            "phone_number": user.phone_number,
            "profile_picture": user.profile_picture,
            "role": user.role
        }
        
        return jsonify(profile_data), 200
    except Exception as e:
        return jsonify({"error": "An internal server error occurred."}), 500

# --- Endpoint to update user profile ---
@app.route('/api/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        if 'name' in data:
            user.name = data['name']
        if 'email' in data:
            user.email = data['email']
        if 'department' in data:
            user.department = data['department']
        if 'student_id' in data:
            user.student_id = data['student_id']
        if 'phone_number' in data:
            user.phone_number = data['phone_number']
        if 'profile_picture' in data:
            user.profile_picture = data['profile_picture']
        
        db.session.commit()
        
        return jsonify({"message": "Profile updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "An internal server error occurred."}), 500

# --- Endpoint to get AI recommendations for hotspots ---
@app.route('/api/ai-recommendations', methods=['POST'])
@jwt_required()
def get_recommendations():
    """
    Get AI-powered recommendations for emission hotspots.
    Requires: hotspot_name, co2e_kg, percentage
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Request body cannot be empty."}), 400
        
        hotspot_name = data.get('hotspot_name')
        co2e_kg = data.get('co2e_kg')
        percentage = data.get('percentage')
        
        if not all([hotspot_name, co2e_kg is not None, percentage is not None]):
            return jsonify({"error": "Missing required fields: hotspot_name, co2e_kg, percentage"}), 400
        
        try:
            co2e_kg = float(co2e_kg)
            percentage = float(percentage)
        except (ValueError, TypeError):
            return jsonify({"error": "co2e_kg and percentage must be valid numbers."}), 400
        
        print(f"DEBUG: Recommendation request for {hotspot_name} (Seed: {data.get('cacheSeed')})")
        result = get_ai_recommendations(hotspot_name, co2e_kg, percentage)
        
        return jsonify({
            "recommendations": result["recommendations"],
            "source": result["source"]
        }), 200
        
    except Exception as e:
        error_message = str(e)
        print(f"Error generating recommendations: {error_message}")
        # Return more descriptive error message
        if "API" in error_message or "key" in error_message.lower():
            return jsonify({"error": error_message}), 500
        return jsonify({"error": "Failed to generate AI recommendations. Please check your API keys (Gemini or OpenAI) and try again."}), 500

# --- Student Management Endpoints ---

# Get all students (for admin dashboard)
@app.route('/api/students', methods=['GET'])
@jwt_required()
def get_students():
    if get_jwt().get('role').strip() != 'admin':
        return jsonify({"error": "Admin access required"}), 403
    
    try:
        students = User.query.filter_by(role='student').all()
        student_list = [{
            "id": student.id,
            "username": student.username,
            "name": student.name,
            "email": student.email,
            "department": student.department,
            "student_id": student.student_id,
            "phone_number": student.phone_number,
            "phone_number": student.phone_number,
            "status": student.status,
            "verified": student.status == 'approved'
        } for student in students]
        return jsonify(student_list), 200
    except Exception as e:
        return jsonify({"error": "Could not fetch students."}), 500

# Create a new student account (admin only)
@app.route('/api/students', methods=['POST'])
@jwt_required()
def create_student():
    if get_jwt().get('role').strip() != 'admin':
        return jsonify({"error": "Admin access required"}), 403
    
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    name = data.get('name')
    email = data.get('email')
    department = data.get('department')
    student_id = data.get('student_id')
    phone_number = data.get('phone_number')
    
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409
    
    try:
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        new_student = User(
            username=username,
            password_hash=hashed_password,
            role='student',
            name=name,
            email=email,
            department=department,
            student_id=student_id,
            phone_number=phone_number
        )
        db.session.add(new_student)
        db.session.commit()
        return jsonify({
            "message": "Student created successfully",
            "student": {
                "id": new_student.id,
                "username": new_student.username,
                "name": new_student.name,
                "email": new_student.email,
                "department": new_student.department,
                "student_id": new_student.student_id,
                "phone_number": new_student.phone_number,
                "phone_number": new_student.phone_number,
                "status": new_student.status,
                "verified": new_student.status == 'approved'
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create student."}), 500

# Get current student profile (for students)
@app.route('/api/profile', methods=['GET'])
@app.route('/api/students/me', methods=['GET'])
@jwt_required()
def get_student_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "id": user.id,
        "username": user.username,
        "name": user.name,
        "email": user.email,
        "department": user.department,
        "student_id": user.student_id,
        "phone_number": user.phone_number,
        "profile_picture": user.profile_picture,
        "verified": bool(user.student_id),
        "eco_points": user.eco_points or 0,
        "trees_planted": user.trees_planted or 0,
        "co2_saved_kg": float(user.co2_saved_kg or 0),
        "events_attended": user.events_attended or 0
    }), 200

# Student requests verification (submit student ID for admin approval)
@app.route('/api/students/request-verification', methods=['POST'])
@jwt_required()
def request_verification():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or user.role != 'student':
        return jsonify({"error": "Student access required"}), 403
    
    data = request.get_json()
    student_id = data.get('student_id')
    name = data.get('name')
    email = data.get('email')
    department = data.get('department')
    phone_number = data.get('phone_number')
    
    if not student_id:
        return jsonify({"error": "Student ID is required"}), 400
    
    # Check if student ID is already taken
    if User.query.filter(User.student_id == student_id, User.id != user.id).first():
        return jsonify({"error": "Student ID already exists"}), 409
    
    try:
        # Update user profile with submitted info
        user.student_id = student_id
        if name: user.name = name
        if email: user.email = email
        if department: user.department = department
        if phone_number: user.phone_number = phone_number
        
        db.session.commit()
        return jsonify({
            "message": "Verification request submitted successfully. Awaiting admin approval.",
            "student": {
                "id": user.id,
                "username": user.username,
                "name": user.name,
                "email": user.email,
                "department": user.department,
                "student_id": user.student_id,
                "phone_number": user.phone_number,
                "phone_number": user.phone_number,
                "status": user.status,
                "verified": user.status == 'approved'
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to submit verification request."}), 500

# Admin approves student verification
@app.route('/api/students/<int:student_id>/approve', methods=['POST'])
@jwt_required()
def approve_student(student_id):
    if get_jwt().get('role').strip() != 'admin':
        return jsonify({"error": "Admin access required"}), 403
    
    student = User.query.get(student_id)
    if not student or student.role != 'student':
        return jsonify({"error": "Student not found"}), 404
    
    try:
        student.status = 'approved'
        db.session.commit()
        return jsonify({
            "message": f"Student {student.username} verified successfully",
            "student": {
                "id": student.id,
                "username": student.username,
                "name": student.name,
                "email": student.email,
                "department": student.department,
                "student_id": student.student_id,
                "phone_number": student.phone_number,
                "status": student.status,
                "verified": True
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to approve student."}), 500

# Admin rejects student verification
@app.route('/api/students/<int:student_id>/reject', methods=['POST'])
@jwt_required()
def reject_student(student_id):
    if get_jwt().get('role').strip() != 'admin':
        return jsonify({"error": "Admin access required"}), 403
    
    student = User.query.get(student_id)
    if not student or student.role != 'student':
        return jsonify({"error": "Student not found"}), 404
    
    try:
        student.status = 'rejected'
        db.session.commit()
        return jsonify({
            "message": f"Student {student.username} rejected successfully",
            "student": {
                "id": student.id,
                "status": student.status
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to reject student."}), 500


# Admin deletes a student
@app.route('/api/students/<int:student_id>', methods=['DELETE'])
@jwt_required()
def delete_student(student_id):
    if get_jwt().get('role').strip() != 'admin':
        return jsonify({"error": "Admin access required"}), 403
    
    student = User.query.get(student_id)
    if not student:
        return jsonify({"error": "Student not found"}), 404
    
    # Optional: Check if role is student to prevent accidental admin deletion
    if student.role != 'student':
         return jsonify({"error": "Cannot delete non-student users via this endpoint"}), 400

    try:
        # Manually delete associated related rows to enforce constraint
        ActivityLog.query.filter_by(user_id=student.id).delete()
        Notification.query.filter_by(user_id=student.id).delete()
        ChallengeParticipant.query.filter_by(user_id=student.id).delete()
        CommuteLog.query.filter_by(user_id=student.id).delete()
        TreePlantation.query.filter_by(user_id=student.id).delete()
        UserAchievement.query.filter_by(user_id=student.id).delete()
        EventParticipant.query.filter_by(user_id=student.id).delete()
        EventProof.query.filter_by(user_id=student.id).delete()
        
        db.session.delete(student)
        db.session.commit()
        return jsonify({"message": f"Student {student.username} deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete student."}), 500

# --- Leaderboard Endpoint ---
@app.route('/api/leaderboard', methods=['GET'])
@jwt_required()
def get_leaderboard():
    """Get leaderboard with student rankings based on various factors"""
    sort_by = request.args.get('sort_by', 'co2_reduced')  # co2_reduced, points, activities
    
    # Get all students with their stats
    students = db.session.query(User).filter(User.role == 'student').all()
    
    leaderboard_data = []
    
    for student in students:
        # Calculate activities count from all sources
        activity_logs = ActivityLog.query.filter_by(user_id=student.id).count()
        commutes = CommuteLog.query.filter_by(user_id=student.id).count()
        trees = TreePlantation.query.filter_by(user_id=student.id, status='approved').count()
        
        # Real activities count
        activities_count = activity_logs + commutes + trees + (student.events_attended or 0)
        
        # Use database values tracking everything in real-time
        total_co2_reduced = float(student.co2_saved_kg or 0.0)
        points = int(student.eco_points or 0)
        
        leaderboard_data.append({
            'id': str(student.id),
            'username': student.username,
            'name': student.name or student.username,
            'email': student.email,
            'profile_picture': student.profile_picture,
            'co2_reduced': round(total_co2_reduced, 2),
            'activities_count': activities_count,
            'emissions_logged': total_co2_reduced, 
            'bills_uploaded': activity_logs,
            'points': points
        })
    
    # Sort by selected criteria
    if sort_by == 'points':
        leaderboard_data.sort(key=lambda x: x['points'], reverse=True)
    elif sort_by == 'activities':
        leaderboard_data.sort(key=lambda x: x['activities_count'], reverse=True)
    else:  # Default to co2_reduced
        leaderboard_data.sort(key=lambda x: x['co2_reduced'], reverse=True)
    
    return jsonify(leaderboard_data), 200

# --- Student Dashboard Stats ---
@app.route('/api/student/dashboard-stats', methods=['GET'])
@jwt_required()
def dashboard_stats():
    user = User.query.get(get_jwt_identity())

    return jsonify({
        "eco_points": user.eco_points or 0,
        "co2_saved": round(user.co2_saved_kg or 0, 2),
        "trees_planted": user.trees_planted or 0,
        "events_attended": user.events_attended or 0
    }), 200


# --- Student History Endpoint ---
@app.route('/api/student/history', methods=['GET'])
@jwt_required()
def get_student_history():
    user_id = int(get_jwt_identity())
    
    history = []
    
    # 1. Commutes
    commutes = CommuteLog.query.filter_by(user_id=user_id).all()
    for c in commutes:
        history.append({
            "id": f"commute_{c.id}",
            "type": "Commute",
            "details": f"{c.transport_mode.capitalize()} - {c.distance_km} km",
            "points": c.eco_points,
            "status": "Completed", # Commutes are auto-approved
            "timestamp": c.timestamp.isoformat() + 'Z'
        })
        
    # 2. Trees
    trees = TreePlantation.query.filter_by(user_id=user_id).all()
    for t in trees:
        points = 0
        if t.status == 'approved': points = 100 # Hardcoded reward for now
        history.append({
            "id": f"tree_{t.id}",
            "type": "Tree Plantation",
            "details": f"{t.tree_type}",
            "points": points,
            "status": t.status.capitalize(),
            "timestamp": t.timestamp.isoformat() + 'Z'
        })
        
    # 3. Events (Official)
    # Join EventParticipant with Event to get details
    events = db.session.query(EventParticipant, Event).join(Event, EventParticipant.event_id == Event.id).filter(EventParticipant.user_id == user_id).all()
    for p, e in events:
        points = 0
        status = p.status
        if status == 'attended': points = e.reward_points
        
        history.append({
            "id": f"event_{e.id}",
            "type": "Event",
            "details": e.title,
            "points": points,
            "status": status.capitalize(),
            "timestamp": e.date + "T" + e.time if e.date and e.time else "2024-01-01T00:00:00" # Fallback if date missing
        })

    # Sort by timestamp desc
    history.sort(key=lambda x: x['timestamp'], reverse=True)
    
    return jsonify(history), 200

@app.route('/api/student/analytics', methods=['GET'])
@jwt_required()
def get_student_analytics():
    try:
        user_id = int(get_jwt_identity())
        
        # 1. Commutes by mode
        commutes = CommuteLog.query.filter_by(user_id=user_id).all()
        by_mode = {}
        for c in commutes:
             mode = c.transport_mode.capitalize()
             by_mode[mode] = by_mode.get(mode, 0) + c.distance_km
             
        # 2. Points Breakdown
        points = {
             "Commutes": sum(c.eco_points for c in commutes),
             "Trees": 0,
             "Events": 0
        }
        
        trees = TreePlantation.query.filter_by(user_id=user_id, status='approved').count()
        points["Trees"] = trees * 100
        
        evt_points = db.session.query(db.func.sum(Event.reward_points)).join(
            EventParticipant, EventParticipant.event_id == Event.id
        ).filter(
            EventParticipant.user_id == user_id,
            EventParticipant.status == 'attended'
        ).scalar() or 0
        points["Events"] = evt_points
        
        # 3. Monthly CO2 Savings (Last 6 Months)
        from datetime import timedelta
        six_months_ago = datetime.utcnow() - timedelta(days=180)
        
        monthly_co2 = {}
        for c in commutes:
             if c.timestamp >= six_months_ago:
                  month = c.timestamp.strftime('%b %Y') # e.g., 'Mar 2026'
                  monthly_co2[month] = monthly_co2.get(month, 0) + c.co2_saved
                  
        timeline = []
        for m, count in sorted(monthly_co2.items(), key=lambda x: datetime.strptime(x[0], '%b %Y')):
             timeline.append({"month": m, "co2": round(count, 2)})
             
        return jsonify({
             "commutes_by_mode": [{"mode": m, "distance": round(d, 2)} for m, d in by_mode.items()],
             "points_breakdown": [{"type": k, "points": v} for k, v in points.items()],
             "co2_timeline": timeline
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to load analytics"}), 500


def initialize_database():
    with app.app_context():
        db.create_all()

        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('user')]
        print(f"Existing columns in user table: {columns}")

        required_columns = ['name', 'email', 'department', 'student_id', 'phone_number', 'profile_picture']

        # Use ONE connection block for all ALTER TABLE operations
        with db.engine.connect() as conn:
            # Add missing profile columns
            for col in required_columns:
                if col not in columns:
                    sql = f"ALTER TABLE user ADD COLUMN {col} VARCHAR(200)"
                    conn.execute(db.text(sql))
                    print(f"Added column {col} to user table")

            # --- Add eco columns safely ---
            eco_columns = {
                "eco_points": "INTEGER DEFAULT 0",
                "co2_saved_kg": "FLOAT DEFAULT 0",
                "trees_planted": "INTEGER DEFAULT 0",
                "events_attended": "INTEGER DEFAULT 0",
                "status": "VARCHAR(20) DEFAULT 'approved'" # EXISTING USERS get approved by default
            }

            for col, definition in eco_columns.items():
                if col not in columns:
                    sql = f"ALTER TABLE user ADD COLUMN {col} {definition}"
                    conn.execute(db.text(sql))
                    print(f"Added column {col}")

        db.session.commit()

        # --- Sync Postgres sequences if applicable ---
        db_url = os.environ.get('DATABASE_URL', '')
        if 'postgresql' in db_url or 'supabase' in db_url:
            try:
                print("Syncing database sequences to avoid UniqueViolation errors...")
                with db.engine.connect() as conn:
                    result = conn.execute(db.text("""
                        SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public'
                    """))
                    tables = [r[0] for r in result]
                    for table in tables:
                        try:
                            seq_res = conn.execute(db.text(f"SELECT pg_get_serial_sequence('\"{table}\"', 'id')")).scalar()
                            if seq_res:
                                conn.execute(db.text(f"""
                                    SELECT setval('{seq_res}', 
                                           COALESCE((SELECT MAX(id) FROM \"{table}\"), 1), 
                                           (SELECT MAX(id) IS NOT NULL FROM \"{table}\"))
                                """))
                                print(f"Synced sequence for {table}")
                        except Exception:
                            pass
                print("✓ Database sequences synced successfully")
            except Exception as e:
                print(f"⚠ Sequence sync failed: {e}")

        # Seed 21 High-Fidelity Achievements (Bronze, Silver, Gold)
        try:
            # Check if our new system is already there
            if not Achievement.query.filter_by(name="First Steps").first():
                # Clear existing to avoid duplicates or mixing with old basic ones
                print("Clearing old achievements and seeding new 21-badge system...")
                UserAchievement.query.delete()
                Achievement.query.delete()
                db.session.commit()
                
                defaults = [
                    # Walking (km)
                    Achievement(name="First Steps", description="Walked 1km - Bronze milestone", category="walk", requirement_type="mode_dist:walk", requirement_value=1.0),
                    Achievement(name="Pavement Hero", description="Walked 10km - Silver milestone", category="walk", requirement_type="mode_dist:walk", requirement_value=10.0),
                    Achievement(name="Walking Legend", description="Walked 50km - Gold milestone", category="walk", requirement_type="mode_dist:walk", requirement_value=50.0),
                    
                    # Cycling (km)
                    Achievement(name="Green Cyclist", description="Cycled 5km - Bronze milestone", category="cycle", requirement_type="mode_dist:cycle", requirement_value=5.0),
                    Achievement(name="Pedal Pro", description="Cycled 25km - Silver milestone", category="cycle", requirement_type="mode_dist:cycle", requirement_value=25.0),
                    Achievement(name="Cycle Champion", description="Cycled 100km - Gold milestone", category="cycle", requirement_type="mode_dist:cycle", requirement_value=100.0),
                    
                    # Bus & Metro (km)
                    Achievement(name="Bus Rider", description="Used Transit for 10km - Bronze milestone", category="transit", requirement_type="transit_dist", requirement_value=10.0),
                    Achievement(name="Transit Pro", description="Used Transit for 50km - Silver milestone", category="transit", requirement_type="transit_dist", requirement_value=50.0),
                    Achievement(name="Metro Master", description="Used Transit for 200km - Gold milestone", category="transit", requirement_type="transit_dist", requirement_value=200.0),
                    
                    # Trees Planted
                    Achievement(name="Seedling", description="Planted 1 tree - Bronze milestone", category="tree", requirement_type="tree_count", requirement_value=1),
                    Achievement(name="Tree Planter", description="Planted 5 trees - Silver milestone", category="tree", requirement_type="tree_count", requirement_value=5),
                    Achievement(name="Forest Guardian", description="Planted 10 trees - Gold milestone", category="tree", requirement_type="tree_count", requirement_value=10),
                    
                    # Events Attended
                    Achievement(name="Event Goer", description="Attended 1 event - Bronze milestone", category="event", requirement_type="event_count", requirement_value=1),
                    Achievement(name="Eco Activist", description="Attended 5 events - Silver milestone", category="event", requirement_type="event_count", requirement_value=5),
                    Achievement(name="Community Leader", description="Attended 10 events - Gold milestone", category="event", requirement_type="event_count", requirement_value=10),
                    
                    # CO2 Saved (kg)
                    Achievement(name="CO2 Cutter", description="Saved 5kg CO2 - Bronze milestone", category="co2", requirement_type="co2_saved", requirement_value=5.0),
                    Achievement(name="Carbon Saver", description="Saved 25kg CO2 - Silver milestone", category="co2", requirement_type="co2_saved", requirement_value=25.0),
                    Achievement(name="Carbon Warrior", description="Saved 100kg CO2 - Gold milestone", category="co2", requirement_type="co2_saved", requirement_value=100.0),
                    
                    # Eco Points
                    Achievement(name="Eco Starter", description="Earned 100 points - Bronze milestone", category="points", requirement_type="eco_points", requirement_value=100),
                    Achievement(name="Eco Champion", description="Earned 500 points - Silver milestone", category="points", requirement_type="eco_points", requirement_value=500),
                    Achievement(name="Sustainability Hero", description="Earned 1000 points - Gold milestone", category="points", requirement_type="eco_points", requirement_value=1000),
                ]
                db.session.add_all(defaults)
                db.session.commit()
                print("Seeded 21 high-fidelity achievements")

            # Seed default users
            if User.query.count() == 0:
                admin_pass = bcrypt.generate_password_hash("admin1234").decode('utf-8')
                student_pass = bcrypt.generate_password_hash("student1234").decode('utf-8')
                
                admin = User(username="admin", password_hash=admin_pass, role="admin", name="System Admin", email="admin@ecotrace.com", status="approved")
                student = User(username="student", password_hash=student_pass, role="student", name="Eco Student", email="student@ecotrace.com", status="approved")
                
                db.session.add(admin)
                db.session.add(student)
                db.session.commit()
                print("Seeded default users (admin/admin1234, student/student1234)")

            # Seed default challenges
            if Challenge.query.count() == 0:
                from datetime import datetime
                today_str = datetime.utcnow().strftime('%Y-%m-%d')
                
                challenges = [
                    Challenge(
                        title="Commute Green 10km", 
                        description="Log 10km of green commute (Walk/Cycle/Transit) this week.", 
                        reward_points=150, 
                        goal_value=10.0, 
                        category="commute", 
                        start_date=today_str, 
                        end_date="2026-12-31"
                    ),
                    Challenge(
                        title="Plant A Tree", 
                        description="Plant at least 1 tree to help reforest our campus.", 
                        reward_points=200, 
                        goal_value=1.0, 
                        category="tree", 
                        start_date=today_str, 
                        end_date="2026-12-31"
                    ),
                    Challenge(
                        title="Join 2 Events", 
                        description="Participate in 2 sustainability events.", 
                        reward_points=300, 
                        goal_value=2.0, 
                        category="event", 
                        start_date=today_str, 
                        end_date="2026-12-31"
                    )
                ]
                db.session.add_all(challenges)
                db.session.commit()
                print("Seeded 3 default challenges")
        except Exception as e:
            print(f"Achievement/User seeding failed: {e}")

        print("Database initialized successfully")


# ================= ECO FEATURE TABLES =================

class CommuteLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    transport_mode = db.Column(db.String(50))
    distance_km = db.Column(db.Float)
    eco_points = db.Column(db.Integer)
    co2_saved = db.Column(db.Float)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)


class TreePlantation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    tree_type = db.Column(db.String(100))
    photo_url = db.Column(db.String(300))
    selfie_url = db.Column(db.String(300))
    status = db.Column(db.String(50), default="pending")
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)


class EventProof(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    event_name = db.Column(db.String(200))
    photo_url = db.Column(db.String(300))
    selfie_url = db.Column(db.String(300))
    reward_points = db.Column(db.Integer, default=50)
    status = db.Column(db.String(50), default="pending")
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)


class Achievement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(200))
    category = db.Column(db.String(50)) # commute, tree, event, general
    requirement_type = db.Column(db.String(50)) # count, points, co2
    requirement_value = db.Column(db.Float)
    icon_url = db.Column(db.String(300))


class UserAchievement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    achievement_id = db.Column(db.Integer, db.ForeignKey('achievement.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)


def check_achievements(user_id):
    """Real-time check for achievement unlocks"""
    user = db.session.get(User, user_id)
    if not user: return []
    
    unlocked = []
    achievements = Achievement.query.all()
    earned_ids = [ua.achievement_id for ua in UserAchievement.query.filter_by(user_id=user_id).all()]
    
    for ach in achievements:
        if ach.id in earned_ids: continue
        
        is_met = False
        req_type = ach.requirement_type
        
        if req_type == 'commute_count':
            count = CommuteLog.query.filter_by(user_id=user_id).count()
            if count >= ach.requirement_value: is_met = True
        elif req_type == 'tree_count':
            count = TreePlantation.query.filter_by(user_id=user_id, status='approved').count()
            if count >= ach.requirement_value: is_met = True
        elif req_type == 'eco_points':
            if (user.eco_points or 0) >= ach.requirement_value: is_met = True
        elif req_type == 'co2_saved':
            if (user.co2_saved_kg or 0) >= ach.requirement_value: is_met = True
        elif req_type == 'event_count':
            if (user.events_attended or 0) >= ach.requirement_value: is_met = True
        elif req_type == 'transit_dist':
            # Sum of bus, metro, train
            dist = db.session.query(db.func.sum(CommuteLog.distance_km)).filter(
                CommuteLog.user_id == user_id, 
                CommuteLog.transport_mode.in_(['bus', 'metro', 'train'])
            ).scalar() or 0.0
            if dist >= ach.requirement_value: is_met = True
        elif req_type.startswith('mode_dist:'):
            mode = req_type.split(':')[1]
            dist = db.session.query(db.func.sum(CommuteLog.distance_km)).filter(
                CommuteLog.user_id == user_id, 
                CommuteLog.transport_mode == mode
            ).scalar() or 0.0
            if dist >= ach.requirement_value: is_met = True
            
        if is_met:
            new_ua = UserAchievement(user_id=user_id, achievement_id=ach.id)
            db.session.add(new_ua)
            unlocked.append({
                "id": ach.id,
                "name": ach.name,
                "description": ach.description,
                "icon": ach.category
            })
    
    db.session.commit()
    return unlocked

def update_challenge_progress(user_id, category, increment):
    """Update progress for joined challenges in a category"""
    from datetime import datetime
    now_str = datetime.utcnow().strftime('%Y-%m-%d')
    
    participants = db.session.query(ChallengeParticipant, Challenge).join(
        Challenge, ChallengeParticipant.challenge_id == Challenge.id
    ).filter(
        ChallengeParticipant.user_id == user_id,
        ChallengeParticipant.completed == False,
        Challenge.category == category,
        (Challenge.start_date <= now_str) | (Challenge.start_date == None),
        (Challenge.end_date >= now_str) | (Challenge.end_date == None)
    ).all()
    
    for p, c in participants:
         p.progress += increment
         if p.progress >= c.goal_value:
              p.completed = True
              user = User.query.get(user_id)
              user.eco_points += c.reward_points
              
              # Add Notification
              notif = Notification(user_id=user_id, message=f"🎉 Challenge Completed: {c.title}! Earned +{c.reward_points} Points.")
              db.session.add(notif)

# ================= COMMUTE API =================
# ================= COMMUTE API =================
@app.route('/api/commute', methods=['POST'])
@jwt_required()
def log_commute():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    distance = float(data.get('distance', 0))
    transport = data.get('transport', 'walk').lower()

    # Point multipliers
    multipliers = {"walk":10, "cycle":9, "bus":6, "metro":6, "train":6, "bike":3, "car":1}
    # CO2 Savings per KM (vs Car @ 0.17 kg/km)
    savings_factors = {
        "walk": 0.17,
        "cycle": 0.17,
        "bus": 0.07,
        "metro": 0.13,
        "train": 0.13,
        "bike": 0.06,
        "car": 0.0
    }
    
    points = int(distance * multipliers.get(transport, 1))
    co2_saved = round(distance * savings_factors.get(transport, 0.0), 2)

    db.session.add(CommuteLog(user_id=user_id, transport_mode=transport,
                              distance_km=distance, eco_points=points,
                              co2_saved=co2_saved))

    user = db.session.get(User, user_id)
    
    # Ensure initialized
    if user.eco_points is None: user.eco_points = 0
    if user.co2_saved_kg is None: user.co2_saved_kg = 0.0
    if user.trees_planted is None: user.trees_planted = 0
    if user.events_attended is None: user.events_attended = 0

    user.eco_points += points
    user.co2_saved_kg += co2_saved
    
    db.session.commit()
    
    # Check for achievements
    new_achievements = check_achievements(user_id)
    
    # Update Challenges
    update_challenge_progress(user_id, 'commute', distance)

    return jsonify({
        "message": "Commute logged", 
        "points_earned": points,
        "co2_saved": co2_saved,
        "new_achievements": new_achievements
    })

# ================= TREE SUBMISSION =================
@app.route('/api/tree', methods=['POST'])
@jwt_required()
def submit_tree():
    user_id = int(get_jwt_identity())
    
    # Check for files
    if 'treePhoto' not in request.files or 'selfiePhoto' not in request.files:
        return jsonify({"error": "Both tree photo and selfie are required"}), 400
        
    tree_photo = request.files['treePhoto']
    selfie_photo = request.files['selfiePhoto']
    
    if tree_photo.filename == '' or selfie_photo.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    # Save files
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    tree_filename = secure_filename(f"tree_{user_id}_{int(datetime.utcnow().timestamp())}_{tree_photo.filename}")
    selfie_filename = secure_filename(f"selfie_{user_id}_{int(datetime.utcnow().timestamp())}_{selfie_photo.filename}")
    
    tree_path = os.path.join(app.config['UPLOAD_FOLDER'], tree_filename)
    selfie_path = os.path.join(app.config['UPLOAD_FOLDER'], selfie_filename)
    
    tree_photo.save(tree_path)
    selfie_photo.save(selfie_path)

    # Supabase Upload Fallback
    public_tree_url = upload_to_supabase(tree_path, tree_filename)
    public_selfie_url = upload_to_supabase(selfie_path, selfie_filename)

    # Get other data
    tree_type = request.form.get('treeType', 'Unknown')
    lat = request.form.get('lat')
    lng = request.form.get('lng')

    db.session.add(TreePlantation(
        user_id=user_id,
        tree_type=tree_type,
        photo_url=public_tree_url if public_tree_url else tree_filename,
        selfie_url=public_selfie_url if public_selfie_url else selfie_filename,
        # We could add lat/lng to model if needed later
    ))
    # Check EventParticipant columns
    from sqlalchemy import inspect, text
    inspector = inspect(db.engine)
    columns = [c['name'] for c in inspector.get_columns('event_participant')]
    if 'proof_photo' not in columns:
        with db.engine.connect() as conn:
            conn.execute(text("ALTER TABLE event_participant ADD COLUMN proof_photo TEXT"))
            conn.execute(text("ALTER TABLE event_participant ADD COLUMN proof_selfie TEXT"))
            conn.execute(text("ALTER TABLE event_participant ADD COLUMN proof_lat FLOAT"))
            conn.execute(text("ALTER TABLE event_participant ADD COLUMN proof_lng FLOAT"))
            conn.execute(text("ALTER TABLE event_participant ADD COLUMN proof_timestamp DATETIME"))
            print("Added proof columns to event_participant table")
    db.session.commit()
    
    return jsonify({"message": "Tree submitted for approval"})

# ================= ADMIN APPROVES TREE =================
@app.route('/api/tree/<int:id>/approve', methods=['PUT'])
@jwt_required()
def approve_tree(id):
    if get_jwt().get('role') != 'admin':
        return jsonify({"error": "Admin only"}), 403

    tree = db.session.get(TreePlantation, id)
    if not tree: return jsonify({"error": "Not found"}), 404
    
    tree.status = "approved"

    user = db.session.get(User, tree.user_id)
    
    if user.eco_points is None: user.eco_points = 0
    if user.trees_planted is None: user.trees_planted = 0
    if user.co2_saved_kg is None: user.co2_saved_kg = 0.0
    
    print(f"DEBUG: User {user.username} before tree: {user.eco_points} pts")
    user.eco_points += 100
    user.trees_planted += 1
    user.co2_saved_kg += 20
    print(f"DEBUG: User {user.username} after tree: {user.eco_points} pts")

    # Add Notification
    notif = Notification(user_id=user.id, message=f"Your tree plantation proof ({tree.tree_type}) has been approved! +100 Points.")
    db.session.add(notif)

    db.session.commit()
    
    # Send Email
    if user.email:
        send_email(
            subject="Tree Plantation Approved!",
            recipients=[user.email],
            body=f"Congratulations! Your tree plantation proof has been approved. You earned 100 Eco Points."
        )

    # Update Challenges
    update_challenge_progress(tree.user_id, 'tree', 1)

    # Check for achievements (fixing user_id bug)
    check_achievements(tree.user_id)
    
    return jsonify({"message": "Tree approved, points added"})


# --- Achievement Endpoints ---

@app.route('/api/achievements', methods=['GET'])
@jwt_required()
def get_all_achievements():
    achievements = Achievement.query.all()
    return jsonify([{
        "id": a.id,
        "name": a.name,
        "description": a.description,
        "category": a.category,
        "icon": a.category
    } for a in achievements])


@app.route('/api/achievements/me', methods=['GET'])
@jwt_required()
def get_my_achievements():
    user_id = get_jwt_identity()
    user_achievements = UserAchievement.query.filter_by(user_id=user_id).all()
    ach_ids = [ua.achievement_id for ua in user_achievements]
    
    # Get all achievements and mark which ones are earned
    all_achs = Achievement.query.all()
    result = []
    for a in all_achs:
        is_earned = a.id in ach_ids
        earned_at = None
        if is_earned:
            ua = next(ua for ua in user_achievements if ua.achievement_id == a.id)
            earned_at = ua.timestamp.isoformat() + 'Z'
            
        result.append({
            "id": a.id,
            "name": a.name,
            "description": a.description,
            "category": a.category,
            "icon": a.category,
            "earned": is_earned,
            "earned_at": earned_at,
            "requirement_type": a.requirement_type,
            "requirement_value": a.requirement_value
        })
    return jsonify(result)


# ================= OFFICIAL EVENTS MODULE =================

class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.String(50)) # YYYY-MM-DD
    time = db.Column(db.String(50)) # HH:MM
    location = db.Column(db.String(200))
    image_url = db.Column(db.String(300))
    reward_points = db.Column(db.Integer, default=50)
    status = db.Column(db.String(50), default="upcoming") # upcoming, completed, cancelled
    
    participants = db.relationship('EventParticipant', backref='event', lazy=True)

class EventParticipant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
    status = db.Column(db.String(50), default="joined") # joined, proof_submitted, attended, rejected
    
    # Proof of participation
    proof_photo = db.Column(db.String(300))
    proof_selfie = db.Column(db.String(300))
    proof_lat = db.Column(db.Float)
    proof_lng = db.Column(db.Float)
    proof_timestamp = db.Column(db.DateTime)

# --- Admin: Get Pending Trees ---
@app.route('/api/admin/trees', methods=['GET'])
@jwt_required()
def get_pending_trees():
    if get_jwt().get('role') != 'admin': return jsonify({"error": "Admin only"}), 403
    
    status = request.args.get('status', 'pending')
    
    if status == 'all':
        trees = TreePlantation.query.order_by(TreePlantation.timestamp.desc()).all()
    else:
        trees = TreePlantation.query.filter_by(status=status).order_by(TreePlantation.timestamp.desc()).all()
    
    result = []
    for t in trees:
        user = User.query.get(t.user_id)
        result.append({
            "id": t.id,
            "user_id": t.user_id,
            "user_name": user.username if user else "Unknown",
            "tree_type": t.tree_type,
            "photo_url": t.photo_url,
            "selfie_url": t.selfie_url,
            "timestamp": t.timestamp.isoformat() + 'Z',
            "status": t.status
        })
    return jsonify(result)

# --- Admin: Reject Tree ---
@app.route('/api/tree/<int:id>/reject', methods=['PUT'])
@jwt_required()
def reject_tree(id):
    if get_jwt().get('role') != 'admin': return jsonify({"error": "Admin only"}), 403
    
    tree = TreePlantation.query.get(id)
    if not tree: return jsonify({"error": "Not found"}), 404
    
    tree.status = "rejected"
    db.session.commit()
    return jsonify({"message": "Tree rejected"})

# --- Events CRUD ---

@app.route('/api/events', methods=['GET'])
def get_events():
    now = datetime.now()
    events = Event.query.all()
    
    dirty = False
    for e in events:
        try:
            # Parse event datetime
            # Date: YYYY-MM-DD, Time: HH:MM
            event_dt_str = f"{e.date} {e.time}"
            event_dt = datetime.strptime(event_dt_str, "%Y-%m-%d %H:%M")
            
            # If time passed and still 'upcoming', set to 'ongoing'
            if e.status == 'upcoming' and event_dt <= now:
                e.status = 'ongoing'
                dirty = True
        except ValueError:
            pass # Skip invalid date formats
            
    if dirty:
        db.session.commit()

    current_user_id = None
    try:
        verify_jwt_in_request(optional=True)
        current_user_id = get_jwt_identity()
        if current_user_id: current_user_id = int(current_user_id)
    except Exception as e:
        pass

    # Public endpoint to list upcoming events
    events = Event.query.order_by(Event.date.asc()).all()
    result = []
    
    for e in events:
        user_status = None
        if current_user_id:
            participation = EventParticipant.query.filter_by(user_id=current_user_id, event_id=e.id).first()
            if participation:
                user_status = participation.status
        
        result.append({
            "id": e.id,
            "title": e.title,
            "description": e.description,
            "date": e.date,
            "time": e.time,
            "location": e.location,
            "reward_points": e.reward_points,
            "image_url": e.image_url,
            "status": e.status,
            "user_status": user_status 
        })
        
    return jsonify(result)

@app.route('/api/events', methods=['POST'])
@jwt_required()
def create_event():
    if get_jwt().get('role') != 'admin': return jsonify({"error": "Admin only"}), 403
    data = request.get_json()
    
    try:
        new_event = Event(
            title=data['title'],
            description=data.get('description', ''),
            date=data['date'],
            time=data['time'],
            location=data['location'],
            reward_points=data.get('reward_points', 50),
            image_url=data.get('image_url', ''),
            status=data.get('status', 'upcoming')
        )
        db.session.add(new_event)
        db.session.commit()
        return jsonify({"message": "Event created", "id": new_event.id}), 201
    except KeyError as e:
        return jsonify({"error": f"Missing required field: {str(e)}"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to create event: {str(e)}"}), 500

@app.route('/api/events/<int:id>', methods=['PUT'])
@jwt_required()
def update_event(id):
    if get_jwt().get('role') != 'admin': return jsonify({"error": "Admin only"}), 403
    event = Event.query.get(id)
    if not event: return jsonify({"error": "Not found"}), 404
    
    data = request.get_json()
    event.title = data.get('title', event.title)
    event.description = data.get('description', event.description)
    event.date = data.get('date', event.date)
    event.time = data.get('time', event.time)
    event.location = data.get('location', event.location)
    event.reward_points = data.get('reward_points', event.reward_points)
    event.status = data.get('status', event.status)
    
    db.session.commit()
    return jsonify({"message": "Event updated"})

@app.route('/api/events/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_event(id):
    if get_jwt().get('role') != 'admin': return jsonify({"error": "Admin only"}), 403
    event = Event.query.get(id)
    if not event: return jsonify({"error": "Not found"}), 404
    
    # Cascade delete participants manually to avoid FK constraint errors
    EventParticipant.query.filter_by(event_id=id).delete()
    
    db.session.delete(event)
    db.session.commit()
    return jsonify({"message": "Event deleted"})

# --- User Join Event ---
@app.route('/api/events/<int:id>/join', methods=['POST'])
@jwt_required()
def join_event(id):
    user_id = int(get_jwt_identity())
    
    # Check if already joined
    existing = EventParticipant.query.filter_by(user_id=user_id, event_id=id).first()
    if existing:
        return jsonify({"message": "Already joined"}), 200
        
    participant = EventParticipant(user_id=user_id, event_id=id)
    db.session.add(participant)
    db.session.commit()
    return jsonify({"message": "Joined event successfully"}), 201

@app.route('/api/events/<int:id>/submit', methods=['POST'])
@jwt_required()
def submit_event_proof(id):
    print(f"DEBUG: submit_event_proof called for event {id}")
    user_id = int(get_jwt_identity())
    
    # Check participation
    participant = EventParticipant.query.filter_by(user_id=user_id, event_id=id).first()
    if not participant:
        print("DEBUG: Participant not found")
        return jsonify({"error": "You have not joined this event"}), 400
        
    if participant.status in ['proof_submitted', 'attended', 'rejected']:
        print(f"DEBUG: Already submitted. Status: {participant.status}")
        return jsonify({"error": "Proof already submitted"}), 400
        
    # Handle files
    print(f"DEBUG: Files received: {request.files.keys()}")
    if 'proof_photo' not in request.files or 'proof_selfie' not in request.files:
        print("DEBUG: Missing files")
        return jsonify({"error": "Both event photo and selfie are required"}), 400
        
    photo = request.files['proof_photo']
    selfie = request.files['proof_selfie']
    lat = request.form.get('lat')
    lng = request.form.get('lng')
    print(f"DEBUG: Lat: {lat}, Lng: {lng}")
    
    if photo.filename == '' or selfie.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    # Save files
    timestamp = int(datetime.now().timestamp())
    photo_filename = secure_filename(f"event_proof_{id}_{user_id}_{timestamp}.jpg")
    selfie_filename = secure_filename(f"event_selfie_{id}_{user_id}_{timestamp}.jpg")
    
    upload_folder = app.config['UPLOAD_FOLDER']
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
    
    try:
        photo.save(os.path.join(upload_folder, photo_filename))
        selfie.save(os.path.join(upload_folder, selfie_filename))
    except Exception as e:
        print(f"DEBUG: File save error: {e}")
        return jsonify({"error": "Failed to save files"}), 500
    
    # Update DB
    participant.proof_photo = photo_filename
    participant.proof_selfie = selfie_filename
    try:
        participant.proof_lat = float(lat) if lat else None
        participant.proof_lng = float(lng) if lng else None
    except ValueError:
        print("DEBUG: Invalid float for lat/lng")
        participant.proof_lat = None
        participant.proof_lng = None

    participant.proof_timestamp = datetime.now()
    participant.status = 'proof_submitted'
    
    db.session.commit()
    print("DEBUG: Success")
    
    return jsonify({"message": "Proof submitted successfully!"}), 200

# --- Admin Mark Event Completed (Award Points) ---
@app.route('/api/events/<int:id>/complete', methods=['POST'])
@jwt_required()
def complete_event(id):
    if get_jwt().get('role') != 'admin': return jsonify({"error": "Admin only"}), 403
    
    event = Event.query.get(id)
    if not event: return jsonify({"error": "Not found"}), 404
    
    if event.status == 'completed':
        return jsonify({"error": "Event already completed"}), 400
        
    # Mark event as completed
    event.status = 'completed'
    
    # Award points to ALL joined participants
    participants = EventParticipant.query.filter_by(event_id=id, status='joined').all()
    count = 0
    
    for p in participants:
        p.status = 'attended'
        user = User.query.get(p.user_id)
        
        # Initialize eco stats if missing
        if user.eco_points is None: user.eco_points = 0
        if user.events_attended is None: user.events_attended = 0
            
        user.eco_points += event.reward_points
        user.events_attended += 1
        count += 1
        
        # Check for achievements
        check_achievements(user.id)
        
    db.session.commit()
    
    return jsonify({
        "message": f"Event marked completed. Awarded {event.reward_points} points to {count} participants."
    })




# ================= ADMIN EVENT PROOF VERIFICATION =================

@app.route('/api/admin/event-proofs', methods=['GET'])
@jwt_required()
def get_event_proofs():
    if get_jwt().get('role') != 'admin': 
        return jsonify({"error": "Admin only"}), 403
    
    dept_filter = request.args.get('department', 'all')
    
    # Query pending proofs
    query = db.session.query(EventParticipant, User, Event)\
        .join(User, EventParticipant.user_id == User.id)\
        .join(Event, EventParticipant.event_id == Event.id)\
        .filter(EventParticipant.status == 'proof_submitted')
    
    # Apply department filter
    if dept_filter != 'all':
        query = query.filter(User.department == dept_filter)
        
    results = query.all()
    
    proofs = []
    for part, user, evt in results:
        proofs.append({
            "id": part.id,
            "user_name": user.username,
            "user_id": user.student_id,
            "department": user.department,
            "event_title": evt.title,
            "proof_photo": part.proof_photo,
            "proof_selfie": part.proof_selfie,
            "proof_lat": part.proof_lat,
            "proof_lng": part.proof_lng,
            "timestamp": part.proof_timestamp.isoformat() + 'Z' if part.proof_timestamp else None
        })
        
    return jsonify(proofs)

@app.route('/api/event-proof/<int:id>/approve', methods=['PUT'])
@jwt_required()
def approve_event_proof(id):
    if get_jwt().get('role') != 'admin': return jsonify({"error": "Admin only"}), 403
    
    participant = EventParticipant.query.get(id)
    if not participant: return jsonify({"error": "Not found"}), 404
    
    if participant.status != 'proof_submitted':
         return jsonify({"error": "Proof already processed"}), 400
         
    participant.status = 'attended'
    
    # Award Points
    event = Event.query.get(participant.event_id)
    user = User.query.get(participant.user_id)
    
    if user.eco_points is None: user.eco_points = 0
    if user.events_attended is None: user.events_attended = 0
    
    user.eco_points += event.reward_points
    user.events_attended += 1
    
    # Add Notification
    notif = Notification(user_id=user.id, message=f"Your proof for event '{event.title}' has been approved! +{event.reward_points} Points.")
    db.session.add(notif)
    
    # Update Challenges
    update_challenge_progress(user.id, 'event', 1)

    # Check for achievements
    check_achievements(user.id)
    
    db.session.commit()
    
    # Send Email
    if user.email:
         send_email(
             subject=f"Event Proof Approved: {event.title}",
             recipients=[user.email],
             body=f"Your proof for '{event.title}' was approved! You earned {event.reward_points} Eco Points."
         )
    return jsonify({"message": "Proof approved, points awarded."})

@app.route('/api/event-proof/<int:id>/reject', methods=['PUT'])
@jwt_required()
def reject_event_proof(id):
    if get_jwt().get('role') != 'admin': return jsonify({"error": "Admin only"}), 403
    
    participant = EventParticipant.query.get(id)
    if not participant: return jsonify({"error": "Not found"}), 404
    
    participant.status = 'rejected' # Or 'joined' to allow retry? Let's say rejected for now.
    db.session.commit()
    return jsonify({"message": "Proof rejected."})

    user = User.query.get(proof.user_id)
    user.eco_points += proof.reward_points
    user.events_attended += 1

    db.session.commit()
    return jsonify({"message": "Event approved, points added"})

# --- App Runner ---
if __name__ == '__main__':
    initialize_database()
    # Support Hugging Face Spaces / Docker port mapping
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

