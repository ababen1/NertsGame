from flask import Flask
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()
cors_origins_env = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://192.168.128.196:5173')
cors_origins = cors_origins_env.split(',')
socketio = SocketIO(cors_allowed_origins=cors_origins)
migrate = Migrate()


def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost/nerts_db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize extensions
    db.init_app(app)
    cors_origins_app = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://192.168.128.196:5173').split(',')
    CORS(app, resources={r"/*": {"origins": cors_origins_app}})
    socketio.init_app(app, cors_allowed_origins=cors_origins_app)
    migrate.init_app(app, db)

    # Register blueprints
    from app.api import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    # Register socketio events
    from app.websocket import register_socketio_events
    register_socketio_events(socketio)

    return app

