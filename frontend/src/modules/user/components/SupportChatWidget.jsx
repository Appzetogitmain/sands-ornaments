import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Headphones, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSupport } from "../../../context/SupportContext";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";
import SupportChatPanel from "./SupportChatPanel";

const SupportChatWidget = ({ inline = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCustomer = user?.role === "user";
  const {
    tickets,
    isOpen,
    setIsOpen,
  } = useSupport();

  const handleToggleOpen = () => {
    if (!isOpen) {
      if (!isCustomer) {
        toast("Please log in to open a support ticket.", { icon: "🔐" });
        navigate("/login", { state: { from: "/help-center" } });
        return;
      }
      setIsOpen(true);
      return;
    }
    setIsOpen(false);
  };

  const buttonPositionClass = inline
    ? "support-floating relative"
    : "support-floating fixed bottom-[calc(5rem+3.5rem+0.75rem)] md:bottom-[calc(2rem+4rem+0.75rem)] right-6 z-[10000]";

  return (
    <div className="support-chat-widget-container">
      {/* Floating Button — visible for all visitors */}
      <motion.button
        onClick={handleToggleOpen}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Contact support"
        className={`${buttonPositionClass} flex items-center justify-center w-14 h-14 bg-[#9C5B61] text-white rounded-full shadow-[0_10px_25px_rgba(156,91,97,0.4)] hover:bg-[#7A2E3A] transition-colors cursor-pointer group shrink-0`}>
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="relative">
              <Headphones className="w-6 h-6" />
              {/* Unread dot indicator */}
              {isCustomer &&
                tickets.some((t) => t.status === "In Progress") && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Separate Chat Panel Component */}
      <SupportChatPanel />
    </div>
  );
};

export default SupportChatWidget;
