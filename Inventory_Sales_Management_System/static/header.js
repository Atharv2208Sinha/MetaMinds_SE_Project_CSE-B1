// --- 1. Login/Profile Logic ---
// This helper function parses the JWT payload. You need this.
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null; // Invalid token
    }
}

// This function runs on every page load to set the header state
function checkLoginState() {
    const nonUser = document.getElementById('non-user');
    const user = document.getElementById('user');
    const altMed = document.getElementById('alt-med');
    const token = localStorage.getItem('token');

    if (token) {
        // --- USER IS LOGGED IN ---
        const payload = parseJwt(token);

        // 1. Change the header type
        nonUser.style.display = 'none';
        user.style.display = 'block';
        
        // 2. Activate the Alternative Medicine Advisor Module based on the 'is_pharmacist' flag
        if (payload.is_pharmacist === 1 || payload.is_pharmacist === true) {
            altMed.style.display = 'block';
        } else{
            altMed.style.display = 'none';
        }

    } else {
        nonUser.style.display = 'block';
        user.style.display = 'none';
    }
}

// Hamburger Menu Logic
const hamburgerBtn = document.getElementById('hamburger-btn');
const mobileNav = document.getElementById('mobile-nav');

hamburgerBtn.addEventListener('click', () => {
    // Toggle the 'open' class on both the hamburger and the mobile menu
    hamburgerBtn.classList.toggle('open');
    mobileNav.classList.toggle('open');
});

// --- Main Event Listener ---
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    //Check login state to set the header
    checkLoginState();

    checkNotifications();

    const authButton = document.getElementById('user-action-btn');
    authButton.onclick = function(event) {
            event.preventDefault();
            document.getElementById('loginModal').style.display = 'block';
        };

    //Get modal elements
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('login-modal-form');
    const closeModalBtn = document.getElementById('modal-close-btn');

    //Add listener for the login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    //Add listener to close the modal
    if (closeModalBtn) {
        closeModalBtn.onclick = function() {
            loginModal.style.display = 'none';
        }
    }

    //Handle Notification Bell Click
    const notifBtn = document.getElementById('notification-btn');
    const notifModal = document.getElementById('notificationModal');
    const notifClose = document.getElementById('notification-close-btn');

    if (notifBtn) {
        notifBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if(token){
                notifModal.style.display = 'block';
                checkNotifications();
            }
            else{
                showMessage('Please Log In to view Notifications', 'error', 1500);
            }
        });
    }

    if (notifClose) {
        notifClose.addEventListener('click', () => {
            notifModal.style.display = 'none';
        });
    }

    //Handle "Mark as Read"
    const markReadBtn = document.getElementById('mark-read-btn');
    if (markReadBtn) {
        markReadBtn.addEventListener('click', markAsRead);
    }

    //Close modal if clicking outside
    window.addEventListener('click', (event) => {
        if (event.target == notifModal) {
            notifModal.style.display = 'none';
        }
        // (Keep existing logic for loginModal)
        if (event.target == document.getElementById('loginModal')) {
            loginModal.style.display = 'none';
        }
    });

    //logout and delete token
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
});

