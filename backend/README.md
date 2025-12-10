# Nerts Backend

Flask backend for the online Nerts game.

## Setup

1. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Initialize the database:

```bash
python setup_db.py
```

5. Run the development server:

```bash
python run.py
```

The server will start on `http://localhost:5000`

## Database Migrations

To use Flask-Migrate for database migrations:

```bash
flask db init  # First time only
flask db migrate -m "Initial migration"
flask db upgrade
```

## Testing

Run tests with pytest:

```bash
pytest
```

With coverage:

```bash
pytest --cov=app --cov-report=html
```

## API Endpoints

### Players

- `POST /api/players` - Create a new player
- `GET /api/players` - List all players
- `GET /api/players/<id>` - Get player by ID

### Games

- `POST /api/games` - Create a new game
- `GET /api/games` - List all games
- `GET /api/games/<id>` - Get game by ID
- `POST /api/games/<id>/join` - Join a game
- `POST /api/games/<id>/start` - Start a game

## WebSocket Events

### Client → Server

- `join_game` - Join a game room
- `leave_game` - Leave a game room
- `draw_deck` - Draw from personal deck
- `play_card` - Play a card
- `call_nerts` - Call NERTS! to end round
- `move_stack` - Move a stack sequence

### Server → Client

- `connected` - Connection confirmed
- `joined_game` - Successfully joined game room
- `game_state` - Updated game state
- `round_ended` - Round has ended
- `error` - Error message
