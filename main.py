import flask
import sqlite3
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_socketio import SocketIO, emit
from better_profanity import profanity

app = flask.Flask(
    __name__,
    static_folder="static",
    static_url_path="/"
)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["100 per day"],
    storage_uri="memory://",
)

socketio = SocketIO(app, cors_allowed_origins="*")

banned_ips = set()

@app.before_request
def check_banned():
    if flask.request.remote_addr in banned_ips:
        flask.abort(403)

conn = sqlite3.connect('gifts.db')
cursor = conn.cursor()
cursor.execute('''
    CREATE TABLE IF NOT EXISTS gifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        gift TEXT NOT NULL,
        fulfilled INTEGER DEFAULT 0
    )
''')
try:
    cursor.execute('ALTER TABLE gifts ADD COLUMN fulfilled INTEGER DEFAULT 0')
except sqlite3.OperationalError:
    pass
conn.commit()
conn.close()

@app.get("/")
@limiter.exempt
def index():
    return flask.send_from_directory("static", "index.html")

@app.get("/forbidden")
@limiter.exempt
def forbidden():
    return flask.abort(403)

@socketio.on('create_gift')
def handle_create_gift(data):
    name = data.get('name')
    gift = data.get('gift')

    if profanity.contains_profanity(name) or profanity.contains_profanity(gift):
        emit('error', {'message': 'Profanity detected'})
        return

    conn = sqlite3.connect('gifts.db')
    cursor = conn.cursor()
    cursor.execute('INSERT INTO gifts (name, gift) VALUES (?, ?)', (name, gift))
    gift_id = cursor.lastrowid
    conn.commit()

    cursor.execute('SELECT id, name, gift, fulfilled FROM gifts WHERE id = ?', (gift_id,))
    row = cursor.fetchone()
    conn.close()

    new_gift = {'id': row[0], 'name': row[1], 'gift': row[2], 'fulfilled': bool(row[3])}

    emit('gift_created', new_gift, broadcast=True)

@socketio.on('update_gift')
def handle_update_gift(data):
    gift_id = data['id']
    fulfilled = data.get('fulfilled', False)

    conn = sqlite3.connect('gifts.db')
    cursor = conn.cursor()
    cursor.execute('UPDATE gifts SET fulfilled = ? WHERE id = ?', (int(fulfilled), gift_id))
    conn.commit()
    conn.close()

    emit('gift_updated', {'id': gift_id, 'fulfilled': fulfilled}, broadcast=True)

@app.get("/gifts")
@limiter.limit("100 per hour")
def get_gifts():
    conn = sqlite3.connect('gifts.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, gift, fulfilled FROM gifts')
    rows = cursor.fetchall()
    conn.close()

    gifts = [{'id': row[0], 'name': row[1], 'gift': row[2], 'fulfilled': bool(row[3])} for row in rows]
    return flask.jsonify(gifts)

if __name__ == "__main__":
    socketio.run(app)
