from flask import Blueprint
from app.api import games, players

api_bp = Blueprint('api', __name__)

# Register routes
from app.api.games import games_bp
from app.api.players import players_bp

api_bp.register_blueprint(games_bp, url_prefix='/games')
api_bp.register_blueprint(players_bp, url_prefix='/players')

