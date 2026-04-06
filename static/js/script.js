// STATE VARIABLES & GLOBAL REFERENCES
let compositions  = [];
let acIndex       = -1;
let compAcIndex   = -1; // Added for composition autocomplete
let tagInput, tagBox, nameInput, acDrop, compDrop;

// MAIN PAGE EVENT LISTENERS
document.addEventListener('DOMContentLoaded', () => {
    setpage();

    // Assign DOM References
    tagInput  = document.getElementById('tagInput');
    tagBox    = document.getElementById('tagBox');
    nameInput = document.getElementById('ama-name');
    acDrop    = document.getElementById('acDrop');
    compDrop  = document.getElementById('compDrop'); // Added reference

    // Initialize the default UI state
    renderEmpty();
    populateCategories(); // Fetch categories on load

    // --- Composition Tag & Autocomplete Listeners ---
    tagInput.addEventListener('input', () => {
        const q = tagInput.value.trim();
        // Handle comma typed manually
        if (q.endsWith(',')) {
            addTag(q.slice(0, -1));
            compDrop.classList.remove('open');
            return;
        }
        if (q.length < 2) { 
            compDrop.classList.remove('open'); 
            return; 
        }
        AutoComp(q);
    });

    tagInput.addEventListener('keydown', e => {
        const items = compDrop.querySelectorAll('.ac-item');
        if (e.key === 'ArrowDown') { 
            e.preventDefault();
            compAcIndex = Math.min(compAcIndex + 1, items.length - 1); 
            markAc(items, compAcIndex); 
        }
        else if (e.key === 'ArrowUp') { 
            e.preventDefault();
            compAcIndex = Math.max(compAcIndex - 1, 0);                
            markAc(items, compAcIndex); 
        }
        else if (e.key === 'Enter') { 
            e.preventDefault();
            if (compAcIndex >= 0 && compDrop.classList.contains('open')) {
                items[compAcIndex].dispatchEvent(new MouseEvent('mousedown'));
            } else if (tagInput.value.trim()) {
                addTag(tagInput.value);
                compDrop.classList.remove('open');
            }
        }
        else if (e.key === ',') {
            e.preventDefault();
            if (tagInput.value.trim()) {
                addTag(tagInput.value);
                compDrop.classList.remove('open');
            }
        }
        else if (e.key === 'Escape') { 
            compDrop.classList.remove('open'); 
        }
        else if (e.key === 'Backspace' && !tagInput.value && compositions.length) {
            removeTag(compositions[compositions.length - 1]);
        }
    });

    tagInput.addEventListener('blur', () => {
        setTimeout(() => {
            compDrop.classList.remove('open');
            if (tagInput.value.trim() && !tagInput.value.includes(',')) {
                addTag(tagInput.value);
            }
        }, 160);
    });

    // --- Autocomplete (Name Field) Listeners ---
    nameInput.addEventListener('input', () => {
        const q = nameInput.value.trim();
        if (q.length < 2) { 
            acDrop.classList.remove('open'); 
            return; 
        }
        AutoIname(q);
    });

    nameInput.addEventListener('keydown', e => {
        const items = acDrop.querySelectorAll('.ac-item');
        if      (e.key === 'ArrowDown')             { e.preventDefault(); acIndex = Math.min(acIndex + 1, items.length - 1); markAc(items, acIndex); }
        else if (e.key === 'ArrowUp')               { e.preventDefault(); acIndex = Math.max(acIndex - 1, 0);                markAc(items, acIndex); }
        else if (e.key === 'Enter' && acIndex >= 0) { e.preventDefault(); items[acIndex].dispatchEvent(new MouseEvent('mousedown')); }
        else if (e.key === 'Escape')                { acDrop.classList.remove('open'); }
    });

    nameInput.addEventListener('blur', () => setTimeout(() => acDrop.classList.remove('open'), 160));

    // --- Search & Filter Controls ---
    document.getElementById('searchBtn').addEventListener('click', () => doSearch());

    document.getElementById('clearBtn').addEventListener('click', () => {
        nameInput.value = '';
        document.getElementById('ama-category').value = 'all';
        compositions = [];
        tagBox.querySelectorAll('.comp-tag').forEach(t => t.remove());
        tagInput.value = '';
        acDrop.classList.remove('open');
        compDrop.classList.remove('open');
        document.getElementById('statusBar').style.display = 'none';
        renderEmpty();
    });
});

