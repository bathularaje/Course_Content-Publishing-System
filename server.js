const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'course_publishing_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
pool.getConnection()
  .then(connection => {
    console.log('Connected to MySQL database');
    connection.release();
  })
  .catch(err => {
    console.error('Error connecting to the database:', err);
  });

// Unified API endpoint
app.use('/api', (req, res, next) => {
  const { path } = req;
  const method = req.method;
  
  console.log(`API Request: ${method} ${path}`);
  next();
});

// COURSES API

// Get all courses
app.get('/api/courses', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, u.name as instructor, cat.name as category 
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.published = true
    `);
    
    // Format the response to match the expected structure in the frontend
    const courses = rows.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      instructor: course.instructor,
      category: course.category,
      cover_image: course.cover_image
    }));
    
    res.json({ success: true, data: courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get course by ID
// Get course by ID
app.get('/api/courses/:id', async (req, res) => {
  try {
    // Get course details
    const [courseRows] = await pool.query(`
      SELECT c.*, u.name as instructor, cat.name as category 
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.id = ?
    `, [req.params.id]);
    
    if (courseRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    // Get course sections
    const [sectionRows] = await pool.query(`
      SELECT id, title, description 
      FROM course_sections 
      WHERE course_id = ? 
      ORDER BY order_index
    `, [req.params.id]);
    
    // Check if course_content table exists
    const [tables] = await pool.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'course_publishing_system' AND TABLE_NAME = 'course_content'
    `);
    
    let sections = [];
    
    // If content table exists, get content for each section
    if (tables.length > 0) {
      for (const section of sectionRows) {
        const [contentRows] = await pool.query(
          'SELECT * FROM course_content WHERE section_id = ? ORDER BY created_at',
          [section.id]
        );
        
        sections.push({
          id: section.id,
          title: section.title,
          text: section.description,
          content: contentRows.map(item => ({
            id: item.id,
            title: item.title,
            type: item.type,
            url: item.url,
            description: item.description
          }))
        });
      }
    } else {
      sections = sectionRows.map(section => ({
        id: section.id,
        title: section.title,
        text: section.description,
        content: []
      }));
    }
    
    // Check if user is enrolled
    let isEnrolled = false;
    if (req.query.userId) {
      const [enrollmentRows] = await pool.query(
        'SELECT * FROM course_enrollments WHERE course_id = ? AND user_id = ?',
        [req.params.id, req.query.userId]
      );
      isEnrolled = enrollmentRows.length > 0;
    }
    
    // Format the response
    const course = {
      id: courseRows[0].id,
      title: courseRows[0].title,
      description: courseRows[0].description,
      instructor: courseRows[0].instructor,
      category: courseRows[0].category,
      content: sections,
      isEnrolled: isEnrolled
    };
    
    res.json({ success: true, data: course });
  } catch (error) {
    console.error('Error fetching course details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new course
app.post('/api/courses', async (req, res) => {
  const { title, description, instructor, category, content } = req.body;
  
  if (!title || !description || !instructor) {
    return res.status(400).json({ success: false, message: 'Please provide title, description, and instructor' });
  }
  
  try {
    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Get instructor ID
      const [instructorRows] = await connection.query('SELECT id FROM users WHERE name = ?', [instructor]);
      if (instructorRows.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ success: false, message: 'Instructor not found' });
      }
      const instructorId = instructorRows[0].id;
      
      // Get category ID
      let categoryId = null;
      if (category) {
        const [categoryRows] = await connection.query('SELECT id FROM categories WHERE name = ?', [category]);
        if (categoryRows.length > 0) {
          categoryId = categoryRows[0].id;
        }
      }
      
      // Insert course
      const [courseResult] = await connection.query(
        'INSERT INTO courses (title, description, instructor_id, category_id, published) VALUES (?, ?, ?, ?, ?)',
        [title, description, instructorId, categoryId, true]
      );
      
      const courseId = courseResult.insertId;
      
      // Insert course sections
      if (content && content.length > 0) {
        for (let i = 0; i < content.length; i++) {
          await connection.query(
            'INSERT INTO course_sections (course_id, title, description, order_index) VALUES (?, ?, ?, ?)',
            [courseId, content[i].title, content[i].text, i + 1]
          );
        }
      }
      
      // Commit transaction
      await connection.commit();
      connection.release();
      
      // Get the newly created course
      const [newCourseRows] = await pool.query(`
        SELECT c.*, u.name as instructor, cat.name as category 
        FROM courses c
        LEFT JOIN users u ON c.instructor_id = u.id
        LEFT JOIN categories cat ON c.category_id = cat.id
        WHERE c.id = ?
      `, [courseId]);
      
      const newCourse = {
        id: newCourseRows[0].id,
        title: newCourseRows[0].title,
        description: newCourseRows[0].description,
        instructor: newCourseRows[0].instructor,
        category: newCourseRows[0].category,
        content: content || [],
        feedback: []
      };
      
      res.status(201).json({ success: true, data: newCourse });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update course
app.put('/api/courses/:id', async (req, res) => {
  const { title, description, instructor, category, content } = req.body;
  const courseId = req.params.id;
  
  try {
    // Check if course exists
    const [courseRows] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
    if (courseRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Update course details
      const updates = [];
      const values = [];
      
      if (title) {
        updates.push('title = ?');
        values.push(title);
      }
      
      if (description) {
        updates.push('description = ?');
        values.push(description);
      }
      
      if (instructor) {
        const [instructorRows] = await connection.query('SELECT id FROM users WHERE name = ?', [instructor]);
        if (instructorRows.length > 0) {
          updates.push('instructor_id = ?');
          values.push(instructorRows[0].id);
        }
      }
      
      if (category) {
        const [categoryRows] = await connection.query('SELECT id FROM categories WHERE name = ?', [category]);
        if (categoryRows.length > 0) {
          updates.push('category_id = ?');
          values.push(categoryRows[0].id);
        }
      }
      
      if (updates.length > 0) {
        values.push(courseId);
        await connection.query(`UPDATE courses SET ${updates.join(', ')} WHERE id = ?`, values);
      }
      
      // Update course sections if provided
      if (content) {
        // Delete existing sections
        await connection.query('DELETE FROM course_sections WHERE course_id = ?', [courseId]);
        
        // Insert new sections
        for (let i = 0; i < content.length; i++) {
          await connection.query(
            'INSERT INTO course_sections (course_id, title, description, order_index) VALUES (?, ?, ?, ?)',
            [courseId, content[i].title, content[i].text, i + 1]
          );
        }
      }
      
      // Commit transaction
      await connection.commit();
      connection.release();
      
      // Get the updated course
      const [updatedCourseRows] = await pool.query(`
        SELECT c.*, u.name as instructor, cat.name as category 
        FROM courses c
        LEFT JOIN users u ON c.instructor_id = u.id
        LEFT JOIN categories cat ON c.category_id = cat.id
        WHERE c.id = ?
      `, [courseId]);
      
      // Get course sections
      const [sectionRows] = await pool.query(`
        SELECT id, title, description 
        FROM course_sections 
        WHERE course_id = ? 
        ORDER BY order_index
      `, [courseId]);
      
      const updatedCourse = {
        id: updatedCourseRows[0].id,
        title: updatedCourseRows[0].title,
        description: updatedCourseRows[0].description,
        instructor: updatedCourseRows[0].instructor,
        category: updatedCourseRows[0].category,
        content: sectionRows.map(section => ({
          title: section.title,
          text: section.description
        }))
      };
      
      res.json({ success: true, data: updatedCourse });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete course
app.delete('/api/courses/:id', async (req, res) => {
  try {
    // Check if course exists
    const [courseRows] = await pool.query('SELECT * FROM courses WHERE id = ?', [req.params.id]);
    if (courseRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    // Delete course (cascade will handle sections and feedback)
    await pool.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
    
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// FEEDBACK API

// Add feedback to a course
app.post('/api/courses/:id/feedback', async (req, res) => {
  const { userId, rating, comment } = req.body;
  const courseId = req.params.id;
  
  if (!userId || !rating) {
    return res.status(400).json({ success: false, message: 'Please provide userId and rating' });
  }
  
  try {
    // Check if course exists
    const [courseRows] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
    if (courseRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    // Check if user already submitted feedback for this course
    const [existingFeedback] = await pool.query(
      'SELECT * FROM course_feedback WHERE course_id = ? AND user_id = ?',
      [courseId, userId]
    );
    
    if (existingFeedback.length > 0) {
      // Update existing feedback
      await pool.query(
        'UPDATE course_feedback SET rating = ?, comment = ? WHERE course_id = ? AND user_id = ?',
        [rating, comment, courseId, userId]
      );
    } else {
      // Insert new feedback
      await pool.query(
        'INSERT INTO course_feedback (course_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
        [courseId, userId, rating, comment]
      );
    }
    
    // Get the user's name
    const [userRows] = await pool.query('SELECT name FROM users WHERE id = ?', [userId]);
    const userName = userRows.length > 0 ? userRows[0].name : 'Unknown User';
    
    // Get the newly created/updated feedback
    const [feedbackRows] = await pool.query(
      'SELECT * FROM course_feedback WHERE course_id = ? AND user_id = ?',
      [courseId, userId]
    );
    
    const newFeedback = {
      id: feedbackRows[0].id,
      userId: feedbackRows[0].user_id,
      userName: userName, // Add user name for display
      rating: feedbackRows[0].rating,
      comment: feedbackRows[0].comment,
      createdAt: feedbackRows[0].created_at
    };
    
    res.status(201).json({ success: true, data: newFeedback });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all feedback for a course
app.get('/api/courses/:id/feedback', async (req, res) => {
  try {
    // Check if course exists
    const [courseRows] = await pool.query('SELECT * FROM courses WHERE id = ?', [req.params.id]);
    if (courseRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    // Get feedback with user names
    const [feedbackRows] = await pool.query(`
      SELECT f.*, u.name as userName
      FROM course_feedback f
      LEFT JOIN users u ON f.user_id = u.id
      WHERE f.course_id = ?
      ORDER BY f.created_at DESC
    `, [req.params.id]);
    
    const feedback = feedbackRows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.userName,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at
    }));
    
    res.json({ success: true, data: feedback });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// USER API

// Simple login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }
  
  try {
    // First, find the user by email only
    const [userRows] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (userRows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const user = userRows[0];
    
  
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Register new user
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
  }
  
  try {
    // Check if email already exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }
    
    // Store password as plain text for now
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, password, role || 'student']
    );
    
    const [newUserRows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    const newUser = newUserRows[0];
    
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({ success: true, data: userWithoutPassword });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ENROLLMENT API

// Enroll in a course
app.post('/api/courses/:id/enroll', async (req, res) => {
  const { userId } = req.body;
  const courseId = req.params.id;
  
  if (!userId) {
    return res.status(400).json({ success: false, message: 'Please provide userId' });
  }
  
  try {
    // Check if course exists
    const [courseRows] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
    if (courseRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    // Check if user is already enrolled
    const [enrollmentRows] = await pool.query(
      'SELECT * FROM course_enrollments WHERE course_id = ? AND user_id = ?',
      [courseId, userId]
    );
    
    if (enrollmentRows.length > 0) {
      return res.status(400).json({ success: false, message: 'Already enrolled in this course' });
    }
    
    // Create enrollment
    await pool.query(
      'INSERT INTO course_enrollments (course_id, user_id) VALUES (?, ?)',
      [courseId, userId]
    );
    
    res.status(201).json({ success: true, message: 'Enrolled successfully' });
  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get enrolled courses for a user
app.get('/api/users/:id/enrollments', async (req, res) => {
  const userId = req.params.id;
  
  try {
    const [rows] = await pool.query(`
      SELECT c.*, u.name as instructor, cat.name as category 
      FROM course_enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE e.user_id = ?
    `, [userId]);
    
    const enrolledCourses = rows.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      instructor: course.instructor,
      category: course.category,
      enrolledAt: course.enrolled_at
    }));
    
    res.json({ success: true, data: enrolledCourses });
  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// COURSE CONTENT API

// Add course content (videos/documents)
app.post('/api/courses/:id/content', async (req, res) => {
  const { title, type, url, description, sectionId } = req.body;
  const courseId = req.params.id;
  
  if (!title || !type || !url || !sectionId) {
    return res.status(400).json({ success: false, message: 'Please provide title, type, url, and sectionId' });
  }
  
  try {
    // Check if course exists
    const [courseRows] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
    if (courseRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    // Check if section exists
    const [sectionRows] = await pool.query('SELECT * FROM course_sections WHERE id = ? AND course_id = ?', [sectionId, courseId]);
    if (sectionRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }
    
    // Create course_content table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_content (
        id INT PRIMARY KEY AUTO_INCREMENT,
        section_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        type ENUM('video', 'document') NOT NULL,
        url VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE CASCADE
      )
    `);
    
    // Insert content
    const [result] = await pool.query(
      'INSERT INTO course_content (section_id, title, type, url, description) VALUES (?, ?, ?, ?, ?)',
      [sectionId, title, type, url, description]
    );
    
    const contentId = result.insertId;
    
    res.status(201).json({ 
      success: true, 
      data: {
        id: contentId,
        title,
        type,
        url,
        description,
        sectionId
      } 
    });
  } catch (error) {
    console.error('Error adding course content:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get content for a course section
app.get('/api/sections/:id/content', async (req, res) => {
  const sectionId = req.params.id;
  
  try {
    // Check if course_content table exists
    const [tables] = await pool.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'course_publishing_system' AND TABLE_NAME = 'course_content'
    `);
    
    if (tables.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    const [rows] = await pool.query(
      'SELECT * FROM course_content WHERE section_id = ? ORDER BY created_at',
      [sectionId]
    );
    
    const content = rows.map(item => ({
      id: item.id,
      title: item.title,
      type: item.type,
      url: item.url,
      description: item.description
    }));
    
    res.json({ success: true, data: content });
  } catch (error) {
    console.error('Error fetching section content:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});