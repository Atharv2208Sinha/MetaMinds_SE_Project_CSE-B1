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
    return render_template('home.html')
@app.route('/Home')  
def home_():
    return render_template('home.html')

@app.route('/Main')  
def main():
    return render_template('main.html')

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

        inventory = f"""Create Table {TI}(Iname varchar(100) not null, Bid varchar(100) COLLATE utf8mb4_bin not null primary key, Quantity int not null, 
                                       Purchase_Price int not null, Sale_Price int not null, MRP int, Exp_Date date not null, 
                                       Purchase_Date date not null, Location varchar(50), Category varchar(50) )"""
        
        cursor.execute(inventory)

        sales = f"""Create Table {TS}(Bid varchar(100) COLLATE utf8mb4_bin not null, foreign key(Bid) references {TI}(Bid), Month int not null check(Month between 1 and 12), Year int not null, 
                                    Sold bool not null, Quantity int not null, Expenditure int not null, Income int not null, 
                                    primary key(Bid, Month, Year, Sold))"""

        cursor.execute(sales)

        read = f"""Create Table {TN}(Iname_Bid varchar(100) not null, type varchar(1) not null check(type = 'L' or type = 'S' or type = 'E'), last_read date not null, primary key(Iname_Bid, type))"""
        # L for low; S for stale; E for expiry
        cursor.execute(read)

        if is_pharmacist:
            TC = f"composition_{new_user_id}"
            composition = f"""Create Table {TC}(Iname varchar(100) not null, component varchar(100) not null, primary key(Iname,component))"""
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
    # Fetches all alerts for the logged-in user.
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None: return jsonify({'error': 'Database error'}), 500
        
        cursor = conn.cursor(dictionary=True)

        low = lowAlert(current_user_id, is_pharmacist, cursor, conn)
        stale = staleAlert(current_user_id, is_pharmacist, cursor, conn)
        exp = expiryAlert(current_user_id, cursor, conn)
        
        # Format the expiration date for JSON serialization
        for row in exp:
            if row.get('Exp_Date'):
                row['Exp_Date'] = str(row['Exp_Date'])
        
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