function setpage() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('alt-container');
    if (!token) {
        showMessage('Access Denied: Please login to access.', 'error', 1000);
        setTimeout(() => {
            window.location.href = 'Home';
        }, 1100);
        return;
    }
    const payload = parseJwt(token);

    if (payload.is_pharmacist !== 1) {
        showMessage('Access Denied: You must be logged in as a Pharmacist to use this feature.', 'error', 1000);
        setTimeout(() => {
            window.location.href = 'Main';
        }, 1100);
        return;
    }
    
    if (container && payload.is_pharmacist === 1) {
        container.style.display = 'block';
    }
}

// FETCH CATEGORIES

async function populateCategories() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch('/api/auto/category?category=', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;

        const json = await res.json();
        const categories = json.data || [];
        const catSelect = document.getElementById('ama-category');

        categories.forEach(c => {
            if (c.Category) {
                const opt = document.createElement('option');
                opt.value = c.Category;
                opt.textContent = c.Category;
                catSelect.appendChild(opt);
            }
        });
    } catch (err) {
        console.error("Failed to fetch categories", err);
    }
}

// COMPOSITION TAG FUNCTIONS

function addTag(rawVal) {
    const v = rawVal.trim().replace(/,+$/, '').trim();
    if (!v) return;
    
    if (compositions.map(c => c.toLowerCase()).includes(v.toLowerCase())) {
        tagInput.value = '';
        return;
    }
    compositions.push(v);

    const tag = document.createElement('span');
    tag.className  = 'comp-tag';
    tag.dataset.val = v;
    tag.innerHTML  = `${escapeHtml(v)} <button class="tag-remove" title="Remove">×</button>`;
    
    tag.querySelector('.tag-remove').addEventListener('click', () => removeTag(v));
    
    // Insert before the ac-wrap div
    tagBox.insertBefore(tag, document.querySelector('#tagBox .ac-wrap'));
    tagInput.value = '';
}

function removeTag(val) {
    compositions = compositions.filter(c => c !== val);
    const el = tagBox.querySelector(`[data-val="${CSS.escape(val)}"]`);
    if (el) el.remove();
}

// AUTOCOMPLETE FUNCTIONS

function markAc(items, activeIndex) {
    items.forEach((it, i) => it.classList.toggle('active', i === activeIndex));
}

async function AutoIname(q) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`/api/auto/iname?iname=${encodeURIComponent(q)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;

        const json  = await res.json();
        const items = json.data || [];
        
        if (!items.length) { 
            acDrop.classList.remove('open'); 
            return; 
        }

        acDrop.innerHTML = items.slice(0, 6).map(it => `
            <div class="ac-item" data-name="${escapeHtml(it.Iname)}">
                <div>
                    <div>${highlight(it.Iname, q)}</div>
                </div>
            </div>
        `).join('');

        acDrop.querySelectorAll('.ac-item').forEach(el => {
            el.addEventListener('mousedown', e => {
                e.preventDefault();
                nameInput.value = el.dataset.name;
                acDrop.classList.remove('open');
                acIndex = -1;
            });
        });

        acDrop.classList.add('open');
        acIndex = -1;

    } catch (_) {}
}

async function AutoComp(q) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`/api/auto/comp?comp=${encodeURIComponent(q)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;

        const json  = await res.json();
        const items = json.data || [];
        
        if (!items.length) { 
            compDrop.classList.remove('open'); 
            return; 
        }

        compDrop.innerHTML = items.slice(0, 6).map(it => `
            <div class="ac-item" data-comp="${escapeHtml(it.component)}">
                <div>
                    <div>${highlight(it.component, q)}</div>
                </div>
            </div>
        `).join('');

        compDrop.querySelectorAll('.ac-item').forEach(el => {
            el.addEventListener('mousedown', e => {
                e.preventDefault();
                addTag(el.dataset.comp);
                compDrop.classList.remove('open');
                compAcIndex = -1;
            });
        });

        compDrop.classList.add('open');
        compAcIndex = -1;

    } catch (_) {}
}

function highlight(text, q) {
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escapeHtml(text).replace(re, '<mark>$1</mark>');
}

// SEARCH LOGIC FUNCTIONS

