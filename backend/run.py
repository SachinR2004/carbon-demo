from dotenv import load_dotenv
import os

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from app import create_app

app = create_app()

if __name__ == '__main__':
    # Local development only. In production run:  gunicorn run:app
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(debug=debug, port=int(os.environ.get('PORT', 5000)), threaded=True)
