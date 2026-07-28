import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, ChevronLeft, Plus, Headphones, Inbox, MessageSquare, AlertCircle, Loader2, Paperclip, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useSocket } from "../../../context/SocketContext";
import toast from "react-hot-toast";
import { getLenis } from "../../../lib/lenis";

const SellerSupportChatWidget = () => {
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [view, setView] = useState("list"); // 'list' | 'chat' | 'create'
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("General Inquiry");
  const [message, setMessage] = useState("");
  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stagedAttachments, setStagedAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Clear staged files on view change
  useEffect(() => {
    setStagedAttachments([]);
  }, [view]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("File size must be under 20MB");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast.error("Only image and video uploads are supported");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const { uploadToCloudinary } = await import("../../../utils/upload");
      const attachment = await uploadToCloudinary(
        file,
        "seller/support/upload-signature",
        (progress) => setUploadProgress(progress)
      );

      setStagedAttachments(prev => [...prev, attachment]);
      toast.success("File uploaded successfully");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeStagedAttachment = (idx) => {
    setStagedAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const renderAttachments = (attachments) => {
    if (!attachments || attachments.length === 0) return null;
    return (
      <div className="flex flex-col gap-2 mt-2 max-w-full">
        {attachments.map((att, idx) => (
          <div key={idx} className="relative">
            {att.type === 'video' ? (
              <video 
                src={att.url} 
                controls 
                preload="none" 
                className="max-h-40 rounded-lg border border-gray-200 bg-black" 
              />
            ) : (
              <img 
                src={att.url} 
                alt={att.name || "attachment"} 
                className="max-h-40 rounded-lg border border-gray-200 cursor-pointer object-contain bg-gray-50" 
                onClick={() => window.open(att.url, '_blank')}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Fetch all merchant tickets
  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("seller/support");
      if (res.data.success) {
        setTickets(res.data.data?.tickets || res.data.tickets || []);
      }
    } catch (err) {
      console.error("Failed to load seller tickets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTickets();
    }
  }, [isOpen]);

  // Lock body scroll and stop Lenis smooth scroll when chat is open
  useEffect(() => {
    const lenis = getLenis();
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.documentElement.classList.add("lenis-stopped");
      if (lenis) {
        lenis.stop();
      }
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.documentElement.classList.remove("lenis-stopped");
      if (lenis) {
        lenis.start();
      }
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.documentElement.classList.remove("lenis-stopped");
      if (lenis) {
        lenis.start();
      }
    };
  }, [isOpen]);

  const activeTicket = tickets.find((t) => t._id === activeTicketId) || null;

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTicket?.replies, view]);

  // Socket listener for live replies
  useEffect(() => {
    if (!socket) return;

    const handleSellerSupportMessage = (data) => {
      const { _id, reply, status } = data;
      setTickets((prev) =>
        prev.map((t) => {
          if (t._id === _id) {
            const exists = t.replies.some(
              (r) =>
                r.text === reply.text &&
                r.from === reply.from &&
                Math.abs(new Date(r.date) - new Date(reply.date)) < 2000
            );
            if (exists) return t;

            return {
              ...t,
              status,
              replies: [...t.replies, reply],
              updatedAt: new Date().toISOString(),
            };
          }
          return t;
        })
      );

      if (reply.from === "admin" && isOpen) {
        toast.success(`Admin Support: "${reply.text.substring(0, 25)}..."`, {
          icon: "💬",
        });
      }
    };

    socket.on("seller_support_message", handleSellerSupportMessage);

    return () => {
      socket.off("seller_support_message", handleSellerSupportMessage);
    };
  }, [socket, isOpen]);

  const handleCreateTicketSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || (!message.trim() && stagedAttachments.length === 0)) return;

    try {
      const res = await api.post("seller/support", {
        subject,
        category,
        message,
        attachments: stagedAttachments
      });
      if (res.data.success) {
        const ticket = res.data.data?.ticket || res.data.ticket;
        setTickets((prev) => [ticket, ...prev]);
        setSubject("");
        setMessage("");
        setStagedAttachments([]);
        setCategory("General Inquiry");
        setActiveTicketId(ticket._id);
        setView("chat");
        toast.success("Support ticket created!");
      }
    } catch (err) {
      console.error("Failed to create ticket:", err);
      toast.error(err.response?.data?.message || "Failed to create ticket");
    }
  };

  const handleSendReplySubmit = async (e) => {
    e.preventDefault();
    if ((!replyText.trim() && stagedAttachments.length === 0) || !activeTicketId) return;

    try {
      const res = await api.post(`seller/support/${activeTicketId}/reply`, {
        message: replyText,
        attachments: stagedAttachments
      });
      if (res.data.success) {
        const updated = res.data.data?.ticket || res.data.ticket;
        setTickets((prev) => prev.map((t) => (t._id === activeTicketId ? updated : t)));
        setReplyText("");
        setStagedAttachments([]);
      }
    } catch (err) {
      console.error("Failed to reply:", err);
      toast.error("Failed to send message");
    }
  };

  const categories = [
    "Payout Issue",
    "Inventory/Catalog",
    "Commission Dispute",
    "Verification/KYC",
    "General Inquiry",
    "Other",
  ];

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Open":
        return "bg-red-50 text-red-700 border-red-100";
      case "In Progress":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "Resolved":
        return "bg-green-50 text-green-700 border-green-100";
      case "Closed":
        return "bg-gray-50 text-gray-700 border-gray-100";
      default:
        return "bg-gray-50 text-gray-700 border-gray-100";
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[99] w-14 h-14 rounded-full bg-[#3E2723] hover:bg-[#5D4037] text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white/10"
        title="Support Chat"
      >
        {isOpen ? <X className="w-6 h-6 animate-in spin-in-12 duration-200" /> : <Headphones className="w-6 h-6 animate-in zoom-in duration-200" />}
      </button>

      {/* Chat Pane Pop-up */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 md:right-6 z-[98] w-full shadow-2xl overflow-hidden bottom-0 md:bottom-24 md:w-[380px] h-full md:h-[550px] bg-white md:rounded-3xl border border-gray-100 flex flex-col"
          >
            {/* Header */}
            <div className="bg-[#3E2723] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {view !== "list" && (
                  <button
                    type="button"
                    onClick={() => {
                      setView("list");
                      setActiveTicketId(null);
                    }}
                    className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm tracking-wide">
                    Merchant Helpdesk
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    <span className="text-[10px] text-white/80 font-medium">
                      Admin Desk Live
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/60 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-grow overflow-hidden flex flex-col bg-gray-50/50">
              <AnimatePresence mode="wait">
                {/* 1. TICKET LIST VIEW */}
                {view === "list" && (
                  <motion.div
                    key="list-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-grow flex flex-col overflow-hidden h-full"
                  >
                    {/* Header */}
                    <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        My Tickets ({tickets.length})
                      </span>
                      <button
                        onClick={() => setView("create")}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#3E2723]/5 hover:bg-[#3E2723]/10 text-[#3E2723] rounded-lg text-xs font-bold transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Ticket
                      </button>
                    </div>

                    {/* Scrollable list */}
                    <div className="flex-grow overflow-y-auto overscroll-contain p-4 space-y-2">
                      {isLoading && tickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                          <Loader2 className="w-6 h-6 animate-spin mb-2" />
                          <span className="text-xs font-semibold">Loading help desk...</span>
                        </div>
                      ) : tickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-center p-6">
                          <Inbox className="w-8 h-8 text-gray-300 mb-2" />
                          <p className="text-xs font-bold text-gray-800">No Tickets Yet</p>
                          <p className="text-[10px] text-gray-400 max-w-[180px] mt-1">
                            Raise a query to get support from the administration team.
                          </p>
                        </div>
                      ) : (
                        tickets.map((ticket) => (
                          <button
                            key={ticket._id}
                            onClick={() => {
                              setActiveTicketId(ticket._id);
                              setView("chat");
                            }}
                            className="w-full text-left p-3.5 bg-white border border-gray-200/60 rounded-2xl hover:border-gray-300 transition-all flex flex-col shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[9px] font-bold text-gray-400 font-mono">
                                #{ticket.ticketId}
                              </span>
                              <span
                                className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                                  ticket.status
                                )}`}
                              >
                                {ticket.status}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-gray-900 truncate">
                              {ticket.subject}
                            </h4>
                            <div className="flex items-center justify-between gap-1 text-[9px] text-gray-400 mt-1 font-medium">
                              <span className="text-[#3E2723]">{ticket.category}</span>
                              <span>
                                {new Date(
                                  ticket.updatedAt || ticket.createdAt
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}

                {/* 2. CHAT DETAILS VIEW */}
                {view === "chat" && activeTicket && (
                  <motion.div
                    key="chat-view"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-grow flex flex-col overflow-hidden h-full"
                  >
                    {/* Active Ticket info */}
                    <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setActiveTicketId(null);
                          setView("list");
                        }}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-black transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <div className="flex-grow min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {activeTicket.subject}
                        </p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5 font-mono">
                          #{activeTicket.ticketId}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${getStatusBadgeClass(
                          activeTicket.status
                        )}`}
                      >
                        {activeTicket.status}
                      </span>
                    </div>

                    {/* Messages Scroll Panel */}
                    <div className="flex-grow overflow-y-auto overscroll-contain p-4 space-y-4">
                      {/* Initial message */}
                      <div className="flex flex-col items-end ml-auto max-w-[85%]">
                        <div className="bg-[#3E2723] text-white rounded-2xl rounded-tr-none px-4 py-2.5 text-xs font-medium shadow-sm">
                          {activeTicket.message}
                          {renderAttachments(activeTicket.attachments)}
                        </div>
                        <span className="text-[9px] text-gray-400 mt-1 pl-1">
                          {new Date(activeTicket.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Replies */}
                      {activeTicket.replies?.slice(1).map((reply, i) => {
                        const isAdmin = reply.from === "admin";
                        return (
                          <div
                            key={i}
                            className={`flex flex-col max-w-[85%] ${
                              isAdmin ? "items-start" : "items-end ml-auto"
                            }`}
                          >
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-xs font-medium shadow-sm border ${
                                isAdmin
                                  ? "bg-white text-gray-800 rounded-tl-none border-gray-200/50"
                                  : "bg-[#3E2723] text-white rounded-tr-none border-[#3E2723]/10"
                              }`}
                            >
                              {reply.text}
                              {renderAttachments(reply.attachments)}
                            </div>
                            <span className="text-[9px] text-gray-400 mt-1 px-1">
                              {new Date(reply.date).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Reply Form */}
                    {activeTicket.status !== "Closed" && activeTicket.status !== "Resolved" ? (
                      <div className="flex flex-col shrink-0">
                        {stagedAttachments.length > 0 && (
                          <div className="bg-white border-t border-gray-100 px-3 py-2 flex flex-wrap gap-2">
                            {stagedAttachments.map((att, idx) => (
                              <div key={idx} className="relative group w-12 h-12 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                                {att.type === 'video' ? (
                                  <video src={att.url} className="w-full h-full object-cover" />
                                ) : (
                                  <img src={att.url} className="w-full h-full object-cover" />
                                )}
                                <button 
                                  type="button" 
                                  onClick={() => removeStagedAttachment(idx)}
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {isUploading && (
                          <div className="bg-white border-t border-gray-100 px-4 py-2 flex items-center gap-3">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Uploading: {uploadProgress}%</span>
                            <div className="flex-grow h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#3E2723] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                            </div>
                          </div>
                        )}
                        <form
                          onSubmit={handleSendReplySubmit}
                          className="bg-white border-t border-gray-100 p-3 flex gap-2 items-center"
                        >
                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0"
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                          <input
                            type="text"
                            placeholder="Type reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="flex-grow bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#3E2723] transition-all"
                          />
                          <button
                            type="submit"
                            disabled={!replyText.trim() && stagedAttachments.length === 0}
                            className="w-8 h-8 rounded-xl bg-[#3E2723] text-white flex items-center justify-center hover:bg-[#5D4037] disabled:opacity-40 disabled:hover:bg-[#3E2723] transition-all shrink-0 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="bg-white border-t border-gray-100 p-4 text-center text-xs text-gray-400 font-bold shrink-0">
                        This support ticket is resolved/closed.
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 3. TICKET CREATION FORM */}
                {view === "create" && (
                  <motion.div
                    key="create-view"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="flex-grow flex flex-col overflow-hidden h-full bg-white p-6 space-y-4"
                  >
                    <h3 className="font-serif font-bold text-sm text-gray-900 tracking-tight">
                      Raise Support Request
                    </h3>

                    <form onSubmit={handleCreateTicketSubmit} className="space-y-4 flex-grow flex flex-col overflow-y-auto overscroll-contain">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                          Category
                        </label>
                        <select
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-black outline-none cursor-pointer"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                          Subject
                        </label>
                        <input
                          type="text"
                          placeholder="Summarize your issue..."
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-black outline-none focus:border-[#3E2723] transition-all"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-1 flex-grow flex flex-col">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                          Message Details
                        </label>
                        <textarea
                          placeholder="Provide details about your query..."
                          className="w-full flex-grow p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-[#3E2723] transition-all h-24 resize-none leading-relaxed"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          required
                        />
                      </div>

                      {/* Attachments Section */}
                      <div className="space-y-2 shrink-0">
                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                          Attachments (Optional)
                        </label>
                        
                        {stagedAttachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 py-1">
                            {stagedAttachments.map((att, idx) => (
                              <div key={idx} className="relative group w-12 h-12 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                                {att.type === 'video' ? (
                                  <video src={att.url} className="w-full h-full object-cover" />
                                ) : (
                                  <img src={att.url} className="w-full h-full object-cover" />
                                )}
                                <button 
                                  type="button" 
                                  onClick={() => removeStagedAttachment(idx)}
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {isUploading && (
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Uploading: {uploadProgress}%</span>
                            <div className="flex-grow h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#3E2723] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 border border-dashed border-gray-300 hover:border-[#3E2723] hover:text-[#3E2723] rounded-lg text-[10px] font-bold text-gray-500 flex items-center gap-1.5 transition-all cursor-pointer w-max"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          Add Photo/Video
                        </button>
                      </div>

                      <div className="pt-2 flex gap-3 shrink-0">
                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={() => setView("list")}
                          className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isUploading}
                          className="flex-1 px-4 py-2.5 bg-[#3E2723] hover:bg-[#5D4037] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#3E2723]/10 disabled:opacity-50"
                        >
                          Submit Query
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*,video/*" 
        className="hidden" 
      />
    </>
  );
};

export default SellerSupportChatWidget;
