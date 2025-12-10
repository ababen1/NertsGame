"""
Database setup script
Run this to initialize the database schema
"""
from app import create_app, db
from app.models import Player, Game, GamePlayer, Move

app = create_app()

with app.app_context():
    # Create all tables
    db.create_all()
    print("Database tables created successfully!")

