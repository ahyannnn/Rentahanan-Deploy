import React, { useState, useEffect } from "react";
import { CreditCard, DollarSign, Upload, CheckCircle, Clock, AlertCircle, ChevronLeft, Search, X, FileText, Receipt, Loader} from "lucide-react";
import "../../styles/tenant/MyBills.css";

const MyBills = () => {
  const [bills, setBills] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [gcashRef, setGcashRef] = useState("");
  const [gcashReceipt, setGcashReceipt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBills, setSelectedBills] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successModalData, setSuccessModalData] = useState({
    totalAmount: 0,
    billCount: 0,
    paymentMethod: "cash",
    gcashRef: ""
  });

  // ✅ ADD API BASE - same as other components
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://rentahanan.onrender.com";

  // ✅ ADD: Get image URL function (same as other components)
  const getImageUrl = (filename, folder = 'receipts') => {
    if (!filename) return null;
    
    // If it's already a full URL (Cloudinary), use it directly
    if (filename.startsWith('http')) {
      return filename;
    }
    
    // Otherwise, construct the local path
    return `${API_BASE}/uploads/${folder}/${filename}`;
  };

  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const tenantId = storedUser.tenantid || storedUser.userid || null;

  // ✅ UPDATED API ENDPOINT for fetching bills
  useEffect(() => {
    if (!tenantId) {
      console.warn("Tenant ID is missing!");
      setLoading(false);
      return;
    }

    const fetchBills = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/bills/${tenantId}`);
        const data = await res.json();
        setBills(data);
      } catch (error) {
        console.error("Error fetching bills:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="loading-container-Tenant-Bills">
        <div className="loading-spinner-Tenant-Bills">
          <Loader className="spinner-icon-Tenant-Bills" size={40} />
        </div>
        <p className="loading-text-Tenant-Bills">Loading your bills...</p>
      </div>
    );
  }

  const filteredBills = bills.filter(bill => {
    const matchesSearch =
      String(bill.billid).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bill.billtype && bill.billtype.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" || (bill.status && bill.status.toLowerCase() === statusFilter);
    return matchesSearch && matchesStatus;
  });

  const selectedTotalAmount = selectedBills.reduce((sum, billId) => {
    const bill = bills.find(b => b.billid === billId);
    return sum + (bill ? parseFloat(bill.amount) : 0);
  }, 0);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPaymentMethod("cash");
    setGcashRef("");
    setGcashReceipt(null);
  };

  // ✅ UPDATED API ENDPOINT for payment submission
  const handleSubmitPayment = async () => {
    if (selectedBills.length === 0) return;

    if (paymentMethod === "gcash") {
      const refPattern = /^\d{13}$/;
      if (!gcashRef || !refPattern.test(gcashRef)) {
        alert("Please enter a valid 13-digit GCash reference number.");
        return;
      }
      if (!gcashReceipt) {
        alert("Please upload your GCash receipt before submitting.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      for (const billId of selectedBills) {
        const formData = new FormData();
        formData.append("paymentType", paymentMethod === "cash" ? "Cash" : "GCash");
        if (paymentMethod === "gcash") {
          formData.append("gcashRef", gcashRef);
          formData.append("gcashReceipt", gcashReceipt);
        }

        const response = await fetch(
          `${API_BASE}/api/bills/pay/${billId}`,
          {
            method: "PUT",
            body: formData,
          }
        );

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Payment update failed");
      }

      // Set success modal data before showing the modal
      setSuccessModalData({
        totalAmount: selectedTotalAmount,
        billCount: selectedBills.length,
        paymentMethod: paymentMethod,
        gcashRef: gcashRef
      });

      setShowSuccessModal(true);
      handleCloseModal();

      // Refresh bills data - UPDATED API ENDPOINT
      const res = await fetch(`${API_BASE}/api/bills/${tenantId}`);
      const data = await res.json();
      setBills(data);
    } catch (error) {
      console.error("Error submitting payment:", error);
      alert(error.message || "Failed to submit payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    // Clear selected bills after success modal is closed
    setSelectedBills([]);
    setPaymentMethod("cash");
    setGcashRef("");
    setGcashReceipt(null);
  };

  // ✅ FIXED: UPDATED API ENDPOINT for receipt viewing with proper URL handling
  const handleViewReceipt = async (billId) => {
    try {
      const response = await fetch(`${API_BASE}/api/transactions/receipt/${billId}`);
      const receiptData = await response.json();

      if (response.ok && receiptData.receiptUrl) {
        // ✅ FIXED: Use the helper function to get correct receipt URL
        const receiptFullUrl = getImageUrl(receiptData.receiptUrl, 'receipts');
        window.open(receiptFullUrl, '_blank');
      } else {
        alert(receiptData.error || `No receipt available for bill ${billId}`);
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
      alert('Error loading receipt. Please try again.');
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return <CheckCircle size={16} />;
      case "for validation":
        return <Clock size={16} />;
      case "unpaid":
        return <AlertCircle size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const statsData = {
    unpaid: bills.filter(b => b.status?.toLowerCase() === "unpaid").length,
    pending: bills.filter(b => b.status?.toLowerCase() === "for validation").length,
    paid: bills.filter(b => b.status?.toLowerCase() === "paid").length
  };

  return (
    <div className="bills-invoice-container-Tenant-Bills">
      {/* Header Section */}
      <div className="bills-header-Tenant-Bills">
        <div className="header-content-Tenant-Bills">
          <h1 className="page-title-Tenant-Bills">My Bills & Invoices</h1>
          <p className="page-description-Tenant-Bills">View, manage, and pay your bills in one place</p>
        </div>
      </div>

      {/* Controls Section */}
      <div className="bills-controls-Tenant-Bills">
        <div className="search-container-Tenant-Bills">
          <Search size={20} className="search-icon-Tenant-Bills" />
          <input
            type="text"
            placeholder="Search by Bill ID or Type..."
            className="search-input-Tenant-Bills"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-controls-Tenant-Bills">
          <div className="filter-tabs-Tenant-Bills">
            <button
              className={`filter-btn-Tenant-Bills ${statusFilter === "all" ? "filter-btn-active-Tenant-Bills" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All Bills
              <span className="filter-count-Tenant-Bills">{bills.length}</span>
            </button>
            <button
              className={`filter-btn-Tenant-Bills ${statusFilter === "unpaid" ? "filter-btn-active-Tenant-Bills" : ""}`}
              onClick={() => setStatusFilter("unpaid")}
            >
              Unpaid
              <span className="filter-count-Tenant-Bills">{statsData.unpaid}</span>
            </button>
            <button
              className={`filter-btn-Tenant-Bills ${statusFilter === "for validation" ? "filter-btn-active-Tenant-Bills" : ""}`}
              onClick={() => setStatusFilter("for validation")}
            >
              For Validation
              <span className="filter-count-Tenant-Bills">{statsData.pending}</span>
            </button>
            <button
              className={`filter-btn-Tenant-Bills ${statusFilter === "paid" ? "filter-btn-active-Tenant-Bills" : ""}`}
              onClick={() => setStatusFilter("paid")}
            >
              Paid
              <span className="filter-count-Tenant-Bills">{statsData.paid}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="bills-table-wrapper-Tenant-Bills">
        <table className="bills-table-Tenant-Bills">
          <thead className="table-header-Tenant-Bills">
            <tr className="table-header-row-Tenant-Bills">
              <th className="table-heading-Tenant-Bills">Select</th>
              <th className="table-heading-Tenant-Bills">Bill ID</th>
              <th className="table-heading-Tenant-Bills">Type</th>
              <th className="table-heading-Tenant-Bills">Amount</th>
              <th className="table-heading-Tenant-Bills">Due Date</th>
              <th className="table-heading-Tenant-Bills">Status</th>
              <th className="table-heading-Tenant-Bills">Action</th>
            </tr>
          </thead>
          <tbody className="table-body-Tenant-Bills">
            {filteredBills.length > 0 ? (
              filteredBills.map((bill) => {
                const isUnpaid = bill.status?.toLowerCase() === "unpaid";
                const isForValidation = bill.status?.toLowerCase() === "for validation";
                const isPaid = bill.status?.toLowerCase() === "paid";
                const isSelectable = isUnpaid;

                return (
                  <tr key={bill.billid} className="table-row-Tenant-Bills">
                    <td className="table-data-Tenant-Bills">
                      <input
                        type="checkbox"
                        className="bill-checkbox-Tenant-Bills"
                        checked={selectedBills.includes(bill.billid)}
                        onChange={(e) => {
                          if (e.target.checked && isSelectable) {
                            setSelectedBills([...selectedBills, bill.billid]);
                          } else {
                            setSelectedBills(selectedBills.filter((id) => id !== bill.billid));
                          }
                        }}
                        disabled={!isSelectable}
                      />
                    </td>
                    <td className="table-data-Tenant-Bills bill-id-Tenant-Bills">
                      #{bill.billid}
                    </td>
                    <td className="table-data-Tenant-Bills bill-type-Tenant-Bills">
                      <div className="bill-type-content-Tenant-Bills">
                        <FileText size={16} />
                        {bill.billtype}
                      </div>
                    </td>
                    <td className="table-data-Tenant-Bills bill-amount-Tenant-Bills">
                      {formatCurrency(bill.amount)}
                    </td>
                    <td className="table-data-Tenant-Bills due-date-Tenant-Bills">
                      <div className="due-date-content-Tenant-Bills">
                        <Clock size={14} />
                        {bill.duedate}
                      </div>
                    </td>
                    <td className="table-data-Tenant-Bills">
                      <span className={`status-badge-Tenant-Bills status-${bill.status?.toLowerCase()}`}>
                        {getStatusIcon(bill.status)}
                        {bill.status}
                      </span>
                    </td>
                    <td className="table-data-Tenant-Bills action-cell-Tenant-Bills">
                      {isUnpaid ? (
                        <button className="action-btn-Tenant-Bills pay-now-btn-Tenant-Bills">
                          Pay Now
                        </button>
                      ) : isForValidation ? (
                        <button className="action-btn-Tenant-Bills pending-btn-Tenant-Bills" disabled>
                          <Clock size={14} />
                          For Validation
                        </button>
                      ) : (
                        <button
                          className="action-btn-Tenant-Bills receipt-btn-Tenant-Bills"
                          onClick={() => handleViewReceipt(bill.billid)}
                        >
                          <Receipt size={14} />
                          View Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="no-bills-row-Tenant-Bills">
                <td colSpan="7" className="no-bills-cell-Tenant-Bills">
                  <div className="no-bills-content-Tenant-Bills">
                    <FileText size={48} className="no-bills-icon-Tenant-Bills" />
                    <h3 className="no-bills-title-Tenant-Bills">No Bills Found</h3>
                    <p className="no-bills-description-Tenant-Bills">
                      {searchTerm || statusFilter !== "all"
                        ? "No bills match your current search criteria. Try adjusting your filters."
                        : "You don't have any bills at the moment."}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="mobile-bills-container-Tenant-Bills">
        {filteredBills.length > 0 ? (
          filteredBills.map((bill) => {
            const isUnpaid = bill.status?.toLowerCase() === "unpaid";
            const isForValidation = bill.status?.toLowerCase() === "for validation";
            const isPaid = bill.status?.toLowerCase() === "paid";
            const isSelectable = isUnpaid;

            return (
              <div key={bill.billid} className="mobile-bill-card-Tenant-Bills">
                <div className="mobile-bill-header-Tenant-Bills">
                  <div className="mobile-bill-info-Tenant-Bills">
                    <span className="mobile-bill-id-Tenant-Bills">#{bill.billid}</span>
                    <div className="mobile-bill-type-Tenant-Bills">
                      <FileText size={14} />
                      {bill.billtype}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="mobile-bill-checkbox-Tenant-Bills"
                    checked={selectedBills.includes(bill.billid)}
                    onChange={(e) => {
                      if (e.target.checked && isSelectable) {
                        setSelectedBills([...selectedBills, bill.billid]);
                      } else {
                        setSelectedBills(selectedBills.filter((id) => id !== bill.billid));
                      }
                    }}
                    disabled={!isSelectable}
                  />
                </div>
                <div className="mobile-bill-content-Tenant-Bills">
                  <div className="mobile-bill-main-Tenant-Bills">
                    <div className="mobile-amount-section-Tenant-Bills">
                      <span className="mobile-bill-amount-Tenant-Bills">{formatCurrency(bill.amount)}</span>
                      <span className="mobile-due-date-Tenant-Bills">
                        <Clock size={12} />
                        Due {bill.duedate}
                      </span>
                    </div>
                    <span className={`mobile-status-badge-Tenant-Bills status-${bill.status?.toLowerCase()}`}>
                      {getStatusIcon(bill.status)}
                      {bill.status}
                    </span>
                  </div>
                </div>
                <div className="mobile-bill-footer-Tenant-Bills">
                  {isUnpaid ? (
                    <button className="mobile-action-btn-Tenant-Bills pay-now-btn-Tenant-Bills">
                      <CreditCard size={16} />
                      Pay Now
                    </button>
                  ) : isForValidation ? (
                    <button className="mobile-action-btn-Tenant-Bills mobile-pending-btn-Tenant-Bills" disabled>
                      <Clock size={16} />
                      For Validation
                    </button>
                  ) : (
                    <button
                      className="mobile-action-btn-Tenant-Bills mobile-receipt-btn-Tenant-Bills"
                      onClick={() => handleViewReceipt(bill.billid)}
                    >
                      <Receipt size={16} />
                      View Receipt
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-bills-mobile-Tenant-Bills">
            <FileText size={48} className="no-bills-mobile-icon-Tenant-Bills" />
            <h3 className="no-bills-mobile-title-Tenant-Bills">No Bills Found</h3>
            <p className="no-bills-mobile-description-Tenant-Bills">
              {searchTerm || statusFilter !== "all"
                ? "No bills match your current search criteria."
                : "You don't have any bills at the moment."}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      {selectedBills.length > 0 && (
        <div className="bottom-actions-Tenant-Bills">
          <div className="payment-summary-Tenant-Bills">
            <div className="selected-bills-info-Tenant-Bills">
              <span className="selected-count-Tenant-Bills">
                {selectedBills.length} bill{selectedBills.length > 1 ? 's' : ''} selected
              </span>
              <span className="total-amount-Tenant-Bills">{formatCurrency(selectedTotalAmount)}</span>
            </div>
            <button
              className="proceed-btn-Tenant-Bills"
              onClick={handleOpenModal}
            >
              <CreditCard size={20} />
              Proceed to Payment
            </button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isModalOpen && (
        <div className="modal-overlay-Tenant-Bills" onClick={handleCloseModal}>
          <div className="payments-modal-Tenant-Bills" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-Tenant-Bills">
              <button className="back-btn-Tenant-Bills" onClick={handleCloseModal}>
                <ChevronLeft size={24} />
              </button>
              <h3 className="modal-title-Tenant-Bills">Payment Method</h3>
              <div className="modal-header-spacer-Tenant-Bills"></div>
            </div>

            <div className="modal-content-Tenant-Bills">
              {/* Bill Summary */}
              <div className="bill-summary-Tenant-Bills">
                <h4 className="summary-title-Tenant-Bills">Selected Bills</h4>
                <div className="bill-list-Tenant-Bills">
                  {bills
                    .filter((bill) => selectedBills.includes(bill.billid))
                    .map((bill) => (
                      <div key={bill.billid} className="bill-item-Tenant-Bills">
                        <div className="bill-info-Tenant-Bills">
                          <span className="bill-id-Tenant-Bills">#{bill.billid}</span>
                          <span className="bill-type-Tenant-Bills">{bill.billtype}</span>
                        </div>
                        <span className="bill-amount-Tenant-Bills">{formatCurrency(bill.amount)}</span>
                      </div>
                    ))}
                </div>
                <div className="total-amount-section-Tenant-Bills">
                  <span className="total-label-Tenant-Bills">Total Amount Due</span>
                  <span className="total-amount-value-Tenant-Bills">{formatCurrency(selectedTotalAmount)}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="payment-methods-Tenant-Bills">
                <h4 className="methods-title-Tenant-Bills">Choose Payment Method</h4>

                {/* Cash Option */}
                <div
                  className={`payment-method-card-Tenant-Bills ${paymentMethod === "cash" ? "method-selected-Tenant-Bills" : ""}`}
                  onClick={() => setPaymentMethod("cash")}
                >
                  <div className="method-header-Tenant-Bills">
                    <div className="method-icon-Tenant-Bills cash">
                      <DollarSign size={24} />
                    </div>
                    <div className="method-info-Tenant-Bills">
                      <h5 className="method-title-Tenant-Bills">Cash Payment</h5>
                      <p className="method-description-Tenant-Bills">Pay with cash directly to the owner</p>
                    </div>
                    <div className={`method-radio-Tenant-Bills ${paymentMethod === "cash" ? "radio-selected-Tenant-Bills" : ""}`}></div>
                  </div>
                </div>

                {/* GCash Option */}
                <div
                  className={`payment-method-card-Tenant-Bills ${paymentMethod === "gcash" ? "method-selected-Tenant-Bills" : ""}`}
                  onClick={() => setPaymentMethod("gcash")}
                >
                  <div className="method-header-Tenant-Bills">
                    <div className="method-icon-Tenant-Bills gcash">
                      <CreditCard size={24} />
                    </div>
                    <div className="method-info-Tenant-Bills">
                      <h5 className="method-title-Tenant-Bills">GCash</h5>
                      <p className="method-description-Tenant-Bills">Pay via GCash mobile wallet</p>
                    </div>
                    <div className={`method-radio-Tenant-Bills ${paymentMethod === "gcash" ? "radio-selected-Tenant-Bills" : ""}`}></div>
                  </div>

                  {paymentMethod === "gcash" && (
                    <div className="gcash-details-Tenant-Bills">
                      <div className="gcash-instructions-Tenant-Bills">
                        <p>Send the payment to the following account:</p>
                        <div className="account-details-Tenant-Bills">
                          <div className="account-detail-Tenant-Bills">
                            <span className="detail-label-Tenant-Bills">Account Name:</span>
                            <span className="detail-value-Tenant-Bills">Maria Dela Cruz</span>
                          </div>
                          <div className="account-detail-Tenant-Bills">
                            <span className="detail-label-Tenant-Bills">Mobile Number:</span>
                            <span className="detail-value-Tenant-Bills">0917-213-5123</span>
                          </div>
                          <div className="account-detail-Tenant-Bills">
                            <span className="detail-label-Tenant-Bills">Amount to Send:</span>
                            <span className="detail-value-Tenant-Bills amount-highlight-Tenant-Bills">
                              {formatCurrency(selectedTotalAmount)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="gcash-form-Tenant-Bills">
                        <div className="form-group-Tenant-Bills">
                          <label className="form-label-Tenant-Bills">GCash Reference Number *</label>
                          <input
                            type="text"
                            placeholder="Enter 13-digit reference number"
                            className="form-input-Tenant-Bills"
                            value={gcashRef}
                            onChange={(e) => setGcashRef(e.target.value)}
                            maxLength={13}
                          />
                        </div>

                        <div className="form-group-Tenant-Bills">
                          <label className="form-label-Tenant-Bills">Upload Receipt *</label>
                          <div className="file-upload-area-Tenant-Bills">
                            <Upload size={20} className="upload-icon-Tenant-Bills" />
                            <div className="upload-text-Tenant-Bills">
                              <p>Click to upload receipt screenshot</p>
                              <span>PNG, JPG up to 5MB</span>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="file-input-Tenant-Bills"
                              onChange={(e) => setGcashReceipt(e.target.files[0])}
                            />
                            {gcashReceipt && (
                              <div className="file-preview-Tenant-Bills">
                                <span className="file-name-Tenant-Bills">{gcashReceipt.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer-Tenant-Bills">
              <button
                className="submit-payment-btn-Tenant-Bills"
                onClick={handleSubmitPayment}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="loading-spinner-Tenant-Bills"></div>
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <CreditCard size={18} />
                    Submit Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay-Tenant-Bills success-modal-overlay">
          <div className="success-modal-Tenant-Bills">
            <div className="success-modal-content-Tenant-Bills">
              <div className="success-animation-container-Tenant-Bills">
                <div className="success-checkmark-Tenant-Bills">
                  <CheckCircle size={80} className="check-icon-Tenant-Bills" />
                </div>
                <div className="success-confetti-Tenant-Bills">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="confetti-piece-Tenant-Bills"></div>
                  ))}
                </div>
              </div>

              <h2 className="success-title-Tenant-Bills">Payment Submitted Successfully!</h2>

              <p className="success-message-Tenant-Bills">
                Your payment of <strong>{formatCurrency(successModalData.totalAmount)}</strong> has been submitted for validation.
                {successModalData.paymentMethod === "gcash"
                  ? " Your GCash payment is being processed and will be verified shortly."
                  : " Please prepare the cash amount for your next meeting with the owner."
                }
              </p>

              <div className="success-details-Tenant-Bills">
                <div className="success-detail-item-Tenant-Bills">
                  <span className="detail-label-Tenant-Bills">Payment Method:</span>
                  <span className="detail-value-Tenant-Bills">
                    {successModalData.paymentMethod === "cash" ? "Cash" : "GCash"}
                  </span>
                </div>
                {successModalData.paymentMethod === "gcash" && successModalData.gcashRef && (
                  <div className="success-detail-item-Tenant-Bills">
                    <span className="detail-label-Tenant-Bills">Reference Number:</span>
                    <span className="detail-value-Tenant-Bills">{successModalData.gcashRef}</span>
                  </div>
                )}
                <div className="success-detail-item-Tenant-Bills">
                  <span className="detail-label-Tenant-Bills">Bills Paid:</span>
                  <span className="detail-value-Tenant-Bills">
                    {successModalData.billCount} bill{successModalData.billCount > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="success-detail-item-Tenant-Bills">
                  <span className="detail-label-Tenant-Bills">Total Amount:</span>
                  <span className="detail-value-Tenant-Bills amount-highlight-Tenant-Bills">
                    {formatCurrency(successModalData.totalAmount)}
                  </span>
                </div>
              </div>

              <button
                className="success-close-btn-Tenant-Bills"
                onClick={handleCloseSuccessModal}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBills;