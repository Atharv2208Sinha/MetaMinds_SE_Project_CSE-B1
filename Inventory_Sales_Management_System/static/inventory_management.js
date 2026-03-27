//Main Page Listener
document.addEventListener('DOMContentLoaded', () => {
    const payload = setpage();

    //Switch Tabs
    const add = document.getElementById('tab-add');
    const check = document.getElementById('tab-check');

    if(add){ add.onclick = () => switchTab('add') }
    if(check){ check.onclick = () => switchTab('check') }

    //Toggle Composition
    if(payload.is_pharmacist === 1 || payload.is_pharmacist === true) {
        const entrymode = document.getElementById('entry-mode');
        if(entrymode){ entrymode.onclick = () => toggleComposition() }
    }

    const addform = document.getElementById('add-inventory-form');
    if (addform) {
        addform.addEventListener('submit', submitInventory);
    }

    const addComp = document.getElementById('add-comp');
    if(addComp){ addComp.onclick = () => addCompField() }

    const checkStatus = document.getElementById('check-status-form');
    if(checkStatus){ 
    checkStatus.addEventListener('submit', checkInventoryStatus); 
    }
});

function setpage() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('inventory-container');
    if (!token) {
        showMessage('Access Denied: Please login to access.', 'error', 1000);
        setTimeout(() => {
            window.location.href = 'Home';
        }, 1100);
        return;
    }
    const payload = parseJwt(token);
    if (container) {
        container.style.display = 'block';
    }

    const mode = document.getElementById('mode-selector');
    const formGrid = document.querySelector('.form-grid');

    if (payload.is_pharmacist === 1 || payload.is_pharmacist === true) {
        mode.style.display = 'flex'; 
        formGrid.classList.add('pharmacist-layout');
        toggleComposition();
    } else {
        mode.style.display = 'none';
        formGrid.classList.remove('pharmacist-layout');
    }

    return payload;
}

function switchTab(tabName) {
    // Reset active states
    const add = document.getElementById('tab-add');
    const check = document.getElementById('tab-check');
    const add_v = document.getElementById('add-view');
    const check_v = document.getElementById('check-view');

    add.classList.remove('active');
    check.classList.remove('active');
    add_v.style.display = 'none';
    check_v.style.display = 'none'


    // Set new active states
    if(tabName === 'add') {
        add.classList.add('active');
        add_v.style.display = 'block';

    } else if (tabName === 'check') {
        check.classList.add('active');
        check_v.style.display = 'block';
    }
}

function toggleComposition() {
    const mode = document.getElementById('entry-mode').value;
    const compSection = document.getElementById('composition-section');
    const compInputsDiv = document.getElementById('comp-inputs');
    
    const token = localStorage.getItem('token');
    if (token) {
        const payload = parseJwt(token);

        if (payload.is_pharmacist === 1 && mode === 'new') {
            compSection.style.display = 'block';
            if (compInputsDiv.children.length === 0) {
                addCompField(); // Add one default empty field
            }
        } else {
            compSection.style.display = 'none';
            compInputsDiv.innerHTML = ''; // Clear fields if closed
        }
    }
}

