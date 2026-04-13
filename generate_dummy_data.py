#!/usr/bin/env python3
"""Generate deterministic CSV seed data that matches the tables in app.py."""

from __future__ import annotations

import argparse
import csv
from pathlib import Path


TABLE_COLUMNS = {
    "user": ["uid", "name", "email", "password", "is_pharmacist"],
    "inventory": [
        "Iname",
        "Bid",
        "Quantity",
        "Purchase_Price",
        "Sale_Price",
        "MRP",
        "Exp_Date",
        "Purchase_Date",
        "Location",
        "Category",
    ],
    "sales": ["Bid", "Month", "Year", "Sold", "Quantity", "Expenditure", "Income"],
    "read": ["Iname_Bid", "type", "last_read"],
    "composition": ["Iname", "component"],
}

SALES_PERIODS = [
    (10, 2025),
    (11, 2025),
    (12, 2025),
    (1, 2026),
    (2, 2026),
    (3, 2026),
]

SOLD_PATTERNS = [
    [6, 8, 7, 9, 10, 8],
    [4, 5, 6, 5, 7, 6],
    [3, 4, 5, 4, 5, 4],
    [8, 8, 9, 10, 9, 11],
]

DISCARD_PATTERNS = [
    [0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0],
    [0, 0, 1, 0, 0, 1],
    [0, 1, 0, 0, 1, 0],
]

USERS = [
    {
        "uid": 1,
        "name": "Rahul Kumar",
        "email": "rahul@gmail.com",
        "password": "$2b$12$n5L/UmnNXij2ZQNAxqedUey7WGnvFwqJRGBhzFB1rRNKdK1BpoNjW",
        "is_pharmacist": 1,
    },
    {
        "uid": 2,
        "name": "Amit Sharma",
        "email": "amit@gmail.com",
        "password": "$2b$12$rHF9I7O4bFnwlQBvNe/KZurdDplWN.llEFRN9JEhzph9WSnERN5aW",
        "is_pharmacist": 0,
    },
]

