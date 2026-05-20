"""Room-scoped players: remove players table, add room_code and device_id

Revision ID: b8c4e1f2a901
Revises: 246707c703b3
Create Date: 2026-05-18

Dev note: existing rows are not migrated; game_players/moves data is cleared.
"""
from alembic import op
import sqlalchemy as sa


revision = 'b8c4e1f2a901'
down_revision = '246707c703b3'
branch_labels = None
depends_on = None


def _drop_fks_to_table(table_name: str, referenced_table: str) -> None:
    """Drop every FK on table_name that points at referenced_table (any constraint name)."""
    bind = op.get_bind()
    rows = bind.execute(
        sa.text(
            """
            SELECT tc.constraint_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.constraint_column_usage AS ccu
              ON tc.constraint_name = ccu.constraint_name
             AND tc.table_schema = ccu.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = 'public'
              AND tc.table_name = :table_name
              AND ccu.table_name = :referenced_table
            """
        ),
        {"table_name": table_name, "referenced_table": referenced_table},
    )
    for (constraint_name,) in rows:
        op.execute(
            sa.text(
                f'ALTER TABLE "{table_name}" DROP CONSTRAINT IF EXISTS "{constraint_name}"'
            )
        )


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    return bool(
        bind.execute(
            sa.text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = :table_name
                  AND column_name = :column_name
                """
            ),
            {"table_name": table_name, "column_name": column_name},
        ).fetchone()
    )


def _clear_games_owner_winner() -> None:
    """Null owner/winner only when those columns exist (setup_db may omit them)."""
    parts = []
    if _column_exists('games', 'owner_id'):
        parts.append('owner_id = NULL')
    if _column_exists('games', 'winner_id'):
        parts.append('winner_id = NULL')
    if parts:
        op.execute(f"UPDATE games SET {', '.join(parts)}")


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    return bool(
        bind.execute(
            sa.text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = :table_name
                """
            ),
            {"table_name": table_name},
        ).fetchone()
    )


def upgrade():
    # Drop FKs pointing at players (names differ per DB / setup_db vs migrate)
    if _table_exists('games'):
        _drop_fks_to_table('games', 'players')
    if _table_exists('game_players'):
        _drop_fks_to_table('game_players', 'players')
    if _table_exists('moves'):
        _drop_fks_to_table('moves', 'players')

    # Also drop new-schema FKs if a previous partial run created them
    if _table_exists('games'):
        _drop_fks_to_table('games', 'game_players')
    if _table_exists('moves'):
        _drop_fks_to_table('moves', 'game_players')

    if _table_exists('games'):
        _clear_games_owner_winner()
    if _table_exists('moves'):
        op.execute('DELETE FROM moves')
    if _table_exists('game_players'):
        op.execute('DELETE FROM game_players')

    if _table_exists('games') and not _column_exists('games', 'room_code'):
        with op.batch_alter_table('games', schema=None) as batch_op:
            batch_op.add_column(sa.Column('room_code', sa.String(length=12), nullable=True))
    if _table_exists('games') and not _column_exists('games', 'is_private'):
        with op.batch_alter_table('games', schema=None) as batch_op:
            batch_op.add_column(
                sa.Column('is_private', sa.Boolean(), nullable=False, server_default='false')
            )

    if not _table_exists('game_players'):
        raise RuntimeError(
            'Expected table game_players to exist before room-scoped migration. '
            'Run earlier migrations or recreate the database.'
        )

    with op.batch_alter_table('game_players', schema=None) as batch_op:
        if not _column_exists('game_players', 'device_id'):
            batch_op.add_column(sa.Column('device_id', sa.String(length=255), nullable=True))
        if not _column_exists('game_players', 'display_name'):
            batch_op.add_column(sa.Column('display_name', sa.String(length=80), nullable=True))
        if _column_exists('game_players', 'player_id'):
            batch_op.drop_column('player_id')

    if not _table_exists('games'):
        raise RuntimeError(
            'Expected table games to exist before room-scoped migration. '
            'Run earlier migrations or recreate the database.'
        )

    op.execute("UPDATE games SET room_code = 'legacy' || id::text WHERE room_code IS NULL")
    with op.batch_alter_table('games', schema=None) as batch_op:
        batch_op.alter_column('room_code', nullable=False)
        if not bind_has_index('games', 'ix_games_room_code'):
            batch_op.create_index(batch_op.f('ix_games_room_code'), ['room_code'], unique=True)

    # owner_id / winner_id may be missing if DB was created via setup_db, not migrations
    with op.batch_alter_table('games', schema=None) as batch_op:
        if not _column_exists('games', 'owner_id'):
            batch_op.add_column(sa.Column('owner_id', sa.Integer(), nullable=True))
        if not _column_exists('games', 'winner_id'):
            batch_op.add_column(sa.Column('winner_id', sa.Integer(), nullable=True))

    if (
        _column_exists('game_players', 'game_id')
        and _column_exists('game_players', 'device_id')
        and not bind_has_unique('game_players', 'unique_game_device')
    ):
        with op.batch_alter_table('game_players', schema=None) as batch_op:
            batch_op.create_unique_constraint('unique_game_device', ['game_id', 'device_id'])

    if _column_exists('games', 'owner_id') and _table_exists('game_players'):
        _drop_fks_to_table('games', 'game_players')
        with op.batch_alter_table('games', schema=None) as batch_op:
            if not bind_has_fk('games', 'games_owner_id_fkey'):
                batch_op.create_foreign_key(
                    'games_owner_id_fkey', 'game_players', ['owner_id'], ['id']
                )
            if _column_exists('games', 'winner_id') and not bind_has_fk('games', 'games_winner_id_fkey'):
                batch_op.create_foreign_key(
                    'games_winner_id_fkey', 'game_players', ['winner_id'], ['id']
                )

    if _table_exists('moves') and _column_exists('moves', 'player_id'):
        _drop_fks_to_table('moves', 'game_players')
        with op.batch_alter_table('moves', schema=None) as batch_op:
            if not bind_has_fk('moves', 'moves_player_id_fkey'):
                batch_op.create_foreign_key(
                    'moves_player_id_fkey', 'game_players', ['player_id'], ['id']
                )

    if _table_exists('players'):
        op.drop_table('players')


