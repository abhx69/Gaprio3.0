import { IoClose, IoSearch } from "react-icons/io5";
import { FaUserFriends, FaUserPlus, FaSpinner, FaExclamationTriangle } from "react-icons/fa";
import { STYLES } from "./styles";

export default function AddMemberModal({
  isOpen,
  searchQuery,
  searchUsers = [],
  isSearching,
  groupMembers = [],
  onClose,
  onSearchQueryChange,
  onSearchUsers,
  onAddMember,
}) {
  if (!isOpen) return null;

  const safeSearchUsers = Array.isArray(searchUsers) ? searchUsers : [];
  const safeGroupMembers = Array.isArray(groupMembers) ? groupMembers : [];

  const handleSearchChange = (value) => {
    onSearchQueryChange(value);
  };

  return (
    <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-gray-800/95 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden border border-gray-700/50 backdrop-blur-xl">
        <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Add Members</h3>
              <p className="text-blue-100 text-sm mt-1">
                Search and add users to your group
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-blue-600/30 rounded-xl transition-colors"
            >
              <IoClose size={20} />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400/70" size={18} />
            <input
              type="text"
              placeholder="Search users by name or username..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-gray-700/30 text-white placeholder-gray-400 backdrop-blur-sm"
              autoFocus
            />
            {isSearching && (
              <FaSpinner className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 animate-spin" size={16} />
            )}
          </div>

          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {isSearching ? (
              <div className="text-center py-8 text-gray-500">
                <FaSpinner className="mx-auto text-2xl mb-2 text-blue-400 animate-spin" />
                <p>Searching users...</p>
                <p className="text-xs mt-1">Looking for "{searchQuery}"</p>
              </div>
            ) : searchQuery.trim() && safeSearchUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FaExclamationTriangle className="mx-auto text-2xl mb-2 text-yellow-400" />
                <p>No users found</p>
                <p className="text-sm mt-1">
                  No results for "{searchQuery}"
                </p>
                <p className="text-xs mt-1 text-gray-500">
                  Try a different search term
                </p>
              </div>
            ) : !searchQuery.trim() ? (
              <div className="text-center py-8 text-gray-500">
                <FaUserFriends className="mx-auto text-3xl mb-2 opacity-50" />
                <p>Search for users</p>
                <p className="text-sm mt-1">
                  Enter a name or username to find users
                </p>
              </div>
            ) : (
              safeSearchUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => onAddMember(user)}
                  className="flex items-center justify-between p-3 hover:bg-gray-700/50 rounded-xl cursor-pointer transition-all duration-200 border-b border-gray-700/50 last:border-b-0 backdrop-blur-sm group"
                >
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mr-3 text-white font-semibold ring-1 ring-blue-500/30 flex-shrink-0">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-white truncate">
                        {user.name || 'Unknown User'}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        @{user.username || 'unknown'}
                      </div>
                    </div>
                  </div>
                  <FaUserPlus className="text-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" size={16} />
                </div>
              ))
            )}
          </div>

          {safeSearchUsers.length > 0 && (
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-400">
                {safeSearchUsers.length} user{safeSearchUsers.length !== 1 ? 's' : ''} found
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}