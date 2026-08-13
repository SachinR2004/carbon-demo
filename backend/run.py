from dotenv import load_dotenv
import os

# Load .env from the backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))

from app import create_app

app = create_app()

if __name__ == '__main__':
    # threaded=True so overlapping GPS-log requests (fired every few seconds
    # during live tracking) don't queue up behind each other on Flask's dev server.
    app.run(debug=True, port=5000, threaded=True)
