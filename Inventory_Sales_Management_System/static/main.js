document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const container = document.getElementById('main-container');
    if (!token) {
        showMessage('Access Denied: Please login to access.', 'error', 1000);
        setTimeout(() => {
            window.location.href = 'Home';
        }, 1100);
        return;
    }

    if (container) {
        container.style.display = 'flex';
    }

    const payload = parseJwt(token);
    if (payload && (payload.is_pharmacist === 1 || payload.is_pharmacist === true)) {
        document.getElementById('dash-btn-alt-med').style.display = 'block';
    }

    fetchUserProfile(token);
});

async function fetchUserProfile(token) {
    try {
        const response = await fetch('/api/user/profile', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const userData = await response.json();
            renderUserProfile(userData);
        } else {
            const result = await response.json();
            showMessage(result.error || 'Failed to fetch user data', 'error');
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        showMessage('Network error while fetching profile.', 'error');
    }
}

function renderUserProfile(data) {
    const profileContainer = document.getElementById('user-profile-data');
    
    // Format the role for display
    const role = data.is_pharmacist ? 'Pharmacist' : 'Retail Shopkeeper';
    
    // Inject the HTML
    profileContainer.innerHTML = `
        <h3>Account Details</h3>
        <div class="profile-item">
            <span class="profile-label">Name</span>
            <span><strong>${data.name}</strong></span>
        </div>
        <div class="profile-item">
            <span class="profile-label">Email Address</span>
            <span><strong>${data.email}</strong></span>
        </div>
        <div class="profile-item">
            <div style="margin-bottom: 15px;"><span class="profile-label">Account Type</span></div>
            <span style="background-color: ${data.is_pharmacist ? '#36c157' : '#3496ff'}; color: white; padding: 8px 8px; border-radius: 4px; font-size: 0.9em;">
                <strong>${role}</strong>
            </span>
        </div>
    `;
}