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
    #A decorator to protect routes that require a valid JWT.
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
            is_pharmacist = data['is_pharmacist']

        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid!'}), 401

        # Pass the extracted user_id to the route function
        return f(current_user_id, is_pharmacist, *args, **kwargs)

    return decorated

@app.route('/')  
def home():
    return render_template('main.html')
@app.route('/Home')  
def home_():
    return render_template('home.html')

@app.route('/Sign_Up')
def signup():
    return render_template('sign_up.html')

@app.route('/register', methods=['POST'])
def register_user():
    data = request.json
    
    # Extract personal data
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    occupation = data.get('occupation')

    # --- Validation ---
    if not all([name, email, password, occupation]):
        return jsonify({'error': 'All personal details are required.'}), 400
    
    if occupation == 'pharmacist':
        is_pharmacist = 1
    else: is_pharmacist = 0

    # Hash the password
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
    
    conn = None
    cursor = None
    
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        #Create the User
        insert_user_query = "INSERT INTO user (name, email, password, is_pharmacist) VALUES (%s, %s, %s, %s)"
        cursor.execute(insert_user_query, (name, email, hashed_password, is_pharmacist ))
        
        #Get the New User's ID ---
        new_user_id = cursor.lastrowid

        TI = f"inventory_{new_user_id}"
        TS = f"sales_{new_user_id}"
        TN = f"read_{new_user_id}"

        inventory = f"""Create Table {TI}(Iname varchar(100) not null, Bid varchar(100) not null primary key, Quantity int not null, 
                                       Purchase_Price int not null, Sale_Price int not null, MRP int, Exp_Date date not null, 
                                       Purchase_Date date not null, Location varchar(50), Category varchar(50) )"""
        
        cursor.execute(inventory)

        sales = f"""Create Table {TS}(Bid varchar(100) not null, foreign key(Bid) references {TI}(Bid), Month int not null check(Month between 1 and 12), Year int not null, 
                                    Sold bool not null, Quantity int not null, Expenditure int not null, Income int not null, 
                                    primary key(Bid, Month, Year, Sold))"""

        cursor.execute(sales)

        read = f"""Create Table {TN}(Iname_Bid varchar(100) not null, type varchar(1) not null check(type = 'L' or type = 'S' or type = 'E'), last_read date not null, primary key(iname_Bid, type))"""
        # L for low; S for stale; E for expiry
        cursor.execute(read)

        if is_pharmacist:
            TC = f"composition_{new_user_id}"
            composition = f"""Create Table {TC}(Iname varchar(100) not null, component varchar(100) not null, primary key(iname,component))"""
            cursor.execute(composition)

        conn.commit()
        
        # Send back the new Uid so the frontend can use it
        return jsonify({'message': 'User registered successfully!', 'uid': new_user_id}), 201
    
    except Error as e:
        # Handle other database errors
        if conn:
            conn.rollback()
        print(f"Database error: {e}")
        return jsonify({'error': 'An internal error occurred.'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/login', methods=['POST'])    
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email id and password are required'}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True) 
        cursor.execute("SELECT * FROM user WHERE email = %s", (email,))
        user = cursor.fetchone()

        if user:
            password_bytes = password.encode('utf-8')
            hashed_password_bytes = user['password'].encode('utf-8')

            if bcrypt.checkpw(password_bytes, hashed_password_bytes):
                # --- JWT CREATION ---
                # Create the "payload" (the data inside the wristband)
                payload = {
                    'user_id': user['uid'],
                    'is_pharmacist': user['is_pharmacist'],
                    'exp': datetime.now(timezone.utc) + timedelta(weeks=4) # Expiration time
                }
                
                # Create the token (the wristband itself)
                token = jwt.encode(
                    payload, 
                    app.config['SECRET_KEY'], 
                    algorithm='HS256'
                )
                
                # Send the token to the frontend
                return jsonify({'message': 'Login successful!', 'token': token}), 200

        # If user not found or password wrong
        return jsonify({'error': 'Invalid phone number or password'}), 401
    except Error as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'An error occurred during login.'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/notifications', methods=['GET'])
@token_required
def get_notifications(current_user_id, is_pharmacist):
    #Fetches all alerts for the logged-in user.
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None: return jsonify({'error': 'Database error'}), 500
        
        cursor = conn.cursor(dictionary=True)

        low = lowAlert(current_user_id, is_pharmacist, cursor, conn)
        stale = staleAlert(current_user_id, is_pharmacist, cursor, conn)
        exp = expiryAlert(current_user_id, cursor, conn)
        
        notifications = (low, stale, exp)
        
        return jsonify(notifications), 200
        
    except Error as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'Failed to fetch notifications'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

def lowAlert(current_user_id, is_pharmacist, cursor, conn):
    if is_pharmacist: low = 50
    else: low = 10

    reset_read = f"""Delete from read_{current_user_id} where type = 'L' and last_read < CURDATE()"""
    cursor.execute(reset_read)
    conn.commit()

    query = f"""SELECT Iname, sum(quantity) as Q
                FROM inventory_{current_user_id} 
                WHERE Iname NOT IN (
                    SELECT Iname_Bid FROM read_{current_user_id} where type = 'L')
                GROUP BY Iname
                HAVING Q <= {low}"""
    
    cursor.execute(query)
    return cursor.fetchall()

def staleAlert(current_user_id, is_pharmacist, cursor, conn):
    if is_pharmacist: old = 12
    else: old = 6

    reset_read = f"""Delete from read_{current_user_id} where type = 'S' and last_read + INTERVAL 1 MONTH <= CURDATE()"""
    cursor.execute(reset_read)
    conn.commit()

    query = f"""
            SELECT Iname, Bid 
            FROM inventory_{current_user_id} 
            where CURDATE() >= Purchase_Date + INTERVAL {old} MONTH and 
            Bid not in( select Iname_Bid FROM read_{current_user_id} where type = 'S')
        """
    
    cursor.execute(query)
    return cursor.fetchall()

def expiryAlert(current_user_id, cursor, conn):
    reset_read = f"""Delete from read_{current_user_id} where type = 'E' and last_read < CURDATE()"""
    cursor.execute(reset_read)
    conn.commit()

    query = f"""
            SELECT Iname, Bid, Exp_Date
            FROM inventory_{current_user_id}
            where CURDATE() >= Exp_Date - INTERVAL 10 Day and
            Bid not in( select Iname_Bid FROM read_{current_user_id} where type = 'E')
        """
    
    cursor.execute(query)
    return cursor.fetchall()


if __name__ == '__main__':
    app.run(debug=True,port=5500)