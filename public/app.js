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

// Fetch all courses
async function fetchCourses() {
  try {
    const response = await fetch('/api/courses');
    const data = await response.json();
    
    if (data.success) {
      courses = data.data;
      renderCourses(courses);
    }
  } catch (error) {
    console.error('Error fetching courses:', error);
  }
}

// Fetch course details
async function fetchCourseDetails(courseId) {
  try {
    const response = await fetch(`/api/courses/${courseId}`);
    const data = await response.json();
    
    if (data.success) {
      currentCourse = data.data;
      renderCourseDetails(currentCourse);
      fetchCourseFeedback(courseId);
      navigateTo('courseDetails');
    }
  } catch (error) {
    console.error('Error fetching course details:', error);
  }
}

// Fetch course feedback
async function fetchCourseFeedback(courseId) {
  try {
    const response = await fetch(`/api/courses/${courseId}/feedback`);
    const data = await response.json();
    
    if (data.success) {
      renderFeedback(data.data);
    }
  } catch (error) {
    console.error('Error fetching feedback:', error);
  }
}

// Fetch all feedback
async function fetchAllFeedback() {
  try {
    const allFeedback = [];
    
    for (const course of courses) {
      const response = await fetch(`/api/courses/${course.id}/feedback`);
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        data.data.forEach(feedback => {
          allFeedback.push({
            ...feedback,
            courseName: course.title
          });
        });
      }
    }
    
    renderAllFeedback(allFeedback);
  } catch (error) {
    console.error('Error fetching all feedback:', error);
  }
}

