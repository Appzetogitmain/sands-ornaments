import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { X, Send, ChevronLeft, Plus, Headphones, Inbox, Paperclip, Trash2 } from "lucide-react";
import { useSupport } from "../../../context/SupportContext";
import toast from "react-hot-toast";
import { getLenis } from "../../../lib/lenis";

const SupportChatPanel = () => {
  const {
    tickets,
    activeTicket,
    activeTicketId,
    setActiveTicketId,
    isOpen,
    setIsOpen,
    createNewTicket,
    sendReply,
    isLoading,
  } = useSupport();

  const [view, setView] = useState("list"); // 'list' | 'chat' | 'create'
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("General Inquiry");
  const [message, setMessage] = useState("");
  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const panelRef = useRef(null);
  const [stagedAttachments, setStagedAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Clear staged files on view change
  useEffect(() => {
    setStagedAttachments([]);
  }, [view]);

  // Reset view when widget opens/closes
  useEffect(() => {
    if (isOpen && !activeTicketId) {
      setView("list");
    }
  }, [isOpen, activeTicketId]);

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
        "user/support/upload-signature",
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

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTicket?.replies]);

  // Open ticket chat when a notification targets a specific ticket
  useEffect(() => {
    if (activeTicketId && isOpen) {
      setView("chat");
    }
  }, [activeTicketId, isOpen]);

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

  const handleCreateTicketSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || (!message.trim() && stagedAttachments.length === 0)) return;
    const ticket = await createNewTicket(subject, category, message, '', stagedAttachments);
    if (ticket) {
      setSubject("");
      setMessage("");
      setStagedAttachments([]);
      setView("chat");
    }
  };

  const handleSendReplySubmit = async (e) => {
    e.preventDefault();
    if ((!replyText.trim() && stagedAttachments.length === 0) || !activeTicketId) return;
    const success = await sendReply(activeTicketId, replyText, stagedAttachments);
    if (success) {
      setReplyText("");
      setStagedAttachments([]);
    }
  };

  const categories = [
    "General Inquiry",
    "Order Tracking",
    "Payment Issue",
    "Return/Refund",
    "Product Feedback",
    "Other",
  ];

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Open":
        return "bg-blue-50 text-blue-700 border-blue-100";
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

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          data-lenis-prevent
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed right-0 md:right-6 z-[10000] w-full shadow-2xl overflow-hidden bottom-0 md:bottom-[11.5rem] md:w-[380px] h-full md:h-[550px] md:max-h-[calc(100vh-13.5rem)] bg-white md:rounded-3xl border border-gray-100 flex flex-col"
        >
          {/* Header */}
          <div className="bg-[#9C5B61] text-white px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              {view !== "list" && (
                <button
                  type="button"
                  onClick={() => {
                    setView("list");
                    setActiveTicketId(null);
                  }}
                  className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
                  aria-label="Back to support tickets"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Headphones className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm tracking-wide">
                  Sands Support
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  <span className="text-[10px] text-white/80 font-medium">
                    Support Online
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
              {/* 1. TICKET CHAT VIEW */}
              {view === "chat" && activeTicket && (
                <motion.div
                  key="chat-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-grow flex flex-col overflow-hidden h-full"
                >
                  {/* Active Ticket Details TopBar */}
                  <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2 shrink-0">
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
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                        #{activeTicket.ticketId}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeClass(activeTicket.status)}`}
                    >
                      {activeTicket.status}
                    </span>
                  </div>

                  {/* Messages Scroll Thread */}
                  <div className="flex-grow overflow-y-auto overscroll-contain p-4 space-y-4">
                    {/* Original Initial message */}
                    <div className="flex flex-col items-start max-w-[85%]">
                      <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs font-medium shadow-sm border border-gray-200/50">
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
                          className={`flex flex-col max-w-[85%] ${isAdmin ? "items-start" : "items-end ml-auto"}`}
                        >
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-xs font-medium shadow-sm border ${
                              isAdmin
                                ? "bg-white text-gray-800 rounded-tl-none border-gray-200/50"
                                : "bg-[#9C5B61] text-white rounded-tr-none border-[#9C5B61]/10"
                            }`}
                          >
                            {reply.text}
                            {renderAttachments(reply.attachments)}
                          </div>
                          <span className="text-[9px] text-gray-400 mt-1 px-1">
                            {new Date(reply.date || reply.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input form */}
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
                            <div className="h-full bg-[#9C5B61] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
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
                          placeholder="Type message..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="flex-grow bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#9C5B61] transition-all"
                        />
                        <button
                          type="submit"
                          disabled={!replyText.trim() && stagedAttachments.length === 0}
                          className="w-8 h-8 rounded-full bg-[#9C5B61] text-white flex items-center justify-center hover:bg-[#7A2E3A] disabled:opacity-40 disabled:hover:bg-[#9C5B61] transition-all shrink-0 cursor-pointer"
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

              {/* 2. TICKET LIST VIEW */}
              {view === "list" && (
                <motion.div
                  key="list-view"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex-grow flex flex-col overflow-hidden h-full"
                >
                  {/* Main CTA */}
                  <div className="p-4 shrink-0">
                    <button
                      onClick={() => setView("create")}
                      className="w-full bg-[#EBCDD0] text-black py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#D39A9F] hover:text-white transition-all shadow-sm text-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Create Support Request
                    </button>
                  </div>

                  <div className="flex-grow overflow-y-auto overscroll-contain px-4 pb-4 space-y-3">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 pl-1">
                      Your Support History
                    </div>

                    {isLoading ? (
                      <div className="flex justify-center items-center py-10">
                        <span className="w-6 h-6 border-2 border-gray-200 border-t-[#9C5B61] rounded-full animate-spin"></span>
                      </div>
                    ) : tickets.length > 0 ? (
                      tickets.map((t) => (
                        <div
                          key={t._id}
                          onClick={() => {
                            setActiveTicketId(t._id);
                            setView("chat");
                          }}
                          className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-[#9C5B61] transition-all cursor-pointer group flex flex-col gap-2"
                        >
                          <div className="flex justify-between items-start">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getStatusBadgeClass(t.status)}`}
                            >
                              {t.status}
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                              #{t.ticketId}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-gray-900 group-hover:text-[#9C5B61] transition-colors line-clamp-1">
                            {t.subject}
                          </h4>
                          <p className="text-[10px] text-gray-400 font-medium line-clamp-1">
                            {t.replies && t.replies.length > 0
                              ? t.replies[t.replies.length - 1].text
                              : t.message}
                          </p>
                          <div className="text-[9px] text-gray-400/80 font-bold uppercase tracking-widest text-right mt-1">
                            {new Date(t.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200/80 p-6">
                        <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                        <p className="text-xs text-gray-500 font-semibold mb-1">
                          No support tickets found
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Need help with an order or product? Create a support request.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* 3. TICKET CREATION VIEW */}
              {view === "create" && (
                <motion.div
                  key="create-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="flex-grow flex flex-col overflow-hidden h-full"
                >
                  <div className="bg-white border-b border-gray-100 px-4 py-3.5 flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setView("list")}
                      className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-black transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h4 className="text-xs font-bold text-gray-900">
                      New Support Request
                    </h4>
                  </div>

                  <form
                    onSubmit={handleCreateTicketSubmit}
                    className="flex-grow overflow-y-auto overscroll-contain p-4 space-y-4 flex flex-col"
                  >
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                        Subject
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="What do you need help with?"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#9C5B61] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#9C5B61] transition-all"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-grow flex flex-col min-h-[150px]">
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                        Detailed Message
                      </label>
                      <textarea
                        required
                        placeholder="Please describe your query..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={6}
                        className="w-full flex-grow bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#9C5B61] resize-none transition-all"
                      />
                    </div>

                    {/* Attachments Section */}
                    <div className="space-y-2">
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
                            <div className="h-full bg-[#9C5B61] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 border border-dashed border-gray-300 hover:border-[#9C5B61] hover:text-[#9C5B61] rounded-lg text-[10px] font-bold text-gray-500 flex items-center gap-1.5 transition-all cursor-pointer w-max"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        Add Photo/Video
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isUploading}
                      className="w-full bg-[#9C5B61] hover:bg-[#7A2E3A] text-white py-3 rounded-xl font-bold transition-all shadow-sm text-xs cursor-pointer mt-auto shrink-0 disabled:opacity-50"
                    >
                      Submit Request
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*,video/*" 
            className="hidden" 
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default SupportChatPanel;