@app.route('/api/notifications/read', methods=['POST'])
@token_required
def mark_notification_read(current_user_id, is_pharmacist):
    data = request.json
    iname_bid = data.get('id')
    alert_type = data.get('type')

    if not iname_bid or not alert_type:
        return jsonify({'error': 'Missing ID or Type'}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None: return jsonify({'error': 'Database error'}), 500

        cursor = conn.cursor()
        table_read = f"read_{current_user_id}"

        # Insert or ignore to prevent duplicates
        query = f"""
            INSERT IGNORE INTO {table_read} (Iname_Bid, type, last_read)
            VALUES (%s, %s, CURDATE())
        """
        cursor.execute(query, (iname_bid, alert_type))
        conn.commit()

        return jsonify({'message': 'Notification marked as read'}), 200
    except Error as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'Failed to mark as read'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route('/api/notifications/read_all', methods=['POST'])
@token_required
def mark_all_notifications_read(current_user_id, is_pharmacist):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None: return jsonify({'error': 'Database error'}), 500

        cursor = conn.cursor(dictionary=True)
        table_read = f"read_{current_user_id}"

        # Fetch current alerts to know what needs to be marked as read
        low = lowAlert(current_user_id, is_pharmacist, cursor, conn)
        stale = staleAlert(current_user_id, is_pharmacist, cursor, conn)
        exp = expiryAlert(current_user_id, cursor, conn)"""  """

        # Insert them into the read table
        for item in low:
            cursor.execute(f"INSERT IGNORE INTO {table_read} (Iname_Bid, type, last_read) VALUES (%s, %s, CURDATE())", (item['Iname'], 'L'))
        for item in stale:
            cursor.execute(f"INSERT IGNORE INTO {table_read} (Iname_Bid, type, last_read) VALUES (%s, %s, CURDATE())", (item['Bid'], 'S'))
        for item in exp:
            cursor.execute(f"INSERT IGNORE INTO {table_read} (Iname_Bid, type, last_read) VALUES (%s, %s, CURDATE())", (item['Bid'], 'E'))

        conn.commit()
        return jsonify({'message': 'All notifications marked as read'}), 200

    except Error as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'Failed to mark all as read'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route('/Inventory_Management')
def salesMgmt():
    return render_template('inventory_management.html')

@app.route('/api/inventory/composition', methods=['POST'])
@token_required
def add_composition(current_user_id, is_pharmacist):
    data = request.json
    
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = conn.cursor()
    
        table_comp = f"composition_{current_user_id}"
        compositions = data.get('compositions', [])
        
        for component in compositions:
            comp_query = f"INSERT IGNORE INTO {table_comp} (Iname, component) VALUES (%s, %s)"
            cursor.execute(comp_query, (data['Iname'], component))

        conn.commit()
        return jsonify({'message': 'Composition saved successfully'}), 200

    except Error as e:
        if conn: conn.rollback()
        print(f"Database error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/inventory/add', methods=['POST'])
@token_required
def add_inventory(current_user_id, is_pharmacist):
    data = request.json
    
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
            
        cursor = conn.cursor()
        table_inv = f"inventory_{current_user_id}"
        
        # Current Date for Purchase_Date
        current_date = datetime.now().strftime('%Y-%m-%d')

        mrp_val = data.get('MRP')
        if mrp_val in [-1, "-1", "", "NULL"]: 
            mrp_val = None
            
        location_val = data.get('Location')
        if location_val in ["", "NULL"]:
            location_val = None
            
        category_val = data.get('Category')
        if category_val in ["", "NULL"]:
            category_val = None
        
        query = f"""INSERT INTO {table_inv} 
                    (Iname, Bid, Quantity, Purchase_Price, Sale_Price, MRP, Exp_Date, Purchase_Date, Location, Category) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
        
        cursor.execute(query, (
            data['Iname'], data['Bid'], data['Quantity'], data['Purchase_Price'], 
            data['Sale_Price'], mrp_val, data['Exp_Date'], current_date, 
            location_val, category_val
        ))
        
        conn.commit()

        handleLow(data['Iname'], current_user_id, cursor, conn)
        return jsonify({'message': 'Inventory saved successfully'}), 200

    except Error as e:
        if conn: conn.rollback()
        print(f"Database error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


def handleLow(Iname, Uid, cursor, conn):
    qinv = f"""Delete from inventory_{Uid} where Iname = %s and Quantity <= 0"""
    cursor.execute(qinv, (Iname,))

    qread = f"Delete from read_{Uid} where Iname_Bid = %s and type = 'L'"
    cursor.execute(qread, (Iname,))
    conn.commit()


@app.route('/api/inventory/check', methods=['GET'])
@token_required
def check_inventory(current_user_id, is_pharmacist):
    search_iname = request.args.get('iname', '')
    
    if not search_iname:
        return jsonify({'error': 'Item name required'}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None: return jsonify({'error': 'Database error'}), 500
        
        cursor = conn.cursor(dictionary=True)
        table_inv = f"inventory_{current_user_id}"
        
        if is_pharmacist == 1:
            table_comp = f"composition_{current_user_id}"
            
            query = f"""
                SELECT i.*, GROUP_CONCAT(c.component SEPARATOR '; ') as components 
                FROM {table_inv} i
                LEFT JOIN {table_comp} c ON i.Iname = c.Iname
                WHERE i.Iname LIKE %s
                GROUP BY i.Bid
            """
        else:
            query = f"SELECT * FROM {table_inv} WHERE Iname LIKE %s"
            
        cursor.execute(query, (f"{search_iname}",))
        results = cursor.fetchall()
        
        return jsonify({
            'data': results,
            'is_pharmacist': bool(is_pharmacist)
        }), 200

    except Error as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'Failed to fetch status'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route('/Sales_Management')
def sales_management_page():
    return render_template('sales_management.html')

@app.route('/api/sales/search', methods=['GET'])
@token_required
def sales_search(current_user_id, is_pharmacist):
    """Search inventory items for autofill. Returns matching items with Name, Bid, Sale_Price, MRP, Quantity."""
    query_str = request.args.get('q', '').strip()
    if not query_str:
        return jsonify({'data': []}), 200

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500

        cursor = conn.cursor(dictionary=True)
        table_inv = f"inventory_{current_user_id}"

        query = f"""SELECT Iname, Bid, Quantity, Sale_Price, MRP
                    FROM {table_inv}
                    WHERE Iname LIKE %s OR Bid LIKE %s
                    ORDER BY Iname, Bid"""
        search_param = f"%{query_str}%"
        cursor.execute(query, (search_param, search_param))
        results = cursor.fetchall()

        return jsonify({'data': results}), 200

    except Error as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'Failed to search inventory'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/sales/generate-bill', methods=['POST'])
@token_required
def generate_bill(current_user_id, is_pharmacist):
    """Record sales and update inventory. Expects JSON: { items: [{ Bid, quantity, selling_price }] }"""
    data = request.json
    items = data.get('items', [])

    if not items:
        return jsonify({'error': 'No items provided'}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500

        cursor = conn.cursor(dictionary=True)
        table_inv = f"inventory_{current_user_id}"
        table_sales = f"sales_{current_user_id}"

        now = datetime.now()
        current_month = now.month
        current_year = now.year

        for item in items:
            bid = item.get('Bid')
            qty = int(item.get('quantity', 0))
            selling_price = int(item.get('selling_price', 0))

            if not bid or qty <= 0:
                return jsonify({'error': f'Invalid item data for Bid: {bid}'}), 400

            # Check available stock
            cursor.execute(f"SELECT Quantity, Purchase_Price, Iname FROM {table_inv} WHERE Bid = %s", (bid,))
            inv_row = cursor.fetchone()

            if not inv_row:
                return jsonify({'error': f'Item with Bid {bid} not found in inventory'}), 404

            if inv_row['Quantity'] < qty:
                return jsonify({'error': f"Insufficient stock for {inv_row['Iname']} ({bid}). Available: {inv_row['Quantity']}"}), 400

            expenditure = inv_row['Purchase_Price'] * qty
            income = selling_price * qty

            # Insert or update sales record
            # Check if a record for this Bid, Month, Year, Sold=1 already exists
            cursor.execute(
                f"SELECT * FROM {table_sales} WHERE Bid = %s AND Month = %s AND Year = %s AND Sold = 1",
                (bid, current_month, current_year)
            )
            existing = cursor.fetchone()

            if existing:
                # Update existing record
                cursor.execute(
                    f"""UPDATE {table_sales}
                        SET Quantity = Quantity + %s, Expenditure = Expenditure + %s, Income = Income + %s
                        WHERE Bid = %s AND Month = %s AND Year = %s AND Sold = 1""",
                    (qty, expenditure, income, bid, current_month, current_year)
                )
            else:
                # Insert new record
                cursor.execute(
                    f"""INSERT INTO {table_sales} (Bid, Month, Year, Sold, Quantity, Expenditure, Income)
                        VALUES (%s, %s, %s, 1, %s, %s, %s)""",
                    (bid, current_month, current_year, qty, expenditure, income)
                )

            # Decrement inventory
            new_qty = inv_row['Quantity'] - qty
            if new_qty <= 0:
                cursor.execute(f"DELETE FROM {table_inv} WHERE Bid = %s", (bid,))
            else:
                cursor.execute(f"UPDATE {table_inv} SET Quantity = %s WHERE Bid = %s", (new_qty, bid))

            # Handle low stock alert cleanup
            handleLow(inv_row['Iname'], current_user_id, cursor, conn)

        conn.commit()
        return jsonify({'message': 'Bill generated successfully!'}), 200

    except Error as e:
        if conn: conn.rollback()
        print(f"Database error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route('/Sales_Analysis')
def salesAnalysis():
    return render_template('sales_analysis.html')

@app.route('/api/sales/monthly/<int:year>', methods=['GET'])
@token_required
def get_monthly_sales(current_user_id, is_pharmacist, year):
    item_id = request.args.get('item_id')  # Get item_id from query parameters
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        query = f"""
            SELECT 
                s.Month, 
                SUM(s.Quantity) as total_sales
            FROM sales_{current_user_id} s
            JOIN inventory_{current_user_id} i ON s.Bid = i.Bid
            WHERE s.Year = %s AND s.Sold = 1
        """
        
        params = [year]
        if item_id and item_id != 'overall':
            query += " AND i.Bid = %s"
            params.append(item_id)
            
        query += " GROUP BY s.Month ORDER BY s.Month;"
        
        cursor.execute(query, tuple(params))
        sales_data = cursor.fetchall()
        
        # Initialize sales for all months to 0
        monthly_sales = {month: 0 for month in range(1, 13)}
        for row in sales_data:
            monthly_sales[row['Month']] = row['total_sales']
            
        return jsonify(list(monthly_sales.values()))

    except Error as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'An internal error occurred.'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/sales/yearly/<int:start_year>/<int:end_year>', methods=['GET'])
@token_required
def get_yearly_sales(current_user_id, is_pharmacist, start_year, end_year):
    item_id = request.args.get('item_id')  # Get item_id from query parameters
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        query = f"""
            SELECT 
                s.Year, 
                SUM(s.Quantity) as total_sales
            FROM sales_{current_user_id} s
            JOIN inventory_{current_user_id} i ON s.Bid = i.Bid
            WHERE s.Year BETWEEN %s AND %s AND s.Sold = 1
        """
        
        params = [start_year, end_year]
        if item_id and item_id != 'overall':
            query += " AND i.Bid = %s"
            params.append(item_id)
            
        query += " GROUP BY s.Year ORDER BY s.Year;"
        
        cursor.execute(query, tuple(params))
        sales_data = cursor.fetchall()

        # Initialize sales for all years in the range to 0
        yearly_sales = {year: 0 for year in range(start_year, end_year + 1)}
        for row in sales_data:
            yearly_sales[row['Year']] = row['total_sales']
            
        return jsonify(list(yearly_sales.values()))

    except Error as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'An internal error occurred.'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/inventory/all_items', methods=['GET'])
@token_required
def get_all_items(current_user_id, is_pharmacist):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        query = f"SELECT Bid as batch_id, Iname as item_name FROM inventory_{current_user_id};"
        cursor.execute(query)
        items = cursor.fetchall()
        
        return jsonify(items)

    except Error as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'An internal error occurred.'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/sales/item_sales/<int:month>/<int:year>', methods=['GET'])
@token_required
def get_item_sales_data(current_user_id, is_pharmacist, month, year):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        query = f"""
            SELECT 
                s.Bid as batch_id,
                i.Iname as item_name,
                s.Month as month,
                s.Year as year,
                s.Sold as sold,
                s.Quantity as quantity,
                s.Expenditure as expenditure,
                s.Income as income
            FROM sales_{current_user_id} s
            JOIN inventory_{current_user_id} i ON s.Bid = i.Bid
            WHERE s.Month = %s AND s.Year = %s;
        """
        cursor.execute(query, (month, year))
        items = cursor.fetchall()
        
        return jsonify(items)

    except Error as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'An internal error occurred.'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()



@app.route('/Alternative_Medicine_Advisor')
def altMed():
    return render_template('alt_med_advisor.html')

# ── Alternative Medicine Advisor API ──
@app.route('/search_alternatives', methods=['POST'])
@token_required
def search_alternatives(current_user_id, is_pharmacist):
    if not is_pharmacist:
        return jsonify({'error': 'Access denied. Pharmacist account required.'}), 403

    data         = request.json or {}
    search_by    = data['searchby']
    search_name  = data.get('name', '').strip()
    search_comps = [c.strip() for c in data.get('compositions', []) if c.strip()]
    category     = data.get('category', '').strip()

    if not search_name and not search_comps and search_by != 'cate':
        return jsonify({'error': 'Provide a medicine name or at least one composition.'}), 400

    conn   = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({'error': 'Database connection failed'}), 500

        cursor = conn.cursor(dictionary=True)
        table_inv  = f"inventory_{current_user_id}"
        table_comp = f"composition_{current_user_id}"

        filter = ""
        if category != 'all':
            filter = f"AND i.Category = %s"

        if search_by == 'name':
            query = f"""
                SELECT i.*, GROUP_CONCAT(c.component ORDER BY c.component SEPARATOR '; ') as components 
                FROM {table_inv} i
                LEFT JOIN {table_comp} c ON i.Iname = c.Iname
                WHERE i.Iname IN (
                    SELECT comp_match.Iname
                    FROM {table_comp} comp_match
                    WHERE comp_match.component IN (
                        SELECT component FROM {table_comp} WHERE Iname = %s
                    )
                    GROUP BY comp_match.Iname
                    HAVING COUNT(DISTINCT comp_match.component) = (
                        SELECT COUNT(DISTINCT component) FROM {table_comp} WHERE Iname = %s
                    )
                )
                AND i.Quantity > 0
                AND i.Iname != %s
                {filter}
                GROUP BY i.Bid
                ORDER BY i.Quantity DESC """
        
            params = [search_name, search_name, search_name]
            if filter:
                params.append(category)
                
            cursor.execute(query, tuple(params))
            results = cursor.fetchall()

        elif search_by == 'comp':
            target_count = len(search_comps)
            comp_placeholders = ", ".join(["%s"] * target_count)

            query = f"""
                SELECT i.*, GROUP_CONCAT(c.component ORDER BY c.component SEPARATOR '; ') as components 
                FROM {table_inv} i
                LEFT JOIN {table_comp} c ON i.Iname = c.Iname
                WHERE i.Iname IN (
                    SELECT comp_match.Iname
                    FROM {table_comp} comp_match
                    WHERE comp_match.component IN ({comp_placeholders})
                    GROUP BY comp_match.Iname
                    HAVING COUNT(DISTINCT comp_match.component) = %s )
                AND i.Quantity > 0
                {filter}
                GROUP BY i.Bid
                ORDER BY i.Quantity DESC
            """

            params = list(search_comps) + [target_count]
            if filter:
                params.append(category)

            cursor.execute(query, tuple(params))
            results = cursor.fetchall()
        
        elif search_by == 'cate':
            query = f"""
                SELECT i.*, GROUP_CONCAT(c.component SEPARATOR '; ') as components 
                FROM {table_inv} i
                LEFT JOIN {table_comp} c ON i.Iname = c.Iname
                WHERE i.Quantity > 0
                AND i.Category = %s
                GROUP BY i.Bid
                ORDER BY i.Quantity DESC
            """
            cursor.execute(query, (category,))
            results = cursor.fetchall()
        
        else:
            return jsonify({'error': 'Invalid search method.'}), 400

        # Fix JSON Serialization for Date Objects
        for row in results:
            if row.get('Exp_Date'):
                row['Exp_Date'] = str(row['Exp_Date'])
            if row.get('Purchase_Date'): 
                row['Purchase_Date'] = str(row['Purchase_Date'])

        return jsonify(results), 200

    except Error as e:
        print(f"Database error in search_alternatives: {e}")
        return jsonify({'error': 'Failed to fetch alternatives'}), 500
    finally:
        if cursor: cursor.close()
        if conn:   conn.close()


@app.route('/api/auto/iname', methods=['GET'])
@token_required
def auto_iname(current_user_id, is_pharmacist):
    search_iname = request.args.get('iname', '').strip()
    
    if not search_iname:
        return jsonify({'error': 'Item name required'}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None: return jsonify({'error': 'Database error'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        if is_pharmacist == 1:
            table = f"composition_{current_user_id}"
        else:
            table = f"inventory_{current_user_id}"

        query = f""" SELECT DISTINCT Iname FROM {table} WHERE Iname LIKE %s 
                    ORDER BY 
                        CASE WHEN Iname LIKE %s THEN 1 ELSE 2 END, 
                        Iname ASC
                    LIMIT 10 """
        
        cursor.execute(query, (f"%{search_iname}%", f"{search_iname}%"))
        results = cursor.fetchall()

        return jsonify({'data': results}), 200

    except Error as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'Failed to fetch Iname'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route('/api/auto/comp', methods=['GET'])
@token_required
def auto_comp(current_user_id, is_pharmacist):
    search_comp = request.args.get('comp', '').strip()
    
    if not search_comp:
        return jsonify({'error': 'Composition required'}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None: return jsonify({'error': 'Database error'}), 500
        
        cursor = conn.cursor(dictionary=True)
        table_comp = f"composition_{current_user_id}"
            
        query = f""" SELECT DISTINCT component FROM {table_comp} WHERE component LIKE %s 
                ORDER BY 
                    CASE WHEN component LIKE %s THEN 1 ELSE 2 END, 
                    component ASC
                LIMIT 10 """
            
        cursor.execute(query, (f"%{search_comp}%", f"{search_comp}%"))
        results = cursor.fetchall()
        
        return jsonify({'data': results}), 200

    except Error as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'Failed to fetch composition'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route('/api/auto/bid', methods=['GET'])
@token_required
def auto_bid(current_user_id, is_pharmacist):
    search_bid = request.args.get('Bid', '').strip()
    
    if not search_bid:
        return jsonify({'error': 'Bid required'}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None: return jsonify({'error': 'Database error'}), 500
        
        cursor = conn.cursor(dictionary=True)
        table_inv = f"inventory_{current_user_id}"

        query = f""" SELECT DISTINCT Bid FROM {table_inv} WHERE Bid LIKE %s
                    ORDER BY Bid ASC
                    LIMIT 10 """
            
        cursor.execute(query, (f"{search_bid}%",))
        results = cursor.fetchall()
        
        return jsonify({'data': results}), 200

    except Error as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'Failed to fetch Bid'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route('/api/auto/category', methods=['GET'])
@token_required
def auto_category(current_user_id, is_pharmacist):
    search_category = request.args.get('category', '').strip()

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if conn is None: return jsonify({'error': 'Database error'}), 500
        
        cursor = conn.cursor(dictionary=True)
        table_inv = f"inventory_{current_user_id}"
            
        if not search_category:
            # If no search term, return all distinct categories
            query = f"SELECT DISTINCT Category FROM {table_inv} WHERE Category IS NOT NULL AND Category != '' ORDER BY Category ASC"
            cursor.execute(query)
        else:
            query = f""" SELECT DISTINCT Category FROM {table_inv} WHERE Category LIKE %s 
                        ORDER BY 
                            CASE WHEN Category LIKE %s THEN 1 ELSE 2 END, 
                            Category ASC
                        LIMIT 10 """
            cursor.execute(query, (f"%{search_category}%", f"{search_category}%"))
            
        results = cursor.fetchall()
        return jsonify({'data': results}), 200

    except Error as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'Failed to fetch Category'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

if __name__ == '__main__':
    app.run(debug=True,port=5500)