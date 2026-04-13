# Generate CSV files for all tables (6 months context already in sales)

import pandas as pd

base_path = "./"

# USER TABLE
user_df = pd.DataFrame([
    [1, 'Rahul Kumar', 'rahul@gmail.com', '$2b$12$dummyhash', 1],
    [2, 'Amit Sharma', 'amit@gmail.com', '$2b$12$dummyhash', 0]
], columns=['uid','name','email','password','is_pharmacist'])

user_path = f"{base_path}user.csv"
user_df.to_csv(user_path, index=False)


# INVENTORY TABLE
inventory_df = pd.DataFrame([
    ['Paracetamol','BID001',50,5,8,10,'2026-12-31','2026-01-01','Shelf A','Tablet'],
    ['Ibuprofen','BID002',30,8,12,15,'2026-10-15','2026-02-01','Shelf B','Tablet'],
    ['Cetirizine','BID003',20,4,7,9,'2026-08-20','2026-03-01','Shelf C','Tablet']
], columns=['Iname','Bid','Quantity','Purchase_Price','Sale_Price','MRP','Exp_Date','Purchase_Date','Location','Category'])

inventory_path = f"{base_path}inventory_1.csv"
inventory_df.to_csv(inventory_path, index=False)


# SALES TABLE (6 months)
sales_data = [
    ['BID001',1,2026,1,10,500,800], ['BID001',1,2026,0,2,100,0],
    ['BID002',1,2026,1,8,400,720],  ['BID002',1,2026,0,1,50,0],
    ['BID003',1,2026,1,12,600,960], ['BID003',1,2026,0,3,150,0],

    ['BID001',2,2026,1,9,450,720],  ['BID001',2,2026,0,1,50,0],
    ['BID002',2,2026,1,7,350,630],  ['BID002',2,2026,0,2,100,0],
    ['BID003',2,2026,1,11,550,880], ['BID003',2,2026,0,2,100,0],

    ['BID001',3,2026,1,11,550,880], ['BID001',3,2026,0,2,100,0],
    ['BID002',3,2026,1,6,300,540],  ['BID002',3,2026,0,1,50,0],
    ['BID003',3,2026,1,10,500,800], ['BID003',3,2026,0,2,100,0],

    ['BID001',4,2026,1,13,650,1040],['BID001',4,2026,0,1,50,0],
    ['BID002',4,2026,1,9,450,810],  ['BID002',4,2026,0,2,100,0],
    ['BID003',4,2026,1,8,400,640],  ['BID003',4,2026,0,1,50,0],

    ['BID001',5,2026,1,10,500,800], ['BID001',5,2026,0,3,150,0],
    ['BID002',5,2026,1,12,600,1080],['BID002',5,2026,0,2,100,0],
    ['BID003',5,2026,1,9,450,720],  ['BID003',5,2026,0,1,50,0],

    ['BID001',6,2026,1,8,400,640],  ['BID001',6,2026,0,2,100,0],
    ['BID002',6,2026,1,11,550,990], ['BID002',6,2026,0,1,50,0],
    ['BID003',6,2026,1,7,350,560],  ['BID003',6,2026,0,2,100,0],
]

sales_df = pd.DataFrame(sales_data, columns=['Bid','Month','Year','Sold','Quantity','Expenditure','Income'])
sales_path = f"{base_path}sales_1.csv"
sales_df.to_csv(sales_path, index=False)


# READ TABLE
read_df = pd.DataFrame([
    ['Paracetamol','L','2026-04-01'],
    ['BID002','S','2026-04-01'],
    ['BID003','E','2026-04-01']
], columns=['Iname_Bid','type','last_read'])

read_path = f"{base_path}read_1.csv"
read_df.to_csv(read_path, index=False)


# COMPOSITION TABLE
composition_df = pd.DataFrame([
    ['Paracetamol','Acetaminophen'],
    ['Ibuprofen','Ibuprofen'],
    ['Cetirizine','Cetirizine Hydrochloride']
], columns=['Iname','component'])

composition_path = f"{base_path}composition_1.csv"
composition_df.to_csv(composition_path, index=False)


[user_path, inventory_path, sales_path, read_path, composition_path]