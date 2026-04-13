# Smart Inventory and Sales Analytics System for Small Businesses

<div align="center">
  <p><strong>A manual-first, fast, and user-friendly inventory, billing, and sales analytics platform for kirana stores, retail shops, pharmacies, and wholesalers.</strong></p>
  <p>Built to reduce paperwork, prevent stock mistakes, speed up billing, and give small business owners clearer visibility into daily operations.</p>
</div>

---

## Overview

The Smart Inventory Management System is designed to help small businesses manage inventory and sales without relying on complex enterprise software. The focus of the project is simplicity: quick stock entry, easy billing, fewer calculation errors, and meaningful business insights that can be used day to day.

Beyond inventory tracking, the system also works as a sales analytics platform. Every sale is recorded, product-wise performance can be reviewed over time, and alerts help owners act early when items are running low, becoming stale, or approaching expiry.

For pharmacy-focused workflows, the project also stores medicine composition data to suggest suitable alternatives when a requested product is unavailable.

## Key Features

| Module | What it does |
| --- | --- |
| Smart Inventory Management | Tracks stock levels, product details, batch IDs, pricing, category, location, and expiry data |
| Billing and Sales Entry | Supports faster checkout and automatically records product-wise sales activity |
| Sales Analytics | Calculates daily, monthly, and yearly sales performance |
| Trend Reporting | Helps identify high-performing products and overall sales direction |
| Low Stock Alerts | Notifies users before products run out |
| Stale Stock Alerts | Flags inventory that is not moving regularly |
| Expiry Alerts | Highlights stock that is close to expiry |
| Alternative Medicine Advisor | Suggests substitutes using stored composition data for pharmacist users |

## Why This Project Matters

Small businesses often handle inventory and billing manually, which increases paperwork, slows down daily work, and creates avoidable calculation mistakes. This project aims to provide a practical middle ground: a simple digital system that is easy to learn, quick to use, and focused on real shop-floor needs.

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Python, Flask
- Authentication: JWT
- Database: MySQL
- Supporting Libraries: `flask-cors`, `bcrypt`, `PyJWT`, `mysql-connector-python`

## Run Locally

### 1. Prerequisites

Make sure you have the following installed:

- Python 3.10 or later
- MySQL Server
- `pip`
- Git
- VS Code (optional, for Live Share)

### 2. Clone the repository

```bash
git clone <your-repo-url>
cd MetaMinds_SE_Project_CSE-B1
```

### 3. Create and activate a virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

If you are on Windows:

```bash
.venv\Scripts\activate
```

### 4. Install dependencies

This project uses `requirement.txt` in the repository root:

```bash
pip install -r requirement.txt
```

### 5. Configure MySQL

The Flask app currently connects to MySQL using the configuration inside `Inventory_Sales_Management_System/app.py`:

```python
host='localhost'
user='root'
password='123789aS'
database='se_project'
```

Update those values in `app.py` if your local MySQL username, password, or database name is different.

Create the base database and `user` table before starting the app:

```sql
CREATE DATABASE se_project;
USE se_project;

CREATE TABLE user (
    uid INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_pharmacist TINYINT(1) NOT NULL DEFAULT 0
);
```

### 6. Start the Flask app

Run the backend from the project root:

```bash
python Inventory_Sales_Management_System/app.py
```

The app runs on:

```text
http://127.0.0.1:5500
```

### 7. Open the app in your browser

Useful routes currently present in the repository:

- `http://127.0.0.1:5500/Sign_Up`
- `http://127.0.0.1:5500/Inventory_Management`
- `http://127.0.0.1:5500/Sales_Management`
- `http://127.0.0.1:5500/Sales_Analysis`
- `http://127.0.0.1:5500/Alternative_Medicine_Advisor`


## Demo Data

The repository includes sample CSV files that can be used as reference data for demos, testing, or manual database seeding:

- `user.csv`
- `inventory_1.csv`
- `sales_1.csv`
- `read_1.csv`
- `composition_1.csv`

There is also a helper script, `generate_dummy_data.py`, that generates sample CSV output for development use.

## VS Code Live Share Setup

If you want to collaborate with teammates in real time, Live Share is a simple way to work on the same codebase together.

### Recommended workflow

- One teammate runs MySQL and the Flask app locally.
- That teammate starts a Live Share session from VS Code.
- Port `5500` is shared so others can open the running app in their own browser.
- Teammates edit files, review code, and debug together in the same session.

### Setup steps

1. Install the `Live Share` extension in VS Code.
2. Open this repository in VS Code.
3. Start the app locally with `python Inventory_Sales_Management_System/app.py`.
4. Open the Command Palette and run `Live Share: Start Collaboration Session`.
5. Share the invite link with your teammates.
6. Run `Live Share: Share Server` and share port `5500`.
7. Teammates can join the session, open the shared app, and collaborate live.

### Live Share note

Because the backend connects to a local MySQL database, teammates who are not using the shared server will need their own local MySQL setup with the same schema. For demos, the easiest option is usually:

- one host runs the backend and database
- everyone else joins through Live Share and the shared web server

## Suggested Use Cases

- Kirana stores managing daily stock and billing
- Retail shops tracking incoming and outgoing inventory
- Pharmacies handling expiry-sensitive products
- Wholesalers reviewing monthly and yearly sales trends


