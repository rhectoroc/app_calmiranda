import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/authContext';
import type { CustomerChat, ChatMessage } from '../../shared/mockData';
import { 
  Search, 
  Bot, 
  User, 
  Send, 
  AlertCircle,
  Check, 
  Phone,
  ChevronDown
} from 'lucide-react';

const getStatusSelectClass = (estatus?: string) => {
  switch (estatus) {
    case 'Empleado':
      return 'border-blue-500/30 text-blue-400 focus:border-blue-500 bg-blue-500/10';
    case 'Transportista':
      return 'border-purple-500/30 text-purple-400 focus:border-purple-500 bg-purple-500/10';
    case 'Ignorar Bot':
      return 'border-red-500/30 text-red-400 focus:border-red-500 bg-red-500/10';
    case 'Activo':
      return 'border-cal-emerald/30 text-cal-emerald-light focus:border-cal-emerald bg-cal-emerald/10';
    case 'Inactivo':
      return 'border-white/10 text-gray-400 focus:border-white bg-white/5';
    case 'Prospecto':
    default:
      return 'border-amber-500/30 text-amber-400 focus:border-amber-500 bg-amber-500/10';
  }
};

export const CustomerServiceHub: React.FC = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<CustomerChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const activeChat = chats.find(c => c.id === selectedChatId) || null;

  // Cargar chats desde la API
  const fetchChats = async (isFirst = false) => {
    try {
      if (isFirst) setIsLoadingChats(true);
      const res = await fetch('/api/chats');
      if (!res.ok) throw new Error('Error al cargar los chats');
      const data = await res.json();
      setChats(data);
      if (isFirst && data.length > 0 && !selectedChatId) {
        setSelectedChatId(data[0].id);
      }
    } catch (error) {
      console.error('Error cargando chats:', error);
    } finally {
      if (isFirst) setIsLoadingChats(false);
    }
  };

  // Cargar mensajes desde la API
  const fetchMessages = async (chatId: string, isSilent = false) => {
    try {
      if (!isSilent) setIsLoadingMessages(true);
      const res = await fetch(`/api/chats/${chatId}/messages`);
      if (!res.ok) throw new Error('Error al cargar mensajes');
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    } finally {
      if (!isSilent) setIsLoadingMessages(false);
    }
  };

  // Polling de la lista de chats
  useEffect(() => {
    fetchChats(true);
    const interval = setInterval(() => {
      fetchChats(false);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Polling de los mensajes del chat activo
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }
    fetchMessages(selectedChatId, false);
    const interval = setInterval(() => {
      fetchMessages(selectedChatId, true);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedChatId]);

  // Hacer scroll automático al final de los mensajes al recibir un mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedChatId]);

  // Filtrar chats
  const filteredChats = chats.filter(c => 
    c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phoneNumber.includes(searchQuery)
  );

  // Intervenir conversación (Toma de control humana)
  const handleTakeOver = async (chatId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/takeover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName: user?.name || 'Agente' }),
      });
      if (!res.ok) throw new Error('Error en handoff');
      
      // Actualizar el estado local de chats
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return { ...c, status: 'agent_active' };
        }
        return c;
      }));
      // Recargar mensajes inmediatamente
      fetchMessages(chatId, true);
    } catch (error) {
      console.error('Error en takeover:', error);
    }
  };

  // Reactivar el bot (devolver control a la IA)
  const handleRelease = async (chatId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/release`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Error al liberar conversación');
      
      // Actualizar el estado local de chats
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return { ...c, status: 'bot_active' };
        }
        return c;
      }));
      // Recargar mensajes inmediatamente
      fetchMessages(chatId, true);
    } catch (error) {
      console.error('Error en release:', error);
    }
  };

  // Cambiar el estatus del cliente (Empleado, Transportista, etc.)
  const handleStatusChange = async (chatId: string, newEstatus: string) => {
    try {
      const chatObj = chats.find(c => c.id === chatId);
      const res = await fetch(`/api/chats/${chatId}/client-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          estatus: newEstatus,
          customerName: chatObj?.customerName 
        }),
      });
      if (!res.ok) throw new Error('Error al cambiar estatus');
      
      // Actualizar el estado local de chats
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return { ...c, clientEstatus: newEstatus };
        }
        return c;
      }));
    } catch (error) {
      console.error('Error en status change:', error);
    }
  };

  // Enviar mensaje humano
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedChatId || isSending) return;

    setIsSending(true);
    const textToSend = replyText;
    setReplyText('');

    try {
      const res = await fetch(`/api/chats/${selectedChatId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSend }),
      });
      if (!res.ok) throw new Error('Error al enviar el mensaje');
      
      // Forzar recarga de mensajes inmediatamente para ver el mensaje enviado
      fetchMessages(selectedChatId, true);
      // Forzar recarga de la lista de chats para actualizar el último mensaje
      fetchChats(false);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      // Restaurar el texto si falló
      setReplyText(textToSend);
    } finally {
      setIsSending(false);
    }
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
          {isLoadingChats && chats.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-cal-emerald border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-gray-500 text-xs">
              <User size={24} className="mb-2 opacity-30" />
              <span>No hay chats activos</span>
            </div>
          ) : (
            filteredChats.map((chat) => (
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
                  <div className="flex gap-1.5 items-center">
                    {chat.status === 'bot_active' && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border text-cal-emerald-light bg-cal-emerald/10 border-cal-emerald/20 flex items-center gap-1">
                        <Bot size={10} /> IA
                      </span>
                    )}
                    {chat.status === 'waiting_handover' && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border text-cal-gold-light bg-cal-gold/10 border-cal-gold/20 flex items-center gap-1">
                        <AlertCircle size={10} /> Espera
                      </span>
                    )}
                    {chat.status === 'agent_active' && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border text-white bg-white/10 border-white/20 flex items-center gap-1">
                        <User size={10} /> Humano
                      </span>
                    )}
                    {chat.status === 'resolved' && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border text-gray-400 bg-white/5 border-white/5 flex items-center gap-1">
                        <Check size={10} /> Resuelto
                      </span>
                    )}
                    {chat.channel === 'WhatsApp' && chat.clientEstatus && ['Empleado', 'Transportista', 'Ignorar Bot'].includes(chat.clientEstatus) && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        chat.clientEstatus === 'Empleado' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                        chat.clientEstatus === 'Transportista' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' :
                        'text-red-400 bg-red-500/10 border-red-500/20'
                      }`}>{chat.clientEstatus}</span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-1/2 md:h-full relative bg-black/10 min-w-0">
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-black/10">
            <div className="p-4 bg-cal-emerald/10 rounded-full border border-cal-emerald/20 text-cal-emerald-light mb-4 animate-pulse">
              <Bot size={32} />
            </div>
            <h4 className="font-semibold text-base text-white mb-2">Panel de Atención al Cliente</h4>
            <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
              Selecciona una conversación de la barra lateral para ver los mensajes en tiempo real, monitorear al asistente IA Diamantín o intervenir manualmente.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-gray-300 border border-white/10 shrink-0">
                  {activeChat.customerName ? activeChat.customerName.charAt(0) : '+'}
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-white leading-tight">
                    {activeChat.customerName}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                      <Phone size={10} />
                      {activeChat.phoneNumber}
                    </span>
                    {activeChat.channel === 'WhatsApp' && (
                      <div className="relative flex items-center">
                        <select
                          value={activeChat.clientEstatus || 'Prospecto'}
                          onChange={(e) => handleStatusChange(activeChat.id, e.target.value)}
                          className={`border rounded-lg px-2 py-0.5 pr-6 text-[10px] focus:outline-none appearance-none cursor-pointer leading-tight transition-all font-bold tracking-wider uppercase ${getStatusSelectClass(activeChat.clientEstatus)}`}
                        >
                          <option value="Activo" className="bg-[#1e2528] text-white">Activo</option>
                          <option value="Inactivo" className="bg-[#1e2528] text-white">Inactivo</option>
                          <option value="Prospecto" className="bg-[#1e2528] text-white">Prospecto</option>
                          <option value="Empleado" className="bg-[#1e2528] text-blue-400">Empleado</option>
                          <option value="Transportista" className="bg-[#1e2528] text-purple-400">Transportista</option>
                          <option value="Ignorar Bot" className="bg-[#1e2528] text-red-400">Ignorar Bot</option>
                        </select>
                        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Handoff Status Buttons */}
              <div className="flex gap-2">
                {activeChat.status !== 'agent_active' && activeChat.status !== 'resolved' && (
                  <button
                    onClick={() => handleTakeOver(activeChat.id)}
                    className="px-4 py-2 bg-cal-emerald hover:bg-cal-emerald-light text-white font-bold text-xs rounded-xl transition-all duration-300 shadow-md shadow-cal-emerald/10 cursor-pointer"
                  >
                    Intervenir Conversación
                  </button>
                )}
                {activeChat.status === 'agent_active' && (
                  <button
                    onClick={() => handleRelease(activeChat.id)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs rounded-xl transition-all duration-300 cursor-pointer"
                  >
                    Reactivar IA (Bot)
                  </button>
                )}
              </div>
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
              {isLoadingMessages && messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-cal-emerald border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-gray-500 text-xs">
                  <span>No hay mensajes en esta conversación</span>
                </div>
              ) : (
                messages.map((msg) => {
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
                            Yo ({user?.name || 'Agente'})
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
                })
              )}
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
                  disabled={activeChat.status !== 'agent_active' || isSending}
                  className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cal-emerald focus:ring-1 focus:ring-cal-emerald transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={activeChat.status !== 'agent_active' || !replyText.trim() || isSending}
                  className="w-12 h-12 flex-shrink-0 bg-cal-emerald text-white rounded-2xl flex items-center justify-center transition-colors hover:bg-cal-emerald-light disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={18} className="translate-x-px" />
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
