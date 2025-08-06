const request = require('supertest');
const express = require('express');
const mysql = require('mysql2/promise');

// Mock the mysql connection pool
jest.mock('mysql2/promise', () => {
  const mockPool = {
    getConnection: jest.fn().mockResolvedValue({
      release: jest.fn(),
      beginTransaction: jest.fn().mockResolvedValue(true),
      commit: jest.fn().mockResolvedValue(true),
      rollback: jest.fn().mockResolvedValue(true),
      query: jest.fn()
    }),
    query: jest.fn()
  };
  return {
    createPool: jest.fn().mockReturnValue(mockPool)
  };
});

// Import the server app after mocking
const app = require('../server');

describe('Course API', () => {
  let mockPool;

  beforeEach(() => {
    // Reset mock data before each test
    jest.clearAllMocks();
    mockPool = mysql.createPool();
  });

  describe('GET /api/courses', () => {
    it('should return all published courses', async () => {
      // Mock the database response
      const mockCourses = [
        { 
          id: 1, 
          title: 'Test Course 1', 
          description: 'Test Description 1', 
          instructor: 'Test Instructor', 
          category: 'Programming',
          cover_image: null
        }
      ];

      mockPool.query.mockResolvedValueOnce([mockCourses]);

      const response = await request(app).get('/api/courses');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Test Course 1');
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/api/courses');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/courses/:id', () => {
    it('should return a specific course with its details', async () => {
      // Mock course data
      const mockCourse = [
        { 
          id: 1, 
          title: 'Test Course', 
          description: 'Test Description', 
          instructor: 'Test Instructor',
          instructor_id: 1, 
          category: 'Programming'
        }
      ];

      // Mock sections data
      const mockSections = [
        { id: 1, title: 'Section 1', description: 'Section 1 content' }
      ];

      // Mock tables check
      const mockTables = [{ TABLE_NAME: 'course_content' }];

      // Mock content data
      const mockContent = [
        { id: 1, title: 'Content 1', type: 'video', url: 'http://example.com', description: 'Content description' }
      ];

      // Mock enrollment check
      const mockEnrollment = [{ id: 1 }];

      // Set up mock responses
      mockPool.query.mockResolvedValueOnce([mockCourse]);
      mockPool.query.mockResolvedValueOnce([mockSections]);
      mockPool.query.mockResolvedValueOnce([mockTables]);
      mockPool.query.mockResolvedValueOnce([mockContent]);
      mockPool.query.mockResolvedValueOnce([mockEnrollment]);

      const response = await request(app)
        .get('/api/courses/1')
        .query({ userId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Course');
      expect(response.body.data.instructor_id).toBe(1);
      expect(response.body.data.isEnrolled).toBe(true);
      expect(response.body.data.content).toHaveLength(1);
    });

    it('should return 404 for non-existent course', async () => {
      mockPool.query.mockResolvedValueOnce([[]]);  // Empty result means course not found

      const response = await request(app).get('/api/courses/999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/courses', () => {
    it('should create a new course', async () => {
      const courseData = {
        title: 'New Course',
        description: 'Course Description',
        instructor: 'Test Instructor',
        category: 'Programming',
        content: [
          { title: 'Section 1', text: 'Section 1 content' }
        ]
      };

      // Mock instructor query
      mockPool.getConnection().query.mockResolvedValueOnce([[{ id: 1 }]]);
      
      // Mock category query
      mockPool.getConnection().query.mockResolvedValueOnce([[{ id: 1 }]]);
      
      // Mock course insert
      mockPool.getConnection().query.mockResolvedValueOnce([{ insertId: 1 }]);
      
      // Mock section insert
      mockPool.getConnection().query.mockResolvedValueOnce([{ insertId: 1 }]);
      
      // Mock course query after creation
      mockPool.query.mockResolvedValueOnce([[
        { 
          id: 1, 
          title: 'New Course', 
          description: 'Course Description', 
          instructor: 'Test Instructor', 
          category: 'Programming' 
        }
      ]]);

      const response = await request(app)
        .post('/api/courses')
        .send(courseData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('New Course');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/courses')
        .send({ title: 'Incomplete Course' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/courses/:id', () => {
    it('should delete a course', async () => {
      // Mock course exists check
      mockPool.query.mockResolvedValueOnce([[{ id: 1 }]]);
      
      // Mock delete operation
      mockPool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app).delete('/api/courses/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Course deleted successfully');
    });

    it('should return 404 if course does not exist', async () => {
      mockPool.query.mockResolvedValueOnce([[]]); // Empty result means course not found

      const response = await request(app).delete('/api/courses/999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});