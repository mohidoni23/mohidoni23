document.addEventListener('DOMContentLoaded', function() {
    console.log('Site initialized');

    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    darkModeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
    });

    // Announcement feature
    const announcement = document.getElementById('announcement');
    

    // Add to Cart buttons
    document.querySelectorAll('.product-card button').forEach(btn => {
        btn.addEventListener('click', function() {
            alert('Added to cart!');
        });
    });

    // Modal logic
    function showModal(id) {
        document.getElementById(id).style.display = 'block';
    }
    function closeModal(id) {
        document.getElementById(id).style.display = 'none';
    }

    // Authentication state (client-side only, NOT production secure)
    let isAuthenticated = false;
    function updateAuthUI() {
        document.getElementById('signInBtn').style.display = isAuthenticated ? 'none' : '';
        document.getElementById('signUpBtn').style.display = isAuthenticated ? 'none' : '';
        document.getElementById('signOutBtn').style.display = isAuthenticated ? '' : 'none';
        document.getElementById('profileBtn').style.display = isAuthenticated ? '' : 'none';
    }
    updateAuthUI();

    // Helper to show already here message
    function showAlreadyHere(msg) {
        alert(msg);
    }

    // Navigation logic
    document.getElementById('homeBtn').addEventListener('click', function(e) {
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '/index.html') {
            e.preventDefault();
            showAlreadyHere('You are already at Home.');
        }
        // else, default navigation
    });

    const productsBtn = document.getElementById('productsBtn');
    if (productsBtn) {
        productsBtn.addEventListener('click', function(e) {
            if (window.location.pathname.endsWith('products.html')) {
                e.preventDefault();
                showAlreadyHere('You are already on the Products page.');
            }
        });
    }

    document.getElementById('profileBtn').addEventListener('click', function(e) {
        if (!isAuthenticated) {
            e.preventDefault();
            alert('Please sign in to view your profile.');
        } else if (window.location.hash === '#profile' || window.location.pathname.endsWith('profile.html')) {
            e.preventDefault();
            showAlreadyHere('You are already on your Profile page.');
        }
        // else, default navigation or logic
    });

    // Modal open/close
    document.getElementById('signInBtn').addEventListener('click', function(e) {
        e.preventDefault();
        showModal('signInModal');
    });
    document.getElementById('signUpBtn').addEventListener('click', function(e) {
        e.preventDefault();
        showModal('signUpModal');
    });
    document.getElementById('closeSignIn').addEventListener('click', function() {
        closeModal('signInModal');
    });
    document.getElementById('closeSignUp').addEventListener('click', function() {
        closeModal('signUpModal');
    });
    document.getElementById('signOutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        isAuthenticated = false;
        updateAuthUI();
        alert('Signed out!');
    });

    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };

    // Dummy Gmail button actions
    document.querySelectorAll('.gmail-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            isAuthenticated = true;
            updateAuthUI();
            closeModal('signInModal');
            closeModal('signUpModal');
        });
    });

    // Security/protection reminders
    console.warn('This site is a static/client-side site. Authentication and user data are NOT secure or persistent. For a real site, use a backend server, database, and secure authentication!');

    // Input validation for sign in/up forms
    function validateEmail(email) {
        // Simple email regex
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Form handlers (replace with real API calls)
    document.getElementById('signInForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const inputs = this.querySelectorAll('input');
        const userOrEmail = inputs[0].value.trim();
        const password = inputs[1].value;
        if (!userOrEmail || !password) {
            alert('Please fill in all fields.');
            return;
        }
        // Example: call your backend API
        const res = await fetch('http://localhost:3000/api/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userOrEmail, password })
        });
        if (res.ok) {
            // Save token, update UI, etc.
            closeModal('signInModal');
            isAuthenticated = true;
            updateAuthUI();
        } else {
            alert('Invalid credentials');
        }
    });

    document.getElementById('signUpForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const inputs = this.querySelectorAll('input');
        const username = inputs[0].value.trim();
        const email = inputs[1].value.trim();
        const password = inputs[2].value;
        if (!username || !email || !password) {
            alert('Please fill in all fields.');
            return;
        }
        const res = await fetch('http://localhost:3000/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        if (res.ok) {
            closeModal('signUpModal');
            isAuthenticated = true;
            updateAuthUI();
        } else {
            alert('Sign up failed');
        }
    });
});