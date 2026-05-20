import json


def test_create_game(client):
    response = client.post(
        '/api/games',
        data=json.dumps({
            'max_players': 6,
            'device_id': 'creator-device',
            'display_name': 'Creator',
        }),
        content_type='application/json',
    )

    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['max_players'] == 6
    assert data['status'] == 'waiting'
    assert data['room_code']
    assert len(data['players']) == 1
    assert data['players'][0]['device_id'] == 'creator-device'
    assert data['players'][0]['display_name'] == 'Creator'
    assert data['owner_id'] == data['players'][0]['id']


def test_create_private_game_not_in_public_list(client):
    create_resp = client.post(
        '/api/games',
        data=json.dumps({
            'max_players': 6,
            'device_id': 'private-owner',
            'display_name': 'Private Owner',
            'is_private': True,
        }),
        content_type='application/json',
    )
    assert create_resp.status_code == 201
    private_game = json.loads(create_resp.data)

    list_resp = client.get('/api/games?status=waiting')
    assert list_resp.status_code == 200
    games = json.loads(list_resp.data)
    assert all(g['id'] != private_game['id'] for g in games)


def test_get_game_by_code(client, sample_game):
    response = client.get(f'/api/games/by-code/{sample_game.room_code}')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['id'] == sample_game.id
    assert data['room_code'] == sample_game.room_code


def test_join_game(client, sample_game):
    response = client.post(
        f'/api/games/{sample_game.id}/join',
        data=json.dumps({
            'device_id': 'guest-device',
            'display_name': 'Guest',
        }),
        content_type='application/json',
    )

    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['game_id'] == sample_game.id
    assert data['device_id'] == 'guest-device'
    assert data['display_name'] == 'Guest'


def test_join_game_by_code(client, sample_game):
    response = client.post(
        f'/api/games/by-code/{sample_game.room_code}/join',
        data=json.dumps({
            'device_id': 'guest2-device',
            'display_name': 'Guest Two',
        }),
        content_type='application/json',
    )

    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['device_id'] == 'guest2-device'


def test_rejoin_updates_display_name(client, sample_game):
    client.post(
        f'/api/games/{sample_game.id}/join',
        data=json.dumps({
            'device_id': 'guest-device',
            'display_name': 'First Name',
        }),
        content_type='application/json',
    )

    response = client.post(
        f'/api/games/{sample_game.id}/join',
        data=json.dumps({
            'device_id': 'guest-device',
            'display_name': 'Updated Name',
        }),
        content_type='application/json',
    )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['display_name'] == 'Updated Name'


def test_ready_requires_device_id(client, sample_game):
    response = client.post(
        f'/api/games/{sample_game.id}/ready',
        data=json.dumps({'device_id': 'owner-device'}),
        content_type='application/json',
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['is_ready'] is True
