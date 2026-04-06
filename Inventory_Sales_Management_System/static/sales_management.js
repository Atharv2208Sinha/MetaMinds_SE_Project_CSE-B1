// ========== Sales Management JS ==========

let billItems = [];
let selectedProduct = null;
let searchTimeout = null;
let currentFocus = -1;

// ---- Page Initialization ----
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const container = document.getElementById('sales-container');

    if (!token) {
        alert('Access Denied: Please login to access.');
        window.location.href = 'Home';
        return;
    }

    if (container) container.style.display = 'block';

    const nameInput = document.getElementById('product-name');   // ✅ matches HTML
    const qtyInput = document.getElementById('product-qty');    // FIXED: was 'sale-qty', HTML has 'product-qty'
    const priceInput = document.getElementById('product-price');  // FIXED: was 'sale-price', HTML has 'product-price'
    const addBtn = document.getElementById('add-item-btn');   // ✅ matches HTML
    const billBtn = document.getElementById('generate-bill-btn'); // ✅ matches HTML

    if (nameInput) {
        // Typing → debounced search
        nameInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const query = nameInput.value;
            searchTimeout = setTimeout(() => handleProductSearch(query), 300);
        });

        // Keyboard navigation: Arrow Up/Down, Enter, Tab
        nameInput.addEventListener('keydown', (e) => {
            const dropdown = document.getElementById('autocomplete-dropdown');
            if (!dropdown || dropdown.style.display !== 'block') return;

            const items = dropdown.querySelectorAll('.dropdown-item:not(.no-results)');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentFocus++;
                addActive(items);

            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentFocus--;
                addActive(items);

            } else if (e.key === 'Enter') {
                e.preventDefault();
                (currentFocus > -1 ? items[currentFocus] : items[0]).click();
                if (qtyInput) qtyInput.focus();

            } else if (e.key === 'Tab') {
                e.preventDefault();
                (currentFocus > -1 ? items[currentFocus] : items[0]).click();
                if (qtyInput) qtyInput.focus();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (
                e.target.id !== 'product-name' &&
                !e.target.closest('#autocomplete-dropdown')
            ) {
                closeDropdown();
            }
        });
    }

    // Enter on Qty / Price fields → add item to bill
    [qtyInput, priceInput].forEach(input => {
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addItemToBill();
                    if (nameInput) nameInput.focus();
                }
            });
        }
    });

    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addItemToBill();
        });
    }

    if (billBtn) billBtn.addEventListener('click', generateBill);
});

// ---- Keyboard Navigation Helpers ----
function addActive(items) {
    if (!items) return;
    removeActive(items);
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = items.length - 1;
    items[currentFocus].classList.add('autocomplete-active');
    items[currentFocus].scrollIntoView({ block: 'nearest' });
}

function removeActive(items) {
    for (let i = 0; i < items.length; i++) {
        items[i].classList.remove('autocomplete-active');
    }
}

