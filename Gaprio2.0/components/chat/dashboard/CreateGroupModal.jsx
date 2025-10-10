// app/(main)/components/CreateGroupModal.jsx
'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaTimes, FaSearch, FaUserPlus, FaUsers, FaCheck, 
  FaUserFriends, FaCrown, FaPlus, FaTrash, FaExclamationTriangle
} from 'react-icons/fa';
import { IoClose, IoSend, IoPeople, IoInformationCircle } from 'react-icons/io5';
import { useAuth } from '@/context/ApiContext';

export default function CreateGroupModal({ onClose, onGroupCreated }) {
  const { user, API } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  const modalRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close modal on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Focus search input when tab changes
  useEffect(() => {
    if (activeTab === 'members' && searchInputRef.current) {
      setTimeout(() => searchInputRef.current.focus(), 300);
    }
  }, [activeTab]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await API.get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
      const filteredResults = response.data.filter(
        userResult => !selectedMembers.some(member => member.id === userResult.id) && userResult.id !== user.id
      );
      setSearchResults(filteredResults);
      setError('');
    } catch (err) {
      console.error('Search failed:', err);
      setError('Failed to search users. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const addMember = (userToAdd) => {
    if (selectedMembers.length >= 49) {
      setError('Maximum 50 members allowed per group (including you)');
      return;
    }
    setSelectedMembers(prev => [...prev, userToAdd]);
    setSearchResults(prev => prev.filter(result => result.id !== userToAdd.id));
    setSearchQuery('');
    setError('');
  };
  
  const removeMember = (userToRemove) => {
    setSelectedMembers(prev => prev.filter(member => member.id !== userToRemove.id));
    setError('');
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Group name is required.');
      return;
    }
    if (groupName.length > 100) {
      setError('Group name must be less than 100 characters');
      return;
    }
    if (groupDescription.length > 500) {
      setError('Description must be less than 500 characters');
      return;
    }
    if (selectedMembers.length === 0) {
      setError('You must add at least one member.');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      const memberIds = selectedMembers.map(m => m.id);
      const response = await API.post('/groups', { 
        name: groupName.trim(), 
        description: groupDescription.trim(),
        memberIds 
      });
      
      onGroupCreated(response.data);
      onClose();
    } catch(err) {
      console.error('Create group error:', err);
      setError(err.response?.data?.message || 'Failed to create group. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  const getRandomColor = (str) => {
    const colors = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-blue-500',
      'from-cyan-500 to-blue-500',
      'from-blue-400 to-cyan-400',
      'from-purple-400 to-blue-400',
    ];
    const index = str ? str.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-gray-900/80 backdrop-blur-xl"
      >
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-6xl bg-gray-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-700 max-h-[98vh] sm:max-h-[95vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900 relative overflow-hidden">
            <div className="relative z-10 flex items-center space-x-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
                className="p-2 bg-blue-500/20 rounded-xl backdrop-blur-sm border border-blue-500/30"
              >
                <IoPeople className="text-xl sm:text-2xl text-blue-400" />
              </motion.div>
              <div>
                <motion.h2
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl sm:text-2xl font-bold text-white"
                >
                  Create New Group
                </motion.h2>
                <motion.p
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-gray-400 text-sm"
                >
                  Connect with friends and colleagues
                </motion.p>
              </div>
            </div>
            
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:16px_16px]"></div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="relative z-10 p-2 text-gray-400 hover:text-white transition-all duration-200 rounded-xl hover:bg-gray-800 backdrop-blur-sm border border-gray-700 hover:border-gray-600"
            >
              <IoClose size={20} className="sm:w-6 sm:h-6" />
            </motion.button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'details'
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-900 shadow-lg'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <FaUsers className="flex-shrink-0 w-4 h-4" />
              <span className="hidden xs:inline">Group Details</span>
              <span className="xs:hidden">Details</span>
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'members'
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-900 shadow-lg'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <FaUserFriends className="flex-shrink-0 w-4 h-4" />
              <span className="hidden xs:inline">Add Members</span>
              <span className="xs:hidden">Members</span>
              {selectedMembers.length > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px]">
                  {selectedMembers.length}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            {/* Left Panel - Group Details */}
            <AnimatePresence mode="wait">
              {activeTab === 'details' && (
                <motion.div
                  key="details"
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -50, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 p-4 sm:p-6 overflow-y-auto"
                >
                  <div className="max-w-2xl mx-auto space-y-6">
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="text-center mb-6 sm:mb-8"
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-blue-400/30">
                        <IoPeople className="text-white text-xl sm:text-2xl" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                        Group Information
                      </h3>
                      <p className="text-gray-400 text-sm sm:text-base">
                        Set up your group name and description
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="space-y-4 sm:space-y-6"
                    >
                      <div>
                        <label className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                          <IoInformationCircle className="text-blue-400" />
                          Group Name *
                        </label>
                        <motion.input
                          whileFocus={{ scale: 1.01 }}
                          type="text"
                          placeholder="Enter group name..."
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          className="w-full p-3 sm:p-4 bg-gray-800 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-500 transition-all duration-200 shadow-lg"
                          maxLength={100}
                        />
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">
                            This will be the display name for your group
                          </span>
                          <span className="text-xs text-gray-400">
                            {groupName.length}/100
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                          <IoInformationCircle className="text-blue-400" />
                          Description
                        </label>
                        <motion.textarea
                          whileFocus={{ scale: 1.01 }}
                          placeholder="What's this group about? (Optional)"
                          value={groupDescription}
                          onChange={(e) => setGroupDescription(e.target.value)}
                          rows={4}
                          className="w-full p-3 sm:p-4 bg-gray-800 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-500 resize-none transition-all duration-200 shadow-lg"
                          maxLength={500}
                        />
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">
                            Briefly describe the purpose of this group
                          </span>
                          <span className="text-xs text-gray-400">
                            {groupDescription.length}/500
                          </span>
                        </div>
                      </div>
                    </motion.div>

                    {/* Preview */}
                    {groupName && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gray-800/50 rounded-2xl border border-gray-700 backdrop-blur-sm"
                      >
                        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <FaCheck className="text-green-400" />
                          Group Preview
                        </h4>
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg border border-blue-400/30">
                            <IoPeople className="text-white text-sm sm:text-lg" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white truncate">
                              {groupName}
                            </div>
                            {groupDescription && (
                              <div className="text-sm text-gray-300 mt-1 line-clamp-2">
                                {groupDescription}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-1">
                              {selectedMembers.length + 1} members • You as owner
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Right Panel - Add Members */}
            <AnimatePresence mode="wait">
              {activeTab === 'members' && (
                <motion.div
                  key="members"
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 50, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 p-4 sm:p-6 overflow-y-auto border-t lg:border-t-0 lg:border-l border-gray-700 bg-gray-800/30"
                >
                  <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                        Add Members
                      </h3>
                      <p className="text-gray-400 text-sm sm:text-base">
                        Search and select members to add to your group
                      </p>
                    </motion.div>

                    {/* Search Section */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="space-y-4"
                    >
                      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
                          <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search users by name or username..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-500 transition-all duration-200 shadow-lg"
                          />
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          disabled={isSearching || !searchQuery.trim()}
                          className="px-6 py-3 text-white bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 transition-all duration-200 shadow-lg flex items-center justify-center gap-2 font-semibold border border-blue-400/30 min-w-[120px]"
                        >
                          {isSearching ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <FaSearch />
                          )}
                          Search
                        </motion.button>
                      </form>

                      {/* Search Results */}
                      <div className="bg-gray-800/50 rounded-2xl p-4 shadow-inner border border-gray-700 backdrop-blur-sm">
                        <h4 className="font-semibold text-gray-200 mb-3 flex items-center gap-2">
                          <FaSearch className="text-blue-400" />
                          Search Results
                          {isSearching && (
                            <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          )}
                        </h4>
                        
                        <div className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
                          {searchResults.length === 0 ? (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-center py-6 sm:py-8"
                            >
                              <FaUserFriends className="mx-auto text-3xl sm:text-4xl text-gray-600 mb-3" />
                              <p className="text-gray-400 font-medium">
                                {searchQuery ? 'No users found' : 'Start searching for users'}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                {searchQuery ? 'Try a different search term' : 'Enter a name or username above'}
                              </p>
                            </motion.div>
                          ) : (
                            searchResults.map((user, index) => (
                              <motion.div
                                key={user.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                onClick={() => addMember(user)}
                                className="flex items-center justify-between p-3 bg-gray-700/50 hover:bg-gray-700 rounded-xl cursor-pointer transition-all duration-200 group border border-transparent hover:border-blue-500/30 backdrop-blur-sm"
                              >
                                <div className="flex items-center space-x-3 min-w-0">
                                  <div className={`flex items-center justify-center w-10 h-10 bg-gradient-to-br ${getRandomColor(user.name)} rounded-xl text-white font-semibold shadow-lg border border-white/10`}>
                                    {getInitials(user.name)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                                      {user.name}
                                    </div>
                                    <div className="text-sm text-gray-400 truncate">
                                      @{user.username}
                                    </div>
                                  </div>
                                </div>
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="p-2 text-green-400 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-lg hover:bg-green-400/10"
                                >
                                  <FaUserPlus size={14} />
                                </motion.div>
                              </motion.div>
                            ))
                          )}
                        </div>
                      </div>
                    </motion.div>

                    {/* Selected Members */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="bg-gray-800/50 rounded-2xl p-4 sm:p-6 shadow-inner border border-gray-700 backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-200 flex items-center gap-2">
                          <FaCheck className="text-green-400" />
                          Selected Members ({selectedMembers.length})
                        </h4>
                        {selectedMembers.length > 0 && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedMembers([])}
                            className="px-3 py-1 text-sm text-red-400 hover:text-red-300 transition-colors rounded-lg hover:bg-red-400/10 flex items-center gap-1 border border-red-400/20"
                          >
                            <FaTrash size={12} />
                            Clear All
                          </motion.button>
                        )}
                      </div>

                      {/* You as Owner */}
                      <div className="mb-4 p-3 sm:p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl text-white shadow-lg border border-blue-400/30">
                            <FaCrown size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-white flex items-center gap-2">
                              <span className="truncate">{user.name}</span>
                              <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full flex items-center gap-1 flex-shrink-0">
                                <FaCrown size={8} />
                                Owner
                              </span>
                            </div>
                            <div className="text-sm text-gray-400 truncate">
                              @{user.username} • You
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Members List */}
                      <div className="space-y-2 max-h-64 sm:max-h-80 overflow-y-auto">
                        {selectedMembers.length === 0 ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-8 sm:py-12"
                          >
                            <FaUserFriends className="mx-auto text-4xl sm:text-5xl text-gray-600 mb-4" />
                            <p className="text-gray-400 font-medium text-base sm:text-lg">
                              No members selected yet
                            </p>
                            <p className="text-gray-500 text-sm sm:text-base mt-2">
                              Search and add members to get started
                            </p>
                          </motion.div>
                        ) : (
                          selectedMembers.map((member, index) => (
                            <motion.div
                              key={member.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all duration-200 group border border-transparent hover:border-gray-600 backdrop-blur-sm"
                            >
                              <div className="flex items-center space-x-3 min-w-0">
                                <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br ${getRandomColor(member.name)} rounded-xl text-white font-semibold shadow-md border border-white/10`}>
                                  {getInitials(member.name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-white truncate">
                                    {member.name}
                                  </div>
                                  <div className="text-sm text-gray-400 truncate">
                                    @{member.username}
                                  </div>
                                </div>
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => removeMember(member)}
                                className="p-1 sm:p-2 text-red-400 hover:text-red-300 transition-all duration-200 rounded-lg hover:bg-red-400/10 opacity-0 group-hover:opacity-100 border border-red-400/0 hover:border-red-400/20"
                              >
                                <IoClose size={16} className="sm:w-5 sm:h-5" />
                              </motion.button>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mx-4 sm:mx-6 mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <FaExclamationTriangle className="text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400 font-medium">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="border-t border-gray-700 bg-gray-800/50 backdrop-blur-sm p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-400 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <IoPeople className="text-blue-400" />
                  <span>
                    {selectedMembers.length + 1} total members • You'll be the group owner
                  </span>
                </div>
                {selectedMembers.length >= 5 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-1 text-green-400 font-medium flex items-center gap-1 justify-center sm:justify-start text-xs"
                  >
                    <FaCheck />
                    Great! You're starting with a solid group
                  </motion.div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-6 sm:px-8 py-2 sm:py-3 text-gray-300 border border-gray-600 rounded-xl hover:bg-gray-700 transition-all duration-200 font-semibold shadow-sm hover:border-gray-500"
                >
                  Cancel
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateGroup}
                  disabled={isLoading || !groupName.trim() || selectedMembers.length === 0}
                  className="px-6 sm:px-8 py-2 sm:py-3 text-white bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg flex items-center justify-center gap-2 min-w-[120px] sm:min-w-[140px] border border-blue-400/30"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="hidden sm:inline">Creating...</span>
                      <span className="sm:hidden">Creating</span>
                    </>
                  ) : (
                    <>
                      <IoSend className="flex-shrink-0" />
                      <span className="hidden sm:inline">Create Group</span>
                      <span className="sm:hidden">Create</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}