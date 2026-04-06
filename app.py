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
