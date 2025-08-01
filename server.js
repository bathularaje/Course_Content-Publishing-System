const express = require('express');
const cors = require('cors');

require('dotenv').config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));


// Unified API endpoint
app.use('/api', (req, res, next) => {
  const { path } = req;
  const method = req.method;
  
  console.log(`API Request: ${method} ${path}`);
  next();
});

// COURSES API

// Get all courses
app.get('/api/courses', (req, res) => {
  res.json({ success: true, data: courses });
});

// Get course by ID
app.get('/api/courses/:id', (req, res) => {
  const course = courses.find(c => c.id === parseInt(req.params.id));
  if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
  res.json({ success: true, data: course });
});

// Create new course
app.post('/api/courses', (req, res) => {
  const { title, description, instructor, category, content } = req.body;
  
  if (!title || !description || !instructor) {
    return res.status(400).json({ success: false, message: 'Please provide title, description, and instructor' });
  }
  
  const newCourse = {
    id: courses.length + 1,
    title,
    description,
    instructor,
    category,
    content: content || [],
    feedback: []
  };
  
  courses.push(newCourse);
  res.status(201).json({ success: true, data: newCourse });
});

// Update course
app.put('/api/courses/:id', (req, res) => {
  const course = courses.find(c => c.id === parseInt(req.params.id));
  if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
  
  const { title, description, instructor, category, content } = req.body;
  
  if (title) course.title = title;
  if (description) course.description = description;
  if (instructor) course.instructor = instructor;
  if (category) course.category = category;
  if (content) course.content = content;
  
  res.json({ success: true, data: course });
});

// Delete course
app.delete('/api/courses/:id', (req, res) => {
  const courseIndex = courses.findIndex(c => c.id === parseInt(req.params.id));
  if (courseIndex === -1) return res.status(404).json({ success: false, message: 'Course not found' });
  
  courses.splice(courseIndex, 1);
  res.json({ success: true, message: 'Course deleted successfully' });
});



// USER API

// Simple login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }
  
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  
  // In a real app, you would use JWT or sessions
  const { password: _, ...userWithoutPassword } = user;
  res.json({ success: true, data: userWithoutPassword });
});

// Register new user
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
  }
  
  if (users.some(u => u.email === email)) {
    return res.status(400).json({ success: false, message: 'Email already in use' });
  }
  
  const newUser = {
    id: users.length + 1,
    name,
    email,
    password,
    role: role || 'student'
  };
  
  users.push(newUser);
  
  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json({ success: true, data: userWithoutPassword });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});