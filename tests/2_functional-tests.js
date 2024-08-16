const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server'); // Adjust the path to your server file

chai.use(chaiHttp);

suite('Functional Tests', function() {
  let threadId; 
  let threadDelId; 
  let replyId; 
  let replyDelId; 

   // Setup before all tests
   before(function(done) {
    // Create a new thread for general testing and deletion testing
    chai.request(server)
      .post('/api/threads/testBoard')
      .send({ text: 'Setup thread for testing', delete_password: 'setupPassword123' })
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        assert.equal(res.status, 200);
        assert.equal(res.body.message, 'thread created');
        threadId = res.body.thread_id; 

        // Create another thread for deletion testing
        chai.request(server)
          .post('/api/threads/testBoard')
          .send({ text: 'Setup thread for deletion testing', delete_password: 'setupPassword123' })
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            assert.equal(res.status, 200);
            assert.equal(res.body.message, 'thread created');
            threadDelId = res.body.thread_id;

            // Create a reply in the first thread
            chai.request(server)
              .post('/api/replies/testBoard')
              .send({ thread_id: threadId, text: 'Setup reply for testing', delete_password: 'setupPassword123' })
              .end(function(err, res) {
                if (err) {
                  return done(err);
                }
                assert.equal(res.status, 200);
                assert.equal(res.body.message, 'Reply created');
                replyId = res.body.reply_id;


                    // Create a reply for delete
                    chai.request(server)
                    .post('/api/replies/testBoard')
                    .send({ thread_id: threadId, text: 'Setup reply for delete testing', delete_password: 'setupPassword123' })
                    .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    assert.equal(res.status, 200);
                    assert.equal(res.body.message, 'Reply created');
                    replyDelId = res.body.reply_id;
                    done();
                });
              });
          });
      });
  });

  // Test 1: Creating a new thread
  test('POST /api/threads/{board} - Creating a new thread', function(done) {
    chai.request(server)
      .post('/api/threads/testBoard')
      .send({ text: 'Test thread', delete_password: 'password123' })
      .end(function(err, res) {
        assert.isNull(err, 'No error should be returned');
        assert.equal(res.status, 200, 'Status should be 200');
        assert.equal(res.body.message, 'thread created', 'Response message should be "thread created"');
        assert.property(res.body, 'thread_id', 'Response should contain thread_id');
        done();
      });
  });

  // Test 2: Viewing the 10 most recent threads with 3 replies each
  test('GET /api/threads/{board} - Viewing the 10 most recent threads with 3 replies each', function(done) {
    chai.request(server)
      .get('/api/threads/testBoard')
      .end(function(err, res) {
        assert.isNull(err, 'No error should be returned');
        assert.equal(res.status, 200, 'Status should be 200');
        assert.isArray(res.body, 'Response body should be an array');
        done();
      });
  });

  // Test 3: Deleting a thread with incorrect password
  test('DELETE /api/threads/{board} - Deleting a thread with incorrect password', function(done) {
    chai.request(server)
      .delete('/api/threads/testBoard')
      .send({ thread_id: threadDelId, delete_password: 'wrongpassword' })
      .end(function(err, res) {
        assert.isNull(err, 'No error should be returned');
        assert.equal(res.status, 200, 'Status should be 200');
        assert.equal(res.text, 'incorrect password', 'Response text should be "Incorrect password"');
        done();
      });
  });

  // Test 4: Deleting a thread with the correct password
  test('DELETE /api/threads/{board} - Deleting a thread with the correct password', function(done) {
    chai.request(server)
      .delete('/api/threads/testBoard')
      .send({ thread_id: threadDelId, delete_password: 'setupPassword123' })
      .end(function(err, res) {
        assert.isNull(err, 'No error should be returned');
        assert.equal(res.status, 200, 'Status should be 200');
        assert.equal(res.text, 'success', 'Response text should be "success"');
        done();
      });
  });

  // Test 5: Reporting a thread
  test('PUT /api/threads/{board} - Reporting a thread', function(done) {
    chai.request(server)
      .put('/api/threads/testBoard')
      .send({ thread_id: threadId })
      .end(function(err, res) {
        assert.isNull(err, 'No error should be returned');
        assert.equal(res.status, 200, 'Status should be 200');
        assert.equal(res.text, 'reported', 'Response text should be "reported"');
        done();
      });
  });

  // Test 6: Creating a new reply
  test('POST /api/replies/{board} - Creating a new reply', function(done) {
    chai.request(server)
      .post('/api/replies/testBoard')
      .send({ thread_id: threadId, text: 'Test reply', delete_password: 'replypassword123' })
      .end(function(err, res) {
        assert.isNull(err, 'No error should be returned');
        assert.equal(res.status, 200, 'Status should be 200');
        assert.equal(res.body.message, 'Reply created', 'Response message should be "Reply created"');
        assert.property(res.body, 'reply_id', 'Response should contain reply_id');
        done();
      });
  });

  // Test 7: Viewing a single thread with all replies
  test('GET /api/replies/{board} - Viewing a single thread with all replies', function(done) {
    chai.request(server)
      .get('/api/replies/testBoard')
      .query({ thread_id: threadId })
      .end(function(err, res) {
        assert.isNull(err, 'No error should be returned');
        assert.equal(res.status, 200, 'Status should be 200');
        assert.property(res.body, 'replies', 'Response body should contain "replies" property');
        assert.isArray(res.body.replies, 'Replies should be an array');
        done();
      });
  });

  // Test 8: Deleting a reply with incorrect password
  test('DELETE /api/replies/{board} - Deleting a reply with incorrect password', function(done) {
    chai.request(server)
      .delete('/api/replies/testBoard')
      .send({ thread_id: threadId, reply_id: replyDelId, delete_password: 'wrongpassword' })
      .end(function(err, res) {
        assert.isNull(err, 'No error should be returned');
        assert.equal(res.status, 200, 'Status should be 200');
        assert.equal(res.text, 'incorrect password', 'Response text should be "incorrect password"');
        done();
      });
  });

  // Test 9: Deleting a reply with the correct password
  test('DELETE /api/replies/{board} - Deleting a reply with the correct password', function(done) {
    chai.request(server)
      .delete('/api/replies/testBoard')
      .send({ thread_id: threadId, reply_id: replyDelId, delete_password: 'setupPassword123' })
      .end(function(err, res) {
        assert.isNull(err, 'No error should be returned');
        assert.equal(res.status, 200, 'Status should be 200');
        assert.equal(res.text, 'success', 'Response text should be "success"');
        done();
      });
  });

  // Test 10: Reporting a reply
  test('PUT /api/replies/{board} - Reporting a reply', function(done) {
    chai.request(server)
      .put('/api/replies/testBoard')
      .send({ thread_id: threadId, reply_id: replyId })
      .end(function(err, res) {
        assert.isNull(err, 'No error should be returned');
        assert.equal(res.status, 200, 'Status should be 200');
        assert.equal(res.text, 'reported', 'Response text should be "reported"');
        done();
      });
  });
});