async function doSearch() {
    const name     = nameInput.value.trim();
    const category = document.getElementById('ama-category').value;
    const comps    = [...compositions];
    let searchby   = 'name'; // Changed from const to let

    if (name && comps.length > 0) {
        document.getElementById('statusBar').style.display = 'none';
        showMessage('Please search by either Medicine Name OR Composition(s), not both.', 'error');
        return;
    }

    if (!name && !comps.length && category === 'all') {
        document.getElementById('statusBar').style.display = 'none';
        renderEmpty();
        return;
    }

    setSearching(true);

    if(comps.length > 0) searchby = 'comp';
    if(!name && !comps.length && category !== 'all') searchby = 'cate';

    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('You must be logged in as a Pharmacist to use this feature.', 'error');
        setSearching(false);
        return;
    }

    try {
        const response = await fetch('/search_alternatives', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ searchby, name, category, compositions: comps })
        });

        if (response.status === 401 || response.status === 403) {
            showMessage('Unauthorized! Please log in as a Pharmacist.', 'error');
            setSearching(false);
            return;
        }

        const results = await response.json();
        setSearching(false);

        if (!results || results.error || results.length === 0) {
            setStatus(0, name || comps.join(', '));
            renderNoResults(name || comps.join(', '));
            if(results.error) showMessage(results.error, 'error');
            return;
        }

        setStatus(results.length, name || comps.join(', '));
        renderTable(results);

    } catch (err) {
        setSearching(false);
        console.error(err);
        showMessage(err.message, 'error');
    }
}

// UI RENDER FUNCTIONS

function setSearching(on) {
    document.getElementById('statusBar').style.display = 'flex';
    document.getElementById('spinner').classList.toggle('show', on);
    if (on) {
        document.getElementById('statusCount').textContent = 'Searching…';
        document.getElementById('statusSub').textContent   = '';
    }
}

function setStatus(count, query) {
    document.getElementById('spinner').classList.remove('show');
    document.getElementById('statusCount').textContent =
        count === 0
            ? 'No alternatives found'
            : `${count} alternative${count > 1 ? 's' : ''} found`;
    document.getElementById('statusSub').textContent =
        count > 0 ? `for "${query}" — sorted by stock availability` : '';
}

function renderTable(data) {
    document.getElementById('resultsArea').innerHTML = '';

    const resultsBox = document.getElementById('status-results');
    const tHead = document.getElementById('results-head');
    const tBody = document.getElementById('results-body');
    
    resultsBox.style.display = 'block';
    tHead.innerHTML = '';
    tBody.innerHTML = '';

    if (data.length === 0) {
        tBody.innerHTML = '<tr><td colspan="11" style="text-align:center;">No records found.</td></tr>';
        return;
    }

    let headers = [
        'Item Name', 'Batch ID', 'Quantity', 'Purchase Price', 
        'Sale Price', 'MRP', 'Exp Date', 'Purchase Date', 
        'Category', 'Location', 'Composition'
    ];
    
    headers.forEach(text => {
        let th = document.createElement('th');
        th.textContent = text;
        tHead.appendChild(th);
    });

    data.forEach(row => {
        let tr = document.createElement('tr');
        
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
            <td>${row.components || 'N/A'}</td>
        `;
        
        tBody.appendChild(tr);
    });
}

function renderEmpty() {
    const resultsBox = document.getElementById('status-results');
    const tHead = document.getElementById('results-head');
    const tBody = document.getElementById('results-body');
    
    resultsBox.style.display = 'none';
    tHead.innerHTML = '';
    tBody.innerHTML = '';

    document.getElementById('resultsArea').innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">💊</div>
            <h3>Find Alternative Medicines</h3>
            <p>Enter a medicine name or active composition to discover in-stock alternatives from your inventory.</p>
        </div>`;
}

function renderNoResults(query) {
    const resultsBox = document.getElementById('status-results');
    const tHead = document.getElementById('results-head');
    const tBody = document.getElementById('results-body');
    
    resultsBox.style.display = 'none';
    tHead.innerHTML = '';
    tBody.innerHTML = '';

    document.getElementById('resultsArea').innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>No Alternatives Found</h3>
            <p>No in-stock alternatives found for <strong>"${escapeHtml(query)}"</strong>. Try a different name or composition.</p>
        </div>`;
}

// UTILITY FUNCTIONS
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;');
}