USER_TABLE_DATA = {
    1: {
        "inventory": [
            {
                "Iname": "Dolo 650",
                "Bid": "PHA001",
                "Quantity": 35,
                "Purchase_Price": 22,
                "Sale_Price": 28,
                "MRP": 30,
                "Exp_Date": "2027-02-15",
                "Purchase_Date": "2026-02-01",
                "Location": "Rack A1",
                "Category": "Analgesic",
            },
            {
                "Iname": "Dolo 650",
                "Bid": "PHA011",
                "Quantity": 20,
                "Purchase_Price": 23,
                "Sale_Price": 29,
                "MRP": 30,
                "Exp_Date": "2027-03-10",
                "Purchase_Date": "2026-03-01",
                "Location": "Rack A1",
                "Category": "Analgesic",
            },
            {
                "Iname": "Calpol 650",
                "Bid": "PHA002",
                "Quantity": 42,
                "Purchase_Price": 20,
                "Sale_Price": 27,
                "MRP": 30,
                "Exp_Date": "2026-04-18",
                "Purchase_Date": "2025-01-15",
                "Location": "Rack A2",
                "Category": "Analgesic",
            },
            {
                "Iname": "Cetzine 10",
                "Bid": "PHA003",
                "Quantity": 48,
                "Purchase_Price": 12,
                "Sale_Price": 18,
                "MRP": 20,
                "Exp_Date": "2026-09-10",
                "Purchase_Date": "2025-02-10",
                "Location": "Rack B1",
                "Category": "Antihistamine",
            },
            {
                "Iname": "Allerfast 10",
                "Bid": "PHA004",
                "Quantity": 70,
                "Purchase_Price": 11,
                "Sale_Price": 17,
                "MRP": 19,
                "Exp_Date": "2027-01-30",
                "Purchase_Date": "2025-12-22",
                "Location": "Rack B2",
                "Category": "Antihistamine",
            },
            {
                "Iname": "Azithral 500",
                "Bid": "PHA005",
                "Quantity": 25,
                "Purchase_Price": 68,
                "Sale_Price": 86,
                "MRP": 92,
                "Exp_Date": "2026-08-25",
                "Purchase_Date": "2025-11-05",
                "Location": "Rack C1",
                "Category": "Antibiotic",
            },
            {
                "Iname": "Azee 500",
                "Bid": "PHA006",
                "Quantity": 38,
                "Purchase_Price": 66,
                "Sale_Price": 84,
                "MRP": 90,
                "Exp_Date": "2026-08-28",
                "Purchase_Date": "2025-10-25",
                "Location": "Rack C2",
                "Category": "Antibiotic",
            },
            {
                "Iname": "ColdRelief Plus",
                "Bid": "PHA007",
                "Quantity": 32,
                "Purchase_Price": 40,
                "Sale_Price": 55,
                "MRP": 60,
                "Exp_Date": "2026-04-20",
                "Purchase_Date": "2025-03-01",
                "Location": "Rack D1",
                "Category": "Cold and Flu",
            },
            {
                "Iname": "FluGuard Plus",
                "Bid": "PHA008",
                "Quantity": 28,
                "Purchase_Price": 42,
                "Sale_Price": 57,
                "MRP": 62,
                "Exp_Date": "2026-05-01",
                "Purchase_Date": "2025-04-10",
                "Location": "Rack D2",
                "Category": "Cold and Flu",
            },
            {
                "Iname": "ORS Restore",
                "Bid": "PHA009",
                "Quantity": 90,
                "Purchase_Price": 14,
                "Sale_Price": 20,
                "MRP": 22,
                "Exp_Date": "2026-12-31",
                "Purchase_Date": "2026-03-05",
                "Location": "Rack E1",
                "Category": "Electrolyte",
            },
            {
                "Iname": "Zincovit",
                "Bid": "PHA010",
                "Quantity": 18,
                "Purchase_Price": 30,
                "Sale_Price": 42,
                "MRP": 45,
                "Exp_Date": "2026-06-15",
                "Purchase_Date": "2024-12-15",
                "Location": "Rack E2",
                "Category": "Supplement",
            },
        ],
        "read": [
            {"Iname_Bid": "Calpol 650", "type": "L", "last_read": "2026-04-13"},
            {"Iname_Bid": "PHA007", "type": "S", "last_read": "2026-04-01"},
            {"Iname_Bid": "PHA002", "type": "E", "last_read": "2026-04-13"},
        ],
        "composition": [
            {"Iname": "Dolo 650", "component": "Paracetamol"},
            {"Iname": "Calpol 650", "component": "Paracetamol"},
            {"Iname": "Cetzine 10", "component": "Cetirizine Hydrochloride"},
            {"Iname": "Allerfast 10", "component": "Cetirizine Hydrochloride"},
            {"Iname": "Azithral 500", "component": "Azithromycin Dihydrate"},
            {"Iname": "Azee 500", "component": "Azithromycin Dihydrate"},
            {"Iname": "ColdRelief Plus", "component": "Paracetamol"},
            {"Iname": "ColdRelief Plus", "component": "Phenylephrine HCl"},
            {"Iname": "ColdRelief Plus", "component": "Chlorpheniramine Maleate"},
            {"Iname": "FluGuard Plus", "component": "Paracetamol"},
            {"Iname": "FluGuard Plus", "component": "Phenylephrine HCl"},
            {"Iname": "FluGuard Plus", "component": "Chlorpheniramine Maleate"},
            {"Iname": "ORS Restore", "component": "Sodium Chloride"},
            {"Iname": "ORS Restore", "component": "Potassium Chloride"},
            {"Iname": "ORS Restore", "component": "Dextrose Anhydrous"},
            {"Iname": "ORS Restore", "component": "Sodium Citrate"},
            {"Iname": "Zincovit", "component": "Zinc Sulphate"},
            {"Iname": "Zincovit", "component": "Vitamin C"},
        ],
    },
    2: {
        "inventory": [
            {
                "Iname": "Basmati Rice 5kg",
                "Bid": "RET001",
                "Quantity": 24,
                "Purchase_Price": 420,
                "Sale_Price": 515,
                "MRP": 550,
                "Exp_Date": "2027-09-30",
                "Purchase_Date": "2026-02-10",
                "Location": "Shelf R1",
                "Category": "Grains",
            },
            {
                "Iname": "Toor Dal 1kg",
                "Bid": "RET002",
                "Quantity": 9,
                "Purchase_Price": 92,
                "Sale_Price": 118,
                "MRP": 125,
                "Exp_Date": "2026-11-15",
                "Purchase_Date": "2025-08-20",
                "Location": "Shelf R2",
                "Category": "Pulses",
            },
            {
                "Iname": "Sunflower Oil 1L",
                "Bid": "RET003",
                "Quantity": 16,
                "Purchase_Price": 118,
                "Sale_Price": 145,
                "MRP": 150,
                "Exp_Date": "2026-10-12",
                "Purchase_Date": "2026-01-15",
                "Location": "Shelf R3",
                "Category": "Oils",
            },
            {
                "Iname": "Masala Tea 500g",
                "Bid": "RET004",
                "Quantity": 7,
                "Purchase_Price": 155,
                "Sale_Price": 190,
                "MRP": 200,
                "Exp_Date": "2026-04-17",
                "Purchase_Date": "2025-06-01",
                "Location": "Shelf R4",
                "Category": "Beverages",
            },
            {
                "Iname": "Wheat Flour 10kg",
                "Bid": "RET005",
                "Quantity": 13,
                "Purchase_Price": 310,
                "Sale_Price": 365,
                "MRP": 380,
                "Exp_Date": "2027-01-20",
                "Purchase_Date": "2025-09-12",
                "Location": "Shelf R5",
                "Category": "Grains",
            },
            {
                "Iname": "Sugar 1kg",
                "Bid": "RET006",
                "Quantity": 28,
                "Purchase_Price": 39,
                "Sale_Price": 48,
                "MRP": 50,
                "Exp_Date": "2027-03-15",
                "Purchase_Date": "2026-03-01",
                "Location": "Shelf R6",
                "Category": "Staples",
            },
        ],
        "read": [
            {"Iname_Bid": "Masala Tea 500g", "type": "L", "last_read": "2026-04-13"},
            {"Iname_Bid": "RET002", "type": "S", "last_read": "2026-03-20"},
            {"Iname_Bid": "RET004", "type": "E", "last_read": "2026-04-13"},
        ],
        "composition": [],
    },
}


