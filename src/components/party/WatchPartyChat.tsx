'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useWatchPartyStore } from '@/stores/watchPartyStore';
import { Send } from 'lucide-react';

interface WatchPartyChatProps {
  onSendChat: (text: string) => void;
}

export function WatchPartyChat({ onSendChat }: WatchPartyChatProps) {
  const messages = useWatchPartyStore((s) => s.messages);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    onSendChat(inputText.trim());
    setInputText('');
  }, [inputText, onSendChat]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-4">
            Belum ada pesan. Mulai chat! 💬
          </p>
        )}
        {messages.map((msg) =>
          msg.type === 'system' ? (
            <div
              key={msg.id}
              className="text-center text-zinc-500 text-xs py-1 italic"
            >
              {msg.text}
            </div>
          ) : (
            <div key={msg.id} className="flex items-start gap-2">
              <div
                className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5"
                style={{ backgroundColor: msg.senderColor || '#6B7280' }}
              >
                {(msg.senderName || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <span
                  className="text-xs font-semibold mr-1.5"
                  style={{ color: msg.senderColor || '#9CA3AF' }}
                >
                  {msg.senderName}
                </span>
                <span className="text-zinc-300 text-sm break-words">
                  {msg.text}
                </span>
              </div>
            </div>
          ),
        )}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-zinc-800 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tulis pesan..."
          maxLength={500}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          className="p-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
