// This will hold the user's ID once they are registered
let currentUserId = null;

//Validation Functions
function validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function validatePassword(password) { return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password); }

//Form Submission Handlers
async function Register(event) {
    event.preventdefault();
    //Validate all fields
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const occupation = document.getElementById("occupation").value.trim();

    if (!name) { showMessage("Please enter your name!", "error"); return; }
    if (!validateEmail(email)) { showMessage("Invalid email format!", "error"); return; }
    if (!validatePassword(password)) { showMessage("Password must have 8+ characters, include uppercase, lowercase, number & special character!", "error"); return; }
    if (!occupation) { showMessage("Please select your occupation!", "error"); return; }

    //Build the data object
    const registrationData = {
        name, email, password, occupation
    };

    //Send to the new /register endpoint
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Registration failed.');
        }
        
        showMessage(result.message, 'success');
        
        // Let's automatically log the user in.
        const loginSuccess = await autoLogin(email, password);
        if (loginSuccess) {
            window.location.href = 'Main';
        }

    } catch (error) {
        console.error('Registration error:', error);
        showMessage(error.message, 'error');
    }
}

async function autoLogin(email, password) {
    // This function logs the user in immediately after registering
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();

        if (!response.ok) {
             showNotification('Registration saved, but auto-login failed. Please log in manually.', 'error');
             return false; // Stop execution and tell Register() it failed
        }
        
        // Store the token
        localStorage.setItem('token', result.token);
        return true;
        
    } catch (error) {
        console.error(error);
        showMessage('Registration saved, but auto-login failed. Please log in manually.', 'error');
        return false;
    }
}

//Main Page Load Listener
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if(token) {
        showMessage('Already logged in. Redirecting to Main.', 'success');
        window.location.href = 'Main';
    }

    //Add listener for the Sign Up form submission
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', Register);
    }
});