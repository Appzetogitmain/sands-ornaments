import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Navbar from '../components/Navbar';
import CategoryNav from '../components/CategoryNav';
import OfferStrip from '../components/OfferStrip';
import Footer from '../components/Footer';
import WhatsAppFloating from '../components/WhatsAppFloating';
import MobileBottomNav from '../components/MobileBottomNav';

const UserLayout = () => {
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            
            // If scrolling down and past the header height (approx 150px)
            if (currentScrollY > lastScrollY && currentScrollY > 150) {
                setIsVisible(false);
            } 
            // If scrolling up
            else if (currentScrollY < lastScrollY) {
                setIsVisible(true);
            }
            
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    return (
        <div className="flex flex-col min-h-screen font-sans bg-background">
            <header 
                className={`sticky top-0 z-[150] flex flex-col shrink-0 bg-white shadow-md transition-transform duration-300 ${
                    isVisible ? 'translate-y-0' : '-translate-y-full'
                }`}
            >
                <TopBar />
                <Navbar />
                <CategoryNav />
                <OfferStrip />
            </header>
            <main className="flex-grow pb-16 md:pb-0">
                <Outlet />
            </main>
            <Footer />
            <WhatsAppFloating />
            <MobileBottomNav />
        </div>
    );
};

export default UserLayout;
