# Online Nerts Game

A real-time multiplayer version of Nerts, a fast-paced competitive solitaire game for up to 6 players.

## Tech Stack

- **Backend**: Python (Flask) with Flask-SocketIO for real-time communication
- **Frontend**: React + Vite + TypeScript
- **Database**: PostgreSQL
- **Deployment**: AWS (to be configured)

## Project Structure

```
Nerts/
├── backend/          # Flask application
│   ├── app/
│   │   ├── models/   # Database models
│   │   ├── game/     # Game logic engine
│   │   ├── api/      # REST API endpoints
│   │   └── websocket/ # WebSocket handlers
│   ├── tests/        # Backend tests
│   └── requirements.txt
├── frontend/         # React application
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── utils/
│   └── package.json
└── README.md
```

## Game Rules

- Each player has their own 52-card deck
- Cards distributed: 6 to personal stacks, 13 to Nerts pile, 33 to personal deck
- First player to reach 100+ points wins
- Cards placed in center shared stacks (A→K, same suit) = +1 point
- When a player empties their Nerts pile and presses "NERTS!", the round ends
- Remaining cards in Nerts pile = -2 points each

## Development

### Prerequisites
- Python 3.8+
- Node.js 18+
- PostgreSQL (or use SQLite for development)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL

# Initialize database
python setup_db.py

# Run the server
python run.py
```

The backend will run on `http://localhost:5000`

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

## Testing

- Backend: `pytest` from the backend directory
- Frontend: `npm test` from the frontend directory

## Architecture

### Backend
- **Flask** for REST API
- **Flask-SocketIO** for WebSocket real-time communication
- **SQLAlchemy** for database ORM
- **PostgreSQL** for data persistence
- Game logic engine handles all card game rules and validation

### Frontend
- **React 18** with hooks
- **TypeScript** for type safety
- **Vite** for fast development and building
- **Socket.IO Client** for real-time updates
- Component-based UI with modern CSS

### Real-time Communication
- WebSocket connections for instant game state updates
- Room-based architecture (one room per game)
- Server-side validation of all moves
- Optimistic UI updates with server confirmation

