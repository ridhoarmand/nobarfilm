'use client';
import { useState, useEffect, useRef, memo } from 'react';
import { MessageCircle, Send, X, ChevronRight, Users } from 'lucide-react';
import { ChatMessage } from '@/types/watch-party';
import { useAuth } from '@/components/providers/AuthProvider';

interface ChatPanelProps {
  roomCode: string;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  participantCount: number;
  className?: string;
}

// Export memoized to prevent re-renders unless props change
export const ChatPanel = memo(ChatPanelComponent);

function ChatPanelComponent({ roomCode, messages, onSendMessage, participantCount, className = '' }: ChatPanelProps) {
  // ... existing implementation ...
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Auto-scroll to bottom when new messages arrive and chat is expanded
  useEffect(() => {
    if (isExpanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded]);

  // Handle marking as read when expanded
  useEffect(() => {
    if (isExpanded) {
      setUnreadCount(0);
      setLastReadTimestamp(Date.now());
    }
  }, [isExpanded]);

  // Track unread messages when chat is collapsed
  useEffect(() => {
    if (!isExpanded) {
      const newMessages = messages.filter((msg) => new Date(msg.timestamp).getTime() > lastReadTimestamp && msg.user_id !== user?.id);
      setUnreadCount((prev) => prev + newMessages.length);
      // Note: We don't update lastReadTimestamp here, only when expanded
      // We use prev + new to accumulate, OR just count total if we know the baseline?
      // Actually, simplest is: count messages > lastReadTimestamp
      const count = messages.filter((msg) => new Date(msg.timestamp).getTime() > lastReadTimestamp && msg.user_id !== user?.id).length;
      setUnreadCount(count);
    }
  }, [messages, isExpanded, lastReadTimestamp, user?.id]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      onSendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setUnreadCount(0);
      setLastReadTimestamp(Date.now());
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col h-full bg-zinc-900/95 lg:border-l border-zinc-700/50 ${className}`}>
      {/* Header */}
      <div className="p-3 lg:p-4 border-b border-zinc-700/50 bg-zinc-900">
        <div className="flex items-center justify-between mb-1 lg:mb-2">
          <h3 className="text-white font-semibold flex items-center gap-2 text-sm lg:text-base">
            <MessageCircle className="w-4 h-4 lg:w-5 lg:h-5" />
            Chat
          </h3>
          <div className="flex items-center gap-1 text-xs lg:text-sm text-gray-400">
            <Users className="w-3 h-3 lg:w-4 lg:h-4" />
            {participantCount}
          </div>
        </div>
        <p className="text-[10px] lg:text-xs text-gray-500 hidden lg:block">Room: {roomCode}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-xs lg:text-sm mt-8">
            <MessageCircle className="w-8 h-8 lg:w-12 lg:h-12 mx-auto mb-2 opacity-30" />
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex gap-2">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {msg.avatar_url ? (
                  <img src={msg.avatar_url} alt={msg.display_name} className="w-7 h-7 lg:w-8 lg:h-8 rounded-full" />
                ) : (
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white text-[10px] lg:text-xs font-semibold">
                    {msg.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Message */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs lg:text-sm font-medium text-white truncate">{msg.display_name}</span>
                  <span className="text-[10px] lg:text-xs text-gray-500">{formatTime(msg.timestamp)}</span>
                </div>
                <p className="text-xs lg:text-sm text-gray-300 break-words">{msg.message}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 lg:p-5 border-t border-zinc-700/50 bg-zinc-900 shadow-2xl">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-3 lg:px-3 lg:py-2 bg-zinc-800 border border-zinc-700 rounded-full lg:rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-full lg:rounded-lg transition flex items-center gap-2 flex-shrink-0"
          >
            <Send className="w-5 h-5 lg:w-4 lg:h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
