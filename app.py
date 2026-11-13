"""Standalone Supabase Flask example; the main website still uses PHP."""
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, render_template_string
from supabase import Client, ClientOptions, create_client

load_dotenv(Path(__file__).with_name('.env'))
app = Flask(__name__)

url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_KEY') or os.environ.get('SUPABASE_PUBLISHABLE_KEY')
if not url or not key:
    raise RuntimeError('Set SUPABASE_URL and SUPABASE_KEY in .env.')

supabase: Client = create_client(
    url, key,
    options=ClientOptions(persist_session=False, auto_refresh_token=False,
                          postgrest_client_timeout=10),
)


@app.get('/')
def index():
    try:
        todos = supabase.table('todos').select('name').limit(100).execute().data
    except Exception:
        app.logger.warning('Unable to read the Supabase todos example table.')
        return ('<h1>Supabase example</h1><p>Unable to read todos. Check that '
                'the table exists and its SELECT grants and RLS policy allow '
                'the configured key to read it.</p>'), 503
    # Jinja escapes database values before rendering HTML.
    return render_template_string(
        '<h1>Todos</h1><ul>{% for todo in todos %}<li>{{ todo.name }}</li>'
        '{% else %}<li>No todos found.</li>{% endfor %}</ul>', todos=todos,
    )


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
