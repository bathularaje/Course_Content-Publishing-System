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

// DOM Elements (add these to the existing DOM elements section)
const enrollButton = document.getElementById('enrollButton');
const enrollmentStatus = document.getElementById('enrollmentStatus');
const enrolledCoursesList = document.getElementById('enrolledCoursesList');
const myCoursesLink = document.querySelector('.nav-link[data-page="myCourses"]');

// Auth DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const submitLogin = document.getElementById('submitLogin');
const submitRegister = document.getElementById('submitRegister');
const showLogin = document.getElementById('showLogin');
const showRegister = document.getElementById('showRegister');
const goToLogin = document.getElementById('goToLogin');
const closeButtons = document.querySelectorAll('.close');

// Global variables
let currentUser = null;
let currentCourse = null;
let courses = [];
let selectedRating = 0;

// Auth functions
async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  if (!email || !password) {
    alert('Please enter both email and password');
    return;
  }
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      currentUser = data.data;
      localStorage.setItem('user', JSON.stringify(currentUser));
      closeModal(loginModal);
      updateAuthUI();
      navigateTo('courses');
    } else {
      alert(data.message || 'Login failed');
    }
  } catch (error) {
    console.error('Error during login:', error);
    alert('Login failed. Please try again.');
  }
}

async function register() {
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const role = document.getElementById('registerRole').value;
  
  if (!name || !email || !password) {
    alert('Please fill in all required fields');
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
      currentUser = data.data;
      localStorage.setItem('user', JSON.stringify(currentUser));
      closeModal(registerModal);
      updateAuthUI();
      navigateTo('courses');
    } else {
      alert(data.message || 'Registration failed');
    }
  } catch (error) {
    console.error('Error during registration:', error);
    alert('Registration failed. Please try again.');
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('user');
  updateAuthUI();
  navigateTo('home');
}

function checkAuth() {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
      updateAuthUI();
    } catch (error) {
      console.error('Error parsing stored user:', error);
      localStorage.removeItem('user');
    }
  }
}

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

