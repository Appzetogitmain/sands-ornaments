import React, { useState, useEffect } from "react";
import {
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Truck,
  Mail,
  Phone,
  MapPin,
  Heart,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import logo from "@assets/sands-logo.png";
import {
  normalizeExternalLink,
  normalizeFooterLink,
} from "../utils/navigation";
import api from "../../../services/api";

const Footer = () => {
  const location = useLocation();
  const isOrderSuccess = location.pathname === "/order-success";

  const [settings, setSettings] = useState({
    footerTagline: "Timeless Elegance,",
    footerSubTagline: "Handcrafted for You.",
    footerDescription:
      "Every piece at Sands tell a story of heritage and modern Grace. Join our community of silver lovers and celebrate life's most precious moments.",
    address: "123 Silver Arcade, Heritage Marg, Jaipur",
    phone: "+91 96088 11487",
    email: "support@sandsornaments.com",
    footerColumn1Title: "Experience",
    footerColumn2Title: "Policies",
    footerColumn3Title: "Our World",
    footerExperienceLinks: [
      { name: "Easy Returns", path: "/returns" },
      { name: "Contact Us", path: "/contact" },
      { name: "FAQs", path: "/help" },
      { name: "Blogs", path: "/blogs" },
      { name: "Sands Gift Cards", path: "/gift-cards" },
    ],
    footerPoliciesLinks: [
      { name: "Shipping Policy", path: "/shipping-policy" },
      { name: "Privacy Policy", path: "/privacy" },
      { name: "Cancellation Policy", path: "/cancellation-policy" },
      { name: "Terms & Conditions", path: "/terms" },
    ],
    footerWorldLinks: [
      { name: "About Us", path: "/about" },
      { name: "Jewellery Care Guide", path: "/care-guide" },
      { name: "Our Craft", path: "/craft" },
    ],
    socialLinks: {
      facebook: "#",
      twitter: "#",
      instagram: "#",
      youtube: "#",
    },
    footerDeliveryText: "Safe & Insured Express Worldwide Delivery",
    footerCopyrightText: "Sands Jewels Pvt Ltd. All Rights Reserved.",
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get("public/settings");
        if (res.data.success && res.data.data?.settings) {
          const fetched = res.data.data.settings;
          setSettings((prev) => ({
            ...prev,
            ...fetched,
            socialLinks: {
              ...prev.socialLinks,
              ...(fetched.socialLinks || {}),
            },
          }));
          return;
        }
      } catch (err) {
        console.warn(
          "Failed to fetch public footer settings, falling back to localStorage/defaults:",
          err.message,
        );
      }

      const saved = localStorage.getItem("siteSettings");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings((prev) => ({
          ...prev,
          ...parsed,
          socialLinks: {
            ...prev.socialLinks,
            ...(parsed.socialLinks || {}),
          },
        }));
      }
    };

    loadSettings();
    window.addEventListener("storage", loadSettings);
    return () => window.removeEventListener("storage", loadSettings);
  }, []);

  if (isOrderSuccess) return null;

  return (
    <footer className="relative bg-[#FCF9F9] pt-12 pb-6 overflow-hidden border-t border-gray-100">
      <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-[#4A1015] via-[#C9A24D] to-[#4A1015]"></div>
      <div className="absolute top-0 right-0 w-1/3 h-full bg-white/40 -z-0 skew-x-[-15deg] translate-x-1/2"></div>

      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-10">
          {/* Brand Section */}
          <div className="lg:col-span-4 space-y-6">
            <div className="space-y-4">
              <Link
                to="/"
                className="inline-block transition-transform hover:scale-105 duration-500"
              >
                <img
                  src={logo}
                  alt="Sands Jewels"
                  className="h-14 w-auto object-contain"
                />
              </Link>
              <div className="space-y-2">
                <h3 className="text-xl font-display text-[#4A1015] leading-tight tracking-wide">
                  {settings.footerTagline} <br />
                  <span className="italic font-serif text-[#C9A24D] font-light">
                    {settings.footerSubTagline}
                  </span>
                </h3>
                <p className="text-gray-500 font-serif text-[13px] leading-relaxed max-w-sm opacity-90">
                  {settings.footerDescription}
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-center pt-2">
              {[
                { Icon: ShieldCheck, label: "Secure" },
                { Icon: Star, label: "925 Pure" },
                { Icon: Heart, label: "Verified" },
              ].map((badge, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1.5 group cursor-default"
                >
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-[#C9A24D] group-hover:scale-110 group-hover:bg-[#C9A24D] group-hover:text-white transition-all duration-500">
                    <badge.Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[9px] uppercase tracking-[0.25em] text-gray-400 font-bold group-hover:text-[#4A1015] transition-colors">
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Links Grid */}
          <div className="lg:col-span-5 grid grid-cols-2 md:grid-cols-3 gap-8 pt-4">
            {[
              {
                title: settings.footerColumn1Title,
                links: settings.footerExperienceLinks,
              },
              {
                title: settings.footerColumn2Title,
                links: settings.footerPoliciesLinks,
              },
              {
                title: settings.footerColumn3Title,
                links: settings.footerWorldLinks,
              },
            ].map((col, i) => (
              <div key={i} className="space-y-4">
                <h4 className="font-display text-[#4A1015] font-bold uppercase tracking-[0.3em] text-[11px] border-b border-[#EBCDD0]/50 pb-2 mb-2">
                  {col.title}
                </h4>
                <ul className="space-y-3">
                  {col.links?.map((link, idx) => (
                    <li key={idx}>
                      <Link
                        to={normalizeFooterLink(link.path)}
                        className="text-[13px] text-gray-500 font-medium hover:text-[#4A1015] transition-all hover:translate-x-1 inline-flex items-center group"
                      >
                        <span className="w-1.5 h-[1px] bg-[#C9A24D] mr-2 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Contact Card */}
          <div className="lg:col-span-3">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#4A1015]/5 rounded-bl-full -z-0 group-hover:scale-[2] transition-transform duration-1000"></div>

              <div className="relative z-10 space-y-5">
                <h4 className="font-display text-[#4A1015] font-bold uppercase tracking-[0.25em] text-[11px]">
                  Connect Directly
                </h4>
                <div className="space-y-4">
                  <a
                    href={`mailto:${settings.email}`}
                    className="flex items-center gap-4 group/item"
                  >
                    <div className="w-10 h-10 bg-[#4A1015] text-white rounded-[14px] flex items-center justify-center group-hover/item:bg-[#C9A24D] transition-all duration-500 shadow-md shadow-[#4A1015]/10">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-700 hover:text-[#4A1015] transition-colors">
                      {settings.email}
                    </span>
                  </a>
                  <a
                    href={`tel:${settings.phone}`}
                    className="flex items-center gap-4 group/item"
                  >
                    <div className="w-10 h-10 bg-[#4A1015] text-white rounded-[14px] flex items-center justify-center group-hover/item:bg-[#C9A24D] transition-all duration-500 shadow-md shadow-[#4A1015]/10">
                      <Phone className="w-4 h-4" />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-700 hover:text-[#4A1015] transition-colors">
                      {settings.phone}
                    </span>
                  </a>
                  <div className="flex items-start gap-4 group/item">
                    <div className="w-10 h-10 bg-[#4A1015] text-white rounded-[14px] flex items-center justify-center group-hover/item:bg-[#C9A24D] transition-all duration-500 shadow-md shadow-[#4A1015]/10">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-700 hover:text-[#4A1015] transition-colors">
                      {settings.address}
                    </span>
                  </div>
                </div>

                <div className="pt-5 border-t border-gray-100 space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.3em] font-black text-gray-300">
                    Social Gallery
                  </p>
                  <div className="flex gap-3">
                    {[
                      { Icon: Facebook, link: settings.socialLinks?.facebook },
                      { Icon: Twitter, link: settings.socialLinks?.twitter },
                      {
                        Icon: Instagram,
                        link: settings.socialLinks?.instagram,
                      },
                      { Icon: Youtube, link: settings.socialLinks?.youtube },
                    ].map((social, i) => (
                      <a
                        key={i}
                        href={normalizeExternalLink(social.link)}
                        target="_blank"
                        rel="noreferrer"
                        className="w-9 h-9 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:bg-[#4A1015] hover:text-white hover:-translate-y-1 transition-all duration-500 shadow-sm"
                      >
                        <social.Icon className="w-4 h-4" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 border border-red-100/50 bg-white/50 backdrop-blur-sm rounded-2xl py-4 flex items-center justify-center px-6 max-w-4xl mx-auto shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
              <span className="font-black text-red-700 mr-2 uppercase tracking-tight">
                FRAUD AWARENESS:
              </span>
              {settings.fraudWarning ||
                "Sands Jewels will NEVER ask for OTPs, passwords, or sensitive financial information via unsolicited calls, WhatsApp, or emails."}
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-4 border-t border-gray-100/60">
          <div className="flex items-center gap-3 bg-white px-5 py-2 rounded-2xl border border-gray-100 shadow-sm">
            <Truck className="w-4 h-4 text-[#4A1015]" />
            <span className="text-[9px] uppercase tracking-[0.3em] font-black text-[#4A1015]">
              {settings.footerDeliveryText}
            </span>
          </div>

          <div className="flex flex-col items-center md:items-end gap-1.5">
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.25em] font-semibold">
              &copy; {new Date().getFullYear()} {settings.footerCopyrightText}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