def build_sales_rows(inventory_rows: list[dict[str, object]]) -> list[dict[str, object]]:
    sales_rows: list[dict[str, object]] = []

    for index, item in enumerate(inventory_rows):
        sold_pattern = SOLD_PATTERNS[index % len(SOLD_PATTERNS)]
        discard_pattern = DISCARD_PATTERNS[index % len(DISCARD_PATTERNS)]

        for (month, year), sold_qty, discarded_qty in zip(
            SALES_PERIODS, sold_pattern, discard_pattern
        ):
            sales_rows.append(
                {
                    "Bid": item["Bid"],
                    "Month": month,
                    "Year": year,
                    "Sold": 1,
                    "Quantity": sold_qty,
                    "Expenditure": item["Purchase_Price"] * sold_qty,
                    "Income": item["Sale_Price"] * sold_qty,
                }
            )

            if discarded_qty:
                sales_rows.append(
                    {
                        "Bid": item["Bid"],
                        "Month": month,
                        "Year": year,
                        "Sold": 0,
                        "Quantity": discarded_qty,
                        "Expenditure": item["Purchase_Price"] * discarded_qty,
                        "Income": 0,
                    }
                )

    return sales_rows


def validate_columns(
    rows: list[dict[str, object]], table_name: str, expected_columns: list[str]
) -> None:
    for row in rows:
        if list(row.keys()) != expected_columns:
            raise ValueError(
                f"{table_name} row columns do not match app.py schema: {list(row.keys())}"
            )


def validate_users(users: list[dict[str, object]]) -> None:
    validate_columns(users, "user", TABLE_COLUMNS["user"])

    seen_uids: set[int] = set()
    seen_emails: set[str] = set()

    for row in users:
        uid = row["uid"]
        email = row["email"]

        if uid in seen_uids:
            raise ValueError(f"Duplicate uid in user table: {uid}")
        if email in seen_emails:
            raise ValueError(f"Duplicate email in user table: {email}")
        if row["is_pharmacist"] not in (0, 1):
            raise ValueError(f"Invalid is_pharmacist value: {row['is_pharmacist']}")

        seen_uids.add(uid)
        seen_emails.add(email)


def validate_inventory(rows: list[dict[str, object]], uid: int) -> None:
    validate_columns(rows, f"inventory_{uid}", TABLE_COLUMNS["inventory"])

    seen_bids: set[str] = set()

    for row in rows:
        bid = row["Bid"]
        if bid in seen_bids:
            raise ValueError(f"Duplicate Bid found in inventory_{uid}: {bid}")
        seen_bids.add(bid)


def validate_sales(
    inventory_rows: list[dict[str, object]], sales_rows: list[dict[str, object]], uid: int
) -> None:
    validate_columns(sales_rows, f"sales_{uid}", TABLE_COLUMNS["sales"])

    valid_bids = {row["Bid"] for row in inventory_rows}
    seen_keys: set[tuple[str, int, int, int]] = set()

    for row in sales_rows:
        if row["Bid"] not in valid_bids:
            raise ValueError(f"sales_{uid} has unknown Bid: {row['Bid']}")
        if not 1 <= row["Month"] <= 12:
            raise ValueError(f"sales_{uid} has invalid month: {row['Month']}")
        if row["Sold"] not in (0, 1):
            raise ValueError(f"sales_{uid} has invalid Sold flag: {row['Sold']}")

        key = (row["Bid"], row["Month"], row["Year"], row["Sold"])
        if key in seen_keys:
            raise ValueError(f"Duplicate primary key in sales_{uid}: {key}")
        seen_keys.add(key)


