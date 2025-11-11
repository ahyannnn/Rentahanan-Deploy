import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Check, 
  X, 
  Search, 
  Clock, 
  AlertCircle, 
  CreditCard, 
  Wrench, 
  FileText, 
  Calendar,
  MessageCircle,
  Home,
  Info
} from "lucide-react";
import "../../styles/tenant/TenantNotification.css";

const TenantNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ ADD API BASE - same as other components
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://rentahanan.onrender.com";

  // ✅ UPDATED API ENDPOINT for fetching notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const storedUserRaw = localStorage.getItem("user");
      if (!storedUserRaw) return;

      const storedUser = JSON.parse(storedUserRaw);
      const userId = storedUser.userid;

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

  // ✅ UPDATED API ENDPOINT for marking as read
  const markAsRead = async (notificationId) => {
    try {
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

  // ✅ UPDATED API ENDPOINT for marking all as read
  const markAllAsRead = async () => {
    try {
      const storedUserRaw = localStorage.getItem("user");
      if (!storedUserRaw) return;

      const storedUser = JSON.parse(storedUserRaw);
      const userId = storedUser.userid;

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

  // ✅ UPDATED API ENDPOINT for deleting notification
  const deleteNotification = async (notificationId) => {
    try {
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

  useEffect(() => {
    fetchNotifications();
  }, []);

  const filteredNotifications = notifications.filter(notification => {
    const matchesFilter = filter === "all" || 
      (filter === "unread" && notification.status === "unread") ||
      (filter === "payment" && (notification.title?.toLowerCase().includes('payment') || notification.message?.toLowerCase().includes('payment'))) ||
      (filter === "maintenance" && (notification.title?.toLowerCase().includes('maintenance') || notification.message?.toLowerCase().includes('maintenance')));

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
    } else if (title.includes('event') || message.includes('event') || message.includes('party')) {
      return <Calendar size={16} />;
    } else if (title.includes('welcome') || message.includes('welcome')) {
      return <Home size={16} />;
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
      <div className="notifications-container-Tenant-Notifications">
        <div className="loading-notifications-Tenant-Notifications">
          <div className="loading-spinner-Tenant-Notifications"></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-container-Tenant-Notifications">
      {/* ===== Page Header ===== */}
      <div className="page-header-Tenant-Notifications">
        <div className="header-content-Tenant-Notifications">
          <h1 
            className="page-title-Tenant-Notifications"
            title="View all your rental-related notifications and updates"
          >
            Notifications
          </h1>
          <p 
            className="page-description-Tenant-Notifications"
            title="Stay informed about payments, maintenance, contracts, and other important updates"
          >
            Stay updated with your rental activities and important announcements
          </p>
        </div>
      </div>

      {/* ===== Notification Controls ===== */}
      <div className="notifications-top-controls-Tenant-Notifications">
        <div className="search-container-Tenant-Notifications">
          <div className="search-box-Tenant-Notifications">
            <Search className="search-icon-Tenant-Notifications" size={20} />
            <input
              type="text"
              placeholder="Search notifications..."
              className="search-input-Tenant-Notifications"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              title="Search through notification titles and messages"
            />
          </div>
        </div>

        <div className="controls-right-Tenant-Notifications">
          <div className="filter-tabs-Tenant-Notifications">
            <button
              className={`filter-btn-Tenant-Notifications ${filter === "all" ? "filter-btn-active-Tenant-Notifications" : ""}`}
              onClick={() => setFilter("all")}
              title="Show all notifications regardless of type or status"
            >
              All
              <span className="filter-count-Tenant-Notifications">{totalCount}</span>
            </button>
            <button
              className={`filter-btn-Tenant-Notifications ${filter === "unread" ? "filter-btn-active-Tenant-Notifications" : ""}`}
              onClick={() => setFilter("unread")}
              title="Show only unread notifications"
            >
              Unread
              <span className="filter-count-Tenant-Notifications">{unreadCount}</span>
            </button>
            <button
              className={`filter-btn-Tenant-Notifications ${filter === "payment" ? "filter-btn-active-Tenant-Notifications" : ""}`}
              onClick={() => setFilter("payment")}
              title="Show payment-related notifications"
            >
              Payments
            </button>
            <button
              className={`filter-btn-Tenant-Notifications ${filter === "maintenance" ? "filter-btn-active-Tenant-Notifications" : ""}`}
              onClick={() => setFilter("maintenance")}
              title="Show maintenance and repair notifications"
            >
              Maintenance
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              className="mark-all-read-btn-Tenant-Notifications"
              onClick={markAllAsRead}
              title="Mark all unread notifications as read"
            >
              <Check size={16} />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* ===== Notifications List ===== */}
      <div className="notifications-list-Tenant-Notifications">
        {filteredNotifications.length === 0 ? (
          <div className="no-notifications-Tenant-Notifications">
            <div className="no-notifications-icon-Tenant-Notifications">
              <Bell size={64} />
            </div>
            <h3 className="no-notifications-title-Tenant-Notifications">
              No notifications found
            </h3>
            <p className="no-notifications-description-Tenant-Notifications">
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
              className={`notification-card-Tenant-Notifications ${notification.status === "unread" ? "unread-Tenant-Notifications" : ""}`}
              title={`${notification.title} - ${formatDate(notification.creationdate)}`}
            >
              <div className="card-header-Tenant-Notifications">
                <div 
                  className="notification-type-Tenant-Notifications"
                  title={`Notification type: ${getTypeLabel(notification)}`}
                >
                  <span className="type-icon-Tenant-Notifications">
                    {getTypeIcon(notification)}
                  </span>
                  <span className="type-label-Tenant-Notifications">
                    {getTypeLabel(notification)}
                  </span>
                </div>
                <div
                  className="notification-priority-Tenant-Notifications"
                  style={{ backgroundColor: getPriorityColor(notification.priority || 'medium') }}
                  title={`${(notification.priority || 'medium').toUpperCase()} priority - ${notification.priority === 'high' ? 'Requires immediate attention' : notification.priority === 'medium' ? 'Important but not urgent' : 'Informational'}`}
                />
              </div>

              <div className="notification-content-Tenant-Notifications">
                <h3 
                  className="notification-title-Tenant-Notifications"
                  title={notification.title}
                >
                  {notification.title}
                </h3>
                <p 
                  className="notification-message-Tenant-Notifications"
                  title={notification.message}
                >
                  {notification.message}
                </p>
              </div>

              <div className="card-footer-Tenant-Notifications">
                <div className="notification-meta-Tenant-Notifications">
                  <div className="meta-item-Tenant-Notifications">
                    <span className="meta-label-Tenant-Notifications">Date</span>
                    <span 
                      className="meta-value-Tenant-Notifications date-value-Tenant-Notifications"
                      title={`Notification received: ${formatDate(notification.creationdate)}`}
                    >
                      <Clock size={14} />
                      {formatDate(notification.creationdate)}
                    </span>
                  </div>
                  <div className="meta-item-Tenant-Notifications">
                    <span className="meta-label-Tenant-Notifications">Status</span>
                    <span 
                      className={`status-badge-Tenant-Notifications ${notification.status === "unread" ? "status-unread-Tenant-Notifications" : "status-read-Tenant-Notifications"}`}
                      title={notification.status === "unread" ? "This notification hasn't been read yet" : "You've already read this notification"}
                    >
                      {notification.status === "unread" ? "Unread" : "Read"}
                    </span>
                  </div>
                </div>

                <div className="notification-actions-Tenant-Notifications">
                  {notification.status === "unread" && (
                    <button
                      className="mark-read-btn-Tenant-Notifications"
                      onClick={() => markAsRead(notification.notificationid)}
                      title="Mark this notification as read"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    className="delete-notification-btn-Tenant-Notifications"
                    onClick={() => deleteNotification(notification.notificationid)}
                    title="Delete this notification permanently"
                  >
                    <X size={16} />
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

export default TenantNotifications;