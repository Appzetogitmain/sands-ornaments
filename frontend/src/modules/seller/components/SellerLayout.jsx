import React, { useState } from 'react';
import SellerSidebar from './SellerSidebar';
import SellerHeader from './SellerHeader';
import SellerSupportChatWidget from './SellerSupportChatWidget';

const SellerLayout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 overflow-x-clip seller-font-reset">
            <style>{`
                .seller-font-reset, .seller-font-reset * {
                    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji" !important;
                }
                .sidebar-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255, 255, 255, 0.32) transparent;
                }
                .sidebar-scroll::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .sidebar-scroll::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.04);
                }
                .sidebar-scroll::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.28);
                    border-radius: 9999px;
                    border: 2px solid rgba(62, 39, 35, 0.65);
                }
                .sidebar-scroll::-webkit-scrollbar-button {
                    display: none;
                }
            `}</style>
            
            {/* Sidebar Backdrop (Mobile only) */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[90] lg:hidden backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <SellerSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

            <main className={`flex-grow flex flex-col min-h-screen min-w-0 transition-all duration-500 ease-in-out ${isSidebarOpen ? 'lg:ml-80' : 'lg:ml-20'}`}>
                <SellerHeader isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="h-16 shrink-0" />

                {/* Page Content */}
                <div className="flex-grow min-h-0 bg-gray-50 p-4 lg:p-8 space-y-6 relative">
                    <div className="max-w-[1600px] mx-auto w-full min-w-0 animate-in fade-in duration-500 pb-10 lg:pb-14">
                        {children}
                    </div>
                </div>
            </main>
            <SellerSupportChatWidget />
        </div>
    );
};

export default SellerLayout;