def validate_read(
    inventory_rows: list[dict[str, object]], read_rows: list[dict[str, object]], uid: int
) -> None:
    validate_columns(read_rows, f"read_{uid}", TABLE_COLUMNS["read"])

    valid_inames = {row["Iname"] for row in inventory_rows}
    valid_bids = {row["Bid"] for row in inventory_rows}
    seen_keys: set[tuple[str, str]] = set()

    for row in read_rows:
        read_type = row["type"]
        key = (row["Iname_Bid"], read_type)

        if read_type not in {"L", "S", "E"}:
            raise ValueError(f"read_{uid} has invalid type: {read_type}")
        if key in seen_keys:
            raise ValueError(f"Duplicate primary key in read_{uid}: {key}")

        if read_type == "L" and row["Iname_Bid"] not in valid_inames:
            raise ValueError(f"read_{uid} low-alert entry must use an Iname: {row}")
        if read_type in {"S", "E"} and row["Iname_Bid"] not in valid_bids:
            raise ValueError(f"read_{uid} stale/expiry entry must use a Bid: {row}")

        seen_keys.add(key)


def validate_composition(
    inventory_rows: list[dict[str, object]],
    composition_rows: list[dict[str, object]],
    uid: int,
) -> None:
    if not composition_rows:
        return

    validate_columns(composition_rows, f"composition_{uid}", TABLE_COLUMNS["composition"])

    valid_inames = {row["Iname"] for row in inventory_rows}
    seen_keys: set[tuple[str, str]] = set()

    for row in composition_rows:
        key = (row["Iname"], row["component"])
        if row["Iname"] not in valid_inames:
            raise ValueError(f"composition_{uid} has unknown Iname: {row['Iname']}")
        if key in seen_keys:
            raise ValueError(f"Duplicate primary key in composition_{uid}: {key}")
        seen_keys.add(key)


def write_csv(path: Path, columns: list[str], rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)


def resolve_output_dir(output_dir: str) -> Path:
    candidate = Path(output_dir)
    if candidate.is_absolute():
        return candidate
    return Path(__file__).resolve().parent / candidate


def generate_files(output_dir: Path) -> list[Path]:
    validate_users(USERS)

    written_files: list[Path] = []

    user_path = output_dir / "user.csv"
    write_csv(user_path, TABLE_COLUMNS["user"], USERS)
    written_files.append(user_path)

    for uid, table_data in USER_TABLE_DATA.items():
        inventory_rows = table_data["inventory"]
        sales_rows = build_sales_rows(inventory_rows)
        read_rows = table_data["read"]
        composition_rows = table_data["composition"]

        validate_inventory(inventory_rows, uid)
        validate_sales(inventory_rows, sales_rows, uid)
        validate_read(inventory_rows, read_rows, uid)
        validate_composition(inventory_rows, composition_rows, uid)

        inventory_path = output_dir / f"inventory_{uid}.csv"
        sales_path = output_dir / f"sales_{uid}.csv"
        read_path = output_dir / f"read_{uid}.csv"

        write_csv(inventory_path, TABLE_COLUMNS["inventory"], inventory_rows)
        write_csv(sales_path, TABLE_COLUMNS["sales"], sales_rows)
        write_csv(read_path, TABLE_COLUMNS["read"], read_rows)

        written_files.extend([inventory_path, sales_path, read_path])

        if composition_rows:
            composition_path = output_dir / f"composition_{uid}.csv"
            write_csv(composition_path, TABLE_COLUMNS["composition"], composition_rows)
            written_files.append(composition_path)

    return written_files


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate CSV dummy data aligned with Inventory_Sales_Management_System/app.py"
    )
    parser.add_argument(
        "--output-dir",
        default="dummy_data",
        help="Directory to write CSV files into. Relative paths are resolved from the repo root.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = resolve_output_dir(args.output_dir)
    written_files = generate_files(output_dir)

    print(f"Created {len(written_files)} CSV files in {output_dir}:")
    for file_path in written_files:
        print(f"- {file_path.name}")

    print("\nDemo credentials:")
    print("- rahul@gmail.com / pharma123")
    print("- amit@gmail.com / store123")


if __name__ == "__main__":
    main()
