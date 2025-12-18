import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
    avatar?: string;
}

interface TextChatProps {
    roomId: string;
    socket: Socket | null;
    messages: ChatMessage[];
    currentUser: any;
    className?: string;
}

export const TextChat: React.FC<TextChatProps> = ({ roomId, socket, messages = [], currentUser, className = '' }) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !socket) return;

        socket.emit('chat_message', {
            roomId,
            text: newMessage.trim(),
            senderId: currentUser.id,
            senderName: currentUser.name,
            avatar: currentUser.avatar || ''
        });

        setNewMessage('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className={`flex flex-col h-full bg-[#1e293b]/50 rounded-3xl border border-slate-700/50 overflow-hidden ${className}`}>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                        <span className="text-4xl mb-2">💬</span>
                        <span className="text-xs uppercase tracking-widest">Чат комнаты</span>
                    </div>
                )}

                {messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    return (
                        <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar */}
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center overflow-hidden text-xs text-white uppercase font-bold">
                                {msg.avatar ? (
                                    <img src={msg.avatar} alt={msg.senderName} className="w-full h-full object-cover" />
                                ) : (
                                    (msg.senderName || '?').substring(0, 2).toUpperCase()
                                )}
                            </div>

                            {/* Message Bubble */}
                            <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-slate-700/80 text-slate-200 rounded-bl-none'
                                    }`}>
                                    {msg.text}
                                </div>
                                <div className="text-[9px] text-slate-500 mt-1 px-1 flex gap-2">
                                    <span className="font-bold">{!isMe && (msg.senderName || 'Unknown')}</span>
                                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-[#0f172a]/40 border-t border-slate-800/50">
                <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Написать сообщение..."
                        className="w-full bg-slate-900/50 text-slate-200 placeholder-slate-500 text-sm rounded-xl py-3 pl-4 pr-12 border border-slate-700/50 focus:outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all disabled:opacity-0 disabled:scale-75 transform active:scale-95 shadow-lg"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
};