// ---- Search & Dropdown Logic ----
async function handleProductSearch(query) {
    const dropdown = document.getElementById('autocomplete-dropdown');

    currentFocus = -1;
    if (!dropdown) return;

    if (query.length < 2) {
        closeDropdown();
        return;
    }

    try {
        const response = await fetch(`/api/sales/search?q=${encodeURIComponent(query)}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) throw new Error('Network response was not ok');

        const result = await response.json();
        // Handle both {data:[...]} and plain array responses
        const items = result.data
            ? result.data
            : (Array.isArray(result) ? result : []);

        dropdown.innerHTML = '';

        if (items.length > 0) {
            items.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'dropdown-item';
                div.textContent = `${item.Iname} (Batch: ${item.Bid}) - Stock: ${item.Quantity}`;

                // mousedown → prevents input blur so dropdown stays open long enough for click
                div.addEventListener('mousedown', (ev) => ev.preventDefault());
                // click → actual selection (fires once, for both mouse and keyboard .click())
                div.addEventListener('click', () => selectProduct(item));
                div.addEventListener('mouseenter', () => {
                    currentFocus = index;
                    addActive(dropdown.querySelectorAll('.dropdown-item:not(.no-results)'));
                });

                dropdown.appendChild(div);
            });
            dropdown.style.display = 'block';

        } else {
            dropdown.innerHTML =
                '<div class="dropdown-item no-results" ' +
                'style="color:red;pointer-events:none;">No items found</div>';
            dropdown.style.display = 'block';
        }

    } catch (err) {
        console.error('Search failed:', err);
    }
}

// ---- Product Selection ----
function selectProduct(item) {
    selectedProduct = item;

    const nameInput = document.getElementById('product-name');
    const priceInput = document.getElementById('product-price'); // FIXED ID
    const qtyInput = document.getElementById('product-qty');   // FIXED ID

    if (nameInput) nameInput.value = `${item.Iname} (Batch: ${item.Bid})`;
    if (priceInput) priceInput.value = item.Sale_Price;          // auto-fill price
    if (qtyInput) {
        qtyInput.value = 1;
        qtyInput.max = item.Quantity;
    }

    // Optional info labels
    const spLabel = document.getElementById('price-sp-label');
    const mrpLabel = document.getElementById('price-mrp-label');
    const stockLabel = document.getElementById('price-stock-label');
    const priceInfo = document.getElementById('price-info');

    if (spLabel) spLabel.textContent = `Sale Price: \u20b9${item.Sale_Price}`;
    if (mrpLabel) mrpLabel.textContent = `MRP: \u20b9${item.MRP || item.Sale_Price}`;
    if (stockLabel) stockLabel.textContent = `Stock: ${item.Quantity}`;
    if (priceInfo) priceInfo.style.display = 'flex'; // watermark uses flex

    closeDropdown();
}

function closeDropdown() {
    const dropdown = document.getElementById('autocomplete-dropdown');
    if (dropdown) dropdown.style.display = 'none';
    currentFocus = -1;
}

// ---- Bill Management ----
function addItemToBill() {
    if (!selectedProduct) {
        alert('Please select a product from the search dropdown first.');
        return;
    }

    const qtyInput = document.getElementById('product-qty');   // FIXED ID
    const priceInput = document.getElementById('product-price'); // FIXED ID

    if (!qtyInput || !priceInput) {
        alert('Setup error: qty/price inputs not found.');
        return;
    }

    const qty = parseInt(qtyInput.value, 10);
    const price = parseFloat(priceInput.value);

    if (isNaN(qty) || qty <= 0) {
        alert('Please enter a valid quantity greater than 0.');
        return;
    }
    if (isNaN(price) || price < 0) {
        alert('Please enter a valid price.');
        return;
    }

    // Stock check
    const alreadyAddedQty = billItems
        .filter(i => i.Bid === selectedProduct.Bid)
        .reduce((sum, i) => sum + i.quantity, 0);
    const maxStock = parseInt(selectedProduct.Quantity, 10);

    if ((qty + alreadyAddedQty) > maxStock) {
        alert(`Insufficient stock! Available: ${maxStock}. Already in bill: ${alreadyAddedQty}.`);
        return;
    }

    billItems.push({
        Iname: selectedProduct.Iname,
        Bid: selectedProduct.Bid,
        quantity: qty,
        selling_price: price,
        mrp: selectedProduct.MRP || price
    });

    renderBillTable();
    resetEntryForm();
}

function removeItemFromBill(index) {
    billItems.splice(index, 1);
    renderBillTable();
}

function renderBillTable() {
    const tbody = document.getElementById('bill-body');
    const billBtn = document.getElementById('generate-bill-btn');
    const totalEl = document.getElementById('grand-total');
    // FIXED: bill-items-section is hidden in HTML — show/hide it here
    const section = document.getElementById('bill-items-section');

    if (!tbody) {
        console.error('[Sales] element id="bill-body" not found in HTML.');
        return;
    }

    tbody.innerHTML = '';

    if (billItems.length === 0) {
        if (section) section.style.display = 'none';
        if (billBtn) billBtn.disabled = true;
        if (totalEl) totalEl.textContent = '\u20b90.00';
        return;
    }

    // Show the table section now that there are items
    if (section) section.style.display = 'block';
    if (billBtn) billBtn.disabled = false;

    let grandTotal = 0;
    billItems.forEach((item, index) => {
        const lineTotal = item.selling_price * item.quantity;
        grandTotal += lineTotal;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.Iname}</td>
            <td>${item.Bid}</td>
            <td>${item.quantity}</td>
            <td>\u20b9${parseFloat(item.selling_price).toFixed(2)}</td>
            <td>\u20b9${lineTotal.toFixed(2)}</td>
            <td>
                <button class="btn-remove-item"
                        onclick="removeItemFromBill(${index})">&#x2715;</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (totalEl) totalEl.textContent = `\u20b9${grandTotal.toFixed(2)}`;
}

function resetEntryForm() {
    const nameInput = document.getElementById('product-name');
    const qtyInput = document.getElementById('product-qty');   // FIXED ID
    const priceInput = document.getElementById('product-price'); // FIXED ID

    if (nameInput) nameInput.value = '';
    if (qtyInput) qtyInput.value = '1';
    if (priceInput) priceInput.value = '';

    selectedProduct = null;
    currentFocus = -1;

    const spLabel = document.getElementById('price-sp-label');
    const mrpLabel = document.getElementById('price-mrp-label');
    const stockLabel = document.getElementById('price-stock-label');
    const priceInfo = document.getElementById('price-info');

    if (spLabel) spLabel.textContent = 'Sale Price: \u2014';
    if (mrpLabel) mrpLabel.textContent = 'MRP: \u2014';
    if (stockLabel) stockLabel.textContent = 'Stock: \u2014';
    if (priceInfo) priceInfo.style.display = 'none';
}

// ---- Generate Bill API Call ----
async function generateBill() {
    if (billItems.length === 0) {
        alert('No items in the bill.');
        return;
    }

    const billBtn = document.getElementById('generate-bill-btn');
    if (billBtn) {
        billBtn.disabled = true;
        billBtn.textContent = 'Processing...';
    }

    try {
        const response = await fetch('/api/sales/generate-bill', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                items: billItems.map(item => ({
                    Bid: item.Bid,
                    quantity: item.quantity,
                    selling_price: item.selling_price
                }))
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Bill generated successfully!');
            billItems = [];
            renderBillTable();
            resetEntryForm();
        } else {
            alert(result.error || 'Failed to generate bill.');
        }

    } catch (error) {
        console.error('Bill generation error:', error);
        alert('Network error. Please try again.');

    } finally {
        if (billBtn) {
            billBtn.disabled = billItems.length === 0;
            billBtn.textContent = 'Generate Bill';
        }
    }
}