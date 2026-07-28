import React, { useState, useEffect } from "react";
import {
  Save,
  Truck,
  AlertTriangle,
  MapPin,
  Phone,
  Mail,
  Globe,
  Check,
  Edit3,
  RefreshCw,
  Repeat,
  CreditCard,
  Shield,
  Bell,
  Plus,
  Trash2,
  Tag,
  Gift,
  Star,
  Zap,
  Headset,
  Upload,
  X,
  ChevronDown,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Layout,
  Sparkles,
  Smile,
  Droplets,
} from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import api from "../../../services/api";
import toast from "react-hot-toast";

const DEFAULT_SETTINGS = {
  productHeader: "ESTIMATED DELIVERY DATE",
  returnPolicy: "2 Days Return",
  exchangePolicy: "10 Days Exchange",
  codPolicy: "Cash On Delivery",
  warrantyText: "Lifetime Warranty",
  safetyText: "Skin Safe Jewellery",
  platingText: "18k Gold Tone Plated",
  purityText: "925 Fine Silver",
  announcementItems: [
    { id: 1, icon: "Truck", text: "Free Shipping" },
    { id: 2, icon: "Shield", text: "Secure Payments" },
    { id: 3, icon: "RefreshCw", text: "Easy Returns & Refunds" },
    { id: 4, icon: "Headset", text: "Dedicated Support Team" },
  ],
  fraudWarning:
    "BEWARE OF FRAUD: Sands Jewels never asks for confidential banking details over phone or email.",
  address: "123 Silver Arcade, Heritage Marg, Jaipur",
  phone: "+91 98765 43210",
  email: "support@sandsornaments.com",
  website: "www.sandsornaments.com",

  // Footer Settings
  footerTagline: "Timeless Elegance,",
  footerSubTagline: "Handcrafted for You.",
  footerDescription:
    "Every piece at Sands tell a story of heritage and modern Grace. Join our community of silver lovers and celebrate life's most precious moments.",

  footerColumn1Title: "Experience",
  footerColumn2Title: "Policies",
  footerColumn3Title: "Our World",

  footerExperienceLinks: [
    { id: 1, name: "Easy Returns", path: "/return-policy" },
    { id: 2, name: "Contact Us", path: "/help" },
    { id: 3, name: "FAQs", path: "/help" },
    { id: 4, name: "Blogs", path: "/blogs" },
  ],
  footerPoliciesLinks: [
    { id: 1, name: "Shipping Policy", path: "/shipping-policy" },
    { id: 2, name: "Privacy Policy", path: "/privacy" },
    { id: 3, name: "Cancellation Policy", path: "/cancellation-policy" },
    { id: 4, name: "Terms & Conditions", path: "/terms" },
  ],
  sandsPromise: [
    {
      title: "Authentic 925 Silver",
      desc: "Certified 925 Sterling Silver with official hallmarking on every single piece.",
      icon: "ShieldCheck",
    },
    {
      title: "Skin Safe Luxury",
      desc: "Hypoallergenic, Nickel and Lead-free materials designed for sensitive skin.",
      icon: "Smile",
    },
    {
      title: "Signature Packaging",
      desc: "Arrives in our signature velvet-lined box, perfect for gifting and safekeeping.",
      icon: "Gift",
    },
  ],
  careGuide: [
    {
      title: "Stay Dry",
      desc: "Remove before bathing or swimming to prevent tarnishing.",
      icon: "Droplets",
    },
    {
      title: "Last Step",
      desc: "Avoid contact with perfumes, makeup, and hairsprays.",
      icon: "Sparkles",
    },
    {
      title: "Safe Haven",
      desc: "Store in individual airtight bags to minimize oxidation.",
      icon: "ShieldCheck",
    },
    {
      title: "Gentle Clean",
      desc: "Regularly wipe with a soft cloth to restore its natural glow.",
      icon: "Smile",
    },
  ],
  careGuideIntro: "Our jewelry is crafted with pure 925 sterling silver and premium plating. Follow these simple steps to ensure your pieces remain as stunning as the day you first wore them.",
  footerWorldLinks: [
    { id: 1, name: "About Us", path: "/about" },
    { id: 2, name: "Jewellery Care Guide", path: "/care-guide" },
    { id: 3, name: "Our Craft", path: "/craft" },
  ],

  socialLinks: {
    facebook: "#",
    twitter: "#",
    instagram: "#",
    youtube: "#",
  },

  footerDeliveryText: "Safe & Insured Express Worldwide Delivery",
  footerCopyrightText: "Sands Jewels Pvt Ltd. All Rights Reserved.",
};

