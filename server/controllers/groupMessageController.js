// server/controllers/groupMessageController.js
const db = require('../db');
const axios = require('axios');

// @desc    Create a group message and handle @ai tag
// @route   POST /api/groups/:groupId/messages
// @access  Private (Group members only)
const createGroupMessage = async (req, res) => {
    const { group_id, message_content } = req.body;
    const sender_id = req.user.id;

    try {
        // Save the original message
        const [result] = await db.query(
            'INSERT INTO group_messages (group_id, sender_id, message_content) VALUES (?, ?, ?)',
            [group_id, sender_id, message_content]
        );
        const messageId = result.insertId;

        // Emit the original message through the socket first
        const [senderDetails] = await db.query('SELECT id, name FROM users WHERE id = ?', [sender_id]);
        req.io.to(`group_${group_id}`).emit('new message', {
            id: messageId,
            group_id,
            sender_id,
            message_content,
            timestamp: new Date().toISOString(),
            is_ai_response: 0,
            sender: senderDetails[0]
        });

        // Check if the message contains the @ai tag
        if (message_content.includes('@ai')) {
            // Fetch the chat history for the group
            const [messages] = await db.query(
                'SELECT u.name as sender, gm.message_content FROM group_messages gm JOIN users u ON gm.sender_id = u.id WHERE gm.group_id = ? ORDER BY gm.timestamp ASC',
                [group_id]
            );

            const chat_data = messages.map(msg => `${msg.sender}: ${msg.message_content}`).join('\n');
            
            // Call the AI service
            const aiServiceResponse = await axios.post('http://localhost:5001/analyze', {
                chat_data,
                user_prompt: message_content,
            });

            const ai_response = aiServiceResponse.data.response;

            // Save the AI's response as a new message
            const [aiMessageResult] = await db.query(
                'INSERT INTO group_messages (group_id, sender_id, message_content, is_ai_response) VALUES (?, ?, ?, ?)',
                [group_id, new ID, ai_response, 1] // Assuming user ID 2 is for the AI bot
            );

            // Emit the AI message through the socket
            req.io.to(`group_${group_id}`).emit('new message', {
                id: aiMessageResult.insertId,
                group_id,
                sender_id: new ID, // AI Bot user ID
                message_content: ai_response,
                timestamp: new Date().toISOString(),
                is_ai_response: 1,
                sender: { id: new ID, name: 'AI Assistant' }
            });
        }

        res.status(201).json({ message: 'Message created successfully', messageId });
    } catch (error) {
        res.status(500).json({ message: 'Error creating message', error: error.message });
    }
};

// @desc    Edit a group message
// @route   PUT /api/groups/:groupId/messages/:messageId
// @access  Private (Only message sender can edit)
const editGroupMessage = async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId, 10);
        const messageId = parseInt(req.params.messageId, 10);
        const { message_content } = req.body;
        const userId = req.user.id;

        if (isNaN(groupId) || isNaN(messageId)) {
            return res.status(400).json({ message: 'Invalid group or message ID.' });
        }

        if (!message_content || message_content.trim() === '') {
            return res.status(400).json({ message: 'Message content is required.' });
        }

        const [messages] = await db.query(
            'SELECT sender_id FROM group_messages WHERE id = ? AND group_id = ?',
            [messageId, groupId]
        );

        if (messages.length === 0) {
            return res.status(404).json({ message: 'Message not found in this group.' });
        }

        if (messages[0].sender_id !== userId) {
            return res.status(403).json({ message: 'You can only edit your own messages.' });
        }

        await db.query(
            'UPDATE group_messages SET message_content = ?, edited_at = NOW() WHERE id = ?',
            [message_content.trim(), messageId]
        );

        const [updatedMessages] = await db.query(
            `SELECT gm.*, u.name as sender_name, u.username as sender_username 
             FROM group_messages gm 
             JOIN users u ON gm.sender_id = u.id 
             WHERE gm.id = ?`,
            [messageId]
        );

        res.json({
            success: true,
            message: 'Message updated successfully',
            data: updatedMessages[0]
        });

    } catch (error) {
        console.error('Error editing group message:', error);
        res.status(500).json({ message: 'Server error while editing message' });
    }
};

// @desc    Delete a group message
// @route   DELETE /api/groups/:groupId/messages/:messageId
const deleteGroupMessage = async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId, 10);
        const messageId = parseInt(req.params.messageId, 10);
        const userId = req.user.id;

        if (isNaN(groupId) || isNaN(messageId)) {
            return res.status(400).json({ message: 'Invalid group or message ID.' });
        }

        const [messages] = await db.query(
            `SELECT gm.sender_id, g.owner_id 
             FROM group_messages gm 
             JOIN \`groups\` g ON gm.group_id = g.id
             WHERE gm.id = ? AND gm.group_id = ?`,
            [messageId, groupId]
        );

        if (messages.length === 0) {
            return res.status(404).json({ message: 'Message not found in this group.' });
        }

        const { sender_id, owner_id } = messages[0];

        if (sender_id !== userId && owner_id !== userId) {
            return res.status(403).json({ message: 'You do not have permission to delete this message.' });
        }

        await db.query('DELETE FROM group_messages WHERE id = ?', [messageId]);

        res.json({
            success: true,
            message: 'Message deleted successfully',
            data: { messageId, groupId }
        });

    } catch (error) {
        console.error('Error deleting group message:', error);
        res.status(500).json({ message: 'Server error while deleting message.' });
    }
};

// @desc    Get a specific group message
// @route   GET /api/groups/:groupId/messages/:messageId
// @access  Private (Group members only)
const getGroupMessage = async (req, res) => {
    try {
        const { groupId, messageId } = req.params;
        const userId = req.user.id;

        const [membership] = await db.query(
            'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?',
            [groupId, userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'You are not a member of this group'
            });
        }

        const [messages] = await db.query(
            `SELECT gm.*, u.name as sender_name, u.username as sender_username 
             FROM group_messages gm 
             JOIN users u ON gm.sender_id = u.id 
             WHERE gm.id = ? AND gm.group_id = ?`,
            [messageId, groupId]
        );

        if (messages.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        res.json({
            success: true,
            data: messages[0]
        });

    } catch (error) {
        console.error('Error fetching group message:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching message'
        });
    }
};

module.exports = {
    createGroupMessage,
    editGroupMessage,
    deleteGroupMessage,
    getGroupMessage
};