'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/chat/dashboard/Sidebar';
import { useAuth } from '@/context/ApiContext';
import ChatWindow from '@/components/ChatWindow';
import EmptyState from '@/components/ChatWindow/EmptyState';

// Make sure this matches your backend AI_USER_ID
const AI_USER_ID = 3;

export default function ChatPage() { 
  const { user, API } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [groups, setGroups] = useState([]);
  const socket = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token || !user) {
      router.push('/chat/login');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (!user) return;

    const token = Cookies.get('token');
    socket.current = io('http://localhost:3001');

    socket.current.emit('authenticate', token);

    socket.current.on('new message', (message) => {
      // This 'if' condition decides whether to show the message
      if (
        // Regular messages between you and the selected user
        (message.sender_id === user.id && message.receiver_id === selectedUser?.id) ||
        (message.sender_id === selectedUser?.id && message.receiver_id === user.id) ||
        // AI responses that belong to the current chat context
        (message.is_ai_response && (
          // For private chats: AI response should show in the chat where question was asked
          (message.context_chat_id === selectedUser?.id) ||
          // Additional check for direct AI responses to user
          (message.receiver_id === user.id && selectedUser?.id === AI_USER_ID)
        ))
      ) {
        setMessages((prevMessages) => [...prevMessages, message]);
      }
    });

    socket.current.on('new group message', (message) => {
      if (selectedUser?.type === 'group' && message.group_id === selectedUser.id) {
        setMessages((prevMessages) => [...prevMessages, message]);
      }
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [user, selectedUser]);

  const handleSelectUser = async (userToSelect) => {
    setSelectedUser(userToSelect);
    try {
      let response;
      if (userToSelect.type === 'group') {
        response = await API.get(`/groups/${userToSelect.id}/messages`);
      } else {
        response = await API.get(`/messages/${userToSelect.id}`);
      }
      setMessages(response.data.data || response.data.messages || response.data || []);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      setMessages([]);
    }
  };

  const handleGroupUpdate = useCallback((updatedGroup) => {
    setGroups(prev => prev.map(group => 
      group.id === updatedGroup.id ? { ...group, ...updatedGroup } : group
    ));
    if (selectedUser?.id === updatedGroup.id) {
      setSelectedUser(prev => ({ ...prev, ...updatedGroup }));
    }
  }, [selectedUser]);

  const handleGroupDelete = useCallback((deletedGroupId) => {
    setGroups(prev => prev.filter(group => group.id !== deletedGroupId));
    if (selectedUser?.id === deletedGroupId) {
      setSelectedUser(null);
      setMessages([]);
    }
  }, [selectedUser]);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar
        onSelectUser={handleSelectUser}
        groups={groups}
        setGroups={setGroups}
        onGroupDelete={handleGroupDelete}
      />
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <ChatWindow
            key={selectedUser.id}
            selectedUser={selectedUser}
            messages={messages}
            setMessages={setMessages}
            socket={socket.current}
            onGroupUpdate={handleGroupUpdate}
            onGroupDelete={handleGroupDelete}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div> 
  );
}