import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  CreditCard,
  TrendingUp,
  FileText,
  ArrowUpRight,
  Bell,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Info
} from "lucide-react";
import "../../styles/tenant/Dashboard.css";

const Dashboard = ({ tenantId: propTenantId }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // ✅ ADD API BASE - same as other components
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://rentahanan.onrender.com";

  const quickActions = [
    { 
      label: "Pay Bills", 
      icon: <FileText size={20} />, 
      color: "blue",
      path: "/tenant/bills",
      tooltip: "View and pay your outstanding bills"
    },
    { 
      label: "View History", 
      icon: <FileText size={20} />, 
      color: "green",
      path: "/tenant/payment",
      tooltip: "Check your payment history and receipts"
    },
    { 
      label: "Report Issue", 
      icon: <Bell size={20} />, 
      color: "orange",
      path: "/tenant/support",
      tooltip: "Report maintenance issues or concerns"
    },
  ];

  // ✅ Get tenantid from multiple possible sources
  const getTenantId = () => {
    // Priority 2: localStorage directly
    const directTenantId = localStorage.getItem("tenantid");
    if (directTenantId) return directTenantId;

    // Priority 3: user object in localStorage
    const storedUser = JSON.parse(localStorage.getItem("user"));
    return storedUser?.tenantid;
  };

  const tenantId = getTenantId();

  useEffect(() => {
    if (tenantId) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [tenantId]);

  // ✅ UPDATED API ENDPOINT for dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/tenant/dashboard/${tenantId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Navigation handlers
  const handleQuickActionClick = (path) => {
    navigate(path);
  };

  const handleViewAllClick = () => {
    navigate("/tenant/bills");
  };

  const handlePayNowClick = (bill) => {
    navigate("/tenant/bills", { 
      state: { 
        selectedBill: bill,
        autoOpenPayment: true 
      } 
    });
  };

  const getCardIcon = (title) => {
    switch (title) {
      case "Current Bills":
        return <FileText size={24} />;
      case "Due Date":
        return <Calendar size={24} />;
      case "Balance":
        return <CreditCard size={24} />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status) => {
    switch (status.toLowerCase()) {
      case "unpaid":
        return { class: "status-unpaid", icon: <AlertCircle size={14} /> };
      case "paid":
        return { class: "status-paid", icon: <CheckCircle size={14} /> };
      case "for validation":
        return { class: "status-pending", icon: <Clock size={14} /> };
      default:
        return { class: "status-default", icon: null };
    }
  };

  const getBillIcon = (billType) => {
    switch (billType?.toLowerCase()) {
      case "rent":
        return <FileText size={16} />;
      case "electricity":
      case "water":
      case "utilities":
        return <TrendingUp size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const getDaysRemaining = (dueDate) => {
    if (!dueDate || dueDate === "No pending bills") return "";

    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "1 day remaining";
    if (diffDays > 1) return `${diffDays} days remaining`;
    return "Overdue";
  };

  if (!tenantId) {
    return (
      <div className="dashboard-content-Tenant-Dashboard">
        <div className="error-state">
          Tenant ID is required to load dashboard. Please make sure you are logged in.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-content-Tenant-Dashboard">
        <div className="loading-state">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-content-Tenant-Dashboard">
        <div className="error-state">
          Error loading dashboard: {error}
          <button onClick={fetchDashboardData}>Retry</button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="dashboard-content-Tenant-Dashboard">
        <div className="no-data">No dashboard data available</div>
      </div>
    );
  }

  const { tenantData, billsData, transactionData, dashboardStats, notifications } = dashboardData;

  return (
    <div className="dashboard-content-Tenant-Dashboard">
      {/* Header */}
      <div className="dashboard-header-Tenant-Dashboard">
        <div className="welcome-section-Tenant-Dashboard">
          <h1 className="welcome-text-Tenant-Dashboard" title="Your tenant dashboard overview">
            Welcome back, <span className="welcome-name-Tenant-Dashboard">
              {tenantData?.name || "Tenant"}
            </span>
          </h1>
          <p className="welcome-subtitle-Tenant-Dashboard" title="Today's financial summary">
            Here's your financial overview for today
          </p>
        </div>
        <div className="unit-lease-info-Tenant-Dashboard">
          <div className="info-badge-Tenant-Dashboard" title="Your assigned rental unit">
            <span className="info-label-Tenant-Dashboard">Unit</span>
            <span className="info-value-Tenant-Dashboard">
              {tenantData?.unit || "N/A"}
            </span>
          </div>
          <div className="info-badge-Tenant-Dashboard" title="Your lease start date">
            <span className="info-label-Tenant-Dashboard">Lease Since</span>
            <span className="info-value-Tenant-Dashboard">
              {tenantData?.leaseStartDate || "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-Tenant-Dashboard">
        {quickActions.map((action, index) => (
          <button
            key={index}
            className={`quick-action-btn-Tenant-Dashboard ${action.color}-action`}
            onClick={() => handleQuickActionClick(action.path)}
            title={action.tooltip}
          >
            <div className="action-icon-Tenant-Dashboard">
              {action.icon}
            </div>
            <span>{action.label}</span>
            <ArrowUpRight size={16} className="action-arrow-Tenant-Dashboard" />
          </button>
        ))}
      </div>

      {/* Overview Cards */}
      <div className="bills-overview-cards-Tenant-Dashboard">
        <div className="card-Tenant-Dashboard blue-card-Tenant-Dashboard" title="Number of pending bills requiring payment">
          <div className="card-header-Tenant-Dashboard">
            <div className="card-title-section-Tenant-Dashboard">
              <p className="card-title-Tenant-Dashboard">Current Bills</p>
              <p className="card-subtitle-Tenant-Dashboard">Pending payments</p>
            </div>
            <div className="card-icon-Tenant-Dashboard">
              {getCardIcon("Current Bills")}
            </div>
          </div>
          <h2 className="card-value-Tenant-Dashboard">{dashboardStats?.currentBillsCount || 0}</h2>
          <div className="card-trend-Tenant-Dashboard">
            <TrendingUp size={16} />
            <span>Unpaid bills</span>
          </div>
        </div>

        <div className="card-Tenant-Dashboard yellow-card-Tenant-Dashboard" title="Next payment due date and remaining time">
          <div className="card-header-Tenant-Dashboard">
            <div className="card-title-section-Tenant-Dashboard">
              <p className="card-title-Tenant-Dashboard">Due Date</p>
              <p className="card-subtitle-Tenant-Dashboard">Next payment</p>
            </div>
            <div className="card-icon-Tenant-Dashboard">
              {getCardIcon("Due Date")}
            </div>
          </div>
          <h2 className="card-value-Tenant-Dashboard">
            {dashboardStats?.nextDueDate && dashboardStats.nextDueDate !== "No pending bills" ?
              new Date(dashboardStats.nextDueDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              }) :
              "No bills"
            }
          </h2>
          <div className="card-trend-Tenant-Dashboard">
            <Calendar size={16} />
            <span>{getDaysRemaining(dashboardStats?.nextDueDate)}</span>
          </div>
        </div>

        <div className="card-Tenant-Dashboard green-card-Tenant-Dashboard" title="Total outstanding balance across all bills">
          <div className="card-header-Tenant-Dashboard">
            <div className="card-title-section-Tenant-Dashboard">
              <p className="card-title-Tenant-Dashboard">Balance</p>
              <p className="card-subtitle-Tenant-Dashboard">Total outstanding</p>
            </div>
            <div className="card-icon-Tenant-Dashboard">
              {getCardIcon("Balance")}
            </div>
          </div>
          <h2 className="card-value-Tenant-Dashboard">
            ₱{dashboardStats?.totalBalance?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}
          </h2>
          <div className={`card-trend-Tenant-Dashboard ${dashboardStats?.totalBalance === 0 ? 'positive' : ''}`}>
            <TrendingUp size={16} />
            <span>{dashboardStats?.totalBalance === 0 ? 'No overdue' : 'Total outstanding'}</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-main-grid-Tenant-Dashboard">
        {/* Current Bills Table */}
        <div className="current-bills-section-Tenant-Dashboard">
          <div className="section-header-Tenant-Dashboard">
            <div className="section-title-group-Tenant-Dashboard">
              <h3 className="section-title-Tenant-Dashboard" title="Your current outstanding bills">Current Bills</h3>
              <p className="section-subtitle-Tenant-Dashboard" title="Manage payments and track bill status">Manage your payments and view status</p>
            </div>
            <button 
              className="view-all-btn-Tenant-Dashboard"
              onClick={handleViewAllClick}
              title="View all bills and payment history"
            >
              View All
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="table-container-Tenant-Dashboard">
            {(!billsData || billsData.length === 0) ? (
              <div className="no-data-Tenant-Dashboard">
                <p>No pending bills found</p>
              </div>
            ) : (
              <table className="bills-table-Tenant-Dashboard">
                <thead className="table-header-Tenant-Dashboard">
                  <tr className="table-header-row-Tenant-Dashboard">
                    <th className="table-heading-Tenant-Dashboard" title="Type of bill">Bill Type</th>
                    <th className="table-heading-Tenant-Dashboard" title="Amount due">Amount</th>
                    <th className="table-heading-Tenant-Dashboard" title="Payment due date">Due Date</th>
                    <th className="table-heading-Tenant-Dashboard" title="Current payment status">Status</th>
                    <th className="table-heading-Tenant-Dashboard action-heading-Tenant-Dashboard" title="Available actions">Action</th>
                  </tr>
                </thead>
                <tbody className="table-body-Tenant-Dashboard">
                  {billsData.map((bill, index) => {
                    const statusVariant = getStatusVariant(bill.status);
                    return (
                      <tr key={index} className="table-row-Tenant-Dashboard">
                        <td className="table-data-Tenant-Dashboard" data-label="Bill Type" title={`Bill type: ${bill.billType}`}>
                          <div className="bill-type-cell-Tenant-Dashboard">
                            <div className="bill-icon-Tenant-Dashboard">
                              {getBillIcon(bill.billType)}
                            </div>
                            <span className="bill-type-text-Tenant-Dashboard">{bill.billType}</span>
                          </div>
                        </td>
                        <td className="table-data-Tenant-Dashboard" data-label="Amount" title={`Amount due: ${bill.amount}`}>
                          <span className="amount-text-Tenant-Dashboard">{bill.amount}</span>
                        </td>
                        <td className="table-data-Tenant-Dashboard" data-label="Due Date" title={`Due date: ${new Date(bill.dueDate).toLocaleDateString()}`}>
                          <span className="due-date-text-Tenant-Dashboard">
                            {new Date(bill.dueDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </td>
                        <td className="table-data-Tenant-Dashboard" data-label="Status" title={`Payment status: ${bill.status}`}>
                          <span className={`status-badge-Tenant-Dashboard ${statusVariant.class}`}>
                            {statusVariant.icon} {bill.status}
                          </span>
                        </td>
                        <td className="table-data-Tenant-Dashboard action-cell-Tenant-Dashboard" data-label="Action">
                          <button
                            className={`action-btn-Tenant-Dashboard action-${bill.action.toLowerCase().replace(" ", "-")}`}
                            onClick={() => handlePayNowClick(bill)}
                            title={`${bill.action} for ${bill.billType}`}
                          >
                            {bill.action}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Transaction Overview */}
        <div className="transaction-overview-section-Tenant-Dashboard">
          <div className="section-header-Tenant-Dashboard">
            <div className="section-title-group-Tenant-Dashboard">
              <h3 className="section-title-Tenant-Dashboard" title="Your payment history and spending patterns">Spending Overview</h3>
              <p className="section-subtitle-Tenant-Dashboard" title="Monthly payment history">Payment history</p>
            </div>
            <div className="chart-legend-Tenant-Dashboard">
              <div className="legend-item-Tenant-Dashboard">
                <div className="legend-color-Tenant-Dashboard blue"></div>
                <span>Payments</span>
              </div>
            </div>
          </div>
          <div className="chart-container-Tenant-Dashboard">
            {(!transactionData || transactionData.length === 0) ? (
              <div className="no-data-Tenant-Dashboard">
                <p>No transaction data available</p>
              </div>
            ) : (
              <>
                <div className="chart-bars-Tenant-Dashboard">
                  {transactionData.map((data, index) => (
                    <div key={index} className="chart-bar-wrapper-Tenant-Dashboard">
                      <div
                        className="chart-bar-Tenant-Dashboard"
                        style={{ height: data.height }}
                        data-amount={data.amount}
                      ></div>
                      <p className="chart-label-Tenant-Dashboard">
                        {data.month}
                        <span className="chart-amount-Tenant-Dashboard">{data.amount}</span>
                      </p>
                    </div>
                  ))}
                </div>
                <div className="chart-grid-Tenant-Dashboard">
                  <div className="grid-line-Tenant-Dashboard"></div>
                  <div className="grid-line-Tenant-Dashboard"></div>
                  <div className="grid-line-Tenant-Dashboard"></div>
                  <div className="grid-line-Tenant-Dashboard"></div>
                </div>
              </>
            )}
          </div>
          <div className="chart-stats-Tenant-Dashboard">
            <div className="stat-item-Tenant-Dashboard">
              <span className="stat-label-Tenant-Dashboard">Average Monthly</span>
              <span className="stat-value-Tenant-Dashboard">
                ₱{dashboardStats?.averageMonthly?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}
              </span>
            </div>
            <div className="stat-item-Tenant-Dashboard">
              <span className="stat-label-Tenant-Dashboard">Total Paid</span>
              <span className="stat-value-Tenant-Dashboard">
                ₱{dashboardStats?.totalPaid?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
