const { expect } = require('chai');
const request = require('supertest');

describe('Samples API', () => {
  let app;
  let db;
  let authToken;

  before(() => {
    app = createTestApp();
    db = createTestDatabase();
    authToken = generateTestToken();
  });

  after(() => {
    if (db) {
      db.close();
    }
    cleanupTestDatabase();
  });

  beforeEach(() => {
    cleanupTestData(db);
    
    // Insert test case for foreign key constraint
    const testCase = generateTestCase();
    const stmt = db.prepare(`
      INSERT INTO test_cases (case_number, ref_kit_number, submission_date, client_type)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(testCase.case_number, testCase.ref_kit_number, testCase.submission_date, testCase.client_type);
  });

  describe('GET /api/samples', () => {
    it('should return empty array when no samples exist', async () => {
      const response = await request(app)
        .get('/api/samples')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array').that.is.empty;
    });

    it('should return all samples', async () => {
      // Insert test samples
      const samples = [
        generateTestSample({ lab_number: '25_1' }),
        generateTestSample({ lab_number: '25_2', name: 'Jane', relation: 'Mother' })
      ];

      const stmt = db.prepare(`
        INSERT INTO samples (
          case_id, lab_number, name, surname, relation, status, workflow_status, case_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      samples.forEach(sample => {
        stmt.run(
          sample.case_id,
          sample.lab_number,
          sample.name,
          sample.surname,
          sample.relation,
          sample.status,
          sample.workflow_status,
          sample.case_number
        );
      });

      const response = await request(app)
        .get('/api/samples')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array').with.length(2);
      expect(response.body.data[0]).to.have.property('lab_number');
      expect(response.body.data[0]).to.have.property('name');
      expect(response.body.data[0]).to.have.property('relation');
    });

    it('should return samples in correct order', async () => {
      // Insert samples in different order
      const samples = [
        generateTestSample({ lab_number: '25_3', name: 'Bob', relation: 'Father' }),
        generateTestSample({ lab_number: '25_1', name: 'Alice', relation: 'Child' }),
        generateTestSample({ lab_number: '25_2', name: 'Carol', relation: 'Mother' })
      ];

      const stmt = db.prepare(`
        INSERT INTO samples (
          case_id, lab_number, name, surname, relation, status, workflow_status, case_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      samples.forEach(sample => {
        stmt.run(
          sample.case_id,
          sample.lab_number,
          sample.name,
          sample.surname,
          sample.relation,
          sample.status,
          sample.workflow_status,
          sample.case_number
        );
      });

      const response = await request(app)
        .get('/api/samples')
        .expect(200);

      expect(response.body.data).to.have.length(3);
      
      // Should be ordered by case_number, then lab_number sequence, then relation
      expect(response.body.data[0].relation).to.equal('Child');
      expect(response.body.data[1].relation).to.equal('Mother');
      expect(response.body.data[2].relation).to.equal('Father');
    });

    it('should handle database errors gracefully', async () => {
      // Close database to simulate error
      db.close();

      const response = await request(app)
        .get('/api/samples')
        .expect(500);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.have.property('message');
    });
  });

  describe('POST /api/samples', () => {
    it('should create a new sample successfully', async () => {
      const sampleData = {
        case_id: 1,
        lab_number: '25_TEST',
        name: 'Test',
        surname: 'Sample',
        relation: 'Child',
        case_number: 'CASE_2025_001'
      };

      const response = await request(app)
        .post('/api/samples')
        .send(sampleData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('id');
      expect(response.body.data.lab_number).to.equal(sampleData.lab_number);

      // Verify in database
      expectDatabaseToHave(db, 'samples', { lab_number: sampleData.lab_number });
    });

    it('should validate required fields', async () => {
      const invalidSampleData = {
        name: 'Test'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/samples')
        .send(invalidSampleData)
        .expect(422);

      expect(response.body.success).to.be.false;
      expect(response.body.error.errorCode).to.equal('VALIDATION_ERROR');
      expect(response.body.error.details).to.have.property('errors');
    });

    it('should enforce unique lab number constraint', async () => {
      const sampleData = generateTestSample({ lab_number: '25_DUPLICATE' });

      // Create first sample
      await request(app)
        .post('/api/samples')
        .send(sampleData)
        .expect(201);

      // Attempt to create duplicate
      const response = await request(app)
        .post('/api/samples')
        .send({ ...sampleData, name: 'Different Name' })
        .expect(409);

      expect(response.body.success).to.be.false;
      expect(response.body.error.errorCode).to.equal('CONFLICT');
    });

    it('should validate email format', async () => {
      const sampleData = generateTestSample({
        email: 'invalid-email'
      });

      const response = await request(app)
        .post('/api/samples')
        .send(sampleData)
        .expect(422);

      expect(response.body.error.details.errors).to.have.property('email');
    });

    it('should validate phone number format', async () => {
      const sampleData = generateTestSample({
        phone_number: 'invalid-phone'
      });

      const response = await request(app)
        .post('/api/samples')
        .send(sampleData)
        .expect(422);

      expect(response.body.error.details.errors).to.have.property('phone_number');
    });

    it('should validate date of birth', async () => {
      const sampleData = generateTestSample({
        date_of_birth: '2030-01-01' // Future date
      });

      const response = await request(app)
        .post('/api/samples')
        .send(sampleData)
        .expect(422);

      expect(response.body.error.details.errors).to.have.property('date_of_birth');
    });
  });

  describe('GET /api/samples/:id', () => {
    let sampleId;

    beforeEach(async () => {
      const sampleData = generateTestSample();
      const stmt = db.prepare(`
        INSERT INTO samples (
          case_id, lab_number, name, surname, relation, status, workflow_status, case_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        sampleData.case_id,
        sampleData.lab_number,
        sampleData.name,
        sampleData.surname,
        sampleData.relation,
        sampleData.status,
        sampleData.workflow_status,
        sampleData.case_number
      );
      
      sampleId = result.lastInsertRowid;
    });

    it('should return sample by ID', async () => {
      const response = await request(app)
        .get(`/api/samples/${sampleId}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('id', sampleId);
      expect(response.body.data).to.have.property('lab_number');
    });

    it('should return 404 for non-existent sample', async () => {
      const response = await request(app)
        .get('/api/samples/99999')
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error.errorCode).to.equal('NOT_FOUND');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/samples/invalid-id')
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.errorCode).to.equal('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/samples/:id', () => {
    let sampleId;

    beforeEach(async () => {
      const sampleData = generateTestSample();
      const stmt = db.prepare(`
        INSERT INTO samples (
          case_id, lab_number, name, surname, relation, status, workflow_status, case_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        sampleData.case_id,
        sampleData.lab_number,
        sampleData.name,
        sampleData.surname,
        sampleData.relation,
        sampleData.status,
        sampleData.workflow_status,
        sampleData.case_number
      );
      
      sampleId = result.lastInsertRowid;
    });

    it('should update sample successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        workflow_status: 'pcr_ready'
      };

      const response = await request(app)
        .put(`/api/samples/${sampleId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.name).to.equal(updateData.name);
      expect(response.body.data.workflow_status).to.equal(updateData.workflow_status);

      // Verify in database
      const stmt = db.prepare('SELECT name, workflow_status FROM samples WHERE id = ?');
      const result = stmt.get(sampleId);
      expect(result.name).to.equal(updateData.name);
      expect(result.workflow_status).to.equal(updateData.workflow_status);
    });

    it('should return 404 for non-existent sample', async () => {
      const response = await request(app)
        .put('/api/samples/99999')
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body.success).to.be.false;
    });

    it('should validate update data', async () => {
      const response = await request(app)
        .put(`/api/samples/${sampleId}`)
        .send({ email: 'invalid-email' })
        .expect(422);

      expect(response.body.error.details.errors).to.have.property('email');
    });
  });

  describe('DELETE /api/samples/:id', () => {
    let sampleId;

    beforeEach(async () => {
      const sampleData = generateTestSample();
      const stmt = db.prepare(`
        INSERT INTO samples (
          case_id, lab_number, name, surname, relation, status, workflow_status, case_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        sampleData.case_id,
        sampleData.lab_number,
        sampleData.name,
        sampleData.surname,
        sampleData.relation,
        sampleData.status,
        sampleData.workflow_status,
        sampleData.case_number
      );
      
      sampleId = result.lastInsertRowid;
    });

    it('should delete sample successfully', async () => {
      const response = await request(app)
        .delete(`/api/samples/${sampleId}`)
        .expect(200);

      expect(response.body.success).to.be.true;

      // Verify deletion
      expectDatabaseNotToHave(db, 'samples', { id: sampleId });
    });

    it('should return 404 for non-existent sample', async () => {
      const response = await request(app)
        .delete('/api/samples/99999')
        .expect(404);

      expect(response.body.success).to.be.false;
    });
  });

  describe('GET /api/samples/search', () => {
    beforeEach(async () => {
      const samples = [
        generateTestSample({ lab_number: '25_1', name: 'John', surname: 'Doe' }),
        generateTestSample({ lab_number: '25_2', name: 'Jane', surname: 'Smith' }),
        generateTestSample({ lab_number: '25_3', name: 'Bob', surname: 'Johnson' })
      ];

      const stmt = db.prepare(`
        INSERT INTO samples (
          case_id, lab_number, name, surname, relation, status, workflow_status, case_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      samples.forEach(sample => {
        stmt.run(
          sample.case_id,
          sample.lab_number,
          sample.name,
          sample.surname,
          sample.relation,
          sample.status,
          sample.workflow_status,
          sample.case_number
        );
      });
    });

    it('should search by name', async () => {
      const response = await request(app)
        .get('/api/samples/search?q=John')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.length(2); // John and Johnson
    });

    it('should search by lab number', async () => {
      const response = await request(app)
        .get('/api/samples/search?q=25_2')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.length(1);
      expect(response.body.data[0].lab_number).to.equal('25_2');
    });

    it('should return empty array for no matches', async () => {
      const response = await request(app)
        .get('/api/samples/search?q=nonexistent')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array').that.is.empty;
    });

    it('should require search query', async () => {
      const response = await request(app)
        .get('/api/samples/search')
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error.errorCode).to.equal('VALIDATION_ERROR');
    });
  });

  describe('Performance tests', () => {
    it('should handle large dataset efficiently', async () => {
      // Insert large number of samples
      const sampleCount = 1000;
      const samples = Array.from({ length: sampleCount }, (_, i) => 
        generateTestSample({ lab_number: `25_${i + 1}` })
      );

      const stmt = db.prepare(`
        INSERT INTO samples (
          case_id, lab_number, name, surname, relation, status, workflow_status, case_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction((samples) => {
        for (const sample of samples) {
          stmt.run(
            sample.case_id,
            sample.lab_number,
            sample.name,
            sample.surname,
            sample.relation,
            sample.status,
            sample.workflow_status,
            sample.case_number
          );
        }
      });

      transaction(samples);

      // Test API performance
      const start = Date.now();
      const response = await request(app)
        .get('/api/samples')
        .expect(200);
      const duration = Date.now() - start;

      expect(response.body.data).to.have.length(sampleCount);
      expect(duration).to.be.lessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = 10;
      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app).get('/api/samples')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
      });
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/samples')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.success).to.be.false;
    });

    it('should handle oversized payload', async () => {
      const largePayload = {
        name: 'A'.repeat(1000000) // 1MB string
      };

      const response = await request(app)
        .post('/api/samples')
        .send(largePayload)
        .expect(413);

      expect(response.body.success).to.be.false;
    });

    it('should sanitize XSS attempts', async () => {
      const xssPayload = generateTestSample({
        name: '<script>alert("xss")</script>'
      });

      const response = await request(app)
        .post('/api/samples')
        .send(xssPayload)
        .expect(201);

      expect(response.body.data.name).to.not.include('<script>');
    });
  });
});