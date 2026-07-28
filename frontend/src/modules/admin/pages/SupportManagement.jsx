import React, { useState, useEffect, useRef } from 'react';
import { Eye, Trash2, Mail, Calendar, Inbox, AlertCircle, ShoppingBag, FileText, CheckCircle2, Send, Clock, User, MessageSquare, X, Headphones, Paperclip } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import DataTable from '../components/common/DataTable';
import AdminStatsCard from '../components/AdminStatsCard';
import api from '../../../services/api';
import { useSocket } from '../../../context/SocketContext';
import toast from 'react-hot-toast';

const SupportManagement = () => {
    const { socket } = useSocket();
    const [activeTab, setActiveTab] = useState('user'); // 'user' or 'seller'
    const [tickets, setTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [adminReplyText, setAdminReplyText] = useState('');
    const [ticketStatusUpdate, setTicketStatusUpdate] = useState('In Progress');
    const repliesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const [stagedAttachments, setStagedAttachments] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Clear staged files when ticket selection changes
    useEffect(() => {
        setStagedAttachments([]);
    }, [selectedTicket]);

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
            
            const { uploadToCloudinary } = await import('../../../utils/upload');
            const attachment = await uploadToCloudinary(
                file,
                "admin/support/upload-signature",
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

    // Fetch all tickets from backend
    const fetchTickets = async () => {
        setIsLoading(true);
        try {
            const endpoint = activeTab === 'user' ? 'admin/support' : 'admin/support/seller';
            const res = await api.get(endpoint);
            if (res.data.success) {
                setTickets(res.data.data?.tickets || res.data.tickets || []);
            }
        } catch (err) {
            console.error('Failed to fetch admin support tickets:', err);
            toast.error('Failed to load support tickets');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [activeTab]);

    // Socket listeners for real-time support updates
    useEffect(() => {
        if (!socket) return;

        const handleNewTicket = (newTicket) => {
            if (activeTab === 'user') {
                setTickets(prev => [newTicket, ...prev]);
                toast.success(`New customer support ticket created: "${newTicket.subject}"`, {
                    icon: '🎫',
                    duration: 5000
                });
            }
        };

        const handleNewSellerTicket = (newTicket) => {
            if (activeTab === 'seller') {
                setTickets(prev => [newTicket, ...prev]);
                toast.success(`New merchant support ticket created: "${newTicket.subject}"`, {
                    icon: '🎫',
                    duration: 5000
                });
            }
        };

        const handleSupportMessage = (data) => {
            if (activeTab !== 'user') return;
            const { _id, reply, status } = data;

            setTickets(prev => prev.map(t => {
                if (t._id === _id) {
                    const exists = t.replies.some(r => r.text === reply.text && r.from === reply.from && Math.abs(new Date(r.date) - new Date(reply.date)) < 2000);
                    if (exists) return t;

                    return {
                        ...t,
                        status,
                        replies: [...t.replies, reply],
                        updatedAt: new Date().toISOString()
                    };
                }
                return t;
            }));

            setSelectedTicket(prev => {
                if (prev && prev._id === _id) {
                    const exists = prev.replies.some(r => r.text === reply.text && r.from === reply.from && Math.abs(new Date(r.date) - new Date(reply.date)) < 2000);
                    if (exists) return prev;

                    return {
                        ...prev,
                        status,
                        replies: [...prev.replies, reply]
                    };
                }
                return prev;
            });

            if (reply.from === 'user') {
                toast(`User reply on ticket #${data.ticketId}: "${reply.text.substring(0, 30)}..."`, {
                    icon: '💬',
                    duration: 5000
                });
            }
        };

        const handleSellerSupportMessage = (data) => {
            if (activeTab !== 'seller') return;
            const { _id, reply, status } = data;

            setTickets(prev => prev.map(t => {
                if (t._id === _id) {
                    const exists = t.replies.some(r => r.text === reply.text && r.from === reply.from && Math.abs(new Date(r.date) - new Date(reply.date)) < 2000);
                    if (exists) return t;

                    return {
                        ...t,
                        status,
                        replies: [...t.replies, reply],
                        updatedAt: new Date().toISOString()
                    };
                }
                return t;
            }));

            setSelectedTicket(prev => {
                if (prev && prev._id === _id) {
                    const exists = prev.replies.some(r => r.text === reply.text && r.from === reply.from && Math.abs(new Date(r.date) - new Date(reply.date)) < 2000);
                    if (exists) return prev;

                    return {
                        ...prev,
                        status,
                        replies: [...prev.replies, reply]
                    };
                }
                return prev;
            });

            if (reply.from === 'seller') {
                toast(`Merchant reply on ticket #${data.ticketId}: "${reply.text.substring(0, 30)}..."`, {
                    icon: '💬',
                    duration: 5000
                });
            }
        };

        socket.on('support_ticket_created', handleNewTicket);
        socket.on('seller_support_ticket_created', handleNewSellerTicket);
        socket.on('support_message', handleSupportMessage);
        socket.on('seller_support_message', handleSellerSupportMessage);

        return () => {
            socket.off('support_ticket_created', handleNewTicket);
            socket.off('seller_support_ticket_created', handleNewSellerTicket);
            socket.off('support_message', handleSupportMessage);
            socket.off('seller_support_message', handleSellerSupportMessage);
        };
    }, [socket, activeTab]);

    // Scroll to bottom of replies when selected ticket changes or gets replies
    useEffect(() => {
        if (repliesEndRef.current) {
            repliesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedTicket?.replies]);

    const handleSendAdminReply = async (e) => {
        e.preventDefault();
        if ((!adminReplyText.trim() && stagedAttachments.length === 0) || !selectedTicket) return;

        try {
            const endpoint = activeTab === 'user' 
                ? `admin/support/${selectedTicket._id}/reply`
                : `admin/support/seller/${selectedTicket._id}/reply`;
            const res = await api.post(endpoint, {
                message: adminReplyText,
                status: ticketStatusUpdate,
                attachments: stagedAttachments
            });

            if (res.data.success) {
                const updatedTicket = res.data.data?.ticket || res.data.ticket;
                setSelectedTicket(updatedTicket);
                setTickets(prev => prev.map(t => t._id === updatedTicket._id ? updatedTicket : t));
                setAdminReplyText('');
                setStagedAttachments([]);
                toast.success('Reply sent successfully');
            }
        } catch (err) {
            console.error('Failed to send admin reply:', err);
            toast.error(err.response?.data?.message || 'Failed to send reply');
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            const endpoint = activeTab === 'user'
                ? `admin/support/${id}/reply`
                : `admin/support/seller/${id}/reply`;
            const res = await api.post(endpoint, {
                message: `Ticket status changed to ${newStatus} by admin.`,
                status: newStatus
            });
            if (res.data.success) {
                const updatedTicket = res.data.data?.ticket || res.data.ticket;
                setTickets(prev => prev.map(t => t._id === id ? updatedTicket : t));
                toast.success(`Ticket status updated to ${newStatus}`);
            }
        } catch (err) {
            console.error('Failed to update ticket status:', err);
            toast.error('Failed to update status');
        }
    };

    const filteredTickets = tickets.filter(t => {
        const nameToSearch = activeTab === 'seller' ? t.sellerName : t.userName;
        const matchesSearch = 
            t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nameToSearch?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.ticketId?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Stats
    const totalTicketsCount = tickets.length;
    const openTicketsCount = tickets.filter(t => t.status === 'Open').length;
    const resolvedTicketsCount = tickets.filter(t => t.status === 'Resolved').length;

    const columns = [
        {
            header: 'Date',
            render: (item) => (
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-900">{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</span>
                    <span className="text-[10px] text-gray-500">{new Date(item.updatedAt || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            )
        },
        {
            header: activeTab === 'seller' ? 'Seller' : 'User',
            render: (item) => (
                <div>
                    <p className="text-xs font-bold text-gray-900">
                        {activeTab === 'seller' ? item.sellerName : (item.userName || 'Customer')}
                    </p>
                    <p className="text-[10px] text-gray-500">
                        {activeTab === 'seller' ? item.sellerEmail : item.userEmail}
                    </p>
                </div>
            )
        },
        {
            header: 'Subject',
            render: (item) => (
                <div>
                    <p className="text-sm font-bold text-black line-clamp-1">{item.subject}</p>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{item.category}</span>
                </div>
            )
        },
        {
            header: 'Status',
            align: 'center',
            render: (item) => (
                <select
                    value={item.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleStatusChange(item._id, e.target.value)}
                    className={`text-[10px] font-bold uppercase tracking-wider bg-transparent border-none focus:ring-0 cursor-pointer ${
                        item.status === 'Open' ? 'text-blue-600' :
                        item.status === 'In Progress' ? 'text-amber-600' :
                        item.status === 'Resolved' ? 'text-green-600' : 'text-gray-500'
                    }`}
                >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                </select>
            )
        },
        {
            header: 'Actions',
            align: 'right',
            render: (item) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => {
                            setSelectedTicket(item);
                            setTicketStatusUpdate(item.status === 'Open' ? 'In Progress' : item.status);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#3E2723] hover:bg-[#3E2723]/5 rounded-lg transition-all cursor-pointer"
                        title="View & Reply"
                    >
                        <MessageSquare className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ];

    const filters = [
        {
            options: [
                { label: 'All', value: 'All' },
                { label: 'Open', value: 'Open' },
                { label: 'In Progress', value: 'In Progress' },
                { label: 'Resolved', value: 'Resolved' },
                { label: 'Closed', value: 'Closed' }
            ],
            onChange: (val) => setStatusFilter(val)
        }
    ];

    return (
        <div className="max-w-[1400px] mx-auto w-full flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] animate-in fade-in duration-500 pb-10">
            <PageHeader
                title="Support Tickets"
                subtitle="Track and resolve customer support requests"
            />

            {/* Toggle Tabs */}
            <div className="flex border-b border-gray-200 mt-4 shrink-0">
                <button
                    onClick={() => setActiveTab('user')}
                    className={`py-2.5 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
                        activeTab === 'user'
                            ? 'border-[#3E2723] text-[#3E2723]'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                >
                    User Tickets
                </button>
                <button
                    onClick={() => setActiveTab('seller')}
                    className={`py-2.5 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
                        activeTab === 'seller'
                            ? 'border-[#3E2723] text-[#3E2723]'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                >
                    Seller Tickets
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mb-8 shrink-0">
                <AdminStatsCard
                    label="Total Tickets"
                    value={totalTicketsCount}
                    icon={Inbox}
                    color="text-gray-600"
                    bgColor="bg-gray-50"
                />
                <AdminStatsCard
                    label="Open Tickets"
                    value={openTicketsCount}
                    icon={AlertCircle}
                    color="text-blue-500"
                    bgColor="bg-blue-50"
                />
                <AdminStatsCard
                    label="Resolved"
                    value={resolvedTicketsCount}
                    icon={CheckCircle2}
                    color="text-green-500"
                    bgColor="bg-green-50"
                />
            </div>

            <DataTable
                columns={columns}
                data={filteredTickets}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                searchPlaceholder="Search tickets..."
                filters={filters}
                isLoading={isLoading}
            />

            {/* Ticket Details & Chat Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-5 duration-300">
                        {/* Header */}
                        <div className="bg-[#3E2723] px-6 py-4 flex items-center justify-between shrink-0 text-white">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/10 p-2 rounded-lg">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">Ticket conversation</h3>
                                    <p className="text-[#D7CCC8] text-xs font-medium">#{selectedTicket.ticketId}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTicket(null)}
                                className="text-white/60 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body: Split into metadata and messages */}
                        <div className="flex-grow overflow-hidden flex flex-col bg-gray-50/50">
                            {/* Metadata bar */}
                            <div className="bg-white border-b border-gray-100 px-6 py-3 flex flex-wrap justify-between items-center gap-4 shrink-0 text-xs text-gray-600">
                                <div>
                                    <span className="font-bold text-gray-900">{activeTab === 'seller' ? 'Seller' : 'User'}:</span> {activeTab === 'seller' ? selectedTicket.sellerName : (selectedTicket.userName || 'Customer')} ({activeTab === 'seller' ? selectedTicket.sellerEmail : selectedTicket.userEmail})
                                </div>
                                {selectedTicket.orderId && (
                                    <div>
                                        <span className="font-bold text-gray-900">Order:</span> #{selectedTicket.orderId}
                                    </div>
                                )}
                                <div>
                                    <span className="font-bold text-gray-900">Category:</span> {selectedTicket.category}
                                </div>
                            </div>

                            {/* Chat messages thread */}
                            <div className="flex-grow overflow-y-auto p-6 space-y-4">
                                {/* Initial message */}
                                <div className="flex gap-3 items-start max-w-[85%]">
                                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
                                        <User className="w-4 h-4 text-gray-600" />
                                    </div>
                                    <div>
                                        <div className="bg-white border border-gray-200/60 p-3.5 rounded-2xl rounded-tl-none text-xs text-gray-800 shadow-sm leading-relaxed">
                                            <p className="font-bold text-[10px] text-[#9C5B61] mb-1">{activeTab === 'seller' ? 'Seller' : 'Customer'}</p>
                                            {selectedTicket.message}
                                            {renderAttachments(selectedTicket.attachments)}
                                        </div>
                                        <span className="text-[9px] text-gray-400 mt-1 block pl-1">
                                            {new Date(selectedTicket.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Replies */}
                                {selectedTicket.replies?.slice(1).map((reply, i) => {
                                    const isAdmin = reply.from === 'admin';
                                    return (
                                        <div
                                            key={i}
                                            className={`flex gap-3 max-w-[85%] ${
                                                isAdmin ? 'ml-auto flex-row-reverse' : 'items-start'
                                            }`}
                                        >
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                    isAdmin ? 'bg-[#3E2723] text-white' : 'bg-gray-300 text-gray-600'
                                                }`}
                                            >
                                                {isAdmin ? (
                                                    <Headphones className="w-4 h-4" />
                                                ) : (
                                                    <User className="w-4 h-4" />
                                                )}
                                            </div>
                                            <div>
                                                <div
                                                    className={`p-3.5 rounded-2xl text-xs shadow-sm leading-relaxed border ${
                                                        isAdmin
                                                          ? 'bg-[#3E2723] text-white rounded-tr-none border-[#3E2723]/10'
                                                          : 'bg-white text-gray-800 rounded-tl-none border-gray-200/60'
                                                    }`}
                                                >
                                                    <p
                                                        className={`font-bold text-[10px] mb-1 ${
                                                            isAdmin ? 'text-[#D7CCC8]' : 'text-[#9C5B61]'
                                                        }`}
                                                    >
                                                        {isAdmin ? 'Admin Support' : (activeTab === 'seller' ? 'Seller' : 'Customer')}
                                                    </p>
                                                    {reply.text}
                                                    {renderAttachments(reply.attachments)}
                                                </div>
                                                <span className="text-[9px] text-gray-400 mt-1 block px-1 text-right">
                                                    {new Date(reply.date).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={repliesEndRef} />
                            </div>

                            {/* Reply Input Form */}
                            <form onSubmit={handleSendAdminReply} className="bg-white border-t border-gray-200 p-4 shrink-0 flex flex-col gap-3">
                                <div className="flex gap-4 items-center">
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="font-bold text-gray-700">Set Ticket Status:</span>
                                        <select
                                            value={ticketStatusUpdate}
                                            onChange={(e) => setTicketStatusUpdate(e.target.value)}
                                            className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-900 focus:outline-none focus:border-[#3E2723]"
                                        >
                                            <option value="In Progress">In Progress</option>
                                            <option value="Resolved">Resolved</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </div>
                                </div>
                                {stagedAttachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 px-1">
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
                                    <div className="flex items-center gap-3 px-1">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Uploading: {uploadProgress}%</span>
                                        <div className="flex-grow h-1 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#3E2723] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-2 items-center">
                                    <button
                                        type="button"
                                        disabled={isUploading}
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0"
                                    >
                                        <Paperclip className="w-4 h-4" />
                                    </button>
                                    <textarea
                                        rows="2"
                                        placeholder="Type support response..."
                                        value={adminReplyText}
                                        onChange={(e) => setAdminReplyText(e.target.value)}
                                        className="flex-grow bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#3E2723] resize-none"
                                    ></textarea>
                                    <button
                                        type="submit"
                                        disabled={!adminReplyText.trim() && stagedAttachments.length === 0}
                                        className="px-5 py-3.5 bg-[#3E2723] hover:bg-[#2D1B18] disabled:opacity-40 disabled:hover:bg-[#3E2723] text-white rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer shrink-0"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        Send
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*,video/*" 
            className="hidden" 
        />
        </div>
    );
};

export default SupportManagement;
