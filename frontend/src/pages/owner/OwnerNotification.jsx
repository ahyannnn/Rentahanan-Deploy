import React, { useState, useEffect } from "react";
import {
  Bell,
  Check,
  Trash2,
  Search,
  Clock,
  AlertCircle,
  CreditCard,
  Wrench,
  FileText,
  Calendar,
  MessageCircle,
  Users,
  Building,
  Plus,
  Send,
  X
} from "lucide-react";
import "../../styles/owners/OwnerNotification.css";

const OwnerNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  
  // New state for sending notifications
  const [showSendNotification, setShowSendNotification] = useState(false);
  const [newNotification, setNewNotification] = useState({
    title: "",
    message: "",
    targetType: "all", // "all" or "specific"
    targetTenantId: "",
    priority: "medium"
  });
  const [tenants, setTenants] = useState([]);
  const [sending, setSending] = useState(false);

  // ✅ ADD API BASE
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://rentahanan.onrender.com";

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const storedUserRaw = localStorage.getItem("user");
      if (!storedUserRaw) return;

      const storedUser = JSON.parse(storedUserRaw);
      const userId = storedUser.userid;

      // ✅ UPDATED API ENDPOINT
      const response = await fetch(`${API_BASE}/api/notifications/${userId}`);
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications || []);
      } else {
        console.error("Failed to fetch notifications:", data.message);
        setNotifications([]);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tenants for sending specific notifications
  const fetchTenants = async () => {
    try {
      // ✅ UPDATED API ENDPOINT
      const response = await fetch(`${API_BASE}/api/tenants/active`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setTenants(data);
      } else {
        console.error("Failed to fetch tenants:", data);
        setTenants([]);
      }
    } catch (error) {
      console.error("Error fetching tenants:", error);
      setTenants([]);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      // ✅ UPDATED API ENDPOINT
      const response = await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, {
        method: "PUT",
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev =>
          prev.map(notif =>
            notif.notificationid === notificationId
              ? { ...notif, status: 'read' }
              : notif
          )
        );
      } else {
        console.error("Failed to mark notification as read");
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const storedUserRaw = localStorage.getItem("user");
      if (!storedUserRaw) return;

      const storedUser = JSON.parse(storedUserRaw);
      const userId = storedUser.userid;

      // ✅ UPDATED API ENDPOINT
      const response = await fetch(`${API_BASE}/api/notifications/${userId}/mark-all-read`, {
        method: "PUT",
      });

      if (response.ok) {
        // Update all notifications to read
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, status: 'read' }))
        );
      } else {
        console.error("Failed to mark all notifications as read");
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      // ✅ UPDATED API ENDPOINT
      const response = await fetch(`${API_BASE}/api/notifications/${notificationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove from local state
        setNotifications(prev =>
          prev.filter(notif => notif.notificationid !== notificationId)
        );
      } else {
        console.error("Failed to delete notification");
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Send new notification
  const sendNotification = async () => {
    if (!newNotification.title.trim() || !newNotification.message.trim()) {
      alert("Please fill in both title and message");
      return;
    }

    if (newNotification.targetType === "specific" && !newNotification.targetTenantId) {
      alert("Please select a tenant");
      return;
    }

    try {
      setSending(true);
      const storedUserRaw = localStorage.getItem("user");
      if (!storedUserRaw) return;

      const storedUser = JSON.parse(storedUserRaw);

      const notificationData = {
        title: newNotification.title,
        message: newNotification.message,
        priority: newNotification.priority,
        createdbyuserid: storedUser.userid
      };

      // Add target information based on selection
      if (newNotification.targetType === "all") {
        notificationData.targetuserrole = "Tenant";
        notificationData.isgroupnotification = true;
      } else {
        // Find the selected tenant to get their userid
        const selectedTenant = tenants.find(t => t.applicationid == newNotification.targetTenantId);
        if (selectedTenant) {
          notificationData.targetuserid = selectedTenant.userid;
          notificationData.isgroupnotification = false;
        }
      }

      // ✅ UPDATED API ENDPOINT
      const response = await fetch(`${API_BASE}/api/notifications/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationData),
      });
      
      const data = await response.json();

      if (data.success) {
        alert("Notification sent successfully!");
        setNewNotification({
          title: "",
          message: "",
          targetType: "all",
          targetTenantId: "",
          priority: "medium"
        });
        setShowSendNotification(false);
        // Refresh notifications
        fetchNotifications();
      } else {
        alert("Failed to send notification: " + data.message);
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      alert("Error sending notification. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // Open send notification modal
  const openSendNotification = () => {
    setShowSendNotification(true);
    fetchTenants(); // Load tenants when opening the modal
  };

  // Close send notification modal
  const closeSendNotification = () => {
    setShowSendNotification(false);
    setNewNotification({
      title: "",
      message: "",
      targetType: "all",
      targetTenantId: "",
      priority: "medium"
    });
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const filteredNotifications = notifications.filter(notification => {
    const matchesFilter = filter === "all" ||
      (filter === "unread" && notification.status === "unread") ||
      (filter === "payment" && (notification.title?.toLowerCase().includes('payment') || notification.message?.toLowerCase().includes('payment'))) ||
      (filter === "maintenance" && (notification.title?.toLowerCase().includes('maintenance') || notification.message?.toLowerCase().includes('maintenance'))) ||
      (filter === "tenant" && (notification.title?.toLowerCase().includes('tenant') || notification.message?.toLowerCase().includes('tenant')));

    const matchesSearch = notification.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "#ef4444";
      case "medium": return "#f59e0b";
      case "low": return "#10b981";
      default: return "#6b7280";
    }
  };

  const getTypeIcon = (notification) => {
    // Determine icon based on notification content
    const title = notification.title?.toLowerCase() || '';
    const message = notification.message?.toLowerCase() || '';

    if (title.includes('payment') || message.includes('payment') || message.includes('rent')) {
      return <CreditCard size={16} />;
    } else if (title.includes('maintenance') || message.includes('maintenance') || message.includes('repair')) {
      return <Wrench size={16} />;
    } else if (title.includes('contract') || message.includes('contract') || message.includes('agreement')) {
      return <FileText size={16} />;
    } else if (title.includes('tenant') || message.includes('tenant') || message.includes('application')) {
      return <Users size={16} />;
    } else if (title.includes('unit') || message.includes('unit') || message.includes('property')) {
      return <Building size={16} />;
    } else if (title.includes('event') || message.includes('event') || message.includes('party')) {
      return <Calendar size={16} />;
    } else {
      return <MessageCircle size={16} />;
    }
  };

  const getTypeLabel = (notification) => {
    const title = notification.title?.toLowerCase() || '';
    const message = notification.message?.toLowerCase() || '';

    if (title.includes('payment') || message.includes('payment') || message.includes('rent')) {
      return "Payment";
    } else if (title.includes('maintenance') || message.includes('maintenance') || message.includes('repair')) {
      return "Maintenance";
    } else if (title.includes('contract') || message.includes('contract') || message.includes('agreement')) {
      return "Contract";
    } else if (title.includes('tenant') || message.includes('tenant') || message.includes('application')) {
      return "Tenant";
    } else if (title.includes('unit') || message.includes('unit') || message.includes('property')) {
      return "Property";
    } else if (title.includes('event') || message.includes('event') || message.includes('party')) {
      return "Event";
    } else {
      return "General";
    }
  };

  // Format time for notifications - FIXED TIMEZONE ISSUE
  const formatDate = (dateString) => {
    if (!dateString) return "Recently";

    // Parse the database timestamp (UTC time)
    const dbDate = new Date(dateString);

    // Get current time in UTC to match the database timezone
    const now = new Date();
    const nowUtc = new Date(now.getTime());

    // Calculate difference in milliseconds
    const diffInMs = nowUtc - dbDate;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;

    // For older dates, use a formatted date string
    return dbDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const unreadCount = notifications.filter(n => n.status === "unread").length;
  const totalCount = notifications.length;

  if (loading) {
    return (
      <div className="Owner-Notifications-container">
        <div className="Owner-Notifications-loading">
          <div className="Owner-Notifications-loading-spinner"></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="Owner-Notifications-container">
      {/* ===== Send Notification Modal ===== */}
      {showSendNotification && (
        <div className="modal-overlay-Owner-Notifications" onClick={closeSendNotification}>
          <div className="send-notification-modal-Owner-Notifications" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-Owner-Notifications">
              <h2>Send Notification</h2>
              <button className="close-modal-btn-Owner-Notifications" onClick={closeSendNotification} title="Close send notification modal">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body-Owner-Notifications">
              <div className="form-group-Owner-Notifications">
                <label>Title *</label>
                <input
                  type="text"
                  placeholder="Enter notification title"
                  value={newNotification.title}
                  onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
                  className="form-input-Owner-Notifications"
                  title="Enter a title for your notification"
                />
              </div>

              <div className="form-group-Owner-Notifications">
                <label>Message *</label>
                <textarea
                  placeholder="Enter notification message"
                  value={newNotification.message}
                  onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
                  className="form-textarea-Owner-Notifications"
                  rows="4"
                  title="Enter the message content for your notification"
                />
              </div>

              <div className="form-group-Owner-Notifications">
                <label>Send To</label>
                <div className="target-options-Owner-Notifications">
                  <label className="radio-option-Owner-Notifications" title="Send notification to all tenants">
                    <input
                      type="radio"
                      value="all"
                      checked={newNotification.targetType === "all"}
                      onChange={(e) => setNewNotification(prev => ({ ...prev, targetType: e.target.value }))}
                    />
                    <span>All Tenants</span>
                  </label>
                  <label className="radio-option-Owner-Notifications" title="Send notification to a specific tenant">
                    <input
                      type="radio"
                      value="specific"
                      checked={newNotification.targetType === "specific"}
                      onChange={(e) => setNewNotification(prev => ({ ...prev, targetType: e.target.value }))}
                    />
                    <span>Specific Tenant</span>
                  </label>
                </div>
              </div>

              {newNotification.targetType === "specific" && (
                <div className="form-group-Owner-Notifications">
                  <label>Select Tenant</label>
                  <select
                    value={newNotification.targetTenantId}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, targetTenantId: e.target.value }))}
                    className="form-select-Owner-Notifications"
                    title="Select a specific tenant to receive this notification"
                  >
                    <option value="">Select a tenant</option>
                    {tenants.map(tenant => (
                      <option key={tenant.applicationid} value={tenant.applicationid} title={`${tenant.fullname} - ${tenant.unit_name}`}>
                        {tenant.fullname} - {tenant.unit_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group-Owner-Notifications">
                <label>Priority</label>
                <select
                  value={newNotification.priority}
                  onChange={(e) => setNewNotification(prev => ({ ...prev, priority: e.target.value }))}
                  className="form-select-Owner-Notifications"
                  title="Set the priority level for this notification"
                >
                  <option value="low" title="Low priority notification">Low</option>
                  <option value="medium" title="Medium priority notification">Medium</option>
                  <option value="high" title="High priority notification">High</option>
                </select>
              </div>
            </div>

            <div className="modal-footer-Owner-Notifications">
              <button
                className="cancel-btn-Owner-Notifications"
                onClick={closeSendNotification}
                disabled={sending}
                title="Cancel sending notification"
              >
                Cancel
              </button>
              <button
                className="send-btn-Owner-Notifications"
                onClick={sendNotification}
                disabled={sending}
                title={sending ? "Sending notification..." : "Send notification to selected recipients"}
              >
                {sending ? (
                  <>
                    <div className="sending-spinner-Owner-Notifications"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Notification
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Page Header ===== */}
      <div className="Owner-Notifications-header">
        <div className="Owner-Notifications-header-content">
          <h1 className="Owner-Notifications-title">Notifications</h1>
          <p className="Owner-Notifications-subtitle">
            Stay updated with your property management activities and important announcements
          </p>
        </div>
        
        {/* Send Notification Button */}
        <button
          className="send-notification-btn-Owner-Notifications"
          onClick={openSendNotification}
          title="Create and send a new notification to tenants"
        >
          <Plus size={20} />
          Send Notification
        </button>
      </div>

      {/* ===== Control Bar ===== */}
      <div className="Owner-Notifications-control-bar">
        <div className="Owner-Notifications-tab-group">
          <button
            className={`Owner-Notifications-tab-btn ${filter === "all" ? "Owner-Notifications-tab-active" : ""}`}
            onClick={() => setFilter("all")}
            title={`View all notifications (${totalCount} total)`}
          >
            All
            <span className="Owner-Notifications-tab-badge" title={`${totalCount} total notifications`}>{totalCount}</span>
          </button>
          <button
            className={`Owner-Notifications-tab-btn ${filter === "unread" ? "Owner-Notifications-tab-active" : ""}`}
            onClick={() => setFilter("unread")}
            title={`View unread notifications (${unreadCount} unread)`}
          >
            Unread
            <span className="Owner-Notifications-tab-badge" title={`${unreadCount} unread notifications`}>{unreadCount}</span>
          </button>
          <button
            className={`Owner-Notifications-tab-btn ${filter === "payment" ? "Owner-Notifications-tab-active" : ""}`}
            onClick={() => setFilter("payment")}
            title="View payment-related notifications"
          >
            Payments
          </button>
          <button
            className={`Owner-Notifications-tab-btn ${filter === "maintenance" ? "Owner-Notifications-tab-active" : ""}`}
            onClick={() => setFilter("maintenance")}
            title="View maintenance-related notifications"
          >
            Maintenance
          </button>
          <button
            className={`Owner-Notifications-tab-btn ${filter === "tenant" ? "Owner-Notifications-tab-active" : ""}`}
            onClick={() => setFilter("tenant")}
            title="View tenant-related notifications"
          >
            Tenants
          </button>
        </div>

        <div className="Owner-Notifications-search-container">
          <div className="Owner-Notifications-search-box">
            <Search className="Owner-Notifications-search-icon" size={20} />
            <input
              type="text"
              placeholder="Search notifications..."
              className="Owner-Notifications-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              title="Search through notification titles and messages"
            />
          </div>
          {unreadCount > 0 && (
            <button
              className="Owner-Notifications-mark-all-btn"
              onClick={markAllAsRead}
              title="Mark all notifications as read"
            >
              <Check size={16} />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* ===== Notifications Grid ===== */}
      <div className="Owner-Notifications-grid">
        {filteredNotifications.length === 0 ? (
          <div className="Owner-Notifications-empty">
            <div className="Owner-Notifications-empty-icon">
              <Bell size={64} />
            </div>
            <h3>No notifications found</h3>
            <p>
              {searchTerm || filter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "You're all caught up! New notifications will appear here."
              }
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.notificationid}
              className={`Owner-Notifications-card ${notification.status === "unread" ? "Owner-Notifications-unread" : ""}`}
              title={`${notification.title} - ${formatDate(notification.creationdate)}`}
            >
              <div className="Owner-Notifications-card-header">
                <div className="Owner-Notifications-type-badge" title={`Notification type: ${getTypeLabel(notification)}`}>
                  <span className="Owner-Notifications-type-icon">
                    {getTypeIcon(notification)}
                  </span>
                  <span className="Owner-Notifications-type-label">
                    {getTypeLabel(notification)}
                  </span>
                </div>
                <div
                  className="Owner-Notifications-priority"
                  style={{ backgroundColor: getPriorityColor(notification.priority || 'medium') }}
                  title={`${notification.priority || 'medium'} priority`}
                />
              </div>

              <div className="Owner-Notifications-card-content">
                <h3 className="Owner-Notifications-card-title" title={notification.title}>
                  {notification.title}
                </h3>
                <p className="Owner-Notifications-card-description" title={notification.message}>
                  {notification.message}
                </p>
              </div>

              <div className="Owner-Notifications-card-footer">
                <div className="Owner-Notifications-meta">
                  <div className="Owner-Notifications-meta-item" title={`Created: ${formatDate(notification.creationdate)}`}>
                    <span className="Owner-Notifications-meta-label">Date</span>
                    <span className="Owner-Notifications-meta-value">
                      <Clock size={14} />
                      {formatDate(notification.creationdate)}
                    </span>
                  </div>
                  <div className="Owner-Notifications-meta-item" title={`Status: ${notification.status === "unread" ? "Unread" : "Read"}`}>
                    <span className="Owner-Notifications-meta-label">Status</span>
                    <span className={`Owner-Notifications-status-badge ${notification.status === "unread" ? "Owner-Notifications-status-unread" : "Owner-Notifications-status-read"}`}>
                      {notification.status === "unread" ? "Unread" : "Read"}
                    </span>
                  </div>
                </div>

                <div className="Owner-Notifications-card-actions">
                  {notification.status === "unread" && (
                    <button
                      className="Owner-Notifications-read-btn"
                      onClick={() => markAsRead(notification.notificationid)}
                      title="Mark this notification as read"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    className="Owner-Notifications-delete-btn"
                    onClick={() => deleteNotification(notification.notificationid)}
                    title="Delete this notification"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OwnerNotifications;