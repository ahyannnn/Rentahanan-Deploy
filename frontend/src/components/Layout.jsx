import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  Building2,
  FileText,
  CreditCard,
  Bell,
  UserCog,
  HelpCircle,
  ClipboardList,
  Camera,
  X,
  Mail,
  Phone,
  Calendar,
  Edit,
  Save,
  RotateCcw,
  User,
  Trash2,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import "../styles/tenant/Layout.css";

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [tenantStatus, setTenantStatus] = useState(null);
  const [userRole, setUserRole] = useState("tenant");
  const [profilePictureUrl, setProfilePictureUrl] = useState("/default-profile.png");
  const [headerProfilePictureUrl, setHeaderProfilePictureUrl] = useState("/default-profile.png");
  const [loading, setLoading] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [profileImageError, setProfileImageError] = useState(false);
  const [headerImageError, setHeaderImageError] = useState(false);

  // ✅ Enhanced Notifications State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeNotificationMenu, setActiveNotificationMenu] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // If current path is /tenant and user is Registered tenant, redirect to browse-units
    if (location.pathname === '/tenant' &&
      userRole === 'tenant' &&
      tenantStatus === 'Registered') {
      navigate('/tenant/browse-units', { replace: true });
    } else if (location.pathname === '/tenant' &&
      userRole === 'tenant' &&
      tenantStatus === 'Terminated') {
      navigate('/tenant/support', { replace: true });
    }
  }, [location.pathname, userRole, tenantStatus, navigate]);

  // Fetch user profile data from API
  const fetchUserProfile = async (userId) => {
    try {
      setLoading(true);
      const response = await fetch(`http://127.0.0.1:5000/api/profile/${userId}`);
      const data = await response.json();

      if (data.success && data.profile) {
        setUserData(data.profile);

        // Map application_status to tenant status - UPDATED: 'Registered' now maps to 'Registered'
        const statusMapping = {
          'Registered': 'Registered',
          'Pending': 'Registered',
          'Active': 'Active',
          'Terminated': 'Terminated'
        };

        const mappedStatus = statusMapping[data.profile.status] || 'Registered';
        setTenantStatus(mappedStatus);
        setUserRole(data.profile.role?.toLowerCase() || "tenant");

        // Reset error states when fetching new data
        setProfileImageError(false);
        setHeaderImageError(false);

        // Set profile picture URL for both modal and header
        if (data.profile.image) {
          const imageUrl = `http://127.0.0.1:5000/uploads/profile_images/${data.profile.image}`;
          setProfilePictureUrl(imageUrl);
          setHeaderProfilePictureUrl(imageUrl);
        } else {
          setProfilePictureUrl("/default-profile.png");
          setHeaderProfilePictureUrl("/default-profile.png");
        }

        localStorage.setItem("user", JSON.stringify(data.profile));
        localStorage.setItem("tenantStatus", mappedStatus);
      } else {
        console.error("Failed to fetch profile:", data.message);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications from API - UPDATED for unified system
  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const storedUserRaw = localStorage.getItem("user");
      if (!storedUserRaw) return;

      const storedUser = JSON.parse(storedUserRaw);
      const userId = storedUser.userid;

      const response = await fetch(`http://127.0.0.1:5000/api/notifications/${userId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications || []);

        // Calculate unread count
        const unread = data.notifications.filter(notif => !notif.is_read).length;
        setUnreadCount(unread);

        // Log notification types for debugging
        const groupNotifications = data.notifications.filter(notif => notif.isgroupnotification);
        const individualNotifications = data.notifications.filter(notif => !notif.isgroupnotification);

      } else {
        console.error("Failed to fetch notifications:", data.message);
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Toggle notifications dropdown and fetch data when opened
  const handleNotificationsToggle = () => {
    const newShowState = !showNotifications;
    setShowNotifications(newShowState);
    setShowAllNotifications(false);
    setActiveNotificationMenu(null);

    if (newShowState) {
      fetchNotifications();
    }
  };

  // Handle three dots menu toggle
  const handleThreeDotsClick = (notificationId, e) => {
    e.stopPropagation();
    setActiveNotificationMenu(activeNotificationMenu === notificationId ? null : notificationId);
  };

  // Handle view notification
  const handleViewNotification = (notification, e) => {
    e.stopPropagation();
    setActiveNotificationMenu(null);
    setShowNotifications(false);
    setShowAllNotifications(false);

    // Mark as read
    markNotificationAsRead(notification.notificationid);

    navigateBasedOnNotification(notification);
  };

  // Handle delete notification - UPDATED: Prevent tenants from deleting general notifications
  const handleDeleteNotification = async (notification, e) => {
    e.stopPropagation();
    setActiveNotificationMenu(null);

    // ✅ CHECK: Prevent tenants from deleting group notifications
    if (userRole === 'tenant' && notification.isgroupnotification) {
      alert("You cannot delete general notifications sent to all tenants.");
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/notifications/${notification.notificationid}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Remove from local state
        setNotifications(prev => prev.filter(notif => notif.notificationid !== notification.notificationid));
        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        console.error('Failed to delete notification:', data.message);
        alert('Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Error deleting notification. Please try again.');
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev =>
          prev.map(notif =>
            notif.notificationid === notificationId
              ? { ...notif, is_read: true }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle view all notifications
  const handleViewAllNotifications = () => {
    setShowAllNotifications(!showAllNotifications);
  };

  // Handle notification card click
  const handleNotificationCardClick = (notification) => {
    setShowNotifications(false);
    setShowAllNotifications(false);
    setActiveNotificationMenu(null);

    // Mark as read
    markNotificationAsRead(notification.notificationid);

    navigateBasedOnNotification(notification);
  };

  // Unified navigation logic for notifications
  const navigateBasedOnNotification = (notification) => {
    const title = notification.title?.toLowerCase() || '';
    const message = notification.message?.toLowerCase() || '';

    if (title.includes('bill') || title.includes('payment') || title.includes('invoice') ||
      message.includes('bill') || message.includes('payment') || message.includes('invoice')) {
      navigate(userRole === 'owner' ? '/owner/billing' : '/tenant/bills');
    } else if (title.includes('concern') || title.includes('support') ||
      message.includes('concern') || message.includes('support')) {
      navigate(userRole === 'owner' ? '/owner/concern' : '/tenant/support');
    } else if (title.includes('contract') || title.includes('agreement') ||
      message.includes('contract') || message.includes('agreement')) {
      navigate(userRole === 'owner' ? '/owner/contract' : '/tenant/contract');
    } else if (title.includes('application') || title.includes('apply') ||
      message.includes('application') || message.includes('apply')) {
      navigate(userRole === 'owner' ? '/owner/tenants' : '/tenant/browse-units');
    } else if (title.includes('transaction') || title.includes('receipt') ||
      message.includes('transaction') || message.includes('receipt')) {
      navigate(userRole === 'owner' ? '/owner/transactions' : '/tenant/payment');
    } else {
      navigate(userRole === 'owner' ? '/owner/notification' : '/tenant/notification');
    }
  };

  // Helper to check if notification can be deleted
  const canDeleteNotification = (notification) => {
    // Owners can delete any notification
    if (userRole === 'owner') return true;

    // Tenants can only delete individual notifications (not group notifications)
    if (userRole === 'tenant') {
      return !notification.isgroupnotification;
    }

    return false;
  };

  // Helper to display notification target info
  const getNotificationTargetInfo = (notification) => {
    if (notification.isgroupnotification && notification.targetuserrole) {
      return `📢 General notification for all ${notification.targetuserrole}s`;
    } else if (notification.targetuserid) {
      return `👤 Personal notification`;
    }
    return '';
  };

  // Helper to get notification type for styling
  const getNotificationTypeClass = (notification) => {
    if (notification.isgroupnotification) {
      return 'group-notification-Layout';
    } else {
      return 'personal-notification-Layout';
    }
  };

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const storedUserRaw = localStorage.getItem("user");
        if (!storedUserRaw) {
          console.warn("No user found in localStorage — redirecting to login");
          navigate("/");
          return;
        }

        const storedUser = JSON.parse(storedUserRaw);
        const userId = storedUser.userid;

        if (userId) {
          await fetchUserProfile(userId);
        } else {
          setUserData(storedUser);
          setUserRole(localStorage.getItem("userRole") || storedUser.role || "tenant");

          const storedStatus = localStorage.getItem("tenantStatus");
          if (storedStatus) {
            setTenantStatus(storedStatus);
          } else {
            const statusMapping = {
              'Registered': 'Registered',
              'Pending': 'Registered',
              'Approved': 'Active',
              'Rejected': 'Terminated'
            };
            const mappedStatus = statusMapping[storedUser.application_status] || 'Registered';
            setTenantStatus(mappedStatus);
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
        navigate("/");
      }
    };

    initializeUser();
  }, [navigate]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  const openProfileModal = () => {
    setIsProfileModalOpen(true);
    setIsEditing(false);
    setSelectedImageFile(null);
    setProfileImageError(false);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setIsEditing(false);
    setSelectedImageFile(null);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    try {
      const formData = new FormData();

      formData.append("email", userData.email);
      formData.append("phone", userData.phone);

      if (selectedImageFile) {
        formData.append("image", selectedImageFile);
      }

      const response = await fetch(`http://127.0.0.1:5000/api/profile/${userData.userid}`, {
        method: "PUT",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUserData(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.user.image) {
          const imageUrl = `http://127.0.0.1:5000/api/profile/image/${data.user.image}`;
          setProfilePictureUrl(imageUrl);
          setHeaderProfilePictureUrl(imageUrl);
          setProfileImageError(false);
          setHeaderImageError(false);
        }

        setIsEditing(false);
        setSelectedImageFile(null);
      } else {
        alert(data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Network error. Please try again.");
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const tempUrl = URL.createObjectURL(file);
      setProfilePictureUrl(tempUrl);
      setSelectedImageFile(file);
      setProfileImageError(false);
    }
  };

  const handleCancelEdit = () => {
    if (userData?.image) {
      const imageUrl = `http://localhost:5000/uploads/profile_images/${userData.image}`;
      setProfilePictureUrl(imageUrl);
      setHeaderProfilePictureUrl(imageUrl);
    } else {
      setProfilePictureUrl("/default-profile.png");
      setHeaderProfilePictureUrl("/default-profile.png");
    }
    setSelectedImageFile(null);
    setProfileImageError(false);

    if (userData?.userid) {
      fetchUserProfile(userData.userid);
    }
    setIsEditing(false);
  };

  const handleProfileImageError = () => {
    setProfileImageError(true);
  };

  const handleHeaderImageError = () => {
    setHeaderImageError(true);
  };

  // ✅ FIXED: Proper timezone handling for notifications
  const formatNotificationTime = (dateString) => {
    if (!dateString) return "Recently";

    try {
      // Parse the database date as UTC
      const dbDate = new Date(dateString);
      
      // If invalid date, return fallback
      if (isNaN(dbDate.getTime())) {
        return "Recently";
      }

      // Get current time in local timezone
      const now = new Date();
      
      // Calculate difference in milliseconds
      const diffInMs = now - dbDate;
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      // Return relative time for recent notifications
      if (diffInMinutes < 1) return "Just now";
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInDays < 7) return `${diffInDays}d ago`;

      // For older notifications, show the actual date in local time
      // Convert UTC date to local time for display
      return dbDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
    } catch (error) {
      console.error('Error formatting notification time:', error);
      return "Recently";
    }
  };

  // ✅ NEW: Get current time in correct timezone for debugging
  const getCurrentTimeInfo = () => {
    const now = new Date();
    return {
      local: now.toString(),
      utc: now.toUTCString(),
      iso: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  };

  // Get notifications to display (3 by default, 10 when expanded)
  const displayedNotifications = showAllNotifications
    ? notifications.slice(0, 10)
    : notifications.slice(0, 3);

  // Updated tenant links by tenant status
  const tenantLinksByStatus = {
    Registered: [
      { name: "Browse Units", to: "/tenant/browse-units", icon: Building2 },
      { name: "My Bills", to: "/tenant/bills", icon: CreditCard },
      { name: "Contract", to: "/tenant/contract", icon: ClipboardList },
      { name: "Notifications", to: "/tenant/notification", icon: Bell },
    ],
    Active: [
      { name: "Dashboard", to: "/tenant", icon: Home },
      { name: "My Bills", to: "/tenant/bills", icon: CreditCard },
      { name: "Payment History", to: "/tenant/payment", icon: FileText },
      { name: "Contract", to: "/tenant/contract", icon: ClipboardList },
      { name: "Concern", to: "/tenant/support", icon: HelpCircle },
      { name: "Notifications", to: "/tenant/notification", icon: Bell },
    ],
    Terminated: [
      { name: "Payment History", to: "/tenant/payment", icon: FileText },
    ],
  };

  const ownerLinks = [
    { name: "Dashboard", to: "/owner", icon: Home },
    { name: "Tenants", to: "/owner/tenants", icon: Users },
    { name: "Units", to: "/owner/units", icon: Building2 },
    { name: "Transactions", to: "/owner/transactions", icon: FileText },
    { name: "Billing", to: "/owner/billing", icon: CreditCard },
    { name: "Contract", to: "/owner/contract", icon: ClipboardList },
    { name: "Concern Center", to: "/owner/concern", icon: HelpCircle },
    { name: "Notifications", to: "/owner/notification", icon: Bell },
  ];

  if (loading) {
    return (
      <div className="loading-logo-container">
        <div className="loading-brand">
          <img
            src="/logo.png"
            alt="RenTahanan Logo"
            className="loading-logo"
          />
          <div className="loading-brand-text">RenTahanan</div>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }
  if (!userData) {
    return (
      <div style={{ textAlign: "center", marginTop: "20vh", color: "#555" }}>
        <h2>No user data found</h2>
        <button onClick={() => navigate("/")}>Go to Login</button>
      </div>
    );
  }

  const links =
    userRole === "owner"
      ? ownerLinks
      : tenantLinksByStatus[tenantStatus || "Registered"] || [];

  const pageTitle =
    links.find((link) => link.to === location.pathname)?.name || "Dashboard";

  const ProfileModal = () => {
  if (!isProfileModalOpen || !userData) return null;

  const formatDate = (dateString) => {
    if (!dateString || dateString === "N/A") return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
    } catch (error) {
      return "N/A";
    }
  };

  // ✅ UPDATED: Conditionally show status, edit button, and joined date
  const showStatus = userRole !== "owner"; // Hide status for owners
  const showEditButton = userRole === "owner" || (userRole === "tenant" && tenantStatus !== "Terminated"); // Show edit for owners, hide for terminated tenants
  const showJoinedDate = userRole !== "owner"; // Hide joined date for owners

  return (
    <div className="modal-overlay-Layout" onClick={closeProfileModal}>
      <div className="profile-modal-content-Layout" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-Layout">
          <h2>User Profile</h2>
          <button className="close-text-btn-Layout" onClick={closeProfileModal}>
            <X size={16} /> Close
          </button>
        </div>

        <div className="modal-body-Layout">
          <div className="current-pic-holder-Layout">
            {profileImageError || !profilePictureUrl || profilePictureUrl === "/default-profile.png" ? (
              <div className="profile-icon-fallback-Layout">
                <User size={48} />
              </div>
            ) : (
              <img
                src={profilePictureUrl}
                alt="Profile"
                width="120"
                height="120"
                style={{ borderRadius: "50%", background: "#eee", objectFit: "cover" }}
                onError={handleProfileImageError}
              />
            )}
            {isEditing && (
              <label className="upload-btn-icon-label-Layout">
                <Camera size={18} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
              </label>
            )}
          </div>

          <h3 className="user-full-name-Layout">
            {userData.firstname} {userData.middlename || ""} {userData.lastname}
          </h3>
          <p className="user-role-label-Layout">
            {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
          </p>
          
          {/* ✅ CONDITIONAL: Only show status if user is not owner */}
          {showStatus && (
            <p className="user-status-label-Layout">
              Status: <span className={`status-badge status-${tenantStatus?.toLowerCase()}`}>
                {tenantStatus || "Registered"}
              </span>
            </p>
          )}

          <div className="user-details-list-Layout">
            <div className="detail-item-Layout">
              <Mail size={18} className="detail-icon-Layout" />
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={userData.email || ""}
                  onChange={handleInputChange}
                  className="editable-input-Layout"
                />
              ) : (
                <span>{userData.email || "N/A"}</span>
              )}
            </div>

            <div className="detail-item-Layout">
              <Phone size={18} className="detail-icon-Layout" />
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={userData.phone || ""}
                  onChange={handleInputChange}
                  className="editable-input-Layout"
                />
              ) : (
                <span>{userData.phone || "N/A"}</span>
              )}
            </div>

            {/* ✅ CONDITIONAL: Only show joined date if user is not owner */}
            {showJoinedDate && (
              <div className="detail-item-Layout detail-view-only-Layout">
                <Calendar size={18} className="detail-icon-Layout" />
                <span>Joined: {formatDate(userData.datecreated || "")}</span>
              </div>
            )}
          </div>

          <div className="modal-actions-Layout">
            {isEditing ? (
              <>
                <button className="btn-save-Layout" onClick={handleSaveEdit}>
                  <Save size={16} /> Save
                </button>
                <button className="btn-cancel-Layout" onClick={handleCancelEdit}>
                  <RotateCcw size={16} /> Cancel
                </button>
              </>
            ) : (
              /* ✅ UPDATED: Show edit button for owners, hide only for terminated tenants */
              showEditButton && (
                <button className="btn-edit-Layout" onClick={() => setIsEditing(true)}>
                  <Edit size={16} /> Edit Profile
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="container-Layout">
      {/* SIDEBAR */}
      <div className={`sidebar-Layout ${sidebarOpen ? "show-Layout" : ""}`} id="sidebar-Layout">
        <div className="logotitle-Layout">
          <div className="nav-brand-Layout">
            <img
              src="/logo.png"
              alt="RenTahanan Logo"
              className="logo-Layout"
            />
            <div className="nav-brand-text-Layout">RenTahanan</div>
          </div>
        </div>

        <div className="linkholderbody-Layout">
          {links.map((link, i) => {
            const Icon = link.icon;
            return (
              <div
                key={i}
                className={`linkholder-Layout ${location.pathname === link.to ? "active-Layout" : ""
                  }`}
              >
                <Link to={link.to} onClick={closeSidebar}>
                  <Icon size={18} style={{ marginRight: "8px" }} />
                  {link.name}
                </Link>
              </div>
            );
          })}
        </div>

        <button id="logout-Layout" onClick={handleLogout}>
          Log out
        </button>
      </div>

      {/* HEADER */}
      <div className="header-Layout">
        <button className="menu-btn-Layout" onClick={toggleSidebar}>
          &#9776;
        </button>
        <h3>{pageTitle}</h3>
        <div className="notifprofile-Layout">
          <div className="notif-wrapper-Layout">
            <button
              className="notif-btn-Layout"
              onClick={handleNotificationsToggle}
            >
              <Bell size={20} color="white" />
              {/* Three dots indicator for desktop hover */}
              <div className="notif-dots-indicator-Layout">
                {unreadCount > 0 && (
                  <>
                    <span className="dot-Layout"></span>
                    <span className="dot-Layout"></span>
                    <span className="dot-Layout"></span>
                  </>
                )}
              </div>
              {/* Badge for mobile */}
              {unreadCount > 0 && (
                <div className="notif-badge-Layout">{unreadCount}</div>
              )}
            </button>

            {showNotifications && (
              <div className="notif-dropdown-Layout">
                <h4>Notifications {unreadCount > 0 && `(${unreadCount} new)`}</h4>
                {notificationsLoading ? (
                  <div className="notif-loading-Layout">Loading notifications...</div>
                ) : notifications.length === 0 ? (
                  <div className="no-notifications-Layout">No notifications</div>
                ) : (
                  <>
                    <div className={`notif-list-container-Layout ${showAllNotifications ? 'expanded-Layout' : ''}`}>
                      {displayedNotifications.map((notif) => (
                        <div
                          key={notif.notificationid}
                          className={`notif-card-Layout ${!notif.is_read ? 'unread-Layout' : ''} ${getNotificationTypeClass(notif)}`}
                          onClick={() => handleNotificationCardClick(notif)}
                        >
                          <div className="notif-content-Layout">
                            <h5>{notif.title}</h5>
                            <p>{notif.message}</p>

                            {/* ✅ ADDED: Show notification target info */}
                            <div className="notif-target-info-Layout">
                              {getNotificationTargetInfo(notif)}
                            </div>

                            <span className="notif-time-Layout">
                              {formatNotificationTime(notif.creationdate)}
                            </span>
                          </div>

                          {/* Three dots menu */}
                          <div className="notif-menu-container-Layout">
                            <button
                              className="three-dots-btn-Layout"
                              onClick={(e) => handleThreeDotsClick(notif.notificationid, e)}
                            >
                              <MoreHorizontal size={16} />
                            </button>

                            {/* Dropdown menu */}
                            {activeNotificationMenu === notif.notificationid && (
                              <div className="notif-action-menu-Layout">
                                <button
                                  className="notif-menu-item-Layout view-menu-item-Layout"
                                  onClick={(e) => handleViewNotification(notif, e)}
                                >
                                  <Eye size={14} />
                                  View
                                </button>

                                {/* ✅ UPDATED: Conditionally show delete button */}
                                {canDeleteNotification(notif) && (
                                  <button
                                    className="notif-menu-item-Layout delete-menu-item-Layout"
                                    onClick={(e) => handleDeleteNotification(notif, e)}
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Show View All button only if more than 3 notifications */}
                    {notifications.length > 3 && (
                      <button
                        className="view-all-btn-Layout"
                        onClick={handleViewAllNotifications}
                      >
                        {showAllNotifications ? 'Show Less' : `View All (${notifications.length})`}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <button className="profile-image-btn-Layout" onClick={openProfileModal}>
            {headerImageError || !headerProfilePictureUrl || headerProfilePictureUrl === "/default-profile.png" ? (
              <div className="header-profile-icon-fallback-Layout">
                <User size={20} />
              </div>
            ) : (
              <img
                src={headerProfilePictureUrl}
                alt="Profile"
                className="header-profile-image-Layout"
                onError={handleHeaderImageError}
              />
            )}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-Layout">
        <Outlet />
      </div>

      <ProfileModal />
    </div>
  );
};

export default Layout;