def bind_has_fk(table_name: str, constraint_name: str) -> bool:
    bind = op.get_bind()
    return bool(
        bind.execute(
            sa.text(
                """
                SELECT 1 FROM information_schema.table_constraints
                WHERE table_schema = 'public'
                  AND table_name = :table_name
                  AND constraint_name = :constraint_name
                  AND constraint_type = 'FOREIGN KEY'
                """
            ),
            {"table_name": table_name, "constraint_name": constraint_name},
        ).fetchone()
    )


def bind_has_index(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    return bool(
        bind.execute(
            sa.text(
                """
                SELECT 1 FROM pg_indexes
                WHERE schemaname = 'public'
                  AND tablename = :table_name
                  AND indexname = :index_name
                """
            ),
            {"table_name": table_name, "index_name": index_name},
        ).fetchone()
    )


def bind_has_unique(table_name: str, constraint_name: str) -> bool:
    bind = op.get_bind()
    return bool(
        bind.execute(
            sa.text(
                """
                SELECT 1 FROM information_schema.table_constraints
                WHERE table_schema = 'public'
                  AND table_name = :table_name
                  AND constraint_name = :constraint_name
                  AND constraint_type = 'UNIQUE'
                """
            ),
            {"table_name": table_name, "constraint_name": constraint_name},
        ).fetchone()
    )


def downgrade():
    op.create_table(
        'players',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=80), nullable=False),
        sa.Column('email', sa.String(length=120), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('players', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_players_device_id'), ['device_id'], unique=True)
        batch_op.create_index(batch_op.f('ix_players_email'), ['email'], unique=False)
        batch_op.create_index(batch_op.f('ix_players_username'), ['username'], unique=False)

    _drop_fks_to_table('moves', 'game_players')
    _drop_fks_to_table('games', 'game_players')

    with op.batch_alter_table('game_players', schema=None) as batch_op:
        if bind_has_unique('game_players', 'unique_game_device'):
            batch_op.drop_constraint('unique_game_device', type_='unique')
        if not _column_exists('game_players', 'player_id'):
            batch_op.add_column(sa.Column('player_id', sa.Integer(), nullable=True))

    with op.batch_alter_table('games', schema=None) as batch_op:
        if bind_has_index('games', 'ix_games_room_code'):
            batch_op.drop_index(batch_op.f('ix_games_room_code'))
        if _column_exists('games', 'is_private'):
            batch_op.drop_column('is_private')
        if _column_exists('games', 'room_code'):
            batch_op.drop_column('room_code')

    with op.batch_alter_table('game_players', schema=None) as batch_op:
        if _column_exists('game_players', 'display_name'):
            batch_op.drop_column('display_name')
        if _column_exists('game_players', 'device_id'):
            batch_op.drop_column('device_id')

    with op.batch_alter_table('games', schema=None) as batch_op:
        batch_op.create_foreign_key('games_owner_id_fkey', 'players', ['owner_id'], ['id'])
        batch_op.create_foreign_key('games_winner_id_fkey', 'players', ['winner_id'], ['id'])

    with op.batch_alter_table('game_players', schema=None) as batch_op:
        batch_op.create_foreign_key('game_players_player_id_fkey', 'players', ['player_id'], ['id'])

    with op.batch_alter_table('moves', schema=None) as batch_op:
        batch_op.create_foreign_key('moves_player_id_fkey', 'players', ['player_id'], ['id'])
