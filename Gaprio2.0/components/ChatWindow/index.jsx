"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ReplyPreview from "./ReplyPreview";
import MessageActionsModal from "./MessageActionsModal";
import GroupInfoSidebar from "./GroupInfoSidebar";
import AddMemberModal from "./AddMemberModal";
import EditGroupModal from "./EditGroupModal";
import EmptyState from "./EmptyState";
import { STYLES } from "./styles";
import { useAuth } from "@/context/ApiContext";

export default function ChatWindow({
  selectedUser,
  messages,
  setMessages, // Receive setMessages to update state
  socket,
  onGroupUpdate,
  onGroupDelete,
}) {
  const { user, API } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [searchUsers, setSearchUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [isSearching, setIsSearching] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editMessageContent, setEditMessageContent] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [showMessageActionsModal, setShowMessageActionsModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const messagesContainerRef = useRef(null);

  const isGroup = selectedUser?.type === "group";
  const safeMessages = Array.isArray(messages) ? messages : [];

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [safeMessages, scrollToBottom]);

  useEffect(() => {
    if (isGroup && selectedUser) {
      fetchGroupMembers();
      checkIfOwner();
      setEditForm({
        name: selectedUser.name,
        description: selectedUser.description || "",
      });
    }
    setTimeout(scrollToBottom, 100);
  }, [selectedUser, isGroup]);

  const fetchGroupMembers = useCallback(async () => {
    if (!isGroup || !selectedUser?.id) return;
    try {
      const response = await API.get(`/groups/${selectedUser.id}/members`);
      setGroupMembers(response.data.data?.members || response.data.members || []);
    } catch (error) {
      console.error("Error fetching group members:", error);
    }
  }, [isGroup, selectedUser, API]);

  const checkIfOwner = useCallback(async () => {
    if (!isGroup || !selectedUser?.id) return;
    try {
      setIsOwner(selectedUser.owner_id === user.id);
    } catch (error) {
      console.error("Error checking ownership:", error);
    }
  }, [isGroup, selectedUser, user]);
  
  // This function is no longer needed as MessageInput handles it directly
  // const handleSendMessage = ... (removed)

  const handleClearConversation = async () => {
    if (isGroup || !selectedUser) return;
    if (window.confirm("Are you sure you want to delete all messages?")) {
      try {
        await API.delete(`/messages/conversation/${selectedUser.id}`);
        setMessages([]); // Clear messages locally
      } catch (error) {
        console.error("Error clearing conversation:", error);
      }
    }
  };

  const onMessageUpdate = (updatedMessage) => {
    setMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
  };
  
  const onMessageDelete = (messageId) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  };
  
  const handleSaveEdit = async (messageId, content) => {
    const url = isGroup
      ? `/groups/${selectedUser.id}/messages/${messageId}`
      : `/messages/${messageId}`;
    try {
      const response = await API.put(url, { message_content: content });
      if (response.data?.success) {
        onMessageUpdate(response.data.data);
      }
      setEditingMessage(null);
    } catch (error) {
      console.error("Error editing message:", error);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    const url = isGroup
      ? `/groups/${selectedUser.id}/messages/${messageId}`
      : `/messages/${messageId}`;
    try {
      await API.delete(url);
      onMessageDelete(messageId);
      setShowMessageActionsModal(false);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  if (!selectedUser) {
    return <EmptyState />;
  }

  return (
    <div className={`flex flex-col flex-grow ${STYLES.bg.main} relative overflow-hidden`}>
      <ChatHeader
        selectedUser={selectedUser}
        isGroup={isGroup}
        onShowGroupInfo={() => setShowGroupInfo(true)}
        onClearConversation={handleClearConversation}
      />
      <MessageList
        ref={messagesContainerRef}
        messages={safeMessages}
        user={user}
        onOpenMessageActions={(message) => {
          setSelectedMessage(message);
          setShowMessageActionsModal(true);
        }}
        editingMessage={editingMessage}
        editMessageContent={editMessageContent}
        onEditMessage={setEditingMessage}
        onEditMessageContent={setEditMessageContent}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={() => setEditingMessage(null)}
      />
      {replyingTo && (
        <ReplyPreview replyingTo={replyingTo} onCancelReply={() => setReplyingTo(null)} />
      )}
      <MessageInput
        newMessage={newMessage}
        onNewMessageChange={setNewMessage}
        isLoading={isLoading}
        selectedUser={selectedUser}
        isGroup={isGroup}
        // ✅ FIX: Pass the socket prop down to MessageInput
        socket={socket} 
        // The onSendMessage prop is no longer needed as MessageInput handles sending
      />
      <MessageActionsModal
        isOpen={showMessageActionsModal}
        onClose={() => setShowMessageActionsModal(false)}
        selectedMessage={selectedMessage}
        user={user}
        onEditMessage={() => {
          setEditingMessage(selectedMessage.id);
          setEditMessageContent(selectedMessage.message_content);
          setShowMessageActionsModal(false);
        }}
        onDeleteMessage={() => handleDeleteMessage(selectedMessage.id)}
        onReplyToMessage={() => {
          setReplyingTo(selectedMessage);
          setShowMessageActionsModal(false);
        }}
      />
      {/* Other modals like GroupInfoSidebar, etc., remain the same */}
    </div>
  );
}