from fastapi.testclient import TestClient
from backend.app.main import app, det_svc

client = TestClient(app)

def test_health():
    r = client.get('/health')
    assert r.status_code == 200
    assert r.json()['status'] == 'ok'

def test_post_detection():
    payload = {
        'id': 't1',
        'source': 'sim',
        'x': 0.1,
        'y': -0.2,
        'r': 0.05,
        'label': 'test',
        'threat': False
    }
    r = client.post('/api/detections', json=payload)
    assert r.status_code == 201
    j = r.json()
    assert j['id'] == 't1'
    # verify it was persisted
    recent = det_svc.list_recent(10)
    assert any(d.id == 't1' for d in recent)