// 1. Write to Inventory & Composition
async function submitInventory(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) { 
        showMessage('Access Denied: Please login to access.', 'error', 2000); 
        return; 
    }

    const mode = document.getElementById('entry-mode').value;
    
    // Collect basic data - sending raw string values directly to Python
    const inv_data = {
        Iname: document.getElementById('Iname').value.trim(),
        Bid: document.getElementById('Bid').value.trim(),
        Quantity: document.getElementById('Quantity').value,
        Location: document.getElementById('Location').value.trim(),
        Purchase_Price: document.getElementById('Purchase_Price').value,
        Sale_Price: document.getElementById('Sale_Price').value,
        MRP: document.getElementById('MRP').value,
        Category: document.getElementById('Category').value.trim(),
        Exp_Date: document.getElementById('Exp_Date').value
    };

    if (parseInt(inv_data.Quantity, 10) <= 0) {
        showMessage('Quantity must be greater than zero.', 'error', 3000);
        return; 
    }

    const comp_data = {
        Iname: inv_data.Iname,
        compositions: []
    }

    try {
        const response = await fetch('/api/inventory/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(inv_data)
        });

        const result = await response.json();
        if (response.ok) {
            showMessage('Inventory saved successfully', 'success');
            document.getElementById('add-inventory-form').reset();
            toggleComposition(); 
        } else {
            const errorMsg = result.error?.message || result.error || 'Unknown error';
            showMessage(errorMsg, 'error');
        }

    } catch (error) {
        console.error('Submission failed', error);
        showMessage(error.message, 'error');
    }

    // Collect composition data if applicable
    const payload = parseJwt(token);
    if (payload && payload.is_pharmacist === 1 && mode === 'new') {
        const compInputs = document.querySelectorAll('.comp-input');
        compInputs.forEach(input => {
            if (input.value.trim() !== '') {
                comp_data.compositions.push(input.value.trim());
            }
        });

        if (comp_data.compositions.length > 0) {
            try {
                const comp_response = await fetch('/api/inventory/composition', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(comp_data)
                });

                const comp_result = await comp_response.json();
                if (comp_response.ok) {
                    showMessage('Composition saved successfully', 'success');
                } else {
                    const errorMsg = comp_result.error?.message || comp_result.error || 'Unknown error';
                    showMessage(errorMsg, 'error');
                    return;
                }
            }
            catch (error) {
                console.error('Submission failed', error);
                showMessage(error.message, 'error');
                return;
            }
        }
    }
}

function addCompField() {
    const div = document.createElement('div');
    div.className = 'comp-input-row';
    div.innerHTML = `
        <input type="text" class="comp-input" required>
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">x</button>
    `;
    document.getElementById('comp-inputs').appendChild(div);
}

//Check Status and Display Table
async function checkInventoryStatus(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const searchItem = document.getElementById('search_item').value;

    try {
        const response = await fetch(`/api/inventory/check?iname=${encodeURIComponent(searchItem)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        if (response.ok) {
            renderTable(result.data, result.is_pharmacist);
        } else {
            alert('Error: ' + result.error);
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Fetch failed', error);
        showMessage(error.message, 'error');
    }
}

function renderTable(data, isPharmacist) {
    const resultsBox = document.getElementById('status-results');
    const tHead = document.getElementById('results-head');
    const tBody = document.getElementById('results-body');
    
    resultsBox.style.display = 'block';
    tHead.innerHTML = '';
    tBody.innerHTML = '';

    if (data.length === 0) {
        // Increased colspan to 11 to cover the max possible columns
        tBody.innerHTML = '<tr><td colspan="11" style="text-align:center;">No records found.</td></tr>';
        return;
    }

    // Set Headers dynamically based on pharmacist role
    let headers = [
        'Item Name', 'Batch ID', 'Quantity', 'Purchase Price', 
        'Sale Price', 'MRP', 'Exp Date', 'Purchase Date', 
        'Category', 'Location'
    ];
    if (isPharmacist) headers.push('Composition');
    
    headers.forEach(text => {
        let th = document.createElement('th');
        th.textContent = text;
        tHead.appendChild(th);
    });

    // Populate Rows
    data.forEach(row => {
        let tr = document.createElement('tr');
        
        // Formatted to exactly match the header array order
        tr.innerHTML = `
            <td>${row.Iname || 'N/A'}</td>
            <td>${row.Bid || 'N/A'}</td>
            <td>${row.Quantity || 0}</td>
            <td>${row.Purchase_Price || 'N/A'}</td>
            <td>${row.Sale_Price || 'N/A'}</td>
            <td>${row.MRP || 'N/A'}</td>
            <td>${row.Exp_Date ? new Date(row.Exp_Date).toLocaleDateString() : 'N/A'}</td>
            <td>${row.Purchase_Date ? new Date(row.Purchase_Date).toLocaleDateString() : 'N/A'}</td>
            <td>${row.Category || 'N/A'}</td>
            <td>${row.Location || 'N/A'}</td>
        `;

        if (isPharmacist) {
            let compDisplay = row.components || 'N/A';
            tr.innerHTML += `<td>${compDisplay}</td>`;
        }
        
        tBody.appendChild(tr);
    });
}