// Render courses list
function renderCourses(coursesData) {
  coursesList.innerHTML = '';
  
  if (coursesData.length === 0) {
    coursesList.innerHTML = '<p>No courses available</p>';
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

// Render feedback
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
        <span class="user-name">${feedback.userName}</span>
        <span class="rating">
          ${'★'.repeat(feedback.rating)}${'☆'.repeat(5 - feedback.rating)}
        </span>
        <span class="date">${new Date(feedback.createdAt).toLocaleDateString()}</span>
      </div>
      <p>${feedback.comment || 'No comment'}</p>
    `;
    
    feedbackList.appendChild(feedbackItem);
  });
}

// Submit feedback handler
async function submitFeedbackHandler() {
  if (!currentUser) {
    alert('Please login to submit feedback');
    return;
  }
  
  if (!selectedRating) {
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
      
      // Reset form
      selectedRating = 0;
      ratingValue.textContent = '0';
      feedbackComment.value = '';
      stars.forEach(s => s.classList.remove('active'));
    } else {
      alert(data.message || 'Failed to submit feedback');
    }
  } catch (error) {
    console.error('Error submitting feedback:', error);
    alert('Failed to submit feedback');
  }
}

// Fetch all feedback for admin view
async function fetchAllFeedback() {
  if (!currentUser || currentUser.role !== 'admin') {
    allFeedbackList.innerHTML = '<p>You need admin privileges to view all feedback</p>';
    return;
  }
  
  try {
    const response = await fetch('/api/courses');
    const data = await response.json();
    
    if (data.success) {
      const courses = data.data;
      let allFeedback = [];
      
      for (const course of courses) {
        const feedbackResponse = await fetch(`/api/courses/${course.id}/feedback`);
        const feedbackData = await feedbackResponse.json();
        
        if (feedbackData.success && feedbackData.data.length > 0) {
          feedbackData.data.forEach(feedback => {
            allFeedback.push({
              ...feedback,
              courseName: course.title
            });
          });
        }
      }
      
      renderAllFeedback(allFeedback);
    }
  } catch (error) {
    console.error('Error fetching all feedback:', error);
  }
}

// Render all feedback for admin view
function renderAllFeedback(feedbackData) {
  allFeedbackList.innerHTML = '';
  
  if (feedbackData.length === 0) {
    allFeedbackList.innerHTML = '<p>No feedback available</p>';
    return;
  }
  
  feedbackData.forEach(feedback => {
    const feedbackItem = document.createElement('div');
    feedbackItem.className = 'feedback-item';
    feedbackItem.innerHTML = `
      <div class="feedback-header">
        <span class="course-name">${feedback.courseName}</span>
        <span class="user-name">${feedback.userName}</span>
        <span class="rating">
          ${'★'.repeat(feedback.rating)}${'☆'.repeat(5 - feedback.rating)}
        </span>
        <span class="date">${new Date(feedback.createdAt).toLocaleDateString()}</span>
      </div>
      <p>${feedback.comment || 'No comment'}</p>
    `;
    
    allFeedbackList.appendChild(feedbackItem);
  });
}

// Reset publish form
function resetPublishForm() {
  document.getElementById('courseTitle').value = '';
  document.getElementById('courseDescription').value = '';
  document.getElementById('courseCategory').value = 'Programming';
  
  // Remove all sections except the first one
  const sections = document.querySelectorAll('.content-section');
  for (let i = 1; i < sections.length; i++) {
    sections[i].remove();
  }
  
  // Clear the first section
  const firstSection = sections[0];
  if (firstSection) {
    firstSection.querySelector('.section-title').value = '';
    firstSection.querySelector('.section-content').value = '';
  }
}

// Update the renderCourseDetails function
function renderCourseDetails(course) {
  courseContent.innerHTML = `
    <div class="course-header">
      <h2>${course.title}</h2>
      <div class="meta">
        <p>Instructor: ${course.instructor}</p>
        <p>Category: ${course.category}</p>
      </div>
      <p>${course.description}</p>
      ${currentUser && (currentUser.id === course.instructor_id || currentUser.role === 'admin') ? 
        `<div class="course-actions">
          <button id="editCourseBtn" class="edit-button">Edit Course</button>
          <button id="deleteCourseBtn" class="delete-button">Delete Course</button>
        </div>` : ''}
    </div>
    <div class="course-content">
      <h3>Course Content</h3>
      ${course.content.map(section => `
        <div class="course-section">
          <h3>${section.title}</h3>
          <p>${section.text}</p>
          ${section.content && section.content.length > 0 ? `
            <div class="section-files">
              <h4>Files</h4>
              <ul class="files-list">
                ${section.content.map(file => `
                  <li class="file-item">
                    <span class="file-icon">${file.type === 'video' ? '🎬' : '📄'}</span>
                    <a href="${file.url}" target="_blank" class="file-link">${file.title}</a>
                    <p class="file-description">${file.description || ''}</p>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
  
  // Update enrollment button/status
  if (currentUser) {
    if (course.isEnrolled) {
      enrollButton.style.display = 'none';
      enrollmentStatus.style.display = 'block';
    } else {
      enrollButton.style.display = 'block';
      enrollmentStatus.style.display = 'none';
    }
  } else {
    enrollButton.style.display = 'none';
    enrollmentStatus.style.display = 'none';
  }

  // Add event listener for delete course button
  const deleteCourseBtn = document.getElementById('deleteCourseBtn');
  if (deleteCourseBtn) {
    deleteCourseBtn.addEventListener('click', deleteCourse);
  }
  
  // Add event listener for edit course button
  const editCourseBtn = document.getElementById('editCourseBtn');
  if (editCourseBtn) {
    editCourseBtn.addEventListener('click', () => openEditCourseModal(course));
  }
}

// Fetch course details (updated to include userId and instructor_id)
async function fetchCourseDetails(courseId) {
  try {
    let url = `/api/courses/${courseId}`;
    if (currentUser) {
      url += `?userId=${currentUser.id}`;
    }
    
    const response = await fetch(url);
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

// Enroll in course
async function enrollInCourse() {
  if (!currentUser) {
    alert('Please login to enroll in this course');
    return;
  }
  
  try {
    const response = await fetch(`/api/courses/${currentCourse.id}/enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: currentUser.id
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Enrolled successfully!');
      // Refresh course details to update enrollment status
      fetchCourseDetails(currentCourse.id);
    } else {
      alert(data.message || 'Failed to enroll');
    }
  } catch (error) {
    console.error('Error enrolling in course:', error);
    alert('Failed to enroll in course');
  }
}

// Fetch enrolled courses
async function fetchEnrolledCourses() {
  if (!currentUser) {
    enrolledCoursesList.innerHTML = '<p>Please login to view your enrolled courses</p>';
    return;
  }
  
  try {
    const response = await fetch(`/api/users/${currentUser.id}/enrollments`);
    const data = await response.json();
    
    if (data.success) {
      renderEnrolledCourses(data.data);
    }
  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
  }
}

// Render enrolled courses
function renderEnrolledCourses(coursesData) {
  enrolledCoursesList.innerHTML = '';
  
  if (coursesData.length === 0) {
    enrolledCoursesList.innerHTML = '<p>You are not enrolled in any courses yet</p>';
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
          <span>Enrolled: ${new Date(course.enrolledAt).toLocaleDateString()}</span>
        </div>
        <div class="course-actions">
          <button class="view-course" data-id="${course.id}">Continue Learning</button>
          ${(currentUser && (currentUser.id === course.instructor_id || currentUser.role === 'admin')) ? 
            `<button class="edit-course edit-button" data-id="${course.id}">Edit Course</button>
             <button class="delete-course delete-button" data-id="${course.id}">Delete Course</button>` : ''}
        </div>
      </div>
    `;
    
    enrolledCoursesList.appendChild(courseCard);
  });
  
  // Add event listeners to view course buttons
  document.querySelectorAll('#enrolledCoursesList .view-course').forEach(button => {
    button.addEventListener('click', () => {
      const courseId = button.getAttribute('data-id');
      fetchCourseDetails(courseId);
    });
  });

  // Add event listeners to edit course buttons
  document.querySelectorAll('#enrolledCoursesList .edit-course').forEach(button => {
    button.addEventListener('click', async () => {
      const courseId = button.getAttribute('data-id');
      try {
        const response = await fetch(`/api/courses/${courseId}`);
        const data = await response.json();
        
        if (data.success) {
          openEditCourseModal(data.data);
        }
      } catch (error) {
        console.error('Error fetching course details for editing:', error);
      }
    });
  });

  // Add event listeners to delete course buttons
  document.querySelectorAll('#enrolledCoursesList .delete-course').forEach(button => {
    button.addEventListener('click', () => {
      const courseId = button.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
        deleteCourseById(courseId);
      }
    });
  });
}

// Delete course by ID
async function deleteCourseById(courseId) {
  try {
    const response = await fetch(`/api/courses/${courseId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      alert('Course deleted successfully');
      // Refresh the courses list
      if (document.getElementById('myCourses').classList.contains('active')) {
        fetchEnrolledCourses();
      } else {
        fetchCourses();
      }
    } else {
      alert(data.message || 'Failed to delete course');
    }
  } catch (error) {
    console.error('Error deleting course:', error);
    alert('Failed to delete course');
  }
}

// Update the addContentSection function to include file uploads
function addContentSection() {
  const sectionDiv = document.createElement('div');
  sectionDiv.className = 'content-section';
  sectionDiv.innerHTML = `
    <input type="text" placeholder="Section Title" class="section-title">
    <textarea placeholder="Section Content" class="section-content"></textarea>
    <div class="section-files">
      <h4>Section Files</h4>
      <div class="file-upload">
        <div class="file-item">
          <input type="text" placeholder="File Title" class="file-title">
          <select class="file-type">
            <option value="video">Video</option>
            <option value="document">Document</option>
          </select>
          <input type="text" placeholder="File URL" class="file-url">
          <textarea placeholder="File Description" class="file-description"></textarea>
        </div>
        <button class="add-file">+ Add File</button>
      </div>
    </div>
  `;
  
  contentSections.appendChild(sectionDiv);
  
  // Add event listener for the add file button
  sectionDiv.querySelector('.add-file').addEventListener('click', function() {
    addFileInput(this.parentElement);
  });
}

// Add file input fields
function addFileInput(fileUploadDiv) {
  const fileItem = document.createElement('div');
  fileItem.className = 'file-item';
  fileItem.innerHTML = `
    <input type="text" placeholder="File Title" class="file-title">
    <select class="file-type">
      <option value="video">Video</option>
      <option value="document">Document</option>
    </select>
    <input type="text" placeholder="File URL" class="file-url">
    <textarea placeholder="File Description" class="file-description"></textarea>
  `;
  
  fileUploadDiv.insertBefore(fileItem, fileUploadDiv.querySelector('.add-file'));
}

// Update the publishCourseHandler function
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
    // First, create the course
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
      const courseId = data.data.id;
      
      // Now add files for each section
      let allFilesUploaded = true;
      
      for (let i = 0; i < contentSectionElements.length; i++) {
        const section = contentSectionElements[i];
        const sectionId = data.data.content[i].id;
        const fileItems = section.querySelectorAll('.file-item');
        
        for (const fileItem of fileItems) {
          const fileTitle = fileItem.querySelector('.file-title').value;
          const fileType = fileItem.querySelector('.file-type').value;
          const fileUrl = fileItem.querySelector('.file-url').value;
          const fileDescription = fileItem.querySelector('.file-description').value;
          
          if (fileTitle && fileUrl) {
            try {
              const fileResponse = await fetch(`/api/courses/${courseId}/content`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  title: fileTitle,
                  type: fileType,
                  url: fileUrl,
                  description: fileDescription,
                  sectionId: sectionId
                })
              });
              
              const fileData = await fileResponse.json();
              
              if (!fileData.success) {
                allFilesUploaded = false;
                console.error('Error uploading file:', fileData.message);
              }
            } catch (error) {
              allFilesUploaded = false;
              console.error('Error uploading file:', error);
            }
          }
        }
      }
      
      if (allFilesUploaded) {
        alert('Course published successfully with all content');
      } else {
        alert('Course published but some content failed to upload');
      }
      
      resetPublishForm();
      navigateTo('courses');
    }
  } catch (error) {
    console.error('Error publishing course:', error);
  }
}

