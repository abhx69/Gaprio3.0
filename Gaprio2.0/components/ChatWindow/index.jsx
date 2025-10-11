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
  setMessages,
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
  
  // State for AddMemberModal
  const [searchUsers, setSearchUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  const [editForm, setEditForm] = useState({ name: "", description: "" });
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

  // Fetch group members
  const fetchGroupMembers = useCallback(async () => {
    if (!isGroup || !selectedUser?.id) return;
    try {
      const response = await API.get(`/groups/${selectedUser.id}/members`);
      setGroupMembers(response.data.data?.members || response.data.members || []);
    } catch (error) {
      console.error("Error fetching group members:", error);
    }
  }, [isGroup, selectedUser, API]);

  // Check if current user is owner
  const checkIfOwner = useCallback(async () => {
    if (!isGroup || !selectedUser?.id) return;
    try {
      setIsOwner(selectedUser.owner_id === user.id);
    } catch (error) {
      console.error("Error checking ownership:", error);
    }
  }, [isGroup, selectedUser, user]);

// Search users function - FIXED VERSION
const handleSearchUsers = useCallback(async (query) => {
  if (!query.trim()) {
    setSearchUsers([]);
    return;
  }

  setIsSearching(true);
  try {
    const response = await API.get(`/users/search?q=${encodeURIComponent(query)}`);
    console.log("Search response:", response.data);
    
    // Handle different response formats
    let users = [];
    if (response.data.data && response.data.data.users) {
      users = response.data.data.users;
    } else if (Array.isArray(response.data)) {
      users = response.data; // Fallback for direct array response
    } else if (response.data.users) {
      users = response.data.users; // Fallback for { users: [] } format
    }
    
    // Filter out users who are already group members and current user
    const existingMemberIds = new Set(groupMembers.map(member => member.id));
    const filteredUsers = users.filter(
      searchUser => !existingMemberIds.has(searchUser.id) && searchUser.id !== user.id
    );
    
    console.log("Filtered users:", filteredUsers);
    setSearchUsers(filteredUsers);
  } catch (error) {
    console.error("Error searching users:", error);
    // More detailed error logging
    if (error.response) {
      console.error("Response error:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    setSearchUsers([]);
  } finally {
    setIsSearching(false);
  }
}, [API, groupMembers, user.id]);

  // Handle search query change with debouncing
  useEffect(() => {
    if (!showAddMemberModal) return;

    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearchUsers(searchQuery);
      } else {
        setSearchUsers([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, showAddMemberModal, handleSearchUsers]);

// Add member function - FIXED
const handleAddMember = async (userToAdd) => {
  try {
    console.log("=== ADD MEMBER DEBUG INFO ===");
    console.log("1. User to add:", userToAdd);
    console.log("2. Selected group ID:", selectedUser?.id);
    console.log("3. User ID to add:", userToAdd.id);
    
    // FIX: Use userIdToAdd instead of user_id
    const response = await API.post(`/groups/${selectedUser.id}/members`, {
      userIdToAdd: userToAdd.id  // ← CHANGE THIS LINE
    });
    
    console.log("4. Success response:", response.data);
    
    // Refresh group members
    await fetchGroupMembers();
    
    // Show success message
    alert(`✅ ${userToAdd.name} has been added to the group!`);
    
    // Close modal and reset search
    setShowAddMemberModal(false);
    setSearchQuery("");
    setSearchUsers([]);
  } catch (error) {
    console.log("=== ADD MEMBER ERROR DETAILS ===");
    
    if (error.response) {
      console.log("Error data:", error.response.data);
      console.log("Error status:", error.response.status);
      
      const errorMessage = error.response.data?.message || "Failed to add member";
      alert(`❌ ${errorMessage}`);
    } else if (error.request) {
      console.log("Error request:", error.request);
      alert("❌ No response from server. Please check your connection.");
    } else {
      console.log("Error message:", error.message);
      alert(`❌ ${error.message}`);
    }
  }
};

  // Remove member function
  const handleRemoveMember = async (memberId, memberName) => {
    try {
      await API.delete(`/groups/${selectedUser.id}/members/${memberId}`);
      // Refresh group members after removal
      await fetchGroupMembers();
    } catch (error) {
      console.error("Error removing member:", error);
      throw error;
    }
  };

  // Delete group function
  const handleDeleteGroup = async () => {
    try {
      await API.delete(`/groups/${selectedUser.id}`);
      if (onGroupDelete) {
        onGroupDelete(selectedUser.id);
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      throw error;
    }
  };

  // Leave group function
  const handleLeaveGroup = async () => {
    try {
      await API.delete(`/groups/${selectedUser.id}/members/${user.id}`);
      if (onGroupDelete) {
        onGroupDelete(selectedUser.id);
      }
    } catch (error) {
      console.error("Error leaving group:", error);
      throw error;
    }
  };

  // Edit group function
  const handleEditGroup = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/groups/${selectedUser.id}`, {
        name: editForm.name,
        description: editForm.description
      });
      
      if (onGroupUpdate) {
        onGroupUpdate();
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error updating group:", error);
      throw error;
    }
  };

  // Clear conversation
  const handleClearConversation = async () => {
    if (isGroup || !selectedUser) return;
    if (window.confirm("Are you sure you want to delete all messages?")) {
      try {
        await API.delete(`/messages/conversation/${selectedUser.id}`);
        setMessages([]);
      } catch (error) {
        console.error("Error clearing conversation:", error);
      }
    }
  };

  // Message functions
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
        isOwner={isOwner}
        groupMembers={groupMembers}
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
        socket={socket}
      />

      {/* Group Info Sidebar */}
      <GroupInfoSidebar
        isOpen={showGroupInfo}
        selectedUser={selectedUser}
        isGroup={isGroup}
        isOwner={isOwner}
        groupMembers={groupMembers}
        user={user}
        onClose={() => setShowGroupInfo(false)}
        onShowAddMember={() => {
          setShowGroupInfo(false);
          setShowAddMemberModal(true);
        }}
        onShowEditGroup={() => {
          setShowGroupInfo(false);
          setShowEditGroupModal(true);
        }}
        onRemoveMember={handleRemoveMember}
        onDeleteGroup={handleDeleteGroup}
        onLeaveGroup={handleLeaveGroup}
        onGroupUpdate={onGroupUpdate}
      />

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={showAddMemberModal}
        searchQuery={searchQuery}
        searchUsers={searchUsers}
        isSearching={isSearching}
        groupMembers={groupMembers}
        onClose={() => {
          setShowAddMemberModal(false);
          setSearchQuery("");
          setSearchUsers([]);
        }}
        onSearchQueryChange={setSearchQuery}
        onSearchUsers={handleSearchUsers}
        onAddMember={handleAddMember}
      />

      {/* Message Actions Modal */}
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

      {/* Edit Group Modal */}
      <EditGroupModal
        isOpen={showEditGroupModal}
        editForm={editForm}
        onClose={() => setShowEditGroupModal(false)}
        onEditFormChange={setEditForm}
        onSubmit={handleEditGroup}
      />
    </div>
  );
}