const GlobalSettings = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get("admin/settings");
        if (res.data.success && res.data.data?.settings) {
          const fetched = res.data.data.settings;
          setSettings((prev) => ({
            ...DEFAULT_SETTINGS,
            ...fetched,
            socialLinks: {
              ...DEFAULT_SETTINGS.socialLinks,
              ...(fetched.socialLinks || {}),
            },
          }));
        }
      } catch (err) {
        console.error("Failed to load settings from DB:", err);
        toast.error("Failed to load settings from server");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await api.put("admin/settings", settings);
      if (res.data.success) {
        toast.success("Global Settings saved to database!");
        // Also write to local storage as fallback/cross-tab trigger
        localStorage.setItem(
          "siteSettings",
          JSON.stringify(res.data.data.settings || settings),
        );
        window.dispatchEvent(new Event("storage"));
        setIsEditing(false);
      } else {
        toast.error(res.data.message || "Failed to save settings");
      }
    } catch (err) {
      console.error("Failed to save settings to DB:", err);
      toast.error(
        err.response?.data?.message || err.message || "Failed to save settings",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parentField, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [key]: value,
      },
    }));
  };

  // Announcement Handlers
  const handleAnnouncementChange = (id, field, value) => {
    setSettings((prev) => ({
      ...prev,
      announcementItems: prev.announcementItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addAnnouncement = () => {
    const newId =
      Math.max(...settings.announcementItems.map((i) => i.id), 0) + 1;
    setSettings((prev) => ({
      ...prev,
      announcementItems: [
        ...prev.announcementItems,
        { id: newId, icon: "Tag", text: "" },
      ],
    }));
  };

  const removeAnnouncement = (id) => {
    setSettings((prev) => ({
      ...prev,
      announcementItems: prev.announcementItems.filter(
        (item) => item.id !== id,
      ),
    }));
  };

  // Generic Link List Handlers (for Footer)
  const handlePromiseChange = (idx, field, value) => {
    setSettings((prev) => {
      const updated = [...(prev.sandsPromise || [])];
      if (!updated[idx]) {
        updated[idx] = { title: "", desc: "", icon: "ShieldCheck" };
      }
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, sandsPromise: updated };
    });
  };

  const handleCareGuideChange = (idx, field, value) => {
    setSettings((prev) => {
      const updated = [...(prev.careGuide || [])];
      if (!updated[idx]) {
        updated[idx] = { title: "", desc: "", icon: "Droplets" };
      }
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, careGuide: updated };
    });
  };

  const handleLinkChange = (listName, id, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [listName]: prev[listName].map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addLink = (listName) => {
    const newId = Math.max(...settings[listName].map((i) => i.id), 0) + 1;
    setSettings((prev) => ({
      ...prev,
      [listName]: [
        ...prev[listName],
        { id: newId, name: "New Link", path: "/" },
      ],
    }));
  };

  const removeLink = (listName, id) => {
    setSettings((prev) => ({
      ...prev,
      [listName]: prev[listName].filter((item) => item.id !== id),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-[#3E2723] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500 tracking-wide animate-pulse">
          Loading settings...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <PageHeader
          title="Global Settings"
          subtitle="Manage store-wide text, alerts, and contact information"
        />

        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl text-xs md:text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs md:text-sm font-medium bg-[#3E2723] text-white hover:bg-[#5D4037] transition-all shadow-sm active:scale-95"
              >
                {isSaving ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isSaving ? "Saved" : "Save Changes"}</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs md:text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Settings</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {/* Product Highlights Section */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-serif font-medium text-[#3E2723]">
              Product Page Policies
            </h3>
            <p className="text-xs text-gray-500 font-medium tracking-wide mt-1">
              Manage delivery, return, and payment text
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-[10px] font-medium text-gray-400 tracking-wide mb-2">
                <Truck className="w-3 h-3" />
                <span>Section Header Title</span>
              </label>
              <input
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3E2723]/10 disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                value={settings.productHeader}
                onChange={(e) => handleChange("productHeader", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-[10px] font-medium text-gray-400 tracking-wide mb-2">
                <RefreshCw className="w-3 h-3" />
                <span>Return Policy Text</span>
              </label>
              <input
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3E2723]/10 disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                value={settings.returnPolicy}
                onChange={(e) => handleChange("returnPolicy", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-[10px] font-medium text-gray-400 tracking-wide mb-2">
                <Repeat className="w-3 h-3" />
                <span>Exchange Policy Text</span>
              </label>
              <input
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3E2723]/10 disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                value={settings.exchangePolicy}
                onChange={(e) => handleChange("exchangePolicy", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-[10px] font-medium text-gray-400 tracking-wide mb-2">
                <CreditCard className="w-3 h-3" />
                <span>COD / Payment Text</span>
              </label>
              <input
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3E2723]/10 disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                value={settings.codPolicy}
                onChange={(e) => handleChange("codPolicy", e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>
        </div>

        {/* Value Propositions Section */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-serif font-medium text-[#3E2723]">
              Value Propositions
            </h3>
            <p className="text-xs text-gray-500 font-medium tracking-wide mt-1">
              Key benefits shown on pink banner
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-[10px] font-medium text-gray-400 tracking-wide mb-2">
                <Star className="w-3 h-3" />
                <span>Purity Text (e.g. 925 Fine Silver)</span>
              </label>
              <input
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3E2723]/10 disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                value={settings.purityText || ""}
                onChange={(e) => handleChange("purityText", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-[10px] font-medium text-gray-400 tracking-wide mb-2">
                <Shield className="w-3 h-3" />
                <span>Warranty Text</span>
              </label>
              <input
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3E2723]/10 disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                value={settings.warrantyText}
                onChange={(e) => handleChange("warrantyText", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-[10px] font-medium text-gray-400 tracking-wide mb-2">
                <Check className="w-3 h-3" />
                <span>Safety Feature (e.g. Skin Safe)</span>
              </label>
              <input
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3E2723]/10 disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                value={settings.safetyText}
                onChange={(e) => handleChange("safetyText", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-[10px] font-medium text-gray-400 tracking-wide mb-2">
                <Check className="w-3 h-3" />
                <span>Plating/Material Text</span>
              </label>
              <input
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3E2723]/10 disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                value={settings.platingText}
                onChange={(e) => handleChange("platingText", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-[10px] font-medium text-gray-400 tracking-wide mb-2">
                <Repeat className="w-3 h-3" />
                <span>Return Policy Text</span>
              </label>
              <input
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3E2723]/10 disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                value={settings.returnPolicy}
                onChange={(e) => handleChange("returnPolicy", e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>
        </div>

        {/* Announcement Bar Section */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-serif font-medium text-[#3E2723]">
                Announcement Bar
              </h3>
              <p className="text-xs text-gray-500 font-medium tracking-wide mt-1">
                Manage scrolling items in navbar
              </p>
            </div>
            {isEditing && (
              <button
                onClick={addAnnouncement}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[#3E2723]/10 text-[#3E2723] hover:bg-[#3E2723]/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {settings.announcementItems &&
              settings.announcementItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-lg animate-in slide-in-from-left-2 duration-300"
                >
                  {/* Leading: Icon Select OR Image Preview */}
                  <div className="shrink-0 flex items-center gap-2">
                    <div className="relative">
                      <select
                        className="w-28 pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#3E2723]/10 appearance-none cursor-pointer"
                        value={item.icon || "Truck"}
                        onChange={(e) =>
                          handleAnnouncementChange(
                            item.id,
                            "icon",
                            e.target.value,
                          )
                        }
                        disabled={!isEditing}
                      >
                        <option value="Truck">Truck</option>
                        <option value="Shield">Secure</option>
                        <option value="RefreshCw">Return</option>
                        <option value="Headset">Support</option>
                        <option value="Tag">Offer</option>
                        <option value="Gift">Gift</option>
                        <option value="Star">Star</option>
                        <option value="Bell">Alert</option>
                        <option value="Zap">New</option>
                      </select>
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <ChevronDown className="w-3 h-3" />
                      </div>
                    </div>
                  </div>

                  {/* Text Input */}
                  <div className="flex-1">
                    <input
                      className="w-full px-3 py-2 bg-transparent text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none border-b border-transparent focus:border-[#3E2723]/20 transition-colors"
                      value={item.text}
                      onChange={(e) =>
                        handleAnnouncementChange(
                          item.id,
                          "text",
                          e.target.value,
                        )
                      }
                      disabled={!isEditing}
                      placeholder="Announcement text..."
                    />
                  </div>

                  {/* Delete */}
                  {isEditing && (
                    <button
                      onClick={() => removeAnnouncement(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Fraud Alert Section */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-serif font-medium text-[#3E2723]">
              Fraud & Safety Alerts
            </h3>
            <p className="text-xs text-gray-500 font-medium tracking-wide mt-1">
              Important warnings for customers
            </p>
          </div>

          <div className="bg-red-50 p-4 rounded-xl border border-red-100">
            <label className="flex items-center gap-2 text-[10px] font-medium text-red-400 tracking-wide mb-2">
              <AlertTriangle className="w-3 h-3" />
              <span>Global Fraud Warning Text</span>
            </label>
            <textarea
              className="w-full p-3 bg-white border border-red-200 rounded-xl text-sm font-medium text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500/10 disabled:bg-white disabled:text-gray-500 h-32 resize-none transition-all"
              value={settings.fraudWarning}
              onChange={(e) => handleChange("fraudWarning", e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </div>

        {/* Contact Details Section - Full Width */}
        <div className="lg:col-span-2 bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-serif font-medium text-[#3E2723]">
              Company Contact Details
            </h3>
            <p className="text-xs text-gray-500 font-medium tracking-wide mt-1">
              Displayed in Footer and Contact Page
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <div>
              <label className="flex items-center gap-2 text-[10px] font-medium text-gray-400 tracking-wide mb-2">
                <MapPin className="w-3 h-3" />
                <span>Official Address</span>
              </label>
              <textarea
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3E2723]/10 disabled:bg-gray-50 disabled:text-gray-500 h-24 resize-none transition-all"
                value={settings.address}
                onChange={(e) => handleChange("address", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-[10px] font-medium text-gray-400 tracking-wide mb-2">
                  <Phone className="w-3 h-3" />
                  <span>Support Phone</span>
                </label>
                <input
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3E2723]/10 disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                  value={settings.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-[10px] font-medium text-gray-400 tracking-wide mb-2">
                  <Mail className="w-3 h-3" />
                  <span>Support Email</span>
                </label>
                <input
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3E2723]/10 disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                  value={settings.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Product Page USP & Care Guide Blocks */}
        <div className="lg:col-span-2 bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-8">
          <div>
            <h3 className="text-xl font-serif font-medium text-[#3E2723]">
              Product USP & Care Guide Configuration
            </h3>
            <p className="text-xs text-gray-500 font-medium tracking-wide mt-1">
              Customize "The Sands Promise" and "Care Guide" blocks shown on product detail pages.
            </p>
          </div>

          <div className="space-y-8">
            {/* The Sands Promise Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900 tracking-wide border-b border-gray-100 pb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#9C5B61]" />
                The Sands Promise (USPs)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((idx) => {
                  const item = (settings.sandsPromise && settings.sandsPromise[idx]) || { title: "", desc: "", icon: "ShieldCheck" };
                  return (
                    <div key={idx} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-gray-400 tracking-wide">Card #{idx + 1}</span>
                        <div className="relative">
                          <select
                            className="w-32 py-1.5 pl-3 pr-8 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#3E2723]/10 appearance-none cursor-pointer"
                            value={item.icon || "ShieldCheck"}
                            onChange={(e) => handlePromiseChange(idx, "icon", e.target.value)}
                            disabled={!isEditing}
                          >
                            <option value="ShieldCheck">Shield Check</option>
                            <option value="Smile">Smile</option>
                            <option value="Gift">Gift</option>
                            <option value="Heart">Heart</option>
                            <option value="Truck">Truck</option>
                            <option value="Star">Star</option>
                            <option value="Zap">Zap</option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[9px] font-medium text-gray-400 tracking-wide mb-1 block">Title</label>
                          <input
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 disabled:text-gray-500"
                            value={item.title || ""}
                            onChange={(e) => handlePromiseChange(idx, "title", e.target.value)}
                            disabled={!isEditing}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-medium text-gray-400 tracking-wide mb-1 block">Description</label>
                          <textarea
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 disabled:text-gray-500 min-h-[60px] resize-none"
                            value={item.desc || ""}
                            onChange={(e) => handlePromiseChange(idx, "desc", e.target.value)}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Care Guide Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900 tracking-wide border-b border-gray-100 pb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#9C5B61]" />
                Care Guide Steps
              </h4>

              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-2">
                <label className="text-[10px] font-medium text-gray-400 tracking-wide block">
                  Care Guide Section Introduction Text
                </label>
                <textarea
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 disabled:text-gray-500 min-h-[60px] resize-none"
                  value={settings.careGuideIntro || ""}
                  onChange={(e) => handleChange("careGuideIntro", e.target.value)}
                  disabled={!isEditing}
                  placeholder="Enter the care guide introduction text here..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((idx) => {
                  const item = (settings.careGuide && settings.careGuide[idx]) || { title: "", desc: "", icon: "Droplets" };
                  return (
                    <div key={idx} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-gray-400 tracking-wide">Step #{idx + 1}</span>
                        <div className="relative">
                          <select
                            className="w-32 py-1.5 pl-3 pr-8 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#3E2723]/10 appearance-none cursor-pointer"
                            value={item.icon || "Droplets"}
                            onChange={(e) => handleCareGuideChange(idx, "icon", e.target.value)}
                            disabled={!isEditing}
                          >
                            <option value="Droplets">Droplets</option>
                            <option value="Sparkles">Sparkles</option>
                            <option value="ShieldCheck">Shield Check</option>
                            <option value="Smile">Smile</option>
                            <option value="Heart">Heart</option>
                            <option value="Star">Star</option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[9px] font-medium text-gray-400 tracking-wide mb-1 block">Title</label>
                          <input
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 disabled:text-gray-500"
                            value={item.title || ""}
                            onChange={(e) => handleCareGuideChange(idx, "title", e.target.value)}
                            disabled={!isEditing}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-medium text-gray-400 tracking-wide mb-1 block">Description</label>
                          <textarea
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 disabled:text-gray-500 min-h-[60px] resize-none"
                            value={item.desc || ""}
                            onChange={(e) => handleCareGuideChange(idx, "desc", e.target.value)}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Configuration Section */}
        <div className="lg:col-span-2 bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-8">
          <div>
            <h3 className="text-xl font-serif font-medium text-[#3E2723]">
              Footer Configuration
            </h3>
            <p className="text-xs text-gray-500 font-medium tracking-wide mt-1">
              Fully customize the website footer content
            </p>
          </div>

          {/* Footer Brand Identity */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="flex items-center gap-2 font-medium text-[#3E2723]">
              <Layout className="w-4 h-4" /> Brand Identity
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-medium text-gray-400 tracking-wide mb-2 block">
                    Footer Tagline
                  </label>
                  <input
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 disabled:text-gray-500"
                    value={settings.footerTagline || ""}
                    onChange={(e) =>
                      handleChange("footerTagline", e.target.value)
                    }
                    disabled={!isEditing}
                    placeholder="timeless Elegance,"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-gray-400 tracking-wide mb-2 block">
                    Footer Sub-Tagline
                  </label>
                  <input
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 disabled:text-gray-500"
                    value={settings.footerSubTagline || ""}
                    onChange={(e) =>
                      handleChange("footerSubTagline", e.target.value)
                    }
                    disabled={!isEditing}
                    placeholder="Handcrafted for You."
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-400 tracking-wide mb-2 block">
                  Brand Description
                </label>
                <textarea
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 disabled:text-gray-500 h-32 resize-none leading-relaxed"
                  value={settings.footerDescription || ""}
                  onChange={(e) =>
                    handleChange("footerDescription", e.target.value)
                  }
                  disabled={!isEditing}
                  placeholder="Company description..."
                />
              </div>
            </div>
          </div>

          {/* Footer Links Columns */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="flex items-center gap-2 font-medium text-[#3E2723]">
              <Layout className="w-4 h-4" /> Footer Links
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                "footerExperienceLinks",
                "footerPoliciesLinks",
                "footerWorldLinks",
              ].map((listName, idx) => (
                <div
                  key={listName}
                  className="bg-gray-50 p-4 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    {isEditing ? (
                      <input
                        className="font-medium text-[#3E2723] uppercase text-xs bg-white border border-gray-200 rounded px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-[#3E2723]/30"
                        value={
                          settings[`footerColumn${idx + 1}Title`] ||
                          (idx === 0
                            ? "Experience"
                            : idx === 1
                              ? "Policies"
                              : "Our World")
                        }
                        onChange={(e) =>
                          handleChange(
                            `footerColumn${idx + 1}Title`,
                            e.target.value,
                          )
                        }
                        placeholder="Column Title"
                      />
                    ) : (
                      <h5 className="text-xs font-medium text-[#3E2723] uppercase">
                        {settings[`footerColumn${idx + 1}Title`] ||
                          (idx === 0
                            ? "Experience"
                            : idx === 1
                              ? "Policies"
                              : "Our World")}
                      </h5>
                    )}
                    {isEditing && (
                      <button
                        onClick={() => addLink(listName)}
                        className="p-1 hover:bg-white rounded-full transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {settings[listName] &&
                      settings[listName].map((link) => (
                        <div key={link.id} className="flex gap-2">
                          <input
                            className="w-1/2 p-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg disabled:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#3E2723]/30"
                            value={link.name}
                            onChange={(e) =>
                              handleLinkChange(
                                listName,
                                link.id,
                                "name",
                                e.target.value,
                              )
                            }
                            disabled={!isEditing}
                            placeholder="Link Name"
                          />
                          <input
                            className="w-1/2 p-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg disabled:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#3E2723]/30"
                            value={link.path}
                            onChange={(e) =>
                              handleLinkChange(
                                listName,
                                link.id,
                                "path",
                                e.target.value,
                              )
                            }
                            disabled={!isEditing}
                            placeholder="/path"
                          />
                          {isEditing && (
                            <button
                              onClick={() => removeLink(listName, link.id)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social & Bottom Bar */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="flex items-center gap-2 font-medium text-[#3E2723]">
              <Layout className="w-4 h-4" /> Social & Bottom Bar
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-[10px] font-medium text-gray-400 tracking-wide block">
                  Social Media Links
                </label>
                {[
                  { icon: Facebook, key: "facebook", label: "Facebook URL" },
                  { icon: Twitter, key: "twitter", label: "Twitter URL" },
                  { icon: Instagram, key: "instagram", label: "Instagram URL" },
                  { icon: Youtube, key: "youtube", label: "YouTube URL" },
                ].map((social) => (
                  <div key={social.key} className="flex items-center gap-3">
                    <social.icon className="w-4 h-4 text-gray-400" />
                    <input
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-900 disabled:text-gray-500"
                      value={settings.socialLinks?.[social.key] || ""}
                      onChange={(e) =>
                        handleNestedChange(
                          "socialLinks",
                          social.key,
                          e.target.value,
                        )
                      }
                      disabled={!isEditing}
                      placeholder={social.label}
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-medium text-gray-400 tracking-wide mb-2 block">
                    Delivery Text
                  </label>
                  <input
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 disabled:text-gray-500"
                    value={settings.footerDeliveryText || ""}
                    onChange={(e) =>
                      handleChange("footerDeliveryText", e.target.value)
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-gray-400 tracking-wide mb-2 block">
                    Copyright Text
                  </label>
                  <input
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 disabled:text-gray-500"
                    value={settings.footerCopyrightText || ""}
                    onChange={(e) =>
                      handleChange("footerCopyrightText", e.target.value)
                    }
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSettings;
