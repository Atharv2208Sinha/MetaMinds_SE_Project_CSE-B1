from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import bcrypt
import jwt # <-- Import PyJWT
import mysql.connector
from mysql.connector import Error, IntegrityError
from datetime import datetime, timedelta, timezone # <-- For token expiration
from functools import wraps # <-- For the decorator

app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = 'alpha_controler'

def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host='localhost',
            user='root',
            password='123789aS',
            database='se_project'
        )
        if connection.is_connected():
            print("Successfully connected to the database")
            return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None
    
def token_required(f):
    """A decorator to protect routes that require a valid JWT."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Check if 'Authorization' header is present
        if 'Authorization' in request.headers:
            # Header format is "Bearer <token>"
            # We split 'Bearer ' and get the token part
            try:
                token = request.headers['Authorization'].split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Token format is invalid'}), 401

        if not token:
            return jsonify({'error': 'Token is missing!'}), 401

        try:
            # --- JWT VERIFICATION ---
            # Try to decode the token using our SECRET_KEY
            # This checks the signature AND the expiration time
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            
            # The payload (data) is now available. We can find the user.
            current_user_id = data['user_id']

        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid!'}), 401

        # Pass the extracted user_id to the route function
        return f(current_user_id, *args, **kwargs)

    return decorated


if __name__ == '__main__':
    app.run(debug=True,port=5500)