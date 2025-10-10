// server/socket/socketManager.js
const jwt = require('jsonwebtoken');
const db = require('../db');
const axios = require('axios');

const onlineUsers = new Map();
// IMPORTANT: Make sure this ID matches your 'AI Assistant' user in the database
const AI_USER_ID = 3; 

const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 New connection: ${socket.id}`);

    // 1. Authenticate and Join Rooms
    socket.on('authenticate', async (token) => {
      if (!token) return console.log(`Auth failed for ${socket.id}: No token.`);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;

        // Join group rooms
        const [memberships] = await db.query('SELECT group_id FROM group_members WHERE user_id = ?', [userId]);
        memberships.forEach(membership => {
          const roomName = `group_${membership.group_id}`;
          socket.join(roomName);
          console.log(`✅ User ${userId} joined room: ${roomName}`);
        });

        console.log(`✅ User ${userId} authenticated. Online users:`, Array.from(onlineUsers.keys()));

      } catch (error) {
        console.log(`Auth failed for ${socket.id}: Invalid token.`);
        socket.disconnect();
      }
    });

    // 2. Handle private messages
    socket.on('privateMessage', async (data) => {
      const senderId = socket.userId;
      if (!senderId) return;

      console.log('📩 Received privateMessage data:', data);

      try {
        const { receiverId, messageContent } = data;
        
        if (!messageContent) {
          console.error('❌ messageContent is null or undefined');
          return;
        }

        const { processedMessage, tagsObject } = await processMessageTags(messageContent);
        
        const [result] = await db.query(
          'INSERT INTO messages (sender_id, receiver_id, message_content, tags) VALUES (?, ?, ?, ?)', 
          [senderId, receiverId, processedMessage, JSON.stringify(tagsObject)]
        );

        const message = { 
          id: result.insertId, 
          sender_id: senderId, 
          receiver_id: receiverId, 
          message_content: processedMessage, 
          tags: tagsObject, 
          timestamp: new Date() 
        };
        
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) io.to(receiverSocketId).emit('new message', message);
        socket.emit('new message', message);

        if (tagsObject.tags.some(tag => tag.type === 'ai_request')) {
          handleAITagging(senderId, receiverId, processedMessage, 'private', io);
        }

      } catch (error) { 
        console.error('Error handling private message:', error); 
      }
    });

    // 3. Handle group messages
    socket.on('groupMessage', async (data) => {
        const senderId = socket.userId;
        if (!senderId) return console.log('Cannot send group message: sender not authenticated.');

        console.log('📩 Received groupMessage data:', data);

        try {
            const { groupId, messageContent } = data;
            
            if (!messageContent) {
              console.error('❌ messageContent is null or undefined in group message');
              return;
            }

            const { processedMessage, tagsObject } = await processMessageTags(messageContent);
            
            const [result] = await db.query(
                'INSERT INTO group_messages (group_id, sender_id, message_content, tags) VALUES (?, ?, ?, ?)',
                [groupId, senderId, processedMessage, JSON.stringify(tagsObject)]
            );

            const [users] = await db.query('SELECT name, username FROM users WHERE id = ?', [senderId]);
            const senderInfo = users[0];

            const message = {
                id: result.insertId,
                group_id: groupId,
                sender_id: senderId,
                message_content: processedMessage,
                tags: tagsObject,
                timestamp: new Date(),
                sender_name: senderInfo.name,
                sender_username: senderInfo.username
            };
            
            const roomName = `group_${groupId}`;
            io.to(roomName).emit('new group message', message);

            if (tagsObject.tags.some(tag => tag.type === 'ai_request')) {
              handleAITagging(senderId, groupId, processedMessage, 'group', io);
            }

        } catch (error) {
            console.error('Error handling group message:', error);
        }
    });

    // 4. Handle chat analysis request
    socket.on('analyzeChat', async ({ chatId, chatType }) => {
      const userId = socket.userId;
      if (!userId) return;

      try {
        let chatHistory = '';
        
        if (chatType === 'private') {
          const [messages] = await db.query(
            `SELECT m.*, u.name as sender_name 
             FROM messages m 
             JOIN users u ON m.sender_id = u.id 
             WHERE (m.sender_id = ? AND m.receiver_id = ?) 
             OR (m.sender_id = ? AND m.receiver_id = ?) 
             ORDER BY m.timestamp ASC 
             LIMIT 100`,
            [userId, chatId, chatId, userId]
          );
          chatHistory = messages.map(msg => `${msg.sender_name}: ${msg.message_content}`).join('\n');
        } else if (chatType === 'group') {
          const [messages] = await db.query(
            `SELECT gm.*, u.name as sender_name 
             FROM group_messages gm 
             JOIN users u ON gm.sender_id = u.id 
             WHERE gm.group_id = ? 
             ORDER BY gm.timestamp ASC 
             LIMIT 100`,
            [chatId]
          );
          chatHistory = messages.map(msg => `${msg.sender_name}: ${msg.message_content}`).join('\n');
        }

        const aiResponse = await fetch('http://localhost:5002/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            history: chatHistory, 
            question: '', 
            analysis_mode: true 
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          socket.emit('analysisComplete', { 
            chatId, 
            chatType,
            analysis: aiData.answer 
          });
        } else {
          socket.emit('analysisError', { error: 'AI analysis failed' });
        }

      } catch (error) {
        console.error('Error analyzing chat:', error);
        socket.emit('analysisError', { error: 'Analysis failed' });
      }
    });

    // 5. Handle disconnection
    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        console.log(`❌ User ${socket.userId} disconnected.`);
      }
    });
  });
};

async function processMessageTags(messageContent) {
    const mentionRegex = /@(\w+)/g;
    const tags = [];
    const mentions = [];
    
    const potentialUsernames = (messageContent.match(mentionRegex) || [])
        .map(mention => mention.substring(1));

    if (potentialUsernames.length > 0) {
        const [users] = await db.query(
            'SELECT id, username FROM users WHERE username IN (?)',
            [potentialUsernames]
        );

        const userMap = new Map(users.map(user => [user.username, user.id]));

        for (const username of potentialUsernames) {
            const lowerUser = username.toLowerCase();
            if (lowerUser === 'ai') {
                tags.push({ type: 'ai_request' });
            } else if (userMap.has(username)) {
                mentions.push({
                    type: 'user_mention',
                    userId: userMap.get(username),
                    username: username
                });
            }
        }
    }

    return {
        processedMessage: messageContent,
        tagsObject: { mentions, tags }
    };
}

async function handleAITagging(senderId, chatId, messageContent, chatType, io) {
  try {
    console.log(`🤖 AI Tagging triggered - Sender: ${senderId}, Chat: ${chatId}, Type: ${chatType}`);
    
    const user_prompt = messageContent.replace(/@ai\s*/i, '').trim();
    console.log(`🤖 User prompt: "${user_prompt}"`);
    
    let chat_data = '';
    
    if (chatType === 'private') {
      const [messages] = await db.query(
        `SELECT u.name as sender, m.message_content 
         FROM messages m JOIN users u ON m.sender_id = u.id 
         WHERE (m.sender_id = ? AND m.receiver_id = ?) 
         OR (m.sender_id = ? AND m.receiver_id = ?) 
         ORDER BY m.timestamp ASC 
         LIMIT 50`,
        [senderId, chatId, chatId, senderId]
      );
      chat_data = messages.map(msg => `${msg.sender}: ${msg.message_content}`).join('\n');
      console.log(`🤖 Chat data fetched: ${messages.length} messages`);
    } else if (chatType === 'group') {
      const [messages] = await db.query(
        `SELECT u.name as sender, gm.message_content 
         FROM group_messages gm JOIN users u ON gm.sender_id = u.id 
         WHERE gm.group_id = ? 
         ORDER BY gm.timestamp ASC 
         LIMIT 50`,
        [chatId]
      );
      chat_data = messages.map(msg => `${msg.sender}: ${msg.message_content}`).join('\n');
    }
    
    console.log(`🤖 Sending request to AI service at http://localhost:5001/analyze`);
    
    const aiServiceResponse = await axios.post('http://localhost:5001/analyze', {
      chat_data,
      user_prompt,
    }, {
      timeout: 30000, // 30 second timeout
    });

    console.log(`🤖 AI Service response status: ${aiServiceResponse.status}`);
    console.log(`🤖 AI Service response data:`, aiServiceResponse.data);

    const aiMessageContent = aiServiceResponse.data.response || "I'm sorry, I couldn't process your request.";

    if (chatType === 'private') {
      // Store the AI response as part of the conversation between you and the other user
      const [result] = await db.query(
        'INSERT INTO messages (sender_id, receiver_id, message_content, is_ai_response, context_chat_id) VALUES (?, ?, ?, ?, ?)',
        [AI_USER_ID, chatId, aiMessageContent, 1, chatId]
      );
      
      const aiMessageObj = {
        id: result.insertId,
        sender_id: AI_USER_ID,
        receiver_id: chatId,
        message_content: aiMessageContent,
        is_ai_response: true,
        timestamp: new Date(),
        context_chat_id: chatId,
      };
      
      console.log(`🤖 AI Response stored in DB. ID: ${result.insertId}`);
      console.log(`🤖 AI Message Object:`, aiMessageObj);
      
      // Emit to both users in the conversation
      const senderSocketId = onlineUsers.get(senderId);
      const receiverSocketId = onlineUsers.get(chatId);
      
      console.log(`🤖 Sender socket ID: ${senderSocketId}, Receiver socket ID: ${receiverSocketId}`);
      
      if (senderSocketId) {
        io.to(senderSocketId).emit('new message', aiMessageObj);
        console.log(`🤖 Sent AI response to sender (${senderId})`);
      }
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new message', aiMessageObj);
        console.log(`🤖 Sent AI response to receiver (${chatId})`);
      }
      
    } else if (chatType === 'group') {
      const [result] = await db.query(
        'INSERT INTO group_messages (group_id, sender_id, message_content, is_ai_response) VALUES (?, ?, ?, ?)',
        [chatId, AI_USER_ID, aiMessageContent, 1]
      );
      
      const aiMessageObj = {
        id: result.insertId,
        group_id: chatId,
        sender_id: AI_USER_ID,
        message_content: aiMessageContent,
        is_ai_response: true,
        timestamp: new Date(),
        sender_name: 'AI Assistant',
        sender_username: 'ai_assistant'
      };
      
      const roomName = `group_${chatId}`;
      io.to(roomName).emit('new group message', aiMessageObj);
      console.log(`🤖 Sent AI response to group ${chatId}`);
    }
    
    console.log(`🤖 AI Tagging completed successfully`);
    
  } catch (error) {
    console.error('❌ Error handling AI tagging:', error);
    
    // Send error response back to user
    const errorMessage = "Sorry, I'm having trouble responding right now. Please try again later.";
    
    if (chatType === 'private') {
      const [result] = await db.query(
        'INSERT INTO messages (sender_id, receiver_id, message_content, is_ai_response, context_chat_id) VALUES (?, ?, ?, ?, ?)',
        [AI_USER_ID, chatId, errorMessage, 1, chatId]
      );
      
      const errorMessageObj = {
        id: result.insertId,
        sender_id: AI_USER_ID,
        receiver_id: chatId,
        message_content: errorMessage,
        is_ai_response: true,
        timestamp: new Date(),
        context_chat_id: chatId,
      };
      
      const senderSocketId = onlineUsers.get(senderId);
      if (senderSocketId) io.to(senderSocketId).emit('new message', errorMessageObj);
    }
  }
}

module.exports = { initializeSocket };