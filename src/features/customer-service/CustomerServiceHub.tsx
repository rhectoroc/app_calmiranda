import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/authContext';
import { initialChats } from '../../shared/mockData';
import type { CustomerChat, ChatMessage } from '../../shared/mockData';
import { 
  Search, 
  Bot, 
  User, 
  Send, 
  AlertCircle,
  Check, 
  Sparkles,
  Phone
} from 'lucide-react';

export const CustomerServiceHub: React.FC = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<CustomerChat[]>(initialChats);
  const [selectedChatId, setSelectedChatId] = useState<string>(initialChats[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const activeChat = chats.find(c => c.id === selectedChatId) || chats[0];

  // Hacer scroll automático al final de los mensajes al seleccionar o recibir un mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages?.length, selectedChatId]);

  // Filtrar chats
  const filteredChats = chats.filter(c => 
    c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phoneNumber.includes(searchQuery)
  );

  // Intervenir conversación (Toma de control humana)
  const handleTakeOver = (chatId: string) => {
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        return {
          ...c,
          status: 'agent_active',
          messages: [
            ...c.messages,
            {
              id: Math.random().toString(),
              sender: 'agent',
              text: `⚠️ [Sistema] El agente ${user?.name} ha tomado control de la conversación.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]
        };
      }
      return c;
    }));
  };

  // Enviar mensaje humano
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessage: ChatMessage = {
      id: Math.random().toString(),
      sender: 'agent',
      text: replyText,
      timestamp: timeString
    };

    setChats(prev => prev.map(c => {
      if (c.id === selectedChatId) {
        const updatedMessages = [...c.messages, newMessage];
        return {
          ...c,
          messages: updatedMessages,
          lastMessage: replyText,
          lastMessageTime: 'Ahora mismo'
        };
      }
      return c;
    }));

    setReplyText('');

    // Simular respuesta del cliente 3 segundos después para darle interactividad al sistema
    setTimeout(() => {
      setChats(prev => prev.map(c => {
        if (c.id === selectedChatId) {
          const clientReplies = [
            'Perfecto, muchas gracias por atender.',
            'Entendido, estaré atento al despacho de cal.',
            'Excelente, ¿me avisan por este mismo medio?',
            'Okey, gracias. ¿Aceptan pago móvil?'
          ];
          const randomReply = clientReplies[Math.floor(Math.random() * clientReplies.length)];
          const replyMessage: ChatMessage = {
            id: Math.random().toString(),
            sender: 'user',
            text: randomReply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          return {
            ...c,
            messages: [...c.messages, replyMessage],
            lastMessage: randomReply,
            lastMessageTime: 'Hace un momento'
          };
        }
        return c;
      }));
    }, 3000);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row glass rounded-3xl border border-white/5 overflow-hidden h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] animate-fade-in shrink-0">
      
      {/* Sidebar de Chats */}
      <div className="w-full md:w-80 border-r border-white/5 flex flex-col h-1/2 md:h-full shrink-0">
        
        {/* Search */}
        <div className="p-4 border-b border-white/5 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente o teléfono..."
              className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-cal-emerald focus:ring-1 focus:ring-cal-emerald transition-all duration-300"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChatId(chat.id)}
              className={`w-full text-left p-3.5 rounded-2xl transition-all duration-300 flex flex-col gap-2 border cursor-pointer ${
                chat.id === selectedChatId
                  ? 'bg-cal-emerald/10 border-cal-emerald/30'
                  : 'bg-transparent border-transparent hover:bg-white/5'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-semibold text-sm text-white truncate max-w-[70%]">
                  {chat.customerName}
                </span>
                <span className="text-[10px] text-gray-500 font-medium shrink-0">
                  {chat.lastMessageTime}
                </span>
              </div>
              
              <p className="text-xs text-gray-400 truncate leading-snug">
                {chat.lastMessage}
              </p>

              <div className="flex justify-between items-center mt-1">
                <span className="text-[9px] text-gray-500 font-medium uppercase tracking-wider">
                  {chat.channel}
                </span>
                
                {/* Status Badges */}
                {chat.status === 'bot_active' && (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-cal-emerald-light bg-cal-emerald/10 px-2 py-0.5 rounded-full border border-cal-emerald/20">
                    <Sparkles size={8} />
                    IA Activa
                  </span>
                )}
                {chat.status === 'waiting_handover' && (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-cal-gold-light bg-cal-gold/10 px-2 py-0.5 rounded-full border border-cal-gold/20 animate-pulse">
                    <AlertCircle size={8} />
                    Espera
                  </span>
                )}
                {chat.status === 'agent_active' && (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-cal-earth bg-cal-earth/15 px-2 py-0.5 rounded-full border border-cal-earth/30">
                    <User size={8} />
                    Humano
                  </span>
                )}
                {chat.status === 'resolved' && (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                    <Check size={8} />
                    Resuelto
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-1/2 md:h-full relative bg-black/10 min-w-0">
        
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-gray-300 border border-white/10 shrink-0">
              {activeChat.customerName.charAt(0)}
            </div>
            <div>
              <h4 className="font-semibold text-sm text-white leading-tight">
                {activeChat.customerName}
              </h4>
              <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                <Phone size={10} />
                {activeChat.phoneNumber}
              </span>
            </div>
          </div>

          {/* Handoff Status Button */}
          {activeChat.status !== 'agent_active' && activeChat.status !== 'resolved' && (
            <button
              onClick={() => handleTakeOver(activeChat.id)}
              className="px-4 py-2 bg-cal-emerald hover:bg-cal-emerald-light text-white font-bold text-xs rounded-xl transition-all duration-300 shadow-md shadow-cal-emerald/10 cursor-pointer"
            >
              Intervenir Conversación
            </button>
          )}
        </div>

        {/* Status Warning Banner */}
        {activeChat.status === 'waiting_handover' && (
          <div className="bg-cal-gold/10 border-b border-cal-gold/20 px-4 py-2.5 text-xs text-cal-gold-light flex items-center gap-2 font-medium shrink-0 animate-pulse">
            <AlertCircle size={14} className="shrink-0" />
            <span>El cliente requiere atención humana. Presiona "Intervenir Conversación" para responder.</span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {activeChat.messages.map((msg) => {
            const isSystem = msg.text.startsWith('⚠️ [Sistema]');
            if (isSystem) {
              return (
                <div key={msg.id} className="text-center my-3 text-[10px] text-cal-gold-light/80 font-mono tracking-wide">
                  {msg.text}
                </div>
              );
            }

            const isMe = msg.sender === 'agent';
            const isBot = msg.sender === 'bot';

            return (
              <div 
                key={msg.id} 
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] flex flex-col gap-1`}>
                  {/* Sender Badge */}
                  {!isMe && (
                    <span className="text-[10px] text-gray-500 font-semibold px-1 flex items-center gap-1">
                      {isBot ? <Bot size={10} className="text-cal-emerald-light" /> : <User size={10} />}
                      {isBot ? 'Diamantín (IA)' : activeChat.customerName}
                    </span>
                  )}
                  {isMe && (
                    <span className="text-[10px] text-gray-500 font-semibold px-1 text-right">
                      Yo ({user?.name})
                    </span>
                  )}
                  
                  {/* Bubble */}
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${
                    isMe 
                      ? 'bg-cal-emerald text-white rounded-tr-none' 
                      : isBot 
                      ? 'bg-white/5 border border-white/5 text-gray-200 rounded-tl-none' 
                      : 'bg-white/10 text-white rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                  
                  {/* Time */}
                  <span className={`text-[9px] text-gray-600 font-mono ${isMe ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <div className="p-4 border-t border-white/5 bg-white/[0.01] shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={
                activeChat.status === 'agent_active' 
                  ? 'Redacta tu mensaje para enviar al cliente...' 
                  : 'Intervén el chat primero para redactar y enviar'
              }
              disabled={activeChat.status !== 'agent_active'}
              className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cal-emerald focus:ring-1 focus:ring-cal-emerald transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={activeChat.status !== 'agent_active' || !replyText.trim()}
              className="w-12 h-12 flex-shrink-0 bg-cal-emerald text-white rounded-2xl flex items-center justify-center transition-colors hover:bg-cal-emerald-light disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send size={18} className="translate-x-px" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
