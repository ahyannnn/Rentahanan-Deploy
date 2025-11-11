import React, { useState, useEffect } from "react";
import "../../styles/owners/Tenants.css";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  FileText,
  CheckCircle,
  Clock,
  X,
  FileCheck,
  CreditCard,
  User,
  Mail,
  Phone,
  Home,
  Calendar,
  MapPin,
  Download,
  Send,
  Ban,
  Check
} from "lucide-react";

const Tenants = () => {
  const [activeTab, setActiveTab] = useState("active");
  const [applicantFilter, setApplicantFilter] = useState("all");
  const [tenants, setTenants] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  
  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showRejectSuccessModal, setShowRejectSuccessModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  
  // NEW: Store user info for success modals
  const [successModalUser, setSuccessModalUser] = useState(null);
  
  const navigate = useNavigate();

  // ✅ ADD API BASE
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://rentahanan.onrender.com";

  // Fetch active tenants
  useEffect(() => {
    if (activeTab === "active") {
      // ✅ UPDATED API ENDPOINT
      fetch(`${API_BASE}/api/tenants/active`)
        .then((res) => res.json())
        .then((data) => setTenants(data))
        .catch((err) => console.error("Error fetching active tenants:", err));
    }
  }, [activeTab]);

  // Fetch pending applicants
  useEffect(() => {
    if (activeTab === "applications") {
      // ✅ UPDATED API ENDPOINT
      fetch(`${API_BASE}/api/tenants/applicants`)
        .then((res) => res.json())
        .then((data) => setApplicants(data))
        .catch((err) => console.error("Error fetching applicants:", err));
    }
  }, [activeTab]);

  // Filter applicants based on selected filter
  const getFilteredApplicants = () => {
    if (applicantFilter === "all") return applicants;
    if (applicantFilter === "contract-signed") {
      return applicants.filter(app => app.contract_signed);
    }
    if (applicantFilter === "payment-pending") {
      return applicants.filter(app => app.bill_status !== "Paid");
    }
    if (applicantFilter === "ready-to-approve") {
      return applicants.filter(app => app.contract_signed && app.bill_status === "Paid");
    }
    return applicants;
  };

  const filterData = (data) =>
    data.filter((item) =>
      item.fullname.toLowerCase().includes(search.toLowerCase())
    );

  const openModal = (user) => {
    setSelectedUser(user);
    setSelectedDocument(null);
  };

  const closeModal = () => {
    setSelectedUser(null);
    setSelectedDocument(null);
  };

  // ✅ FIXED: Use the full Cloudinary URL directly
  const getProfileImage = (user) => {
    if (user.image) {
      return user.image; // ✅ user.image already contains the full Cloudinary URL
    }
    return null;
  };

  // Function to handle image error and fallback to initials
  const handleImageError = (e, user) => {
    e.target.style.display = 'none';
    const fallbackElement = e.target.nextSibling;
    if (fallbackElement) {
      fallbackElement.style.display = 'flex';
    }
  };

  // ✅ FIXED: Document URLs - use Cloudinary URLs directly
  const getDocumentUrl = (documentPath) => {
    if (documentPath) {
      return documentPath; // ✅ documentPath already contains the full Cloudinary URL
    }
    return null;
  };

  // Approve functions
  const handleOpenApproveModal = () => {
    setShowApproveModal(true);
  };

  const handleApproveConfirm = async () => {
    if (!selectedUser) return;

    try {
      // ✅ UPDATED API ENDPOINT
      const response = await fetch(
        `${API_BASE}/api/tenants/approve/${selectedUser.applicationid}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.ok) {
        // Store user info before clearing
        setSuccessModalUser({
          fullname: selectedUser.fullname,
          unit_name: selectedUser.unit_name
        });
        
        setShowApproveModal(false);
        setShowSuccessModal(true);
        setApplicants((prev) =>
          prev.filter((a) => a.applicationid !== selectedUser.applicationid)
        );
        closeModal();
      } else {
        console.error("Failed to approve application");
      }
    } catch (error) {
      console.error("Error approving application:", error);
    }
  };

  // Reject functions
  const handleOpenRejectModal = () => {
    setRejectReason("Incomplete requirements");
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedUser) return;

    try {
      // ✅ UPDATED API ENDPOINT
      const response = await fetch(
        `${API_BASE}/api/tenants/reject/${selectedUser.applicationid}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: rejectReason }),
        }
      );

      if (response.ok) {
        // Store user info before clearing
        setSuccessModalUser({
          fullname: selectedUser.fullname,
          unit_name: selectedUser.unit_name
        });
        
        setShowRejectModal(false);
        setShowRejectSuccessModal(true);
        setApplicants((prev) =>
          prev.filter((a) => a.applicationid !== selectedUser.applicationid)
        );
        closeModal();
      } else {
        console.error("Failed to reject application");
      }
    } catch (error) {
      console.error("Error rejecting application:", error);
    }
  };

  // NEW: Function to close success modals and clear stored user data
  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessModalUser(null);
  };

  const handleCloseRejectSuccessModal = () => {
    setShowRejectSuccessModal(false);
    setSuccessModalUser(null);
    setRejectReason(""); // Also clear reject reason
  };

  const handleIssueContract = (applicationId) => {
    navigate("/owner/contract", {
      state: { openTab: "issue", selectedApplicantId: applicationId },
    });
  };

  const handleAdvancePayment = (applicationId) => {
    navigate("/owner/billing", {
      state: { openApplicants: true, applicationId },
    });
  };

  const renderCards = (data, type) =>
    data.map((item, index) => (
      <div className="Owner-Tenant-card" key={index} title={`Click to view ${type === "active" ? "profile" : "application"} details`}>
        <div className="Owner-Tenant-avatar">
          {getProfileImage(item) ? (
            <>
              <img 
                src={getProfileImage(item)} 
                alt={item.fullname}
                className="Owner-Tenant-avatar-image"
                onError={(e) => handleImageError(e, item)}
              />
              <div className="Owner-Tenant-avatar-fallback" style={{display: 'none'}}>
                {item.fullname.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
            </>
          ) : (
            <div className="Owner-Tenant-avatar-fallback">
              {item.fullname.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
          )}
        </div>
        <div className="Owner-Tenant-info">
          <h4 title={`Name: ${item.fullname}`}>{item.fullname}</h4>
          <p title={`Email: ${item.email}`}><Mail size={14} /> Email: {item.email}</p>
          <p title={`Phone: ${item.phone}`}><Phone size={14} /> Phone: {item.phone}</p>
          <p title={`Unit: ${item.unit_name || "N/A"}`}><Home size={14} /> Unit: {item.unit_name || "N/A"}</p>
          {type === "applicant" && (
            <div className={`Owner-Tenant-status-badge ${item.contract_signed ? 'Owner-Tenant-status-complete' : 'Owner-Tenant-status-pending'}`} title={`Contract status: ${item.contract_signed ? "Signed" : "Pending"}`}>
              {item.contract_signed ? (
                <><CheckCircle size={14} /> Contract Signed</>
              ) : (
                <><Clock size={14} /> Pending Contract</>
              )}
            </div>
          )}
        </div>
        <button className="Owner-Tenant-view-profile-btn" onClick={() => openModal(item)} title={`View ${type === "active" ? "tenant profile" : "application details"}`}>
          {type === "active" ? (
            <><User size={16} /> View Profile</>
          ) : (
            <><FileText size={16} /> Review Application</>
          )}
        </button>
      </div>
    ));

  // Count applicants by status for badges
  const applicantCounts = {
    all: applicants.length,
    'contract-signed': applicants.filter(app => app.contract_signed).length,
    'payment-pending': applicants.filter(app => app.bill_status !== "Paid").length,
    'ready-to-approve': applicants.filter(app => app.contract_signed && app.bill_status === "Paid").length
  };

  return (
    <div className="Owner-Tenant-container">
      <div className="Owner-Tenant-header-section">
        <h2 className="Owner-Tenant-title">Tenant Management</h2>
        <p className="Owner-Tenant-subtitle">Manage active tenants and review applications</p>
      </div>

      {/* Tabs + Search */}
      <div className="Owner-Tenant-header">
        <div className="Owner-Tenant-tabs">
          <button
            className={`Owner-Tenant-tab ${activeTab === "active" ? "Owner-Tenant-tab-active" : ""}`}
            onClick={() => setActiveTab("active")}
            title={`View active tenants (${tenants.length} active)`}
          >
            <span className="Owner-Tenant-tab-icon"><Users size={18} /></span>
            Active Tenants
            <span className="Owner-Tenant-tab-badge" title={`${tenants.length} active tenants`}>{tenants.length}</span>
          </button>
          <button
            className={`Owner-Tenant-tab ${activeTab === "applications" ? "Owner-Tenant-tab-active" : ""}`}
            onClick={() => setActiveTab("applications")}
            title={`View pending applications (${applicants.length} applications)`}
          >
            <span className="Owner-Tenant-tab-icon"><FileText size={18} /></span>
            Applications
            <span className="Owner-Tenant-tab-badge" title={`${applicants.length} pending applications`}>{applicants.length}</span>
          </button>
        </div>
        <div className="Owner-Tenant-search-container">
          <input
            type="text"
            placeholder="Search by name..."
            className="Owner-Tenant-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            title="Search tenants or applicants by name"
          />
          <span className="Owner-Tenant-search-icon" title="Search"><Search size={18} /></span>
        </div>
      </div>

      {/* Applicant Filter Tabs */}
      {activeTab === "applications" && (
        <div className="Owner-Tenant-filter-tabs">
          <button
            className={`Owner-Tenant-filter-tab ${applicantFilter === "all" ? "Owner-Tenant-filter-tab-active" : ""}`}
            onClick={() => setApplicantFilter("all")}
            title={`View all applications (${applicantCounts.all} total)`}
          >
            <FileText size={16} />
            All Applications
            <span className="Owner-Tenant-filter-badge" title={`${applicantCounts.all} total applications`}>{applicantCounts.all}</span>
          </button>
          <button
            className={`Owner-Tenant-filter-tab ${applicantFilter === "contract-signed" ? "Owner-Tenant-filter-tab-active" : ""}`}
            onClick={() => setApplicantFilter("contract-signed")}
            title={`View applications with signed contracts (${applicantCounts['contract-signed']} signed)`}
          >
            <FileCheck size={16} />
            Contract Signed
            <span className="Owner-Tenant-filter-badge" title={`${applicantCounts['contract-signed']} applications with signed contracts`}>{applicantCounts['contract-signed']}</span>
          </button>
          <button
            className={`Owner-Tenant-filter-tab ${applicantFilter === "payment-pending" ? "Owner-Tenant-filter-tab-active" : ""}`}
            onClick={() => setApplicantFilter("payment-pending")}
            title={`View applications pending payment (${applicantCounts['payment-pending']} pending)`}
          >
            <CreditCard size={16} />
            Payment Pending
            <span className="Owner-Tenant-filter-badge" title={`${applicantCounts['payment-pending']} applications pending payment`}>{applicantCounts['payment-pending']}</span>
          </button>
          <button
            className={`Owner-Tenant-filter-tab ${applicantFilter === "ready-to-approve" ? "Owner-Tenant-filter-tab-active" : ""}`}
            onClick={() => setApplicantFilter("ready-to-approve")}
            title={`View applications ready for approval (${applicantCounts['ready-to-approve']} ready)`}
          >
            <CheckCircle size={16} />
            Ready to Approve
            <span className="Owner-Tenant-filter-badge" title={`${applicantCounts['ready-to-approve']} applications ready for approval`}>{applicantCounts['ready-to-approve']}</span>
          </button>
        </div>
      )}

      {/* Cards Grid */}
      <div className="Owner-Tenant-grid">
        {activeTab === "active"
          ? renderCards(filterData(tenants), "active")
          : renderCards(filterData(getFilteredApplicants()), "applicant")}
        
        {filterData(activeTab === "active" ? tenants : getFilteredApplicants()).length === 0 && (
          <div className="Owner-Tenant-empty-state">
            <div className="Owner-Tenant-empty-icon"><Users size={64} /></div>
            <h3>No {activeTab === "active" ? "active tenants" : "applications"} found</h3>
            <p>
              {search ? "Try adjusting your search terms" : 
               activeTab === "active" ? "No tenants are currently active" : "No pending applications"}
            </p>
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      {selectedUser && (
        <div className="Owner-Tenant-modal-overlay" onClick={closeModal}>
          <div className="Owner-Tenant-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="Owner-Tenant-modal-header">
              <div className="Owner-Tenant-modal-user-info">
                <div className="Owner-Tenant-modal-avatar">
                  {getProfileImage(selectedUser) ? (
                    <>
                      <img 
                        src={getProfileImage(selectedUser)} 
                        alt={selectedUser.fullname}
                        className="Owner-Tenant-modal-avatar-image"
                        onError={(e) => handleImageError(e, selectedUser)}
                      />
                      <div className="Owner-Tenant-modal-avatar-fallback" style={{display: 'none'}}>
                        {selectedUser.fullname.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                    </>
                  ) : (
                    <div className="Owner-Tenant-modal-avatar-fallback">
                      {selectedUser.fullname.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h2 title={`Applicant: ${selectedUser.fullname}`}>{selectedUser.fullname}</h2>
                  <p className="Owner-Tenant-modal-email" title={`Email: ${selectedUser.email}`}><Mail size={14} /> {selectedUser.email}</p>
                </div>
              </div>
              <button className="Owner-Tenant-close-btn" onClick={closeModal} title="Close modal">
                <X size={20} />
              </button>
            </div>

            <div className="Owner-Tenant-modal-body">
              <div className="Owner-Tenant-info-grid">
                <div className="Owner-Tenant-info-item" title={`Phone number: ${selectedUser.phone}`}>
                  <label><Phone size={14} /> Phone</label>
                  <span>{selectedUser.phone}</span>
                </div>
                <div className="Owner-Tenant-info-item" title={`Assigned unit: ${selectedUser.unit_name || "N/A"}`}>
                  <label><Home size={14} /> Unit</label>
                  <span>{selectedUser.unit_name || "N/A"}</span>
                </div>
                <div className="Owner-Tenant-info-item" title={`Date of birth: ${selectedUser.dateofbirth}`}>
                  <label><Calendar size={14} /> Date of Birth</label>
                  <span>{selectedUser.dateofbirth}</span>
                </div>
                <div className="Owner-Tenant-info-item Owner-Tenant-info-full" title={`Address: ${selectedUser.address}`}>
                  <label><MapPin size={14} /> Address</label>
                  <span>{selectedUser.address}</span>
                </div>
              </div>

              {activeTab === "applications" && (
                <>
                  <div className="Owner-Tenant-documents-section">
                    <h3><FileText size={18} /> Required Documents</h3>
                    <div className="Owner-Tenant-documents-grid">
                      <div className="Owner-Tenant-document-item">
                        <span className="Owner-Tenant-document-label">Valid ID</span>
                        <button
                          className="Owner-Tenant-document-btn"
                          onClick={() => {
                            const url = getDocumentUrl(selectedUser.valid_id);
                            if (url) {
                              window.open(url, "_blank");
                            }
                          }}
                          disabled={!selectedUser.valid_id}
                          title={selectedUser.valid_id ? "View valid ID document" : "No valid ID uploaded"}
                        >
                          <Download size={14} /> View Document
                        </button>
                      </div>
                      <div className="Owner-Tenant-document-item">
                        <span className="Owner-Tenant-document-label">Barangay Clearance</span>
                        <button
                          className="Owner-Tenant-document-btn"
                          onClick={() => {
                            const url = getDocumentUrl(selectedUser.brgy_clearance);
                            if (url) {
                              window.open(url, "_blank");
                            }
                          }}
                          disabled={!selectedUser.brgy_clearance}
                          title={selectedUser.brgy_clearance ? "View barangay clearance document" : "No barangay clearance uploaded"}
                        >
                          <Download size={14} /> View Document
                        </button>
                      </div>
                      <div className="Owner-Tenant-document-item">
                        <span className="Owner-Tenant-document-label">Proof of Income</span>
                        <button
                          className="Owner-Tenant-document-btn"
                          onClick={() => {
                            const url = getDocumentUrl(selectedUser.proof_of_income);
                            if (url) {
                              window.open(url, "_blank");
                            }
                          }}
                          disabled={!selectedUser.proof_of_income}
                          title={selectedUser.proof_of_income ? "View proof of income document" : "No proof of income uploaded"}
                        >
                          <Download size={14} /> View Document
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="Owner-Tenant-action-buttons">
                    <button
                      className="Owner-Tenant-action-btn Owner-Tenant-contract-btn"
                      onClick={() => handleIssueContract(selectedUser.applicationid)}
                      title="Issue rental contract to this applicant"
                    >
                      <Send size={16} /> Issue Contract
                    </button>
                    <button
                      className="Owner-Tenant-action-btn Owner-Tenant-payment-btn"
                      onClick={() => handleAdvancePayment(selectedUser.applicationid)}
                      title="Issue initial payment invoice to this applicant"
                    >
                      <CreditCard size={16} /> Issue Initial Payment
                    </button>
                  </div>

                  <div className="Owner-Tenant-approval-section">
                    <div className="Owner-Tenant-approval-status">
                      <div className={`Owner-Tenant-status-item ${selectedUser.contract_signed ? 'Owner-Tenant-status-complete' : 'Owner-Tenant-status-pending'}`} title={`Contract: ${selectedUser.contract_signed ? "Signed" : "Pending signature"}`}>
                        {selectedUser.contract_signed ? <CheckCircle size={14} /> : <Clock size={14} />}
                        Contract: {selectedUser.contract_signed ? "Signed" : "Pending"}
                      </div>
                      <div className={`Owner-Tenant-status-item ${selectedUser.bill_status === 'Paid' ? 'Owner-Tenant-status-complete' : 'Owner-Tenant-status-pending'}`} title={`Payment: ${selectedUser.bill_status === 'Paid' ? "Completed" : "Pending payment"}`}>
                        {selectedUser.bill_status === 'Paid' ? <CheckCircle size={14} /> : <Clock size={14} />}
                        Payment: {selectedUser.bill_status === 'Paid' ? "Completed" : "Pending"}
                      </div>
                    </div>
                    
                    <div className="Owner-Tenant-approval-buttons">
                      <button
                        className="Owner-Tenant-approve-btn"
                        onClick={handleOpenApproveModal}
                        disabled={
                          selectedUser.bill_status !== "Paid" || !selectedUser.contract_signed
                        }
                        title={
                          selectedUser.bill_status !== "Paid"
                            ? "Cannot approve: Initial payment not completed"
                            : !selectedUser.contract_signed
                              ? "Cannot approve: Contract not signed"
                              : "Approve this application and make tenant active"
                        }
                      >
                        <Check size={16} /> Approve Application
                      </button>
                      <button
                        className="Owner-Tenant-reject-btn"
                        onClick={handleOpenRejectModal}
                        title="Reject this application"
                      >
                        <Ban size={16} /> Reject Application
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="modal-overlay-transactions" onClick={() => setShowApproveModal(false)}>
          <div className="modal-content-transactions" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn-transactions" onClick={() => setShowApproveModal(false)} title="Close approval modal">
              <X size={24} />
            </button>
            
            <div className="modal-icon-transactions modal-icon-warning">
              <CheckCircle size={48} />
            </div>
            
            <h2 className="modal-title-transactions">Approve Application</h2>
            
            <p className="modal-message-transactions">
              Are you sure you want to approve <strong>{selectedUser?.fullname}</strong>'s application?
              This will make them an active tenant.
            </p>
            
            <div className="modal-bill-details-transactions">
              <div className="bill-detail-item" title={`Applicant: ${selectedUser?.fullname}`}>
                <span>Applicant:</span>
                <strong>{selectedUser?.fullname}</strong>
              </div>
              <div className="bill-detail-item" title={`Unit: ${selectedUser?.unit_name || "N/A"}`}>
                <span>Unit:</span>
                <span>{selectedUser?.unit_name || "N/A"}</span>
              </div>
            </div>
            
            <div className="modal-actions-transactions">
              <button 
                className="modal-btn-transactions modal-btn-cancel"
                onClick={() => setShowApproveModal(false)}
                title="Cancel approval"
              >
                Cancel
              </button>
              <button 
                className="modal-btn-transactions modal-btn-confirm"
                onClick={handleApproveConfirm}
                title="Confirm and approve application"
              >
                Yes, Approve Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && (
        <div className="modal-overlay-transactions" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content-transactions" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn-transactions" onClick={() => setShowRejectModal(false)} title="Close rejection modal">
              <X size={24} />
            </button>
            
            <div className="modal-icon-transactions modal-icon-danger">
              <Ban size={48} />
            </div>
            
            <h2 className="modal-title-transactions">Reject Application</h2>
            
            <p className="modal-message-transactions">
              Are you sure you want to reject <strong>{selectedUser?.fullname}</strong>'s application?
            </p>
            
            <div className="modal-bill-details-transactions">
              <div className="bill-detail-item">
                <span>Reason for Rejection:</span>
                <input
                  type="text"
                  className="modal-reason-input"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  title="Enter the reason for rejecting this application"
                />
              </div>
            </div>
            
            <div className="modal-actions-transactions">
              <button 
                className="modal-btn-transactions modal-btn-cancel"
                onClick={() => setShowRejectModal(false)}
                title="Cancel rejection"
              >
                Cancel
              </button>
              <button 
                className="modal-btn-transactions modal-btn-reject"
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim()}
                title={!rejectReason.trim() ? "Please enter a rejection reason" : "Confirm and reject application"}
              >
                Yes, Reject Application
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
            
            <h2 className="modal-title-transactions">Application Approved!</h2>
            
            <p className="modal-message-transactions">
              <strong>{successModalUser?.fullname}</strong> has been successfully approved and is now an active tenant.
            </p>
            
            <div className="modal-bill-details-transactions">
              <div className="bill-detail-item" title={`New tenant: ${successModalUser?.fullname}`}>
                <span>Tenant:</span>
                <strong>{successModalUser?.fullname}</strong>
              </div>
              <div className="bill-detail-item" title={`Assigned unit: ${successModalUser?.unit_name || "N/A"}`}>
                <span>Unit:</span>
                <span>{successModalUser?.unit_name || "N/A"}</span>
              </div>
            </div>
            
            <button 
              className="modal-btn-transactions modal-btn-success"
              onClick={handleCloseSuccessModal}
              title="Continue to tenant management"
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
              <Ban size={64} />
            </div>
            
            <h2 className="modal-title-transactions">Application Rejected!</h2>
            
            <p className="modal-message-transactions">
              <strong>{successModalUser?.fullname}</strong>'s application has been rejected.
            </p>
            
            <div className="modal-bill-details-transactions">
              <div className="bill-detail-item" title={`Rejected applicant: ${successModalUser?.fullname}`}>
                <span>Applicant:</span>
                <strong>{successModalUser?.fullname}</strong>
              </div>
              <div className="bill-detail-item" title={`Rejection reason: ${rejectReason}`}>
                <span>Reason:</span>
                <span>{rejectReason}</span>
              </div>
            </div>
            
            <button 
              className="modal-btn-transactions modal-btn-success"
              onClick={handleCloseRejectSuccessModal}
              title="Continue to tenant management"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tenants;