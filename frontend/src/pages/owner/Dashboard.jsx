import React, { useState, useEffect } from "react";
import {
  Users,
  Home,
  FileWarning,
  Wallet,
  TrendingUp,
  Calendar,
  Download,
  PieChart,
  BarChart3
} from "lucide-react";
import "../../styles/owners/Dashboard.css";

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5000/api/owner/dashboard');
        
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

    fetchDashboardData();
  }, []);

  // Calculate stats from real data
  const totalTenants = dashboardData?.tenantsData?.length || 0;
  const totalProperties = dashboardData?.dashboardStats?.totalProperties || 0;
  const vacantProperties = dashboardData?.dashboardStats?.vacantProperties || 0;
  const pendingApplications = dashboardData?.dashboardStats?.pendingApplications || 0;
  const monthlyIncome = dashboardData?.dashboardStats?.monthlyRevenue || 0;

  // Prepare data for charts
  const financialData = dashboardData?.financialData || [];
  const propertiesData = dashboardData?.propertiesData || [];

  // Calculate property status distribution for donut chart - FIXED VERSION
  const propertyStatusCount = propertiesData.reduce((acc, property) => {
    // Use original_status directly from your data
    const status = property.original_status;
    
    if (status) {
      // Count each status directly
      acc[status] = (acc[status] || 0) + 1;
    }
    return acc;
  }, {});

  // Debug log to verify counts
  console.log('Property status counts:', propertyStatusCount);
  console.log('Total properties in data:', propertiesData.length);
  console.log('Properties data:', propertiesData);

  const propertyStatusData = Object.entries(propertyStatusCount).map(([status, count]) => ({
    status,
    count,
    percentage: totalProperties > 0 ? ((count / totalProperties) * 100).toFixed(1) : '0'
  }));

  // Calculate revenue trend data
  const revenueData = financialData.map(item => ({
    month: item.month,
    revenue: item.value
  }));

  // Calculate occupancy rate
  const occupancyRate = totalProperties > 0 ? 
    Math.round(((totalProperties - vacantProperties) / totalProperties) * 100) : 0;

  if (loading) {
    return (
      <div className="dashboard-container-Owner-Dashboard">
        <div className="loading-state">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container-Owner-Dashboard">
        <div className="error-state">
          Error loading dashboard: {error}
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="dashboard-container-Owner-Dashboard">
        <div className="no-data">No dashboard data available</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container-Owner-Dashboard">
      {/* ==== HEADER SECTION ==== */}
      <div className="dashboard-header-Owner-Dashboard">
        <div className="header-content-Owner-Dashboard">
          <h1 className="dashboard-title-Owner-Dashboard">Dashboard Overview</h1>
          <p className="dashboard-subtitle-Owner-Dashboard">Welcome back! Here's what's happening today.</p>
        </div>
        
      </div>

      {/* ==== STATS CARDS ==== */}
      <div className="stats-grid-Owner-Dashboard">
        <div className="stat-card-Owner-Dashboard">
          <div className="stat-icon-container-Owner-Dashboard stat-icon-blue-Owner-Dashboard">
            <Users className="stat-icon-Owner-Dashboard" size={28} />
          </div>
          <div className="stat-info-Owner-Dashboard">
            <p className="stat-label-Owner-Dashboard">Total Tenants</p>
            <h2 className="stat-value-Owner-Dashboard">{totalTenants}</h2>
            <div className="stat-trend-Owner-Dashboard stat-trend-up-Owner-Dashboard">
              <TrendingUp className="trend-icon-Owner-Dashboard" size={16} />
              <span className="trend-text-Owner-Dashboard">Active tenants</span>
            </div>
          </div>
        </div>

        <div className="stat-card-Owner-Dashboard">
          <div className="stat-icon-container-Owner-Dashboard stat-icon-green-Owner-Dashboard">
            <Home className="stat-icon-Owner-Dashboard" size={28} />
          </div>
          <div className="stat-info-Owner-Dashboard">
            <p className="stat-label-Owner-Dashboard">Vacant Units</p>
            <h2 className="stat-value-Owner-Dashboard">{vacantProperties}</h2>
            <div className="stat-trend-Owner-Dashboard stat-trend-down-Owner-Dashboard">
              <span className="trend-text-Owner-Dashboard">Out of {totalProperties} total</span>
            </div>
          </div>
        </div>

        <div className="stat-card-Owner-Dashboard">
          <div className="stat-icon-container-Owner-Dashboard stat-icon-orange-Owner-Dashboard">
            <FileWarning className="stat-icon-Owner-Dashboard" size={28} />
          </div>
          <div className="stat-info-Owner-Dashboard">
            <p className="stat-label-Owner-Dashboard">Pending Applications</p>
            <h2 className="stat-value-Owner-Dashboard">{pendingApplications}</h2>
            <div className="stat-trend-Owner-Dashboard stat-trend-up-Owner-Dashboard">
              <span className="trend-text-Owner-Dashboard">Waiting for review</span>
            </div>
          </div>
        </div>

        <div className="stat-card-Owner-Dashboard">
          <div className="stat-icon-container-Owner-Dashboard stat-icon-gold-Owner-Dashboard">
            <Wallet className="stat-icon-Owner-Dashboard" size={28} />
          </div>
          <div className="stat-info-Owner-Dashboard">
            <p className="stat-label-Owner-Dashboard">Monthly Income</p>
            <h2 className="stat-value-Owner-Dashboard">₱{monthlyIncome.toLocaleString('en-PH')}</h2>
            <div className="stat-trend-Owner-Dashboard stat-trend-up-Owner-Dashboard">
              <TrendingUp className="trend-icon-Owner-Dashboard" size={16} />
              <span className="trend-text-Owner-Dashboard">This month's revenue</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==== CHARTS SECTION ==== */}
      <div className="charts-grid-Owner-Dashboard">
        {/* Revenue Trend Chart */}
        <div className="chart-card-Owner-Dashboard">
          <div className="chart-header-Owner-Dashboard">
            <div className="chart-title-section-Owner-Dashboard">
              <BarChart3 className="chart-icon-Owner-Dashboard" size={20} />
              <h3 className="chart-title-Owner-Dashboard">Revenue Trend</h3>
            </div>
            <span className="chart-subtitle-Owner-Dashboard">Last 6 months</span>
          </div>
          <div className="chart-container-Owner-Dashboard">
            {revenueData.length > 0 ? (
              <div className="bar-chart-Owner-Dashboard">
                <div className="chart-bars-container-Owner-Dashboard">
                  {revenueData.map((item, index) => {
                    const maxRevenue = Math.max(...revenueData.map(r => r.revenue));
                    const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                    
                    return (
                      <div key={index} className="bar-chart-item-Owner-Dashboard">
                        <div className="bar-wrapper-Owner-Dashboard">
                          <div 
                            className="bar-fill-Owner-Dashboard" 
                            style={{ height: `${height}%` }}
                            data-amount={`₱${item.revenue.toLocaleString('en-PH')}`}
                          >
                            <div className="bar-value-Owner-Dashboard">₱{item.revenue.toLocaleString('en-PH')}</div>
                          </div>
                        </div>
                        <div className="bar-label-Owner-Dashboard">{item.month}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="chart-grid-Owner-Dashboard">
                  <div className="grid-line-Owner-Dashboard"></div>
                  <div className="grid-line-Owner-Dashboard"></div>
                  <div className="grid-line-Owner-Dashboard"></div>
                  <div className="grid-line-Owner-Dashboard"></div>
                </div>
              </div>
            ) : (
              <div className="no-chart-data-Owner-Dashboard">
                <p>No revenue data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Property Status Distribution - Donut Chart */}
        <div className="chart-card-Owner-Dashboard">
          <div className="chart-header-Owner-Dashboard">
            <div className="chart-title-section-Owner-Dashboard">
              <PieChart className="chart-icon-Owner-Dashboard" size={20} />
              <h3 className="chart-title-Owner-Dashboard">Property Status</h3>
            </div>
            <span className="chart-subtitle-Owner-Dashboard">Current distribution</span>
          </div>
          <div className="chart-container-Owner-Dashboard">
            {propertyStatusData.length > 0 ? (
              <div className="donut-chart-Owner-Dashboard">
                <div className="donut-chart-visual-Owner-Dashboard">
                  <svg width="160" height="160" viewBox="0 0 160 160" className="donut-svg-Owner-Dashboard">
                    {/* Background circle */}
                    <circle cx="80" cy="80" r="70" fill="none" stroke="#f3f4f6" strokeWidth="20" />
                    
                    {/* Segments */}
                    {propertyStatusData.map((item, index, array) => {
                      const percentage = (item.count / totalProperties) * 100;
                      const circumference = 2 * Math.PI * 70;
                      const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                      const previousPercentages = array.slice(0, index).reduce((sum, prevItem) => 
                        sum + (prevItem.count / totalProperties) * 100, 0
                      );
                      const strokeDashoffset = -((previousPercentages / 100) * circumference);
                      
                      return (
                        <circle
                          key={index}
                          cx="80"
                          cy="80"
                          r="70"
                          fill="none"
                          stroke={getStatusColor(item.status)}
                          strokeWidth="20"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          transform="rotate(-90 80 80)"
                          className="donut-segment-Owner-Dashboard"
                        />
                      );
                    })}
                  </svg>
                  
                  {/* Center label */}
                  <div className="donut-center-Owner-Dashboard">
                    <div className="donut-total-Owner-Dashboard">{totalProperties}</div>
                    <div className="donut-label-Owner-Dashboard">Total Properties</div>
                  </div>
                </div>
                
                <div className="donut-legend-Owner-Dashboard">
                  {propertyStatusData.map((item, index) => (
                    <div key={index} className="legend-item-Owner-Dashboard">
                      <div 
                        className="legend-color-Owner-Dashboard" 
                        style={{ backgroundColor: getStatusColor(item.status) }}
                      ></div>
                      <div className="legend-info-Owner-Dashboard">
                        <span className="legend-label-Owner-Dashboard">{item.status}</span>
                        <span className="legend-value-Owner-Dashboard">
                          {item.count} units ({item.percentage}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="no-chart-data-Owner-Dashboard">
                <p>No property data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==== QUICK OVERVIEW ==== */}
      <div className="overview-grid-Owner-Dashboard">
        <div className="overview-card-Owner-Dashboard">
          <div className="overview-header-Owner-Dashboard">
            <h4 className="overview-title-Owner-Dashboard">Recent Activity</h4>
          </div>
          <div className="overview-content-Owner-Dashboard">
            {dashboardData.recentActivity && dashboardData.recentActivity.length > 0 ? (
              <div className="activity-list-Owner-Dashboard">
                {dashboardData.recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="activity-item-Owner-Dashboard">
                    <div className="activity-dot-Owner-Dashboard"></div>
                    <div className="activity-info-Owner-Dashboard">
                      <p className="activity-text-Owner-Dashboard">
                        Payment from {activity.tenant_name}
                      </p>
                      <span className="activity-date-Owner-Dashboard">
                        {activity.payment_date}
                      </span>
                    </div>
                    <div className="activity-amount-Owner-Dashboard">
                      ₱{activity.amount_paid?.toLocaleString('en-PH') || '0'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-activity-Owner-Dashboard">
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>

        <div className="overview-card-Owner-Dashboard">
          <div className="overview-header-Owner-Dashboard">
            <h4 className="overview-title-Owner-Dashboard">Quick Stats</h4>
          </div>
          <div className="overview-content-Owner-Dashboard">
            <div className="stats-list-Owner-Dashboard">
              <div className="stat-item-Owner-Dashboard">
                <span className="stat-item-label-Owner-Dashboard">Occupancy Rate</span>
                <span className="stat-item-value-Owner-Dashboard">
                  {occupancyRate}%
                </span>
              </div>
              <div className="stat-item-Owner-Dashboard">
                <span className="stat-item-label-Owner-Dashboard">Avg. Monthly Revenue</span>
                <span className="stat-item-value-Owner-Dashboard">
                  ₱{dashboardData?.dashboardStats?.averageMonthlyRevenue?.toLocaleString('en-PH') || '0'}
                </span>
              </div>
              <div className="stat-item-Owner-Dashboard">
                <span className="stat-item-label-Owner-Dashboard">YTD Revenue</span>
                <span className="stat-item-value-Owner-Dashboard">
                  ₱{dashboardData?.dashboardStats?.ytdRevenue?.toLocaleString('en-PH') || '0'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get colors for status
const getStatusColor = (status) => {
  switch (status.toLowerCase()) {
    case 'occupied':
      return '#10b981'; // Green
    case 'vacant':
      return '#ef4444'; // Red
    case 'available':
      return '#3b82f6'; // Blue
    case 'maintenance':
      return '#f59e0b'; // Orange
    default:
      return '#6b7280'; // Gray
  }
};

export default Dashboard;