async function handleLogin(event) {
    event.preventDefault(); // Stop the form from reloading the page
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const data = {
        email: email,
        password: password
    };

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage('Logged in Successfully!', 'success');
            setTimeout(() => {
                localStorage.setItem('token', result.token);
                window.location.href = 'Main';
            }, 1000); // Wait 1.5s then reload
        } else {
            showMessage(result.error, 'error');
        }

    } catch (error) {
        console.error('Login fetch error:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    showMessage('You have been logged out.', 'success');
    setTimeout(() => window.location.href = 'Home', 1500);
}

// --- Notification Logic ---
function showMessage(message_, type, duration) {
    // Set default durations if not provided
    if (!duration) {
        duration = (type === 'error') ? 6000 : 3000; // 6s for error, 3s for success
    }

    // Remove any existing notification to prevent stacking
    const existingToast = document.getElementById('message-toast');
    if (existingToast) {
        existingToast.remove();
    }

    // 1. Create the element
    const message = document.createElement('div');
    message.id = 'message-toast';
    message.classList.add(type); // Adds .success or .error
    message.textContent = message_;

    // 2. Add to page
    document.body.appendChild(message);

    // 3. Make it visible
    setTimeout(() => {
        message.classList.add('show');
    }, 10); // 10ms delay

    // 4. Set timer to hide
    setTimeout(() => {
        message.classList.remove('show'); // Triggers fade-out

        // 5. Remove from DOM *after* the fade-out transition finishes
        setTimeout(() => {
            message.remove();
        }, 100); // This MUST match your CSS transition time
    }, duration);
}

async function checkNotifications() {
    const token = localStorage.getItem('token');
    if (!token) return; // Don't check if not logged in

    try {
        const response = await fetch('/api/notifications', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (response.ok) {
            const notifications = await response.json();
            updateNotificationUI(notifications);
        }
    } catch (error) {
        console.error('Error checking notifications:', error);
        showMessage(error, 'error')
    }
}

function updateNotificationUI(notifications) {
    const dot = document.getElementById('notification-dot');
    const list = document.getElementById('notification-list');
    const globalMarkReadBtn = document.getElementById('mark-read-btn'); 

    // Extract the three groups from the backend tuple
    const lowAlerts = notifications[0] || [];
    const staleAlerts = notifications[1] || [];
    const expAlerts = notifications[2] || [];

    const totalAlerts = lowAlerts.length + staleAlerts.length + expAlerts.length;

    // Toggle Red Notification Dot
    if (totalAlerts > 0) {
        dot.style.display = 'block';
    } else {
        dot.style.display = 'none';
    }

    // Build the List HTML
    if (totalAlerts === 0) {
        list.innerHTML = '<p class="no-notifications">No new alerts.</p>';
        if (globalMarkReadBtn) globalMarkReadBtn.style.display = 'none';
    } else {
        if (globalMarkReadBtn) {
            globalMarkReadBtn.style.display = 'block';
            globalMarkReadBtn.textContent = 'Mark All as Read'; 
        }
        
        let htmlContent = '';

        // 1. Low Stock Group
        if (lowAlerts.length > 0) {
            htmlContent += '<h4 class="notification-group-title">Low Stock</h4>';
            lowAlerts.forEach(item => {
                htmlContent += `
                    <div class="alert-n">
                        <span><strong>${item.Iname}</strong> only has <strong>${item.Q}</strong> pieces remaining.</span>
                        <span class="close-btn" data-id="${item.Iname}" data-type="L">&times;</span>
                    </div>
                `;
            });
        }

        // 2. Stale Stock Group
        if (staleAlerts.length > 0) {
            htmlContent += '<h4 class="notification-group-title">Stale Stock</h4>';
            staleAlerts.forEach(item => {
                const durationStr = getStaleDuration(item.Purchase_Date);

                htmlContent += `
                    <div class="alert-n">
                        <span><strong>${item.Iname}</strong> (Batch: <strong>${item.Bid}</strong>) hasn't been sold in <strong>${durationStr}</strong>.</span>
                        <span class="close-btn" data-id="${item.Bid}" data-type="S">&times;</span>
                    </div>
                `;
            });
        }

        // 3. Expiring Group
        if (expAlerts.length > 0) {
            htmlContent += '<h4 class="notification-group-title">Expiring Soon</h4>';
            expAlerts.forEach(item => {
                const { remainingDays, expDateStr } = getExpiryDetails(item.Exp_Date);

                htmlContent += `
                    <div class="alert-n">
                        <span><strong>${item.Iname}</strong> (Batch: <strong>${item.Bid}</strong>) will expire in <strong>${remainingDays}</strong> days on <strong>${expDateStr}</strong>.</span>
                        <span class="close-btn" data-id="${item.Bid}" data-type="E">&times;</span>
                    </div>
                `;
            });
        }

        list.innerHTML = htmlContent;

        // Attach Event Listeners to each individual Cross Button
        const closeBtns = list.querySelectorAll('.close-btn');
        closeBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                const id = e.target.getAttribute('data-id');
                const type = e.target.getAttribute('data-type');
                markSingleAsRead(id, type, e.target.parentElement);
            });
        });
    }
}

// --- ADD THIS FUNCTION AT THE END OF header.js ---
async function markSingleAsRead(id, type, elementToRemove) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('/api/notifications/read', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token 
            },
            body: JSON.stringify({ id: id, type: type })
        });

        if (response.ok) {
            // Remove the specific notification element from UI
            elementToRemove.remove();
            
            // Re-check UI: if there are no more cross buttons, hide the group titles and the red dot
            const remainingAlerts = document.querySelectorAll('.close-btn');
            if (remainingAlerts.length === 0) {
                document.getElementById('notification-dot').style.display = 'none';
                document.getElementById('notification-list').innerHTML = '<p class="no-notifications">No new alerts.</p>';
            }
        } else {
            showMessage('Failed to mark as read', 'error');
        }
    } catch (error) {
        console.error('Error marking as read:', error);
        showMessage('Network error', 'error');
    }
}


async function markAsRead() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('/api/notifications/read_all', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token 
            }
        });

        if (response.ok) {
            // Clear the UI completely
            document.getElementById('notification-dot').style.display = 'none';
            document.getElementById('notification-list').innerHTML = '<p class="no-notifications">No new alerts.</p>';
            document.getElementById('mark-read-btn').style.display = 'none';
        } else {
            showMessage('Failed to mark all as read', 'error');
        }
    } catch (error) {
        console.error('Error marking all as read:', error);
        showMessage('Network error', 'error');
    }
}

// --- Date Calculation Helpers ---
function getStaleDuration(purchaseDateStr) {
    if (!purchaseDateStr) return "a while";

    const pDate = new Date(purchaseDateStr);
    const today = new Date();
    pDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(today - pDate);
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Calculate strict months and days
    const mos = Math.floor(totalDays / 30);
    const days = totalDays % 30;

    let parts = [];
    if (mos > 0) parts.push(`${mos} month${mos > 1 ? 's' : ''}`);
    if (days > 0 || mos === 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);

    return parts.join(" and ");
}

function getExpiryDetails(expDateStr) {
    if (!expDateStr) return { remainingDays: 0, expDateStr: 'N/A' };

    const eDate = new Date(expDateStr);
    const today = new Date();
    eDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = eDate - today;
    let remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (remainingDays < 0) remainingDays = 0;

    return {
        remainingDays: remainingDays,
        expDateStr: eDate.toLocaleDateString()
    };
}