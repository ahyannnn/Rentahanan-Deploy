import React, { useState, useEffect } from "react";
import { 
  Search, 
  Calendar, 
  CreditCard, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle,
  Smartphone,
  Banknote,
  Building,
  Download,
  Eye,
  Info
} from "lucide-react";
import "../../styles/tenant/Payment.css";

const Payment = () => {
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [filteredPayments, setFilteredPayments] = useState([]);
    const [timeFilter, setTimeFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    // ✅ ADD API BASE
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://rentahanan.onrender.com";

    const itemsPerPage = 6;
    const storedUser = JSON.parse(localStorage.getItem("user")) || {};
    const tenantId = storedUser.tenantid || storedUser.userid || null;

    useEffect(() => {
        fetchPaidBills();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [paymentHistory, timeFilter, currentPage, searchTerm]);

    const fetchPaidBills = async () => {
        try {
            setLoading(true);
            // ✅ UPDATED API ENDPOINT
            const response = await fetch(`${API_BASE}/api/bills/paid/${tenantId}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch payment history: ${response.status}`);
            }
            
            const data = await response.json();
            setPaymentHistory(data);
        } catch (err) {
            console.error("Error fetching paid bills:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ✅ UPDATED: Consistent receipt viewing like Transactions component
    const handleViewReceipt = async (billId) => {
        try {
            // ✅ UPDATED API ENDPOINT - Same as Transactions component
            const response = await fetch(`${API_BASE}/api/transactions/receipt/${billId}`);
            const receiptData = await response.json();

            if (response.ok && receiptData.receipt_url) {
                // ✅ Use receipt_url directly like Transactions component
                window.open(receiptData.receipt_url, '_blank');
            } else {
                // Fallback: Show payment details if no receipt
                const payment = paymentHistory.find(p => p.id === billId || p.billid === billId);
                if (payment) {
                    alert(`Payment Details:\n- ID: #${payment.id || payment.billid}\n- Amount: ₱${payment.amount}\n- Date: ${new Date(payment.date).toLocaleDateString()}\n- Status: ${payment.status}\n\nNo digital receipt available.`);
                } else {
                    alert(`No receipt available for this payment.`);
                }
            }
        } catch (error) {
            console.error('Error fetching receipt:', error);
            // Fallback to showing basic payment info
            const payment = paymentHistory.find(p => p.id === billId || p.billid === billId);
            if (payment) {
                alert(`Payment Details:\n- ID: #${payment.id || payment.billid}\n- Amount: ₱${payment.amount}\n- Date: ${new Date(payment.date).toLocaleDateString()}\n- Status: ${payment.status}\n\nReceipt is not available.`);
            }
        }
    };

    const applyFilters = () => {
        let filtered = [...paymentHistory];

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(payment =>
                payment.billType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.paymentType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.gcashRef?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.amount?.toString().includes(searchTerm)
            );
        }

        // Apply time filter
        if (timeFilter !== "all") {
            const now = new Date();
            filtered = filtered.filter(payment => {
                const paymentDate = new Date(payment.date);
                
                switch (timeFilter) {
                    case "week":
                        const oneWeekAgo = new Date(now);
                        oneWeekAgo.setDate(now.getDate() - 7);
                        return paymentDate >= oneWeekAgo;
                    
                    case "month":
                        const oneMonthAgo = new Date(now);
                        oneMonthAgo.setMonth(now.getMonth() - 1);
                        return paymentDate >= oneMonthAgo;
                    
                    case "year":
                        const oneYearAgo = new Date(now);
                        oneYearAgo.setFullYear(now.getFullYear() - 1);
                        return paymentDate >= oneYearAgo;
                    
                    default:
                        return true;
                }
            });
        }

        setFilteredPayments(filtered);
    };

    const getCurrentPageItems = () => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredPayments.slice(startIndex, endIndex);
    };

    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleTimeFilterChange = (filter) => {
        setTimeFilter(filter);
        setCurrentPage(1);
    };

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case "paid": return <CheckCircle size={16} className="status-icon-tenant-p" />;
            case "pending": return <Clock size={16} className="status-icon-tenant-p" />;
            case "cancelled": return <XCircle size={16} className="status-icon-tenant-p" />;
            default: return <FileText size={16} className="status-icon-tenant-p" />;
        }
    };

    const getPaymentMethodIcon = (method) => {
        switch (method?.toLowerCase()) {
            case "gcash": return <Smartphone size={16} className="payment-method-icon-tenant-p" />;
            case "cash": return <Banknote size={16} className="payment-method-icon-tenant-p" />;
            case "bank transfer": return <Building size={16} className="payment-method-icon-tenant-p" />;
            case "credit card": return <CreditCard size={16} className="payment-method-icon-tenant-p" />;
            default: return <CreditCard size={16} className="payment-method-icon-tenant-p" />;
        }
    };

    if (loading) {  
        return (
            <div className="payment-history-container-tenant-p">
                <div className="loading-container-tenant-p">
                    <div className="loading-spinner-tenant-p"></div>
                    <p className="loading-text-tenant-p">Loading payment history...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="payment-history-container-tenant-p">
                <div className="error-container-tenant-p">
                    <div className="error-icon-tenant-p">⚠️</div>
                    <h3 className="error-title-tenant-p">Error Loading Payment History</h3>
                    <p className="error-message-tenant-p">{error}</p>
                    <button 
                        onClick={fetchPaidBills} 
                        className="retry-btn-tenant-p"
                        title="Retry loading payment history"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const currentItems = getCurrentPageItems();

    return (
        <div className="payment-history-container-tenant-p">
            {/* Header Section */}
            <div className="page-header-section-tenant-p">
                <h2 
                    className="page-header-tenant-p" 
                    title="View your complete payment transaction history"
                >
                    Payment History
                </h2>
                <p 
                    className="page-subtext-tenant-p" 
                    title="Track and review all your successful payments"
                >
                    View all your past successful payment records
                </p>
            </div>

            {/* Controls Section */}
            <div className="controls-container-tenant-p">
                <div className="search-container-tenant-p">
                    <div className="search-box-tenant-p">
                        <Search size={18} className="search-icon-tenant-p" />
                        <input
                            type="text"
                            placeholder="Search by bill type, status, or reference..."
                            className="search-input-tenant-p"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            title="Search payments by type, status, reference number, or amount"
                        />
                    </div>
                </div>

                <div className="time-filters-container-tenant-p">
                    <div className="time-filters-tenant-p">
                        <button
                            className={`time-filter-btn-tenant-p ${timeFilter === "all" ? "time-filter-btn-active-tenant-p" : ""}`}
                            onClick={() => handleTimeFilterChange("all")}
                            title="Show all payments regardless of date"
                        >
                            All Time
                        </button>
                        <button
                            className={`time-filter-btn-tenant-p ${timeFilter === "week" ? "time-filter-btn-active-tenant-p" : ""}`}
                            onClick={() => handleTimeFilterChange("week")}
                            title="Show payments from the last 7 days"
                        >
                            This Week
                        </button>
                        <button
                            className={`time-filter-btn-tenant-p ${timeFilter === "month" ? "time-filter-btn-active-tenant-p" : ""}`}
                            onClick={() => handleTimeFilterChange("month")}
                            title="Show payments from the last 30 days"
                        >
                            This Month
                        </button>
                        <button
                            className={`time-filter-btn-tenant-p ${timeFilter === "year" ? "time-filter-btn-active-tenant-p" : ""}`}
                            onClick={() => handleTimeFilterChange("year")}
                            title="Show payments from the last 12 months"
                        >
                            This Year
                        </button>
                    </div>
                </div>
            </div>

            {/* Payment Cards - 1 per row */}
            <div className="payments-list-container-tenant-p">
                <div className="payments-list-tenant-p">
                    {currentItems.length > 0 ? (
                        currentItems.map((payment) => (
                            <div 
                                key={payment.id} 
                                className="payment-card-tenant-p"
                                title={`Payment for ${payment.billType} - ₱${payment.amount}`}
                            >
                                <div className="payment-card-header-tenant-p">
                                    <div 
                                        className="payment-type-badge-tenant-p"
                                        title={`Bill type: ${payment.billType || "General Payment"}`}
                                    >
                                        <FileText size={16} className="payment-type-icon-tenant-p" />
                                        <span className="payment-type-text-tenant-p">{payment.billType || "Bill Payment"}</span>
                                    </div>
                                    <span 
                                        className={`payment-status-tenant-p payment-status-${payment.status?.toLowerCase()}-tenant-p`}
                                        title={`Payment status: ${payment.status}`}
                                    >
                                        {getStatusIcon(payment.status)}
                                        <span className="status-text-tenant-p">{payment.status}</span>
                                    </span>
                                </div>

                                <div className="payment-card-content-tenant-p">
                                    <div className="payment-main-info-tenant-p">
                                        <h3 
                                            className="payment-amount-tenant-p"
                                            title={`Payment amount: ₱${payment.amount?.toLocaleString() || '0.00'}`}
                                        >
                                            ₱{payment.amount?.toLocaleString() || '0.00'}
                                        </h3>
                                        <p 
                                            className="payment-description-tenant-p"
                                            title={payment.description || `Payment details for ${payment.billType}`}
                                        >
                                            {payment.description || `Payment for ${payment.billType}`}
                                        </p>
                                    </div>

                                    <div className="payment-details-grid-tenant-p">
                                        <div className="detail-item-tenant-p">
                                            <div className="detail-label-container-tenant-p">
                                                <Calendar size={14} className="detail-icon-tenant-p" />
                                                <span className="detail-label-tenant-p">Payment Date</span>
                                            </div>
                                            <span 
                                                className="detail-value-tenant-p"
                                                title={`Payment processed on ${new Date(payment.date).toLocaleDateString()}`}
                                            >
                                                {new Date(payment.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="detail-item-tenant-p">
                                            <div className="detail-label-container-tenant-p">
                                                {getPaymentMethodIcon(payment.paymentType)}
                                                <span className="detail-label-tenant-p">Payment Method</span>
                                            </div>
                                            <span 
                                                className="detail-value-tenant-p"
                                                title={`Paid using ${payment.paymentType}`}
                                            >
                                                {payment.paymentType}
                                            </span>
                                        </div>
                                        {payment.gcashRef && (
                                            <div className="detail-item-tenant-p">
                                                <div className="detail-label-container-tenant-p">
                                                    <FileText size={14} className="detail-icon-tenant-p" />
                                                    <span className="detail-label-tenant-p">Reference No.</span>
                                                </div>
                                                <span 
                                                    className="detail-value-tenant-p ref-value-tenant-p"
                                                    title={`GCash reference number: ${payment.gcashRef}`}
                                                >
                                                    #{payment.gcashRef}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="payment-card-footer-tenant-p">
                                    <div 
                                        className="payment-id-tenant-p"
                                        title={`Unique payment identifier: #${payment.id || payment.billid}`}
                                    >
                                        <span className="id-label-tenant-p">Payment ID:</span>
                                        <span className="id-value-tenant-p">#{payment.id || payment.billid}</span>
                                    </div>
                                    <div className="payment-actions-tenant-p">
                                        <button 
                                            className="view-receipt-btn-tenant-p"
                                            onClick={() => handleViewReceipt(payment.id || payment.billid)}
                                            title="View and download payment receipt"
                                        >
                                            <Eye size={16} className="receipt-icon-tenant-p" />
                                            <span className="receipt-text-tenant-p">View Receipt</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-payments-tenant-p">
                            <div className="no-payments-icon-tenant-p">💸</div>
                            <h3 className="no-payments-title-tenant-p">No payments found</h3>
                            <p className="no-payments-description-tenant-p">
                                {searchTerm || timeFilter !== "all" 
                                    ? "No payments match your search criteria." 
                                    : "You haven't made any payments yet."}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination Controls */}
            {filteredPayments.length > itemsPerPage && (
                <div className="pagination-container-tenant-p">
                    <div className="pagination-controls-tenant-p">
                        <button 
                            className="pagination-btn-tenant-p" 
                            onClick={handlePrevPage}
                            disabled={currentPage === 1}
                            title={currentPage === 1 ? "You're on the first page" : "Go to previous page"}
                        >
                            ← Previous
                        </button>
                        
                        <span 
                            className="pagination-info-tenant-p"
                            title={`Current page ${currentPage} of ${totalPages}`}
                        >
                            Page {currentPage} of {totalPages}
                        </span>
                        
                        <button 
                            className="pagination-btn-tenant-p" 
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            title={currentPage === totalPages ? "You're on the last page" : "Go to next page"}
                        >
                            Next →
                        </button>
                    </div>
                </div>
            )}

            {/* Results Count */}
            <div className="results-count-tenant-p">
                <p 
                    className="results-text-tenant-p"
                    title={`Displaying ${currentItems.length} out of ${filteredPayments.length} total payments`}
                >
                    Showing {currentItems.length} of {filteredPayments.length} payments
                    {(searchTerm || timeFilter !== "all") && " (filtered)"}
                </p>
            </div>
        </div>
    );
};

export default Payment;