// Update navigation function
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
  } else if (pageId === 'myCourses') {
    fetchEnrolledCourses();
  }
}

// Update the updateAuthUI function
function updateAuthUI() {
  if (currentUser) {
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    userInfo.style.display = 'inline-block';
    userInfo.textContent = `${currentUser.name} (${currentUser.role})`;
    myCoursesLink.style.display = 'inline-block';
    
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
    myCoursesLink.style.display = 'none';
    publishForm.style.display = 'none';
    loginPrompt.style.display = 'block';
    addFeedbackForm.style.display = 'none';
  }
}

// Add event listeners
enrollButton.addEventListener('click', enrollInCourse);

// Add event listeners for add file buttons
document.querySelectorAll('.add-file').forEach(button => {
  button.addEventListener('click', function() {
    addFileInput(this.parentElement);
  });
});

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

// Edit course modal
document.getElementById('addEditSection').addEventListener('click', () => addEditContentSection());
document.getElementById('updateCourseBtn').addEventListener('click', updateCourse);

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

// Delete course
async function deleteCourse() {
  if (!currentUser || !currentCourse) {
    return;
  }

  if (!confirm(`Are you sure you want to delete the course "${currentCourse.title}"? This action cannot be undone.`)) {
    return;
  }

  await deleteCourseById(currentCourse.id);
  navigateTo('courses');
}

