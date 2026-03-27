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
    }
}

function updateNotificationUI(notifications) {
    const dot = document.getElementById('notification-dot');
    const list = document.getElementById('notification-list');

    //Toggle Red Dot
    if (notifications.length > 0) {
        dot.style.display = 'block';
    } else {
        dot.style.display = 'none';
    }

    // Remove any existing notification to prevent stacking
    const existingToast = document.getElementById('notification-item');
    if (existingToast) {
        existingToast.remove();
    }

    //Build the List HTML
    if (notifications.length === 0) {
        list.innerHTML = '<p class="no-notifications">No new alerts.</p>';
        document.getElementById('mark-read-btn').style.display = 'none';
    } else {
        document.getElementById('mark-read-btn').style.display = 'block';
        list.innerHTML = notifications.map(alert => `
            <div class="notification-item">
                <p class="alert-n"><strong>Warning!!</strong> : ${alert.disaster_type} warning in ${alert.affected_location}
            </div>
        `).join('');
    }
}

async function markAsRead() {
    const token = localStorage.getItem('token');
    if (!confirm("This will delete all alerts. Continue?")) return;

    const existingToast = document.getElementById('notification-item');
    if (existingToast) {
        existingToast.remove();
    }
}
