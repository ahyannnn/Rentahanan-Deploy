import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, FileText, Search, Download, Eye, X } from "lucide-react";
import "../../styles/owners/Transactions.css";

function Transactions() {
  const [activeTab, setActiveTab] = useState("all");
  const [bills, setBills] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showRejectSuccessModal, setShowRejectSuccessModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

  // ✅ ADD API BASE
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://rentahanan.onrender.com";

  useEffect(() => {
    const fetchBills = async () => {
      try {
        setIsLoading(true);
        // ✅ UPDATED API ENDPOINT
        const res = await fetch(`${API_BASE}/api/billing/bills`);
        const data = await res.json();
        setBills(data);
      } catch (err) {
        console.error("Error fetching bills:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBills();
  }, []);

  // Filter bills by tab and search term
  const filteredBills = bills
    .filter((b) => {
      if (activeTab === "unpaid") return b.status === "Unpaid";
      if (activeTab === "for_validation") return b.status === "For Validation";
      if (activeTab === "paid") return b.status === "Paid";
      return true; // all
    })
    .filter((b) =>
      b.tenant_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Approve functions
  const handleOpenApproveModal = (bill) => {
    setSelectedBill(bill);
    setShowApproveModal(true);
  };

  const handleApproveConfirm = async () => {
    if (!selectedBill) return;

    const prevBills = [...bills];
    setBills((prev) =>
      prev.map((b) =>
        b.billid === selectedBill.billid ? { ...b, status: "Paid" } : b
      )
    );

    try {
      // ✅ UPDATED API ENDPOINT
      const res = await fetch(
        `${API_BASE}/api/transactions/issue-receipt/${selectedBill.billid}`,
        { method: "POST" }
      );

      if (res.ok) {
        const data = await res.json();
        
        setBills((prev) =>
          prev.map((b) =>
            b.billid === selectedBill.billid ? { ...b, GCash_receipt: data.receipt_url } : b // ✅ FIXED: Use receipt_url from response
          )
        );

        setShowApproveModal(false);
        setShowSuccessModal(true);
        setActiveTab("paid");
      } else {
        throw new Error("Failed to issue receipt");
      }
    } catch (err) {
      console.error(err);
      // Rollback on error
      setBills(prevBills);
      setShowApproveModal(false);
    }
  };

  // Reject functions - SIMPLE VERSION LIKE YOUR ORIGINAL CODE
  const handleOpenRejectModal = (bill) => {
    setSelectedBill(bill);
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedBill) return;
    
    try {
      // ✅ UPDATED API ENDPOINT
      const res = await fetch(
        `${API_BASE}/api/transactions/reject/${selectedBill.billid}`,
        { method: "PUT" }
      );
      
      if (res.ok) {
        setBills((prev) =>
          prev.map((b) =>
            b.billid === selectedBill.billid ? { 
              ...b, 
              status: "Unpaid",
              GCash_receipt: null,
              GCash_Ref: null,
              paymenttype: null
            } : b
          )
        );
        
        setShowRejectModal(false);
        setShowRejectSuccessModal(true);
      } else {
        throw new Error("Failed to reject payment");
      }
    } catch (err) {
      console.error("Reject error:", err);
      setShowRejectModal(false);
    }
  };

  // ✅ FIXED: Use Cloudinary URL directly for receipts
  const handleViewReceipt = async (billId) => {
    try {
      // ✅ UPDATED API ENDPOINT
      const response = await fetch(`${API_BASE}/api/transactions/receipt/${billId}`);
      const receiptData = await response.json();

      if (response.ok && receiptData.receipt_url) { // ✅ FIXED: Use receipt_url directly
        window.open(receiptData.receipt_url, '_blank'); // ✅ No need to construct URL
      } else {
        console.log(receiptData.error || `No receipt available for bill ${billId}`);
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
    }
  };

  // ✅ FIXED: Helper function to get document URLs
  const getDocumentUrl = (documentPath) => {
    if (documentPath) {
      return documentPath; // ✅ documentPath already contains the full Cloudinary URL
    }
    return null;
  };

  const getStatusVariant = (status) => {
    switch (status.toLowerCase()) {
      case "paid":
        return { class: "status-approved", label: "Paid" };
      case "for validation":
        return { class: "status-pending", label: "For Validation" };
      case "unpaid":
        return { class: "status-unpaid", label: "Unpaid" };
      default:
        return { class: "status-default", label: status };
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Function to determine which actions to show based on bill status
  const getActionsForBill = (bill) => {
    const actions = [];
    
    if (bill.status === "For Validation") {
      actions.push(
        <button
          key="approve"
          className="action-button action-button-primary"
          onClick={() => handleOpenApproveModal(bill)}
        >
          <CheckCircle size={16} />
          Approve
        </button>
      );
      actions.push(
        <button
          key="reject"
          className="action-button action-button-reject"
          onClick={() => handleOpenRejectModal(bill)}
        >
          <XCircle size={16} />
          Reject
        </button>
      );
    }
    
    if (bill.status === "Paid") {
      actions.push(
        <button
          key="view-receipt"
          className="action-button action-button-download"
          onClick={() => handleViewReceipt(bill.billid)}
        >
          <Eye size={16} />
          View Receipt
        </button>
      );
    }
    
    return actions;
  };

  return (
    <div className="owner-transactions-page-container">
      <div className="owner-transactions-header">
        <div className="owner-transactions-title-section">
          <h1>Transaction History</h1>
          <p>Track and manage all tenant bills and payments</p>
        </div>
        <div className="owner-transactions-stats">
          <div className="stat-card">
            <span className="stat-number">{bills.length}</span>
            <span className="stat-label">Total Bills</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {bills.filter(b => b.status === "Paid").length}
            </span>
            <span className="stat-label">Paid</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {bills.filter(b => b.status === "For Validation").length}
            </span>
            <span className="stat-label">For Validation</span>
          </div>
        </div>
      </div>

      <div className="owner-transactions-content-card">
        {/* Tabs and Search */}
        <div className="owner-transactions-controls">
          <div className="owner-transactions-tabs">
            {[
              { key: "all", label: "All Transactions" },
              { key: "unpaid", label: "Unpaid" },
              { key: "for_validation", label: "For Validation" },
              { key: "paid", label: "Paid" }
            ].map((tab) => (
              <button
                key={tab.key}
                className={`owner-transactions-tab ${activeTab === tab.key ? "owner-transactions-tab-active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="owner-transactions-search">
            <Search size={18} className="owner-transactions-search-icon" />
            <input
              type="text"
              placeholder="Search by tenant name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="owner-transactions-search-input"
            />
          </div>
        </div>

        {/* Table */}
        <div className="owner-transactions-table-container">
          {isLoading ? (
            <div className="owner-transactions-loading">
              <div className="loading-spinner"></div>
              <p>Loading transactions...</p>
            </div>
          ) : (
            <table className="owner-transactions-table">
              <thead>
                <tr>
                  <th>Bill ID</th>
                  <th>Tenant</th>
                  <th>Unit</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Reference</th>
                  <th>Proof</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="owner-transactions-empty">
                      <div className="empty-state">
                        <FileText size={48} className="empty-icon" />
                        <p>No transactions found</p>
                        <small>Try changing your filters or search term</small>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((b) => {
                    const status = getStatusVariant(b.status);
                    return (
                      <tr key={b.billid} className="owner-transactions-row">
                        <td className="owner-transactions-bill-id">#{b.billid}</td>
                        <td className="owner-transactions-tenant">{b.tenant_name}</td>
                        <td className="owner-transactions-unit">{b.unit_name}</td>
                        <td className="owner-transactions-type">{b.billtype}</td>
                        <td className="owner-transactions-amount">
                          {formatCurrency(parseFloat(b.amount))}
                        </td>
                        <td className="owner-transactions-method">
                          {b.paymenttype || "N/A"}
                        </td>
                        <td className="owner-transactions-reference">
                          {b.GCash_Ref || "N/A"}
                        </td>
                        <td className="owner-transactions-proof">
                          {b.GCash_receipt ? (
                            <a
                              // ✅ FIXED: Use Cloudinary URL directly
                              href={getDocumentUrl(b.GCash_receipt)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="proof-link"
                            >
                              <Eye size={16} />
                              View
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td className="owner-transactions-date">
                          {formatDate(b.issuedate)}
                        </td>
                        <td className="owner-transactions-status">
                          <span className={`status-badge ${status.class}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="owner-transactions-actions">
                          {getActionsForBill(b)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="modal-overlay-transactions" onClick={() => setShowApproveModal(false)}>
          <div className="modal-content-transactions" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn-transactions" onClick={() => setShowApproveModal(false)}>
              <X size={24} />
            </button>
            
            <div className="modal-icon-transactions modal-icon-warning">
              <CheckCircle size={48} />
            </div>
            
            <h2 className="modal-title-transactions">Approve Payment</h2>
            
            <p className="modal-message-transactions">
              Are you sure you want to approve this payment and issue receipt for 
              <strong> {selectedBill?.tenant_name}</strong> - Bill #{selectedBill?.billid}?
            </p>
            
            <div className="modal-bill-details-transactions">
              <div className="bill-detail-item">
                <span>Amount:</span>
                <strong>{selectedBill && formatCurrency(parseFloat(selectedBill.amount))}</strong>
              </div>
              <div className="bill-detail-item">
                <span>Payment Method:</span>
                <span>{selectedBill?.paymenttype || "N/A"}</span>
              </div>
            </div>
            
            <div className="modal-actions-transactions">
              <button 
                className="modal-btn-transactions modal-btn-cancel"
                onClick={() => setShowApproveModal(false)}
              >
                Cancel
              </button>
              <button 
                className="modal-btn-transactions modal-btn-confirm"
                onClick={handleApproveConfirm}
              >
                Yes, Approve Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && (
        <div className="modal-overlay-transactions" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content-transactions" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn-transactions" onClick={() => setShowRejectModal(false)}>
              <X size={24} />
            </button>
            
            <div className="modal-icon-transactions modal-icon-danger">
              <XCircle size={48} />
            </div>
            
            <h2 className="modal-title-transactions">Reject Payment</h2>
            
            <p className="modal-message-transactions">
              Are you sure you want to reject this payment from 
              <strong> {selectedBill?.tenant_name}</strong> - Bill #{selectedBill?.billid}?
            </p>
            
            <div className="modal-bill-details-transactions">
              <div className="bill-detail-item">
                <span>Amount:</span>
                <strong>{selectedBill && formatCurrency(parseFloat(selectedBill.amount))}</strong>
              </div>
              <div className="bill-detail-item">
                <span>Payment Method:</span>
                <span>{selectedBill?.paymenttype || "N/A"}</span>
              </div>
            </div>
            
            <div className="modal-actions-transactions">
              <button 
                className="modal-btn-transactions modal-btn-cancel"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </button>
              <button 
                className="modal-btn-transactions modal-btn-reject"
                onClick={handleRejectConfirm}
              >
                Yes, Reject Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay-transactions success-modal-overlay-transactions">
          <div className="modal-content-transactions success-modal-transactions">
            <div className="modal-icon-transactions modal-icon-success">
              <CheckCircle size={64} />
            </div>
            
            <h2 className="modal-title-transactions">Payment Approved!</h2>
            
            <p className="modal-message-transactions">
              Receipt has been successfully issued for 
              <strong> {selectedBill?.tenant_name}</strong> - Bill #{selectedBill?.billid}.
            </p>
            
            <div className="modal-bill-details-transactions">
              <div className="bill-detail-item">
                <span>Amount:</span>
                <strong>{selectedBill && formatCurrency(parseFloat(selectedBill.amount))}</strong>
              </div>
              <div className="bill-detail-item">
                <span>Status:</span>
                <span className="status-approved">Paid</span>
              </div>
            </div>
            
            <button 
              className="modal-btn-transactions modal-btn-success"
              onClick={() => setShowSuccessModal(false)}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Reject Success Modal */}
      {showRejectSuccessModal && (
        <div className="modal-overlay-transactions success-modal-overlay-transactions">
          <div className="modal-content-transactions success-modal-transactions">
            <div className="modal-icon-transactions modal-icon-danger">
              <XCircle size={64} />
            </div>
            
            <h2 className="modal-title-transactions">Payment Rejected!</h2>
            
            <p className="modal-message-transactions">
              Payment from <strong> {selectedBill?.tenant_name}</strong> has been rejected.
              The bill status has been reset to Unpaid.
            </p>
            
            <div className="modal-bill-details-transactions">
              <div className="bill-detail-item">
                <span>Bill ID:</span>
                <strong>#{selectedBill?.billid}</strong>
              </div>
              <div className="bill-detail-item">
                <span>Status:</span>
                <span className="status-unpaid">Unpaid</span>
              </div>
            </div>
            
            <button 
              className="modal-btn-transactions modal-btn-success"
              onClick={() => setShowRejectSuccessModal(false)}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transactions;