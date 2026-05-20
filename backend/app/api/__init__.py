from flask import Blueprint

api_bp = Blueprint('api', __name__)

from app.api.games import games_bp

api_bp.register_blueprint(games_bp, url_prefix='/games')
