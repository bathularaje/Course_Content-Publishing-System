// DOM Elements
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');
const coursesList = document.getElementById('coursesList');
const courseSearch = document.getElementById('courseSearch');
const categoryFilter = document.getElementById('categoryFilter');
const courseContent = document.getElementById('courseContent');
const feedbackList = document.getElementById('feedbackList');
const allFeedbackList = document.getElementById('allFeedbackList');
const backToCourses = document.getElementById('backToCourses');
const addFeedbackForm = document.getElementById('addFeedbackForm');
const stars = document.querySelectorAll('.star');
const ratingValue = document.getElementById('ratingValue');
const feedbackComment = document.getElementById('feedbackComment');
const submitFeedback = document.getElementById('submitFeedback');
const publishForm = document.getElementById('publishForm');
const loginPrompt = document.getElementById('loginPrompt');
const addSection = document.getElementById('addSection');
const contentSections = document.getElementById('contentSections');
const publishCourse = document.getElementById('publishCourse');

// Auth Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const closeButtons = document.querySelectorAll('.close');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const submitLogin = document.getElementById('submitLogin');
const submitRegister = document.getElementById('submitRegister');
const goToLogin = document.getElementById('goToLogin');

// State
let currentUser = null;
let currentCourse = null;
let selectedRating = 0;
let courses = [];

// Check if user is logged in
function checkAuth() {
  const user = localStorage.getItem('currentUser');
  if (user) {
    currentUser = JSON.parse(user);
    updateAuthUI();
  }
}

// Update UI based on auth state
function updateAuthUI() {
  if (currentUser) {
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    userInfo.style.display = 'inline-block';
    userInfo.textContent = `${currentUser.name} (${currentUser.role})`;
    
    if (currentUser.role === 'instructor' || currentUser.role === 'admin') {
      publishForm.style.display = 'block';
      loginPrompt.style.display = 'none';
    } else {
      publishForm.style.display = 'none';
      loginPrompt.style.display = 'block';
    }
    
    addFeedbackForm.style.display = 'block';
  } else {
    loginBtn.style.display = 'inline-block';
    registerBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    userInfo.style.display = 'none';
    publishForm.style.display = 'none';
    loginPrompt.style.display = 'block';
    addFeedbackForm.style.display = 'none';
  }
}

// Navigation
function navigateTo(pageId) {
  pages.forEach(page => {
    page.classList.remove('active');
  });
  
  document.getElementById(pageId).classList.add('active');
  
  navLinks.forEach(link => {
    if (link.getAttribute('data-page') === pageId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
  
  if (pageId === 'courses') {
    fetchCourses();
  } else if (pageId === 'feedback') {
    fetchAllFeedback();
  }
}

// API Functions



// Auth Functions


// Register
async function register() {
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const role = document.getElementById('registerRole').value;
  
  if (!name || !email || !password) {
    alert('Please fill in all fields');
    return;
  }
  
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, password, role })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Registered successfully. Please login.');
      closeModal(registerModal);
      openModal(loginModal);
    } else {
      alert(data.message || 'Registration failed');
    }
  } catch (error) {
    console.error('Error registering:', error);
    alert('Registration failed');
  }
}

// Logout
function logout() {
  localStorage.removeItem('currentUser');
  currentUser = null;
  updateAuthUI();
  navigateTo('home');
}


// Navigation
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const pageId = link.getAttribute('data-page');
    navigateTo(pageId);
  });
});



// Add content section
addSection.addEventListener('click', addContentSection);

// Publish course
publishCourse.addEventListener('click', publishCourseHandler);

// Auth
loginBtn.addEventListener('click', () => openModal(loginModal));
registerBtn.addEventListener('click', () => openModal(registerModal));
logoutBtn.addEventListener('click', logout);
goToLogin.addEventListener('click', () => openModal(loginModal));

// Modal close buttons
closeButtons.forEach(button => {
  button.addEventListener('click', () => {
    const modal = button.closest('.modal');
    closeModal(modal);
  });
});

// Switch between login and register
showRegister.addEventListener('click', (e) => {
  e.preventDefault();
  closeModal(loginModal);
  openModal(registerModal);
});

showLogin.addEventListener('click', (e) => {
  e.preventDefault();
  closeModal(registerModal);
  openModal(loginModal);
});

// Submit login and register
submitLogin.addEventListener('click', login);
submitRegister.addEventListener('click', register);

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  if (e.target === loginModal) {
    closeModal(loginModal);
  }
  if (e.target === registerModal) {
    closeModal(registerModal);
  }
});

// Initialize
checkAuth();
navigateToHome();

function navigateToHome() {
  navigateTo('home');
}