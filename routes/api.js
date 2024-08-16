'use strict';

module.exports = function (app) {
  const mongoose = require('mongoose');

  // Connect to MongoDB
  mongoose.connect(process.env.MONGO_URI);

  // Define schemas and models
  const threadSchema = new mongoose.Schema({
    board: String,
    text: String,
    delete_password: String,
    reported: { type: Boolean, default: false },
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reply' }],
    created_on: { type: Date, default: Date.now },
    bumped_on: { type: Date, default: Date.now }
  });

  const replySchema = new mongoose.Schema({
    thread_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread' },
    text: String,
    delete_password: String,
    reported: { type: Boolean, default: false },
    created_on: { type: Date, default: Date.now },
  });

  const Thread = mongoose.model('Thread', threadSchema);
  const Reply = mongoose.model('Reply', replySchema);

  // Create a new thread 
  app.post('/api/threads/:board', async (req, res) => {
    const {text, delete_password } = req.body;
    const board = req.params.board;

      if (!text || !delete_password) return res.status(400).send('Missing fields');
    try{
      const thread = new Thread({ board, text, delete_password });
      await thread.save();
    
      res.status(200).json({ thread_id: thread._id, message: 'thread created' });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });



  // Create a new reply 
  app.post('/api/replies/:board', async (req, res) => {
    const { thread_id, text, delete_password } = req.body;

    if (thread_id) {
      try{
        // Check if the thread_id is valid
        const thread = await Thread.findById(thread_id);

        if (!thread) {
          res.status(400).send('Thread not found!')
        } else {
          // If thread found, create a reply and update the thread
          const reply = new Reply({ thread_id, text, delete_password });
          await reply.save();

          // Update the thread with new reply and bump the thread
          await Thread.findByIdAndUpdate(thread_id, {
            $push: { replies: reply._id },
            bumped_on: reply.created_on
          });

          return res.status(200).json({ reply_id: reply._id, message: 'Reply created' });
        }
      } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
      }
  }});



// View the 10 most recent threads with 3 replies each
app.get('/api/threads/:board', async (req, res) => {
  const board = req.params.board;
  const { thread_id } = req.query;

  let threads = [];
  try{
    // If no thread_id, find the most recent 10 threads
    threads = await Thread.find({ board })
      .sort({ bumped_on: -1 })
      .limit(10)
      .populate({
        path: 'replies',
        select: '-delete_password -reported',
        options: { sort: { _id: -1 }, limit: 3 }
      });

    // Add replycount to each thread
    const result = threads.map(thread => ({
      _id: thread._id,
      text: thread.text,
      created_on: thread.created_on,
      bumped_on: thread.bumped_on,
      replies: thread.replies,
      replycount: thread.replies.length
    }));

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


  // Delete a thread
  app.delete('/api/threads/:board', async (req, res) => {
    const { thread_id, delete_password } = req.body;

    if (!thread_id || !delete_password) return res.status(400).send('Missing fields');
    try{
      const thread = await Thread.findById(thread_id);

      if (!thread) return res.status(404).send('Thread not found');
      if (thread.delete_password !== delete_password) return res.status(200).send('incorrect password');

      await Thread.deleteOne({ _id: thread_id });
      res.status(200).send('success');
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });

  // Report a thread
  app.put('/api/threads/:board', async (req, res) => {
    const { thread_id } = req.body;

    if (!thread_id) return res.status(400).send('Missing thread_id');
    try{
      const thread = await Thread.findById(thread_id);

      if (!thread) return res.status(404).send('Thread not found');

      thread.reported = true;
      await thread.save();

      res.status(200).send('reported');
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });

  // Create a new reply
  app.post('/api/replies/:board', async (req, res) => {
    const { thread_id, text, delete_password } = req.body;

    if (!thread_id || !text || !delete_password) return res.status(400).send('Missing fields');
    try {
      const reply = new Reply({ thread_id, text, delete_password });
      await reply.save();

      // Update thread with new reply and bump the thread
      await Thread.findByIdAndUpdate(thread_id, {
        $push: { replies: reply._id },
        bumped_on: reply.created_on
      });

      res.status(200).json({ reply_id: reply._id, message: 'Reply created' });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });

  //get one thread 
  app.get('/api/replies/:board', async (req, res) => {
    const board = req.params.board;
    const { thread_id } = req.query;
  
    let threads = [];
    try{
      // If thread_id is provided, find that specific thread
      const thread = await Thread.findOne({ board, _id: thread_id })
        .populate({
          path: 'replies',
          select: '-delete_password -reported',
          options: { sort: { _id: -1 }, limit: 3 }
        });
    
      // Check if the thread was found and push to the array if so
      if (thread) {
        threads.push(thread);
      }
    
      // Add replycount to each thread
      const result = threads.map(thread => ({
        _id: thread._id,
        text: thread.text,
        created_on: thread.created_on,
        bumped_on: thread.bumped_on,
        replies: thread.replies,
        replycount: thread.replies.length
      }));
    
      res.status(200).json(result[0]);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });

  // Delete a reply
  app.delete('/api/replies/:board', async (req, res) => {
    const { thread_id, reply_id, delete_password } = req.body;

    if (!thread_id || !reply_id || !delete_password) return res.status(400).send('Missing fields');
    try {
      const reply = await Reply.findById(reply_id);

      if (!reply) return res.status(404).send('Reply not found');
      if (reply.delete_password !== delete_password) return res.status(200).send('incorrect password');

      reply.text = '[deleted]';
      await reply.save();

      res.status(200).send('success');
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });

  // Report a reply
  app.put('/api/replies/:board', async (req, res) => {
    const { thread_id, reply_id } = req.body;

    if (!thread_id || !reply_id) return res.status(400).send('Missing fields');
    try{
    const reply = await Reply.findById(reply_id);

    if (!reply) return res.status(404).send('Reply not found');

    reply.reported = true;
    await reply.save();

    res.status(200).send('reported');
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });
};
