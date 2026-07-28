import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Shield,
  Lock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  Landmark,
  FileText,
  FileBadge2,
  ExternalLink,
  CalendarDays,
  Trash2,
  FileUp,
  X,
  ShieldCheck,
  Building
} from "lucide-react";
import { sellerService } from "../services/sellerService";
import { useAuth } from "../../../context/AuthContext";
import DeleteModal from "../../shared/components/DeleteModal";
import toast from "react-hot-toast";

const SellerProfile = () => {
  const navigate = useNavigate();
  const { logout, user, refreshUser } = useAuth();
  const [seller, setSeller] = useState(null);
  
  // Profile Text Fields
  const [profile, setProfile] = useState({
    fullName: "",
    shopName: "",
    email: "",
    mobileNumber: "",
    dob: "",
    district: "",
    shopAddress: "",
    city: "",
    state: "",
    pincode: "",
    bisNumber: "",
    bisNumberGold: "",
    bisNumberSilver: "",
    firmType: "sole proprietorship",
    cin: "",
    llpin: "",
    bankName: "",
    branchName: "",
    accountNumber: "",
    ifscCode: "",
    gstNumber: "",
    panNumber: ""
  });

  // Local File Inputs
  const [files, setFiles] = useState({
    aadhar: null,
    shopLicense: null,
    certificate: null,
    partnershipDeed: null,
    pan: null,
    gst: null,
    visitingCard: null,
    diamondCertificate: null
  });

  // Backend Document URL Previews
  const [docUrls, setDocUrls] = useState({
    aadharUrl: "",
    shopLicenseUrl: "",
    certificateUrl: "",
    partnershipDeedUrl: "",
    panUrl: "",
    gstUrl: "",
    visitingCardUrl: "",
    diamondCertificateUrl: ""
  });

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  
  // Show prompt popup modal on mount if not approved
  const [showPromptModal, setShowPromptModal] = useState(false);

  const allowedDocTypes = [
    'image/jpeg', 
    'image/png', 
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  const maxDocSize = 10 * 1024 * 1024; // 10MB

  const loadProfile = async () => {
    const data = await sellerService.getProfile();
    const resolved = data || sellerService.getCurrentSeller();
    if (!resolved) return;
    setSeller(resolved);
    
    setProfile({
      fullName: resolved.fullName || "",
      shopName: resolved.shopName || "",
      email: resolved.email || "",
      mobileNumber: resolved.mobileNumber || "",
      dob: resolved.dob ? new Date(resolved.dob).toISOString().split("T")[0] : "",
      district: resolved.district || "",
      shopAddress: resolved.shopAddress || "",
      city: resolved.city || "",
      state: resolved.state || "",
      pincode: resolved.pincode || "",
      bisNumber: resolved.bisNumber || "",
      bisNumberGold: resolved.bisNumberGold || "",
      bisNumberSilver: resolved.bisNumberSilver || "",
      firmType: resolved.firmType || "sole proprietorship",
      cin: resolved.cin || "",
      llpin: resolved.llpin || "",
      bankName: resolved.bankAccount?.bankName || "",
      branchName: resolved.bankAccount?.branchName || "",
      accountNumber: resolved.bankAccount?.accountNumber || "",
      ifscCode: resolved.bankAccount?.ifscCode || "",
      gstNumber: resolved.gstNumber || "",
      panNumber: resolved.panNumber || ""
    });

    setDocUrls({
      aadharUrl: resolved.documents?.aadharUrl || "",
      shopLicenseUrl: resolved.documents?.shopLicenseUrl || "",
      certificateUrl: resolved.documents?.certificateUrl || "",
      partnershipDeedUrl: resolved.documents?.partnershipDeedUrl || "",
      panUrl: resolved.documents?.panUrl || "",
      gstUrl: resolved.documents?.gstUrl || "",
      visitingCardUrl: resolved.documents?.visitingCardUrl || "",
      diamondCertificateUrl: resolved.documents?.diamondCertificateUrl || ""
    });

    sellerService.setCurrentSeller(resolved);
    
    // Sync React Auth user context state if status has changed (e.g. approved)
    if (resolved && resolved.status !== user?.status) {
      refreshUser();
    }
    
    // Trigger prompt modal for PENDING_PROFILE or REJECTED statuses
    if (resolved.status === 'PENDING_PROFILE' || resolved.status === 'REJECTED') {
      setShowPromptModal(true);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    const selectedFile = selectedFiles ? selectedFiles[0] : null;

    if (selectedFile) {
        if (!allowedDocTypes.includes(selectedFile.type)) {
            toast.error('Only JPG, PNG, WEBP, PDF, or Word files are allowed.');
            return;
        }
        if (selectedFile.size > maxDocSize) {
            toast.error('File size must be under 10MB.');
            return;
        }
        setFiles(prev => ({ ...prev, [name]: selectedFile }));
        toast.success(name.toUpperCase() + " file selected successfully!");
    }
  };

  const handleRemoveFile = (name) => {
    setFiles(prev => ({ ...prev, [name]: null }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!profile.fullName?.trim() || !profile.shopName?.trim() || !profile.email?.trim() || !profile.mobileNumber?.trim()) {
      toast.error("Contact details and Shop name are required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
      toast.error("Enter a valid email address");
      return;
    }
    const mobileDigits = profile.mobileNumber.replace(/\D/g, "");
    if (mobileDigits.length !== 10) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    if (!profile.dob) {
      toast.error("Date of birth is required");
      return;
    }
    if (!profile.district?.trim()) {
      toast.error("District is required");
      return;
    }
    const pinDigits = profile.pincode.replace(/\D/g, "");
    if (pinDigits.length !== 6) {
      toast.error("Enter a valid 6-digit pincode");
      return;
    }

    const gstUpper = profile.gstNumber?.trim().toUpperCase();
    if (!gstUpper) {
      toast.error("GST number is required");
      return;
    }
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}[A-Z\d]{1}$/.test(gstUpper)) {
      toast.error("Enter a valid 15-character GST number");
      return;
    }

    const panUpper = profile.panNumber?.trim().toUpperCase();
    if (!panUpper) {
      toast.error("PAN number is required");
      return;
    }
    if (!/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(panUpper)) {
      toast.error("Enter a valid 10-character PAN number");
      return;
    }

    // Bank Account validations
    if (!profile.bankName?.trim()) {
      toast.error("Bank name is required");
      return;
    }
    const accDigits = profile.accountNumber.replace(/\D/g, "");
    if (!accDigits || accDigits.length < 9 || accDigits.length > 18) {
      toast.error("Bank account number must be between 9 and 18 digits");
      return;
    }
    const ifscUpper = profile.ifscCode.trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscUpper)) {
      toast.error("Enter a valid bank IFSC code");
      return;
    }

    // Firm Type validations
    if (profile.firmType === "Partnership") {
      if (!files.partnershipDeed && !docUrls.partnershipDeedUrl) {
        toast.error("Partnership Deed document is mandatory for Partnership firm type");
        return;
      }
    } else if (profile.firmType === "Pvt Ltd") {
      if (!profile.cin?.trim()) {
        toast.error("Corporate Identification Number (CIN) is mandatory for Pvt Ltd firm type");
        return;
      }
    } else if (profile.firmType === "LLP") {
      if (!profile.llpin?.trim()) {
        toast.error("LLP Identification Number is mandatory for LLP firm type");
        return;
      }
    }

    // Mandatory documents check
    if (!files.aadhar && !docUrls.aadharUrl) return toast.error("Aadhar document is required");
    if (!files.shopLicense && !docUrls.shopLicenseUrl) return toast.error("Shop license document is required");
    if (!files.certificate && !docUrls.certificateUrl) return toast.error("Certificate document is required");
    if (!files.pan && !docUrls.panUrl) return toast.error("PAN document is required");
    if (!files.gst && !docUrls.gstUrl) return toast.error("GST document is required");

    setSavingProfile(true);

    try {
      const payload = new FormData();
      
      // Append standard text fields
      Object.entries(profile).forEach(([key, value]) => {
        if (key !== "bankAccount" && value !== null && value !== undefined && value !== "") {
          payload.append(key, value);
        }
      });

      // Append bankAccount details as JSON
      payload.append("bankAccount", JSON.stringify({
        accountNumber: accDigits,
        ifscCode: ifscUpper,
        bankName: profile.bankName.trim(),
        branchName: profile.branchName.trim()
      }));

      // Append documents (if selected locally)
      Object.entries(files).forEach(([key, file]) => {
        if (file) {
          payload.append(key, file);
        }
      });

      const res = await sellerService.updateProfile(payload);
      if (res.success) {
        toast.success(res.message || "Profile submitted successfully for review!");
        await loadProfile();
        // Force refresh window to update user status in context
        window.location.reload();
      } else {
        toast.error(res.message || "Unable to update profile details");
      }
    } catch (err) {
      toast.error(err.message || "An error occurred during submission");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwords.new.length < 4) {
      toast.error("Password must be at least 4 characters long");
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    setSavingPassword(true);
    const res = await sellerService.changePassword({
      currentPassword: passwords.current,
      newPassword: passwords.new,
    });
    if (res.success) {
      toast.success(res.message || "Password updated");
      setPasswords({ current: "", new: "", confirm: "" });
    } else {
      toast.error(res.message || "Unable to update password");
    }
    setSavingPassword(false);
  };

  const handleConfirmDelete = async () => {
    if (deletingAccount) return { success: false };
    setDeletingAccount(true);
    try {
      const res = await sellerService.deleteAccount();
      if (res?.success) {
        sellerService.logout();
        logout({ silent: true });
        toast.success("Seller account deleted successfully");
        navigate("/seller/login");
        return { success: true };
      } else {
        toast.error(res?.message || "Failed to delete account. Please try again.");
        return { success: false };
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
      return { success: false };
    } finally {
      setDeletingAccount(false);
    }
  };

  if (!seller)
    return (
      <div className="p-12 text-center text-gray-400 font-black uppercase tracking-widest">
        Loading profile...
      </div>
    );

  const inputClasses =
    "w-full bg-[#FDFBF7] border border-[#EFEBE9] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#8D6E63] focus:ring-4 focus:ring-[#8D6E63]/5 transition-all shadow-inner disabled:opacity-60 disabled:cursor-not-allowed";
  const selectClasses =
    "w-full bg-[#FDFBF7] border border-[#EFEBE9] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#8D6E63] focus:ring-4 focus:ring-[#8D6E63]/5 transition-all shadow-inner disabled:opacity-60 disabled:cursor-not-allowed";
  const labelClasses =
    "text-[10px] font-black text-[#8D6E63] uppercase tracking-widest ml-1 mb-2 block";
  
  const statusMeta =
    seller.status === "APPROVED"
      ? { badge: "Verified Merchant", tone: "text-emerald-500", bg: "bg-emerald-50" }
      : seller.status === "REJECTED"
        ? { badge: "Rejected Merchant", tone: "text-red-500", bg: "bg-red-50" }
        : seller.status === "PENDING"
          ? { badge: "Under Admin Review", tone: "text-blue-500", bg: "bg-blue-50" }
          : { badge: "Incomplete Profile", tone: "text-amber-500", bg: "bg-amber-50" };

  const isPendingReview = seller.status === "PENDING";

  const renderDocumentUploadBox = (name, label, existingUrl, isRequired = true) => {
    const file = files[name];
    
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8D6E63]">
              {label} {isRequired && <span className="text-red-500">*</span>}
            </p>
            <p className="text-xs font-bold text-gray-800 mt-1">
              {file ? "File selected" : existingUrl ? "Already uploaded" : "No file uploaded"}
            </p>
          </div>
          {existingUrl && (
            <a
              href={existingUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[9px] font-black uppercase tracking-widest text-[#8D6E63] hover:text-[#3E2723] flex items-center gap-1 border-b border-[#8D6E63]/20"
            >
              View Upload <ExternalLink size={10} />
            </a>
          )}
        </div>

        {!isPendingReview && (
          <div className="relative">
            {file ? (
              <div className="flex items-center justify-between bg-white border border-[#8D6E63]/20 rounded-xl px-4 py-2 text-xs">
                <span className="font-bold text-gray-700 truncate max-w-[200px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(name)}
                  className="p-1 hover:bg-red-50 text-red-500 rounded"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 w-full bg-[#FDFBF7] border border-dashed border-[#EFEBE9] hover:border-[#8D6E63] rounded-xl py-2.5 cursor-pointer text-xs font-bold text-gray-500 hover:text-[#8D6E63] transition-colors">
                <FileUp size={14} />
                Upload New File
                <input
                  type="file"
                  name={name}
                  accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-in fade-in duration-500 font-sans">
      <div>
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">
          Merchant Identity
        </h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
          Manage institutional credentials, bank settlements & verifications
        </p>
      </div>

      {/* Warning Alert Boxes for Unapproved Sellers */}
      {seller.status === "PENDING_PROFILE" && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-start gap-4 animate-in slide-in-from-top-4">
          <AlertCircle size={24} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-black text-amber-800 uppercase tracking-wider">⚠️ Profile Completion Required</h4>
            <p className="text-xs font-semibold text-amber-700 leading-relaxed uppercase mt-1">
              Your registration is successful. However, you must update your business details, bank account, and upload all required documents below to submit your account for admin approval. You will not be able to list products or operate on the platform until approved.
            </p>
          </div>
        </div>
      )}

      {seller.status === "REJECTED" && (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-6 flex items-start gap-4 animate-in slide-in-from-top-4">
          <AlertCircle size={24} className="text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-black text-red-800 uppercase tracking-wider">❌ Profile Verification Rejected</h4>
            <p className="text-xs font-semibold text-red-700 leading-relaxed uppercase">
              Your profile verification details were rejected by the administration team.
            </p>
            {seller.rejectionReason && (
              <p className="text-xs font-black text-red-900 uppercase tracking-wide bg-white/60 px-3 py-2 rounded-xl border border-red-200 mt-2 inline-block">
                Reason: "{seller.rejectionReason}"
              </p>
            )}
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider pt-1">
              Please correct the fields flagged, upload valid documents, and resubmit below.
            </p>
          </div>
        </div>
      )}

      {seller.status === "PENDING" && (
        <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 flex items-start gap-4 animate-in slide-in-from-top-4">
          <CheckCircle2 size={24} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-black text-blue-800 uppercase tracking-wider">⏳ Under Admin Verification</h4>
            <p className="text-xs font-semibold text-blue-700 leading-relaxed uppercase mt-1">
              Your profile details have been submitted and are currently being reviewed. You cannot edit details or access other parts of the platform during this time. Verification usually takes 24-48 hours. You will receive an email once approved.
            </p>
          </div>
        </div>
      )}

      {seller.status === "APPROVED" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 flex items-start gap-4">
          <ShieldCheck size={24} className="text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-black text-emerald-800 uppercase tracking-wider">✅ Verified Partner Merchant</h4>
            <p className="text-xs font-semibold text-emerald-700 leading-relaxed uppercase mt-1">
              Your merchant profile is fully verified and active. You have full access to list products and process orders on the platform.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#3E2723] rounded-[2.5rem] p-8 text-white relative overflow-hidden group shadow-2xl shadow-[#3E2723]/30">
            <div className="relative z-10 space-y-6">
              <div className="w-16 h-16 bg-white/10 rounded-[1.5rem] border border-white/20 flex items-center justify-center">
                <User size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight leading-none mb-2">
                  {seller.fullName || "Seller"}
                </h2>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">
                  Registered Administrator
                </p>
              </div>
              <div className="pt-6 border-t border-white/10 space-y-4">
                <div className="flex items-center gap-2">
                  <Shield size={14} className={statusMeta.tone} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {statusMeta.badge}
                  </span>
                </div>
                <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest leading-tight">
                  {seller.shopName || "Shop name not set"}
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm space-y-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Institutional Contact
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                  Email Endpoint
                </p>
                <p className="text-sm font-bold text-gray-900">
                  {seller.email || "Not available"}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                  Telecommunication
                </p>
                <p className="text-sm font-bold text-gray-900">
                  {seller.mobileNumber || "Not available"}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                  Registration Date
                </p>
                <p className="text-sm font-bold text-gray-900">
                  {seller.registrationDate || seller.createdAt
                    ? new Date(seller.registrationDate || seller.createdAt).toLocaleDateString()
                    : "Not available"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3 mb-10">
              <div className="p-3 bg-[#8D6E63]/10 rounded-xl">
                <Building2 size={20} className="text-[#3E2723]" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">
                Business Profile Update
              </h3>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClasses}>Full Name <span className="text-red-500">*</span></label>
                  <input
                    required
                    name="fullName"
                    value={profile.fullName}
                    onChange={handleProfileChange}
                    className={inputClasses}
                    placeholder="Full name"
                    disabled={isPendingReview}
                  />
                </div>
                <div>
                  <label className={labelClasses}>Shop Name <span className="text-red-500">*</span></label>
                  <input
                    required
                    name="shopName"
                    value={profile.shopName}
                    onChange={handleProfileChange}
                    className={inputClasses}
                    placeholder="Shop name"
                    disabled={isPendingReview}
                  />
                </div>
                <div>
                  <label className={labelClasses}>Email <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      required
                      name="email"
                      type="email"
                      value={profile.email}
                      onChange={handleProfileChange}
                      className={inputClasses + " pl-10"}
                      placeholder="Email address"
                      autoComplete="email"
                      disabled={isPendingReview}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>Mobile Number <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      required
                      name="mobileNumber"
                      value={profile.mobileNumber}
                      onChange={handleProfileChange}
                      className={inputClasses + " pl-10"}
                      placeholder="Mobile number"
                      inputMode="numeric"
                      maxLength={10}
                      autoComplete="tel"
                      disabled={isPendingReview}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>Date of Birth <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <CalendarDays className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      required
                      name="dob"
                      type="date"
                      value={profile.dob}
                      onChange={handleProfileChange}
                      className={inputClasses + " pl-10"}
                      disabled={isPendingReview}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>District <span className="text-red-500">*</span></label>
                  <input
                    required
                    name="district"
                    value={profile.district}
                    onChange={handleProfileChange}
                    className={inputClasses}
                    placeholder="District"
                    disabled={isPendingReview}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClasses}>Shop Address <span className="text-red-500">*</span></label>
                  <input
                    required
                    name="shopAddress"
                    value={profile.shopAddress}
                    onChange={handleProfileChange}
                    className={inputClasses}
                    placeholder="Street, area"
                    disabled={isPendingReview}
                  />
                </div>
                <div>
                  <label className={labelClasses}>City <span className="text-red-500">*</span></label>
                  <input
                    required
                    name="city"
                    value={profile.city}
                    onChange={handleProfileChange}
                    className={inputClasses}
                    placeholder="City"
                    disabled={isPendingReview}
                  />
                </div>
                <div>
                  <label className={labelClasses}>State <span className="text-red-500">*</span></label>
                  <input
                    required
                    name="state"
                    value={profile.state}
                    onChange={handleProfileChange}
                    className={inputClasses}
                    placeholder="State"
                    disabled={isPendingReview}
                  />
                </div>
                <div>
                  <label className={labelClasses}>Pincode <span className="text-red-500">*</span></label>
                  <input
                    required
                    name="pincode"
                    value={profile.pincode}
                    onChange={handleProfileChange}
                    className={inputClasses}
                    placeholder="Pincode"
                    inputMode="numeric"
                    maxLength={6}
                    disabled={isPendingReview}
                  />
                </div>
                <div>
                  <label className={labelClasses}>BIS Hallmark License (Gold)</label>
                  <input
                    name="bisNumberGold"
                    value={profile.bisNumberGold}
                    onChange={handleProfileChange}
                    className={inputClasses}
                    placeholder="BIS Hallmark Gold License"
                    disabled={isPendingReview}
                  />
                </div>
                <div>
                  <label className={labelClasses}>BIS Hallmark License (Silver)</label>
                  <input
                    name="bisNumberSilver"
                    value={profile.bisNumberSilver}
                    onChange={handleProfileChange}
                    className={inputClasses}
                    placeholder="BIS Hallmark Silver License"
                    disabled={isPendingReview}
                  />
                </div>
              </div>

              {/* Bank Details section */}
              <div className="border-t border-gray-100 pt-8 space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#3E2723] flex items-center gap-2">
                  <Landmark size={14} /> Settlement Bank Account
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClasses}>Bank Name <span className="text-red-500">*</span></label>
                    <input
                      required
                      name="bankName"
                      value={profile.bankName}
                      onChange={handleProfileChange}
                      className={inputClasses}
                      placeholder="Ex: State Bank of India"
                      disabled={isPendingReview}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Branch Name (Optional)</label>
                    <input
                      name="branchName"
                      value={profile.branchName}
                      onChange={handleProfileChange}
                      className={inputClasses}
                      placeholder="Ex: Mumbai Main Branch"
                      disabled={isPendingReview}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Account Number <span className="text-red-500">*</span></label>
                    <input
                      required
                      name="accountNumber"
                      value={profile.accountNumber}
                      onChange={handleProfileChange}
                      className={inputClasses}
                      placeholder="Settlement Account Number"
                      inputMode="numeric"
                      disabled={isPendingReview}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>IFSC Code <span className="text-red-500">*</span></label>
                    <input
                      required
                      name="ifscCode"
                      value={profile.ifscCode}
                      onChange={handleProfileChange}
                      className={inputClasses}
                      placeholder="IFSC Code"
                      disabled={isPendingReview}
                    />
                  </div>
                </div>
              </div>

              {/* Firm Type Dropdown & Conditional Fields */}
              <div className="border-t border-gray-100 pt-8 space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#3E2723] flex items-center gap-2">
                  <Building size={14} /> Organization Structuring
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClasses}>Firm Type <span className="text-red-500">*</span></label>
                    <select
                      name="firmType"
                      value={profile.firmType}
                      onChange={handleProfileChange}
                      className={selectClasses}
                      disabled={isPendingReview}
                    >
                      <option value="sole proprietorship">sole proprietorship</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Pvt Ltd">Pvt Ltd</option>
                      <option value="LLP">LLP</option>
                    </select>
                  </div>

                  {profile.firmType === "Pvt Ltd" && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <label className={labelClasses}>Corporate Identification Number (CIN) <span className="text-red-500">*</span></label>
                      <input
                        required
                        name="cin"
                        value={profile.cin}
                        onChange={handleProfileChange}
                        className={inputClasses}
                        placeholder="U12345MH2020PTC123456"
                        disabled={isPendingReview}
                      />
                    </div>
                  )}

                  {profile.firmType === "LLP" && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <label className={labelClasses}>LLP Identification Number (LLPIN) <span className="text-red-500">*</span></label>
                      <input
                        required
                        name="llpin"
                        value={profile.llpin}
                        onChange={handleProfileChange}
                        className={inputClasses}
                        placeholder="AAB-1234"
                        disabled={isPendingReview}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClasses}>GST Number <span className="text-red-500">*</span></label>
                    <input
                      required
                      name="gstNumber"
                      value={profile.gstNumber}
                      onChange={handleProfileChange}
                      className={inputClasses}
                      placeholder="e.g. 22AAAAA0000A1Z5"
                      maxLength={15}
                      disabled={isPendingReview}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>PAN Number <span className="text-red-500">*</span></label>
                    <input
                      required
                      name="panNumber"
                      value={profile.panNumber}
                      onChange={handleProfileChange}
                      className={inputClasses}
                      placeholder="e.g. ABCDE1234F"
                      maxLength={10}
                      disabled={isPendingReview}
                    />
                  </div>
                </div>
              </div>

              {/* Document upload grid */}
              <div className="border-t border-gray-100 pt-8 space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#3E2723] flex items-center gap-2">
                  <FileBadge2 size={14} /> Document Upload Verification
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderDocumentUploadBox("aadhar", "Aadhar Card", docUrls.aadharUrl, true)}
                  {renderDocumentUploadBox("shopLicense", "Shop License", docUrls.shopLicenseUrl, true)}
                  {renderDocumentUploadBox("certificate", "Business Certificate", docUrls.certificateUrl, true)}
                  {renderDocumentUploadBox("pan", "PAN Card", docUrls.panUrl, true)}
                  {renderDocumentUploadBox("gst", "GST Registration certificate", docUrls.gstUrl, true)}
                  {profile.firmType === "Partnership" && (
                    renderDocumentUploadBox("partnershipDeed", "Partnership Deed", docUrls.partnershipDeedUrl, true)
                  )}
                  {renderDocumentUploadBox("visitingCard", "Visiting Card (Optional)", docUrls.visitingCardUrl, false)}
                  {renderDocumentUploadBox("diamondCertificate", "Diamond Certificate (Optional)", docUrls.diamondCertificateUrl, false)}
                </div>
              </div>

              {!isPendingReview && (
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full bg-[#3E2723] text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-[#3E2723]/20 hover:bg-[#2D1B18] transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
                >
                  {savingProfile ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Submit Profile for Admin Approval
                      <CheckCircle2
                        size={16}
                        className="group-hover:scale-110 transition-transform"
                      />
                    </>
                  )}
                </button>
              )}
            </form>
          </div>

          {/* Change password section */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3 mb-10">
              <div className="p-3 bg-[#8D6E63]/10 rounded-xl">
                <Lock size={20} className="text-[#3E2723]" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">
                Authentication Security
              </h3>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className={labelClasses}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="current"
                    value={passwords.current}
                    onChange={handlePasswordChange}
                    className={inputClasses}
                    placeholder="********"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className={labelClasses}>New Password</label>
                    <input
                      type="password"
                      name="new"
                      value={passwords.new}
                      onChange={handlePasswordChange}
                      className={inputClasses}
                      placeholder="Min 4 Characters"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClasses}>Confirm New Password</label>
                    <input
                      type="password"
                      name="confirm"
                      value={passwords.confirm}
                      onChange={handlePasswordChange}
                      className={inputClasses}
                      placeholder="Repeat Password"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="w-full bg-[#3E2723] text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-[#3E2723]/20 hover:bg-[#2D1B18] transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
              >
                {savingPassword ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Change Security Password
                    <CheckCircle2
                      size={16}
                      className="group-hover:scale-110 transition-transform"
                    />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-[2.5rem] border border-red-100 p-10 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-50 rounded-xl">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">
                Danger Zone
              </h3>
            </div>

            <div className="p-6 bg-red-50/60 rounded-2xl border border-red-100 flex items-start gap-4 mb-8">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-red-800 leading-relaxed uppercase">
                Permanent Action: Deleting your seller account will remove all
                your products, pickup locations, and store data permanently.
                This action cannot be undone.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="w-full bg-red-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-red-600/20 hover:bg-red-700 transition-all flex items-center justify-center gap-2 group"
            >
              <Trash2
                size={16}
                className="group-hover:scale-110 transition-transform"
              />
              Delete Seller Account
            </button>
          </div>
        </div>
      </div>

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Seller Account?"
        description="This is permanent and cannot be undone. Your store, all products, and pickup locations will be deleted immediately."
      />

      {/* Prompt modal popup asking for profile update if unapproved */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full border border-gray-100 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-[#8D6E63]/10 rounded-full flex items-center justify-center mx-auto border border-[#8D6E63]/20">
              <FileBadge2 className="w-8 h-8 text-[#8D6E63]" />
            </div>
            {seller.status === "PENDING_PROFILE" ? (
              <>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Complete Merchant Profile</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-semibold">
                  Welcome to Sands Jewels! To begin selling on our platform, please fill in your firm type, bank account details, and upload the required business verification documents in your profile.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-black text-red-600 uppercase tracking-tight">Profile Updates Required</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-semibold">
                  Your business profile verification details were rejected by admin. Reason: &quot;{seller.rejectionReason}&quot;. Please update the correct details and submit them for review.
                </p>
              </>
            )}
            <button
              onClick={() => setShowPromptModal(false)}
              className="w-full bg-[#3E2723] text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-[#3E2723]/20 hover:bg-[#2D1B18] transition-all"
            >
              Update Profile Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerProfile;