// Open edit course modal
function openEditCourseModal(course) {
  const modal = document.getElementById('editCourseModal');
  const form = document.getElementById('editCourseForm');
  const contentSections = document.getElementById('editContentSections');
  
  // Set course ID in a hidden field
  document.getElementById('editCourseId').value = course.id;
  
  // Fill in course details
  document.getElementById('editCourseTitle').value = course.title;
  document.getElementById('editCourseDescription').value = course.description;
  document.getElementById('editCourseCategory').value = course.category;
  
  // Clear existing content sections
  contentSections.innerHTML = '<h3>Content Sections</h3>';
  
  // Add content sections
  course.content.forEach((section, index) => {
    addEditContentSection(section.title, section.text);
  });
  
  // Show the modal
  modal.style.display = 'block';
}

// Add content section to edit form
function addEditContentSection(title = '', content = '') {
  const contentSections = document.getElementById('editContentSections');
  const sectionId = Date.now(); // Unique ID for the section
  
  const section = document.createElement('div');
  section.className = 'edit-content-section';
  section.dataset.id = sectionId;
  
  section.innerHTML = `
    <button type="button" class="remove-section" onclick="removeEditSection(${sectionId})">×</button>
    <div class="form-group">
      <label for="sectionTitle-${sectionId}">Section Title</label>
      <input type="text" id="sectionTitle-${sectionId}" class="section-title" value="${title}" required>
    </div>
    <div class="form-group">
      <label for="sectionContent-${sectionId}">Section Content</label>
      <textarea id="sectionContent-${sectionId}" class="section-content" required>${content}</textarea>
    </div>
  `;
  
  contentSections.appendChild(section);
}

// Remove content section from edit form
function removeEditSection(sectionId) {
  const section = document.querySelector(`.edit-content-section[data-id="${sectionId}"]`);
  if (section) {
    section.remove();
  }
}

// Update course
async function updateCourse(event) {
  event.preventDefault();
  
  const courseId = document.getElementById('editCourseId').value;
  const title = document.getElementById('editCourseTitle').value;
  const description = document.getElementById('editCourseDescription').value;
  const category = document.getElementById('editCourseCategory').value;
  
  // Get content sections
  const contentSections = [];
  document.querySelectorAll('.edit-content-section').forEach(section => {
    const sectionTitle = section.querySelector('.section-title').value;
    const sectionContent = section.querySelector('.section-content').value;
    
    if (sectionTitle && sectionContent) {
      contentSections.push({
        title: sectionTitle,
        text: sectionContent
      });
    }
  });
  
  // Validate form
  if (!title || !description || contentSections.length === 0) {
    alert('Please fill in all required fields and add at least one content section');
    return;
  }
  
  try {
    const response = await fetch(`/api/courses/${courseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        description,
        category,
        content: contentSections
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Course updated successfully!');
      closeModal(document.getElementById('editCourseModal'));
      
      // Refresh course details
      fetchCourseDetails(courseId);
    } else {
      alert(data.message || 'Failed to update course');
    }
  } catch (error) {
    console.error('Error updating course:', error);
    alert('Failed to update course');
  }
}

// ... existing code ...
