"""
Reset PostgreSQL schema and align with current SQLAlchemy models.

Use when migrations fail due to schema drift (e.g. setup_db vs alembic mismatch).

Usage:
  cd backend
  source venv/bin/activate
  python reset_database.py
"""
from sqlalchemy import create_engine, text
from flask_migrate import stamp

from app import create_app, db


def main() -> None:
    app = create_app()
    url = app.config["SQLALCHEMY_DATABASE_URI"]
    if not url or "postgresql" not in url:
        raise SystemExit("reset_database.py only supports PostgreSQL DATABASE_URL")

    engine = create_engine(url)
    print("Dropping public schema (all tables and data)...")
    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO CURRENT_USER"))
        conn.commit()

    print("Creating tables from current models...")
    with app.app_context():
        db.create_all()
        stamp(revision="head")
        db.engine.dispose()

    print("Done. Database is empty and stamped at the latest migration (head).")


if __name__ == "__main__":
    main()
