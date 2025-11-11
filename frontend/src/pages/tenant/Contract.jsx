import React, { useEffect, useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import axios from "axios";
import { 
  FileText, 
  Home, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  Clock, 
  XCircle, 
  PlayCircle,
  Eye,
  Pen,
  Trash2,
  Save,
  X,
  Download,
  Loader,
  AlertTriangle,
  Info
} from "lucide-react";
import "../../styles/tenant/Contract.css";

const Contract = () => {
  const [contract, setContract] = useState(null);
  const [isSigning, setIsSigning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [terminationDate, setTerminationDate] = useState('');
  const sigCanvas = useRef();

  // ✅ ADD API BASE
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://rentahanan.onrender.com";

  // ✅ Get image URL function (same as BrowseUnits)
  const getImageUrl = (filename, folder = 'signed_contracts') => {
    if (!filename) return null;
    
    // If it's already a full URL (Cloudinary), use it directly
    if (filename.startsWith('http')) {
      return filename;
    }
    
    // Otherwise, construct the local path
    return `${API_BASE}/uploads/${folder}/${filename}`;
  };

  // ✅ Get tenantid from both possible locations
  const getTenantId = () => {
    // First try to get from localStorage directly
    const directTenantId = localStorage.getItem("tenantid");
    if (directTenantId) return directTenantId;

    // Then try to get from user object
    const storedUser = JSON.parse(localStorage.getItem("user"));
    return storedUser?.tenantid;
  };

  const tenantId = getTenantId();

  useEffect(() => {
    const fetchContract = async () => {
      try {
        setLoading(true);
        
        // ✅ Better error handling for missing tenant ID
        if (!tenantId) {
          console.error("No tenant ID found in localStorage.");
          console.log("Available localStorage items:", {
            user: localStorage.getItem("user"),
            tenantid: localStorage.getItem("tenantid"),
            allItems: { ...localStorage }
          });
          setLoading(false);
          return;
        }

        // ✅ UPDATED API ENDPOINT
        const response = await axios.get(
          `${API_BASE}/api/contracts/tenant/${tenantId}`
        );

        const data = response.data;

        if (Array.isArray(data) && data.length > 0) {
          setContract(data[0]);
        } else if (data && data.contractid) {
          setContract(data);
        } else {
          console.warn("No contract found for tenant:", tenantId);
        }
      } catch (error) {
        console.error("Error fetching contract:", error);
        if (error.response) {
          console.error("API Error Response:", error.response.data);
          console.error("API Error Status:", error.response.status);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchContract();
  }, [tenantId, API_BASE]);

  // Calculate min and max dates for termination
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() + 14); // 2 weeks from now

  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 30); // 30 days from now

  const minDateString = minDate.toISOString().split('T')[0];
  const maxDateString = maxDate.toISOString().split('T')[0];

  // Function to open terminate modal
  const openTerminateModal = () => {
    // Calculate default termination date (2 weeks from now)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    const formattedDate = defaultDate.toISOString().split('T')[0];
    
    setTerminationDate(formattedDate);
    setShowTerminateModal(true);
  };

  // Function to show confirmation modal
  const showConfirmation = () => {
    if (!terminationDate) {
      showMessage("❌ Please select a termination date first.", true);
      return;
    }
    setShowConfirmModal(true);
  };

  // Function to handle termination
  const handleTerminateContract = async () => {
    try {
      // ✅ UPDATED API ENDPOINT
      const response = await fetch(`${API_BASE}/api/contracts/terminate-tenant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractid: contract.contractid,
          tenantid: tenantId,
          termination_date: terminationDate,
          terminated_by: "Tenant"
        }),
      });

      const result = await response.json();
      
      if (!response.ok) throw new Error(result.message || "Failed to terminate contract");

      // Refresh data to show updated status
      // ✅ UPDATED API ENDPOINT
      const updatedResponse = await axios.get(`${API_BASE}/api/contracts/tenant/${tenantId}`);
      const updatedData = updatedResponse.data;
      
      if (Array.isArray(updatedData) && updatedData.length > 0) {
        setContract(updatedData[0]);
      }

      // Show success message
      showMessage("✅ Tenancy termination requested successfully! The landlord has been notified.");
      setShowTerminateModal(false);
      setShowConfirmModal(false);
      
    } catch (error) {
      console.error("Error terminating contract:", error);
      showMessage("❌ Failed to terminate tenancy. Please try again.", true);
      setShowConfirmModal(false);
    }
  };

  const handleSignClick = () => setIsSigning(true);
  
  const handleCancelSign = () => {
    setIsSigning(false);
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  const showMessage = (message, isError = false) => {
    setModalMessage(message);
    if (isError) {
      setShowErrorModal(true);
    } else {
      setShowSuccessModal(true);
    }
  };

  const handleSaveSignature = async () => {
    if (sigCanvas.current.isEmpty()) {
      showMessage("Please provide your signature before saving.", true);
      return;
    }

    try {
      const canvas = sigCanvas.current.getCanvas();
      const signatureImage = canvas.toDataURL("image/png");
      const blob = await (await fetch(signatureImage)).blob();

      const formData = new FormData();
      formData.append("signed_contract", blob, `signed_${tenantId}.png`);
      formData.append("contractid", contract.contractid);

      // ✅ UPDATED API ENDPOINT
      const response = await axios.post(
        `${API_BASE}/api/contracts/sign`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (response.data.message) {
        showMessage("Contract signed successfully!");
        setContract((prev) => ({
          ...prev,
          signed_contract: response.data.filename,
          status: "Signed"
        }));
        setIsSigning(false);
        sigCanvas.current.clear();
      } else {
        showMessage("Error saving signed contract.", true);
      }
    } catch (error) {
      console.error("Error signing contract:", error);
      showMessage("Failed to upload signed contract.", true);
    }
  };

  const handleClear = () => sigCanvas.current.clear();

  const getStatusIcon = (status) => {
    const icons = {
      "signed": <CheckCircle className="status-icon signed" />,
      "pending": <Clock className="status-icon pending" />,
      "rejected": <XCircle className="status-icon rejected" />,
      "active": <PlayCircle className="status-icon active" />,
      "expired": <XCircle className="status-icon expired" />,
      "terminated": <XCircle className="status-icon terminated" />
    };
    return icons[status?.toLowerCase()] || <FileText className="status-icon default" />;
  };

  // ✅ FIXED: Update file URLs using the helper function
  const contractURL = contract?.signed_contract
    ? getImageUrl(contract.signed_contract, 'signed_contracts')
    : contract?.generated_contract
    ? getImageUrl(contract.generated_contract, 'contracts')
    : null;

  // ✅ Add debug information
  if (!tenantId) {
    return (
      <div className="no-contract-container-Contract">
        <div className="no-contract-icon-Contract">
          <FileText size={64} />
        </div>
        <h2 className="no-contract-title-Contract">Tenant ID Not Found</h2>
        <p className="no-contract-description-Contract">
          Unable to find your tenant information. Please try logging out and logging back in.
        </p>
        <div className="debug-info-Contract" style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '5px' }}>
          <p><strong>Debug Information:</strong></p>
          <p>User in localStorage: {localStorage.getItem("user") ? "Exists" : "Missing"}</p>
          <p>TenantID in localStorage: {localStorage.getItem("tenantid") || "Missing"}</p>
          <button 
            onClick={() => {
              console.log("LocalStorage contents:");
              alert("Check console for localStorage contents");
            }}
            style={{ marginTop: '10px', padding: '5px 10px' }}
            title="Show detailed localStorage information"
          >
            Show LocalStorage Details
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container-Contract">
        <div className="loading-spinner-Contract">
          <Loader className="spinner-icon" />
        </div>
        <p className="loading-text-Contract">Loading your contract...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="no-contract-container-Contract">
        <div className="no-contract-icon-Contract">
          <FileText size={64} />
        </div>
        <h2 className="no-contract-title-Contract">No Contract Found</h2>
        <p className="no-contract-description-Contract">
          You don't have an active contract yet. Please contact the administrator for more information.
        </p>
        <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          Tenant ID: {tenantId}
        </p>
      </div>
    );
  }

  const isActiveContract = contract.status === 'Active';

  return (
    <div className="contract-container-Contract">
      {/* Header Section */}
      <div className="contract-header-Contract">
        <h1 className="contract-title-Contract" title="Your rental contract management">
          <FileText className="header-icon" />
          My Contract
        </h1>
        <p className="contract-subtitle-Contract" title="Review and manage your rental agreement">
          Review and manage your rental agreement
        </p>
      </div>

      {/* Contract Summary Cards */}
      <div className="contract-summary-Contract">
        <div className="summary-card-Contract summary-card-unit-Contract" title="Your rental unit information">
          <div className="summary-icon-Contract">
            <Home className="icon" />
          </div>
          <div className="summary-content-Contract">
            <p className="summary-label-Contract">Unit</p>
            <p className="summary-value-Contract">{contract.unit_name || "N/A"}</p>
          </div>
        </div>
        
        <div className="summary-card-Contract summary-card-price-Contract" title="Monthly rental amount">
          <div className="summary-icon-Contract">
            <DollarSign className="icon" />
          </div>
          <div className="summary-content-Contract">
            <p className="summary-label-Contract">Monthly Price</p>
            <p className="summary-value-Contract">₱{contract.unit_price?.toLocaleString() || "0"}</p>
          </div>
        </div>
        
        <div className="summary-card-Contract summary-card-dates-Contract" title="Lease start and end dates">
          <div className="summary-icon-Contract">
            <Calendar className="icon" />
          </div>
          <div className="summary-content-Contract">
            <p className="summary-label-Contract">Lease Period</p>
            <p className="summary-value-Contract">
              {contract.start_date} - {contract.end_date || "Ongoing"}
            </p>
          </div>
        </div>
        
        <div className="summary-card-Contract summary-card-status-Contract" title="Current contract status">
          <div className="summary-icon-Contract">
            {getStatusIcon(contract.status)}
          </div>
          <div className="summary-content-Contract">
            <p className="summary-label-Contract">Status</p>
            <p className={`summary-value-Contract status-value-Contract status-${contract.status ? contract.status.toLowerCase() : "unknown"}-Contract`}>
              {contract.status || "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Contract Actions Section */}
      <div className="contract-actions-Contract">
        {/* Contract Preview */}
        <div className="contract-preview-Contract">
          <div className="preview-header-Contract">
            <div className="contract-file-info-Contract">
              <div className="pdf-icon-Contract">
                <FileText className="file-icon" />
              </div>
              <div className="file-details-Contract">
                <p className="file-label-Contract">Contract Document</p>
                <p className="file-size-Contract">PDF Document</p>
              </div>
            </div>
            <div className="preview-actions-Contract">
              <button 
                className="open-btn-Contract" 
                onClick={() => window.open(contractURL, "_blank")}
                title="Open contract document in new tab"
              >
                <Eye className="btn-icon" size={18} />
                View Contract
              </button>
              {/* Only show End Tenancy button for Active contracts */}
              {isActiveContract && (
                <button
                  className="terminate-btn-Contract"
                  onClick={openTerminateModal}
                  title="Request to end your tenancy"
                >
                  <X className="btn-icon" size={18} />
                  End Tenancy
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Signature Section */}
        {!contract.signed_contract && !isSigning && (
          <div className="signature-prompt-Contract">
            <div className="prompt-content-Contract">
              <div className="prompt-icon-Contract">
                <Pen className="icon" />
              </div>
              <div className="prompt-text-Contract">
                <h3 className="prompt-title-Contract">Ready to Sign?</h3>
                <p className="prompt-description-Contract">
                  Review the contract above and sign digitally to complete the agreement process.
                </p>
              </div>
            </div>
            <button 
              className="sign-btn-Contract" 
              onClick={handleSignClick}
              title="Start digital signature process"
            >
              <Pen className="btn-icon" size={18} />
              Sign Contract
            </button>
          </div>
        )}

        {isSigning && (
          <div className="signature-area-Contract">
            <div className="signature-header-Contract">
              <h3 className="signature-title-Contract">Digital Signature</h3>
              <p className="signature-instruction-Contract" title="Use mouse or touch to sign in the box">
                Sign in the box below using your mouse or touchscreen
              </p>
            </div>
            
            <div className="signature-canvas-container-Contract">
              <SignatureCanvas
                ref={sigCanvas}
                penColor="#000000ff"
                backgroundColor="#f8faff"
                canvasProps={{
                  width: 500,
                  height: 200,
                  className: "sigCanvas-Contract",
                }}
              />
            </div>
            
            <div className="signature-buttons-Contract">
              <button 
                className="clear-btn-Contract" 
                onClick={handleClear}
                title="Clear signature canvas"
              >
                <Trash2 className="btn-icon" size={18} />
                Clear
              </button>
              <div className="signature-action-buttons-Contract">
                <button 
                  className="cancel-btn-Contract" 
                  onClick={handleCancelSign}
                  title="Cancel signing process"
                >
                  <X className="btn-icon" size={18} />
                  Cancel
                </button>
                <button 
                  className="save-signature-btn-Contract" 
                  onClick={handleSaveSignature}
                  title="Save your signature and complete signing"
                >
                  <Save className="btn-icon" size={18} />
                  Save Signature
                </button>
              </div>
            </div>
          </div>
        )}

        {contract.signed_contract && (
          <div className="signed-message-Contract">
            <div className="signed-header-Contract">
              <div className="signed-icon-Contract">
                <CheckCircle className="icon" />
              </div>
              <div className="signed-content-Contract">
                <h3 className="signed-title-Contract">Contract Signed</h3>
                <p className="signed-text-Contract">
                  You've successfully signed this contract on {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="signed-actions-Contract">
              <p className="signed-file-info-Contract">
                Signed file: <strong className="signed-filename-Contract">{contract.signed_contract}</strong>
              </p>
              <button 
                className="view-signed-btn-Contract"
                onClick={() =>
                  window.open(
                    // ✅ FIXED: Use the helper function
                    getImageUrl(contract.signed_contract, 'signed_contracts'),
                    "_blank"
                  )
                }
                title="View signed contract copy"
              >
                <Eye className="btn-icon" size={18} />
                View Signed Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Termination Modal */}
      {showTerminateModal && contract && (
        <div className="modal-overlay-Contract" onClick={() => setShowTerminateModal(false)}>
          <div className="modal-content-Contract terminate" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-Contract">
              <h3 className="modal-title-Contract">End Tenancy</h3>
              <button 
                className="modal-close-btn-Contract" 
                onClick={() => setShowTerminateModal(false)}
                title="Close termination modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body-Contract">
              <div className="terminate-warning-Contract">
                <div className="warning-icon-Contract">
                  <AlertTriangle size={24} />
                </div>
                <div className="warning-content-Contract">
                  <h4>You are about to request tenancy termination</h4>
                  <p>This request will be sent to the landlord for approval. The landlord will be notified of your request.</p>
                </div>
              </div>

              <div className="terminate-details-Contract">
                <div className="detail-row-Contract">
                  <span className="detail-label-Contract">Unit:</span>
                  <span className="detail-value-Contract">{contract.unit_name}</span>
                </div>
                <div className="detail-row-Contract">
                  <span className="detail-label-Contract">Current Rent:</span>
                  <span className="detail-value-Contract">₱{parseFloat(contract.unit_price || 0).toLocaleString()}</span>
                </div>
                <div className="detail-row-Contract">
                  <span className="detail-label-Contract">Current Status:</span>
                  <span className="detail-value-Contract">{contract.status}</span>
                </div>
              </div>

              <div className="form-group-Contract">
                <label className="form-label-Contract">
                  Preferred Move-out Date *
                  <span className="form-tooltip-Contract" title="Select your preferred move-out date (2-30 days from today)">
                    <Info size={14} />
                  </span>
                  <span className="date-note-Contract">(Must be between 2 weeks and 30 days from today)</span>
                </label>
                <input
                  type="date"
                  value={terminationDate}
                  onChange={(e) => setTerminationDate(e.target.value)}
                  className="form-input-Contract"
                  min={minDateString}
                  max={maxDateString}
                  title="Select your preferred move-out date"
                />
                <div className="date-info-Contract">
                  <Calendar size={14} />
                  <span>You plan to move out on: {new Date(terminationDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer-Contract">
              <button 
                className="cancel-btn-Contract" 
                onClick={() => setShowTerminateModal(false)}
                title="Cancel termination request"
              >
                Cancel
              </button>
              <button 
                className="proceed-btn-Contract"
                onClick={showConfirmation}
                disabled={!terminationDate}
                title={!terminationDate ? "Please select a move-out date first" : "Proceed to confirmation"}
              >
                <X size={16} />
                Proceed to Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && contract && (
        <div className="modal-overlay-Contract" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-content-Contract confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-Contract">
              <h3 className="modal-title-Contract">Confirm Termination Request</h3>
              <button 
                className="modal-close-btn-Contract" 
                onClick={() => setShowConfirmModal(false)}
                title="Close confirmation modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body-Contract">
              <div className="confirm-warning-Contract">
                <div className="confirm-icon-Contract">
                  <AlertTriangle size={48} />
                </div>
                <div className="confirm-content-Contract">
                  <h4>Are you sure you want to request tenancy termination?</h4>
                  <p>This action will:</p>
                  <ul className="confirm-list-Contract">
                    <li>Send a termination request for <strong>{contract.unit_name}</strong></li>
                    <li>Notify the landlord of your move-out date: <strong>{new Date(terminationDate).toLocaleDateString()}</strong></li>
                    <li>Your tenancy will remain active until the landlord approves the termination</li>
                    <li><strong>This request cannot be undone</strong></li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="modal-footer-Contract">
              <button 
                className="cancel-btn-Contract" 
                onClick={() => setShowConfirmModal(false)}
                title="Cancel termination request"
              >
                No, Go Back
              </button>
              <button 
                className="terminate-final-btn-Contract"
                onClick={handleTerminateContract}
                title="Confirm and send termination request"
              >
                <X size={16} />
                Yes, Request Termination
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="modal-overlay-Contract" onClick={() => setShowSuccessModal(false)}>
          <div className="modal-content-Contract success" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-Contract">
              <CheckCircle className="icon" />
            </div>
            <h3 className="modal-title-Contract">Success</h3>
            <p className="modal-message-Contract">{modalMessage}</p>
            
            {/* ✅ Contract Details like Owner Contract */}
            <div className="success-details-Contract">
              <div className="success-detail-item-Contract">
                <span className="success-detail-label-Contract">Unit:</span>
                <span className="success-detail-value-Contract">{contract.unit_name}</span>
              </div>
              <div className="success-detail-item-Contract">
                <span className="success-detail-label-Contract">Monthly Rent:</span>
                <span className="success-detail-value-Contract">₱{contract.unit_price?.toLocaleString()}</span>
              </div>
              <div className="success-detail-item-Contract">
                <span className="success-detail-label-Contract">Requested On:</span>
                <span className="success-detail-value-Contract">{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {/* ✅ Single Button like Owner Contract */}
            <div className="success-modal-actions-Contract">
              <button 
                className="success-modal-button-Contract"
                onClick={() => setShowSuccessModal(false)}
                title="Close success message"
              >
                <Eye className="btn-icon" size={18} />
                View Contract
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="modal-overlay-Contract" onClick={() => setShowErrorModal(false)}>
          <div className="modal-content-Contract error" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-Contract">
              <XCircle className="icon" />
            </div>
            <h3 className="modal-title-Contract">Error</h3>
            <p className="modal-message-Contract">{modalMessage}</p>
            <button 
              className="modal-button-Contract error"
              onClick={() => setShowErrorModal(false)}
              title="Close error message and try again"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contract;