// Submit feedback 
async function submitFeedbackHandler() {
  if (!currentUser) {
    alert('Please login to submit feedback');
    return;
  }
  
  if (selectedRating === 0) {
    alert('Please select a rating');
    return;
  }
  
  try {
    const response = await fetch(`/api/courses/${currentCourse.id}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: currentUser.id,
        rating: selectedRating,
        comment: feedbackComment.value
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Feedback submitted successfully');
      fetchCourseFeedback(currentCourse.id);
      resetFeedbackForm();
    }
  } catch (error) {
    console.error('Error submitting feedback:', error);
  }
}

// Render feedback (updated to use userName from server)
function renderFeedback(feedbackData) {
  feedbackList.innerHTML = '';
  
  if (feedbackData.length === 0) {
    feedbackList.innerHTML = '<p>No feedback yet</p>';
    return;
  }
  
  feedbackData.forEach(feedback => {
    const feedbackItem = document.createElement('div');
    feedbackItem.className = 'feedback-item';
    feedbackItem.innerHTML = `
      <div class="feedback-header">
        <span class="user">${feedback.userName || 'Anonymous'}</span>
        <span class="rating">${'★'.repeat(feedback.rating)}${'☆'.repeat(5 - feedback.rating)}</span>
      </div>
      <p>${feedback.comment || 'No comment'}</p>
    `;
    
    feedbackList.appendChild(feedbackItem);
  });
}

// Publish course
async function publishCourseHandler() {
  if (!currentUser || (currentUser.role !== 'instructor' && currentUser.role !== 'admin')) {
    alert('You must be logged in as an instructor to publish courses');
    return;
  }
  
  const title = document.getElementById('courseTitle').value;
  const description = document.getElementById('courseDescription').value;
  const category = document.getElementById('courseCategory').value;
  
  if (!title || !description) {
    alert('Please fill in all required fields');
    return;
  }
  
  const contentSectionElements = document.querySelectorAll('.content-section');
  const content = [];
  
  contentSectionElements.forEach(section => {
    const title = section.querySelector('.section-title').value;
    const text = section.querySelector('.section-content').value;
    
    if (title && text) {
      content.push({ title, text });
    }
  });
  
  try {
    const response = await fetch('/api/courses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        description,
        instructor: currentUser.name,
        category,
        content
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Course published successfully');
      resetPublishForm();
      navigateTo('courses');
    }
  } catch (error) {
    console.error('Error publishing course:', error);
  }
}

// Auth Functions

// Login
async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  console.log('Login attempt:', { email });
  
  if (!email || !password) {
    alert('Please fill in all fields');
    return;
  }
  
  try {
    console.log('Sending login request...');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    console.log('Login response status:', response.status);
    const data = await response.json();
    console.log('Login response data:', data);
    
    if (data.success) {
      currentUser = data.data;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      updateAuthUI();
      closeModal(loginModal);
      alert('Logged in successfully');
    } else {
      alert(data.message || 'Login failed');
    }
  } catch (error) {
    console.error('Error logging in:', error);
    alert('Login failed');
  }
}

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

// Render Functions

// Render courses list
function renderCourses(coursesData) {
  coursesList.innerHTML = '';
  
  if (coursesData.length === 0) {
    coursesList.innerHTML = '<p>No courses found</p>';
    return;
  }
  
  coursesData.forEach(course => {
    const courseCard = document.createElement('div');
    courseCard.className = 'course-card';
    courseCard.innerHTML = `
      <div class="course-card-content">
        <h3>${course.title}</h3>
        <p>${course.description}</p>
        <div class="course-meta">
          <span>Instructor: ${course.instructor}</span>
          <span>Category: ${course.category}</span>
        </div>
        <button class="view-course" data-id="${course.id}">View Course</button>
      </div>
    `;
    
    coursesList.appendChild(courseCard);
  });
  
  // Add event listeners to view course buttons
  document.querySelectorAll('.view-course').forEach(button => {
    button.addEventListener('click', () => {
      const courseId = button.getAttribute('data-id');
      fetchCourseDetails(courseId);
    });
  });
}

// Render course details
function renderCourseDetails(course) {
  courseContent.innerHTML = `
    <div class="course-header">
      <h2>${course.title}</h2>
      <div class="meta">
        <p>Instructor: ${course.instructor}</p>
        <p>Category: ${course.category}</p>
      </div>
      <p>${course.description}</p>
    </div>
    <div class="course-content">
      <h3>Course Content</h3>
      ${course.content.map(section => `
        <div class="course-section">
          <h3>${section.title}</h3>
          <p>${section.text}</p>
        </div>
      `).join('')}
    </div>
  `;
}



// Modal Functions

// Open modal
function openModal(modal) {
  modal.style.display = 'block';
}

// Close modal
function closeModal(modal) {
  modal.style.display = 'none';
}

// Event Listeners

// Navigation
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const pageId = link.getAttribute('data-page');
    navigateTo(pageId);
  });
});

// Back to courses
backToCourses.addEventListener('click', () => {
  navigateTo('courses');
});

// Course search and filter
courseSearch.addEventListener('input', filterCourses);
categoryFilter.addEventListener('change', filterCourses);

// Rating stars
stars.forEach(star => {
  star.addEventListener('click', () => {
    const rating = parseInt(star.getAttribute('data-rating'));
    selectedRating = rating;
    ratingValue.textContent = rating;
    
    // Update active stars
    stars.forEach(s => {
      if (parseInt(s.getAttribute('data-rating')) <= rating) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });
  });
});

// Submit feedback
submitFeedback.addEventListener('click', submitFeedbackHandler);

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


// Filter courses based on search and category
function filterCourses() {
  const searchTerm = courseSearch.value.toLowerCase();
  const categoryValue = categoryFilter.value;
  
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm) || 
                         course.description.toLowerCase().includes(searchTerm);
    const matchesCategory = categoryValue === '' || course.category === categoryValue;
    
    return matchesSearch && matchesCategory;
  });
  
  renderCourses(filteredCourses);
}

// Add a new content section to the publish form
function addContentSection() {
  const sectionDiv = document.createElement('div');
  sectionDiv.className = 'content-section';
  sectionDiv.innerHTML = `
    <input type="text" placeholder="Section Title" class="section-title">
    <textarea placeholder="Section Content" class="section-content"></textarea>
  `;
  
  contentSections.appendChild(sectionDiv);
}