import React, { useState, useEffect, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { useLocation } from "react-router-dom";
import { 
  FileText, 
  X, 
  Download, 
  User, 
  Mail, 
  Phone, 
  Home, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Check, 
  Eye,
  TrendingUp,
  Building,
  Users,
  AlertCircle,
  Info,
  ArrowRight,
  FileCheck,
  FileX
} from "lucide-react";
import "../../styles/owners/Contract.css";

const OwnerContract = () => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState("tenants");
    const [contracts, setContracts] = useState([]);
    const [applicants, setApplicants] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showTerminateModal, setShowTerminateModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [successModalData, setSuccessModalData] = useState(null);
    const [selectedApplicant, setSelectedApplicant] = useState(null);
    const [selectedContract, setSelectedContract] = useState(null);
    const [terminationDate, setTerminationDate] = useState('');
    const [highlightedApplicantId, setHighlightedApplicantId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        tenantid: "",
        startdate: "",
        monthlyrent: "",
        deposit: "",
        advancepayment: "",
        remarks: "",
    });

    // ✅ ADD API BASE
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://rentahanan.onrender.com";

    const sigPadRef = useRef(null);

    useEffect(() => {
        if (location.state?.openTab === "issue") {
            setActiveTab("issue");
            if (location.state?.selectedApplicantId) {
                setHighlightedApplicantId(location.state.selectedApplicantId);
            }
        }
    }, [location.state]);

    // Function to fetch data
    const fetchData = async () => {
        try {
            setLoading(true);
            // ✅ UPDATED API ENDPOINTS
            const [contractsRes, applicantsRes] = await Promise.all([
                fetch(`${API_BASE}/api/contracts/tenants`),
                fetch(`${API_BASE}/api/contracts/applicants`),
            ]);
            const contractsData = await contractsRes.json();
            const applicantsData = await applicantsRes.json();
            setContracts(contractsData);
            setApplicants(applicantsData);

            if (location.state?.selectedApplicantId) {
                const foundApplicant = applicantsData.find(
                    (a) => a.applicationid === location.state.selectedApplicantId
                );
                if (foundApplicant) openIssueModal(foundApplicant);
            }
        } catch (error) {
            console.error("Error loading contracts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Function to get profile image URL
    const getProfileImage = (user) => {
        if (user.image) {
            // ✅ UPDATED IMAGE URL
            return `${API_BASE}/uploads/profile_images/${user.image}`;
        }
        if (user.profile_image) {
            // ✅ UPDATED IMAGE URL
            return `${API_BASE}/uploads/profile_images/${user.profile_image}`;
        }
        return null;
    };

    // Function to handle image error
    const handleImageError = (e, user) => {
        console.log("Image failed to load for user:", user.fullname);
        e.target.style.display = 'none';
        const fallbackElement = e.target.nextSibling;
        if (fallbackElement) {
            fallbackElement.style.display = 'flex';
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const openIssueModal = (applicant) => {
        setSelectedApplicant(applicant);
        const today = new Date().toISOString().split("T")[0];
        setFormData({
            tenantid: applicant.tenantid,
            unitid: applicant.unitid,
            startdate: today,
            monthlyrent: applicant.unit_price,
            deposit: applicant.unit_price,
            advancepayment: applicant.unit_price,
            remarks: `Contract for ${applicant.fullname} (${applicant.unit_name})`,
        });
        setShowAddModal(true);
    };

    // Function to open terminate modal
    const openTerminateModal = (contract) => {
        setSelectedContract(contract);
        
        // Calculate default termination date (30 days from now)
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 30);
        const formattedDate = defaultDate.toISOString().split('T')[0];
        
        setTerminationDate(formattedDate);
        setShowTerminateModal(true);
    };

    // Function to open approve modal for termination requests
    const openApproveModal = (contract) => {
        setSelectedContract(contract);
        setShowApproveModal(true);
    };

    // Function to show confirmation modal
    const showConfirmation = () => {
        if (!terminationDate) {
            alert("Please select a termination date first.");
            return;
        }
        setShowConfirmModal(true);
    };

    // Function to handle termination
    const handleTerminateContract = async () => {
        try {
            // ✅ UPDATED API ENDPOINT
            const response = await fetch(`${API_BASE}/api/contracts/terminate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contractid: selectedContract.contractid,
                    tenantid: selectedContract.tenantid,
                    termination_date: terminationDate,
                    terminated_by: "Owner"
                }),
            });

            const result = await response.json();
            
            if (!response.ok) throw new Error(result.message || "Failed to terminate contract");

            // Refresh data to show updated status
            await fetchData();
            
            // Show success message
            setShowTerminateModal(false);
            setShowConfirmModal(false);
            
        } catch (error) {
            console.error("Error terminating contract:", error);
            alert("Failed to terminate contract. Please try again.");
            setShowConfirmModal(false);
        }
    };

    // Function to handle approval of tenant termination request
    const handleApproveTermination = async () => {
        try {
            // ✅ UPDATED API ENDPOINT
            const response = await fetch(`${API_BASE}/api/contracts/approve-termination`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contractid: selectedContract.contractid,
                    tenantid: selectedContract.tenantid,
                    approved_by: "Owner"
                }),
            });

            const result = await response.json();
            
            if (!response.ok) throw new Error(result.message || "Failed to approve termination");

            // Refresh data to show updated status
            await fetchData();
            
            // Show success message
            setShowApproveModal(false);
            
        } catch (error) {
            console.error("Error approving termination:", error);
            alert("Failed to approve termination request. Please try again.");
        }
    };

    // Function to handle rejection of tenant termination request
    const handleRejectTermination = async () => {
        try {
            // ✅ UPDATED API ENDPOINT
            const response = await fetch(`${API_BASE}/api/contracts/reject-termination`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contractid: selectedContract.contractid,
                    tenantid: selectedContract.tenantid,
                    rejected_by: "Owner"
                }),
            });

            const result = await response.json();
            
            if (!response.ok) throw new Error(result.message || "Failed to reject termination");

            // Refresh data to show updated status
            await fetchData();
            
            // Show success message
            setShowApproveModal(false);
            
        } catch (error) {
            console.error("Error rejecting termination:", error);
            alert("Failed to reject termination request. Please try again.");
        }
    };

    // Calculate min and max dates for termination
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 14); // 2 weeks from now

    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 30); // 30 days from now

    const minDateString = minDate.toISOString().split('T')[0];
    const maxDateString = maxDate.toISOString().split('T')[0];

    const clearSignature = () => {
        sigPadRef.current.clear();
    };

    const handleGeneratePDF = async () => {
        try {
            const signatureData = sigPadRef.current.isEmpty()
                ? null
                : sigPadRef.current.getCanvas().toDataURL("image/png");

            // ✅ UPDATED API ENDPOINT
            const pdfResponse = await fetch(`${API_BASE}/api/contracts/generate-pdf`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tenantid: formData.tenantid,
                    tenant_name: selectedApplicant.fullname,
                    unit_name: selectedApplicant.unit_name,
                    monthlyrent: formData.monthlyrent,
                    deposit: formData.deposit,
                    advancepayment: formData.advancepayment,
                    start_date: formData.startdate,
                    remarks: formData.remarks,
                    owner_signature: signatureData,
                }),
            });

            const pdfData = await pdfResponse.json();
            if (!pdfResponse.ok) throw new Error(pdfData.error || "Failed to generate contract");

            // Save to backend
            // ✅ UPDATED API ENDPOINT
            const issueResponse = await fetch(`${API_BASE}/api/contracts/issuecontract`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tenantid: formData.tenantid,
                    unitid: formData.unitid,
                    startdate: formData.startdate,
                    generated_contract: pdfData.filename,
                }),
            });

            if (!issueResponse.ok) throw new Error("Failed to issue contract record");

            // Show success modal instead of opening PDF immediately
            setSuccessModalData({
                applicantName: selectedApplicant.fullname,
                unitName: selectedApplicant.unit_name,
                startDate: formData.startdate,
                monthlyRent: formData.monthlyrent,
                issuedDate: new Date().toLocaleDateString(),
                contractId: pdfData.contract_id || `CONTRACT-${Date.now()}`,
                // ✅ UPDATED PDF URL
                pdfUrl: pdfData.pdf_url || `${API_BASE}/api/contracts/download/${pdfData.filename}`
            });

            // Close add modal and show success modal
            setShowAddModal(false);
            setShowSuccessModal(true);

            // Remove the issued applicant from the applicants list
            setApplicants(prevApplicants => 
                prevApplicants.filter(app => app.tenantid !== formData.tenantid)
            );

        } catch (error) {
            console.error("Error issuing contract:", error);
            alert("Failed to issue contract. Please try again.");
        }
    };

    const handleViewContract = () => {
        if (successModalData?.pdfUrl) {
            window.open(successModalData.pdfUrl, "_blank");
        } else {
            console.error("PDF URL not available");
            alert("Contract PDF is not available. Please try generating again.");
        }
        setShowSuccessModal(false);
    };

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        fetchData();
    };

    // Function to view existing contracts
    const handleViewExistingContract = (contract) => {
        let contractUrl = '';
        
        if (contract.signed_contract) {
            // ✅ UPDATED CONTRACT URL
            contractUrl = `${API_BASE}/uploads/signed_contracts/${contract.signed_contract}`;
        } else if (contract.generated_contract) {
            // ✅ UPDATED CONTRACT URL
            contractUrl = `${API_BASE}/uploads/contracts/${contract.generated_contract}`;
        } else {
            console.error("No contract file found for:", contract);
            alert("Contract file not found. Please contact administrator.");
            return;
        }
        
        console.log("Opening contract URL:", contractUrl);
        window.open(contractUrl, "_blank");
    };

    // Calculate statistics
    const stats = {
        total: contracts.length,
        active: contracts.filter(c => c.status === 'Active').length,
        pending: applicants.length,
        terminationRequests: contracts.filter(c => c.status === 'Termination Requested').length
    };

    return (
        <div className="Owner-Contract-container">
            {/* Header Section */}
            <div className="Owner-Contract-header">
                <div className="Owner-Contract-header-content">
                    <h1 className="Owner-Contract-title">Contract Management</h1>
                    <p className="Owner-Contract-subtitle">Manage tenant contracts and issue new agreements</p>
                </div>
                
                {/* Statistics Cards */}
                <div className="Owner-Contract-stats">
                    <div className="Owner-Contract-stat-card">
                        <div className="Owner-Contract-stat-icon total">
                            <FileText size={20} />
                        </div>
                        <div className="Owner-Contract-stat-info">
                            <span className="Owner-Contract-stat-number">{stats.total}</span>
                            <span className="Owner-Contract-stat-label">Total Contracts</span>
                        </div>
                    </div>
                    <div className="Owner-Contract-stat-card">
                        <div className="Owner-Contract-stat-icon active">
                            <Users size={20} />
                        </div>
                        <div className="Owner-Contract-stat-info">
                            <span className="Owner-Contract-stat-number">{stats.active}</span>
                            <span className="Owner-Contract-stat-label">Active</span>
                        </div>
                    </div>
                    <div className="Owner-Contract-stat-card">
                        <div className="Owner-Contract-stat-icon pending">
                            <Clock size={20} />
                        </div>
                        <div className="Owner-Contract-stat-info">
                            <span className="Owner-Contract-stat-number">{stats.pending}</span>
                            <span className="Owner-Contract-stat-label">Pending</span>
                        </div>
                    </div>
                    <div className="Owner-Contract-stat-card">
                        <div className="Owner-Contract-stat-icon termination">
                            <AlertTriangle size={20} />
                        </div>
                        <div className="Owner-Contract-stat-info">
                            <span className="Owner-Contract-stat-number">{stats.terminationRequests}</span>
                            <span className="Owner-Contract-stat-label">Termination Requests</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="Owner-Contract-control-bar">
                <div className="Owner-Contract-tab-group">
                    <button
                        className={`Owner-Contract-tab-btn ${activeTab === "tenants" ? "Owner-Contract-tab-active" : ""}`}
                        onClick={() => setActiveTab("tenants")}
                    >
                        <FileText size={16} />
                        Active Contracts
                        <span className="Owner-Contract-tab-badge">{stats.total}</span>
                    </button>
                    <button
                        className={`Owner-Contract-tab-btn ${activeTab === "issue" ? "Owner-Contract-tab-active" : ""}`}
                        onClick={() => setActiveTab("issue")}
                    >
                        <User size={16} />
                        Issue New Contracts
                        <span className="Owner-Contract-tab-badge">{stats.pending}</span>
                    </button>
                </div>
            </div>

            {/* Active Contracts Tab */}
            {activeTab === "tenants" && (
                <div className="Owner-Contract-content-card">
                    <div className="Owner-Contract-table-header">
                        <h3>Active Contracts</h3>
                        <p>Manage and view all tenant rental agreements</p>
                    </div>

                    {loading ? (
                        <div className="Owner-Contract-loading">
                            <div className="Owner-Contract-loading-spinner"></div>
                            <p>Loading contracts...</p>
                        </div>
                    ) : (
                        <div className="Owner-Contract-grid">
                            {contracts.length === 0 ? (
                                <div className="Owner-Contract-empty">
                                    <FileText size={48} className="Owner-Contract-empty-icon" />
                                    <h3>No contracts found</h3>
                                    <p>There are no active contracts at the moment.</p>
                                </div>
                            ) : (
                                contracts.map((contract, index) => {
                                    const profileImage = getProfileImage(contract);
                                    const isActiveContract = contract.status === 'Active';
                                    const isTerminationRequested = contract.status === 'Termination Requested';
                                    
                                    return (
                                        <div className="Owner-Contract-card" key={index}>
                                            <div className="Owner-Contract-card-header">
                                                <div className="Owner-Contract-tenant-avatar">
                                                    {profileImage ? (
                                                        <>
                                                            <img 
                                                                src={profileImage} 
                                                                alt={contract.fullname}
                                                                className="Owner-Contract-avatar-image"
                                                                onError={(e) => handleImageError(e, contract)}
                                                            />
                                                            <div className="Owner-Contract-avatar-fallback" style={{display: 'none'}}>
                                                                <User size={20} />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="Owner-Contract-avatar-fallback">
                                                            <User size={20} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="Owner-Contract-tenant-info">
                                                    <h3>{contract.fullname}</h3>
                                                    <span className="Owner-Contract-tenant-email">{contract.email}</span>
                                                    <div className={`Owner-Contract-status-badge ${contract.status.toLowerCase().replace(' ', '-')}`}>
                                                        {contract.status}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="Owner-Contract-card-details">
                                                <div className="Owner-Contract-detail-item">
                                                    <Home size={16} />
                                                    <span>{contract.unit_name}</span>
                                                </div>
                                                <div className="Owner-Contract-detail-item">
                                                    <DollarSign size={16} />
                                                    <span>₱{contract.unit_price}/month</span>
                                                </div>
                                                <div className="Owner-Contract-detail-item">
                                                    <Calendar size={16} />
                                                    <span>Started {new Date(contract.start_date).toLocaleDateString()}</span>
                                                </div>
                                                {contract.end_date && (
                                                    <div className="Owner-Contract-detail-item">
                                                        <Calendar size={16} />
                                                        <span>Ends {new Date(contract.end_date).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="Owner-Contract-card-actions">
                                                <button
                                                    className="Owner-Contract-view-btn"
                                                    onClick={() => handleViewExistingContract(contract)}
                                                >
                                                    <Eye size={16} />
                                                    View
                                                </button>
                                                
                                                {isActiveContract && (
                                                    <button
                                                        className="Owner-Contract-terminate-btn"
                                                        onClick={() => openTerminateModal(contract)}
                                                    >
                                                        <FileX size={16} />
                                                        End Tenancy
                                                    </button>
                                                )}
                                                
                                                {isTerminationRequested && (
                                                    <div className="Owner-Contract-approval-actions">
                                                        <button
                                                            className="Owner-Contract-approve-btn"
                                                            onClick={() => openApproveModal(contract)}
                                                        >
                                                            <FileCheck size={16} />
                                                            Review Request
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Issue Contracts Tab */}
            {activeTab === "issue" && (
                <div className="Owner-Contract-content-card">
                    <div className="Owner-Contract-table-header">
                        <h3>Applicants Ready for Contract Issuance</h3>
                        <p>Select an applicant to generate and issue a rental contract</p>
                    </div>

                    {loading ? (
                        <div className="Owner-Contract-loading">
                            <div className="Owner-Contract-loading-spinner"></div>
                            <p>Loading applicants...</p>
                        </div>
                    ) : (
                        <div className="Owner-Contract-table-wrapper">
                            <table className="Owner-Contract-table">
                                <thead>
                                    <tr>
                                        <th>Applicant</th>
                                        <th>Contact Information</th>
                                        <th>Unit Details</th>
                                        <th>Monthly Rent</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {applicants.length > 0 ? (
                                        applicants.map((app, i) => {
                                            const profileImage = getProfileImage(app);
                                            return (
                                                <tr
                                                    key={i}
                                                    className={`Owner-Contract-table-row ${highlightedApplicantId === app.applicationid ? "Owner-Contract-highlight-row" : ""}`}
                                                >
                                                    <td>
                                                        <div className="Owner-Contract-applicant-info">
                                                            <span className="Owner-Contract-applicant-name">{app.fullname}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="Owner-Contract-contact-info">
                                                            <span className="Owner-Contract-contact-email">
                                                                <Mail size={12} />
                                                                {app.email}
                                                            </span>
                                                            <span className="Owner-Contract-contact-phone">
                                                                <Phone size={12} />
                                                                {app.phone}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="Owner-Contract-unit-info">
                                                            <Home size={12} />
                                                            {app.unit_name}
                                                        </div>
                                                    </td>
                                                    <td className="Owner-Contract-amount">
                                                        ₱{parseFloat(app.unit_price || 0).toLocaleString()}
                                                    </td>
                                                    <td>
                                                        <button 
                                                            className="Owner-Contract-issue-btn"
                                                            onClick={() => openIssueModal(app)}
                                                        >
                                                            <FileText size={14} />
                                                            Issue Contract
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="Owner-Contract-empty-state">
                                                <User size={48} />
                                                <p>No applicants ready for contract issuance</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Issue Contract Modal */}
            {showAddModal && selectedApplicant && (
                <div className="Owner-Contract-modal-overlay">
                    <div className="Owner-Contract-modal Owner-Contract-issue-modal">
                        <div className="Owner-Contract-modal-header">
                            <h3>Issue Rental Contract</h3>
                            <button className="Owner-Contract-close-btn" onClick={() => setShowAddModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="Owner-Contract-modal-body">
                            {/* Applicant Summary */}
                            <div className="Owner-Contract-applicant-summary">
                                <div className="Owner-Contract-applicant-avatar">
                                    {getProfileImage(selectedApplicant) ? (
                                        <>
                                            <img 
                                                src={getProfileImage(selectedApplicant)} 
                                                alt={selectedApplicant.fullname}
                                                className="Owner-Contract-modal-avatar-image"
                                                onError={(e) => handleImageError(e, selectedApplicant)}
                                            />
                                            <div className="Owner-Contract-modal-avatar-fallback" style={{display: 'none'}}>
                                                <User size={24} />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="Owner-Contract-modal-avatar-fallback">
                                            <User size={24} />
                                        </div>
                                    )}
                                </div>
                                <div className="Owner-Contract-applicant-details">
                                    <h4>{selectedApplicant.fullname}</h4>
                                    <p>{selectedApplicant.unit_name}</p>
                                </div>
                            </div>

                            {/* Contract Details Form */}
                            <div className="Owner-Contract-form-grid">
                                <div className="Owner-Contract-form-group">
                                    <label className="Owner-Contract-form-label">Start Date</label>
                                    <input
                                        type="date"
                                        name="startdate"
                                        value={formData.startdate}
                                        onChange={handleInputChange}
                                        className="Owner-Contract-form-input"
                                    />
                                </div>

                                <div className="Owner-Contract-form-group">
                                    <label className="Owner-Contract-form-label">Monthly Rent (₱)</label>
                                    <input
                                        type="number"
                                        name="monthlyrent"
                                        value={formData.monthlyrent}
                                        onChange={handleInputChange}
                                        className="Owner-Contract-form-input"
                                    />
                                </div>

                                <div className="Owner-Contract-form-group">
                                    <label className="Owner-Contract-form-label">Security Deposit (₱)</label>
                                    <input
                                        type="number"
                                        name="deposit"
                                        value={formData.deposit}
                                        onChange={handleInputChange}
                                        className="Owner-Contract-form-input"
                                    />
                                </div>

                                <div className="Owner-Contract-form-group">
                                    <label className="Owner-Contract-form-label">Advance Payment (₱)</label>
                                    <input
                                        type="number"
                                        name="advancepayment"
                                        value={formData.advancepayment}
                                        onChange={handleInputChange}
                                        className="Owner-Contract-form-input"
                                    />
                                </div>
                            </div>

                            <div className="Owner-Contract-form-group">
                                <label className="Owner-Contract-form-label">Remarks</label>
                                <textarea
                                    name="remarks"
                                    value={formData.remarks}
                                    onChange={handleInputChange}
                                    className="Owner-Contract-form-textarea"
                                    placeholder="Additional contract notes..."
                                    rows="3"
                                />
                            </div>

                            {/* Signature Section */}
                            <div className="Owner-Contract-signature-section">
                                <label className="Owner-Contract-form-label">Owner Signature</label>
                                <div className="Owner-Contract-signature-container">
                                    <SignatureCanvas
                                        ref={sigPadRef}
                                        penColor="black"
                                        canvasProps={{
                                            width: 400,
                                            height: 150,
                                            className: "Owner-Contract-sigCanvas",
                                        }}
                                    />
                                    <button className="Owner-Contract-clear-btn" onClick={clearSignature}>
                                        Clear Signature
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="Owner-Contract-modal-footer">
                            <button className="Owner-Contract-cancel-btn" onClick={() => setShowAddModal(false)}>
                                Cancel
                            </button>
                            <button className="Owner-Contract-generate-btn" onClick={handleGeneratePDF}>
                                <FileText size={16} />
                                Generate Contract PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Termination Modal */}
            {showTerminateModal && selectedContract && (
                <div className="Owner-Contract-modal-overlay">
                    <div className="Owner-Contract-modal Owner-Contract-terminate-modal">
                        <div className="Owner-Contract-modal-header">
                            <h3>End Tenancy</h3>
                            <button className="Owner-Contract-close-btn" onClick={() => setShowTerminateModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="Owner-Contract-modal-body">
                            <div className="Owner-Contract-terminate-warning">
                                <div className="Owner-Contract-warning-icon">
                                    <AlertTriangle size={24} />
                                </div>
                                <div className="Owner-Contract-warning-content">
                                    <h4>You are about to end this tenancy</h4>
                                    <p>This action cannot be undone. The tenant will be notified and the contract status will be updated to "Terminated".</p>
                                </div>
                            </div>

                            <div className="Owner-Contract-terminate-details">
                                <div className="Owner-Contract-detail-row">
                                    <span className="Owner-Contract-detail-label">Tenant:</span>
                                    <span className="Owner-Contract-detail-value">{selectedContract.fullname}</span>
                                </div>
                                <div className="Owner-Contract-detail-row">
                                    <span className="Owner-Contract-detail-label">Unit:</span>
                                    <span className="Owner-Contract-detail-value">{selectedContract.unit_name}</span>
                                </div>
                                <div className="Owner-Contract-detail-row">
                                    <span className="Owner-Contract-detail-label">Current Rent:</span>
                                    <span className="Owner-Contract-detail-value">₱{parseFloat(selectedContract.unit_price || 0).toLocaleString()}</span>
                                </div>
                                <div className="Owner-Contract-detail-row">
                                    <span className="Owner-Contract-detail-label">Current Status:</span>
                                    <span className="Owner-Contract-detail-value">{selectedContract.status}</span>
                                </div>
                            </div>

                            <div className="Owner-Contract-form-group">
                                <label className="Owner-Contract-form-label">
                                    Termination Date
                                    <span className="Owner-Contract-date-note">(Must be between 2 weeks and 30 days from today)</span>
                                </label>
                                <input
                                    type="date"
                                    value={terminationDate}
                                    onChange={(e) => setTerminationDate(e.target.value)}
                                    className="Owner-Contract-form-input"
                                    min={minDateString}
                                    max={maxDateString}
                                />
                                <div className="Owner-Contract-date-info">
                                    <Calendar size={14} />
                                    <span>Tenancy will end on: {new Date(terminationDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="Owner-Contract-modal-footer">
                            <button 
                                className="Owner-Contract-cancel-btn" 
                                onClick={() => setShowTerminateModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="Owner-Contract-terminate-confirm-btn"
                                onClick={showConfirmation}
                                disabled={!terminationDate}
                            >
                                <ArrowRight size={16} />
                                Proceed to Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && selectedContract && (
                <div className="Owner-Contract-modal-overlay">
                    <div className="Owner-Contract-modal Owner-Contract-confirm-modal">
                        <div className="Owner-Contract-modal-header">
                            <h3>Confirm Termination</h3>
                            <button className="Owner-Contract-close-btn" onClick={() => setShowConfirmModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="Owner-Contract-modal-body">
                            <div className="Owner-Contract-confirm-warning">
                                <div className="Owner-Contract-confirm-icon">
                                    <AlertCircle size={48} />
                                </div>
                                <div className="Owner-Contract-confirm-content">
                                    <h4>Are you sure you want to terminate this contract?</h4>
                                    <p>This action will:</p>
                                    <ul className="Owner-Contract-confirm-list">
                                        <li>End the tenancy for <strong>{selectedContract.fullname}</strong></li>
                                        <li>Terminate the contract for <strong>{selectedContract.unit_name}</strong></li>
                                        <li>Set the termination date to <strong>{new Date(terminationDate).toLocaleDateString()}</strong></li>
                                        <li>Send notifications to both tenant and landlord</li>
                                        <li><strong>This action cannot be undone</strong></li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="Owner-Contract-modal-footer">
                            <button 
                                className="Owner-Contract-cancel-btn" 
                                onClick={() => setShowConfirmModal(false)}
                            >
                                No, Go Back
                            </button>
                            <button 
                                className="Owner-Contract-terminate-final-btn"
                                onClick={handleTerminateContract}
                            >
                                <FileX size={16} />
                                Yes, Terminate Contract
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && successModalData && (
                <div className="Owner-Contract-success-modal-overlay">
                    <div className="Owner-Contract-success-modal">
                        <div className="Owner-Contract-success-modal-content">
                            <div className="Owner-Contract-success-animation-container">
                                <div className="Owner-Contract-success-checkmark">
                                    <CheckCircle size={80} className="Owner-Contract-check-icon" />
                                </div>
                                <div className="Owner-Contract-success-confetti">
                                    {[...Array(12)].map((_, i) => (
                                        <div key={i} className="Owner-Contract-confetti-piece"></div>
                                    ))}
                                </div>
                            </div>
                            
                            <h2 className="Owner-Contract-success-title">Contract Created Successfully!</h2>
                            
                            <p className="Owner-Contract-success-message">
                                The rental contract has been generated and issued to the tenant.
                            </p>

                            <div className="Owner-Contract-success-details">
                                <div className="Owner-Contract-success-detail-item">
                                    <span className="Owner-Contract-detail-label">Applicant Name:</span>
                                    <span className="Owner-Contract-detail-value">
                                        {successModalData.applicantName}
                                    </span>
                                </div>
                                <div className="Owner-Contract-success-detail-item">
                                    <span className="Owner-Contract-detail-label">Unit:</span>
                                    <span className="Owner-Contract-detail-value">
                                        {successModalData.unitName}
                                    </span>
                                </div>
                                <div className="Owner-Contract-success-detail-item">
                                    <span className="Owner-Contract-detail-label">Start Date:</span>
                                    <span className="Owner-Contract-detail-value">
                                        {new Date(successModalData.startDate).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="Owner-Contract-success-detail-item">
                                    <span className="Owner-Contract-detail-label">Monthly Rent:</span>
                                    <span className="Owner-Contract-detail-value">
                                        ₱{parseFloat(successModalData.monthlyRent || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="Owner-Contract-success-detail-item">
                                    <span className="Owner-Contract-detail-label">Issued On:</span>
                                    <span className="Owner-Contract-detail-value">
                                        {successModalData.issuedDate}
                                    </span>
                                </div>
                            </div>

                            <div className="Owner-Contract-success-modal-actions">
                                <button 
                                    className="Owner-Contract-view-contract-btn"
                                    onClick={handleViewContract}
                                >
                                    <FileText size={16} />
                                    View Contract
                                </button>
                                <button 
                                    className="Owner-Contract-success-close-btn"
                                    onClick={handleCloseSuccessModal}
                                >
                                    <Check size={16} />
                                    Continue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Approve Termination Modal */}
            {showApproveModal && selectedContract && (
                <div className="Owner-Contract-modal-overlay">
                    <div className="Owner-Contract-modal Owner-Contract-approve-modal">
                        <div className="Owner-Contract-modal-header">
                            <h3>Review Termination Request</h3>
                            <button className="Owner-Contract-close-btn" onClick={() => setShowApproveModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="Owner-Contract-modal-body">
                            <div className="Owner-Contract-approve-warning">
                                <div className="Owner-Contract-warning-icon">
                                    <Info size={24} />
                                </div>
                                <div className="Owner-Contract-warning-content">
                                    <h4>Tenant Termination Request</h4>
                                    <p>{selectedContract.fullname} has requested to terminate their tenancy.</p>
                                </div>
                            </div>

                            <div className="Owner-Contract-terminate-details">
                                <div className="Owner-Contract-detail-row">
                                    <span className="Owner-Contract-detail-label">Tenant:</span>
                                    <span className="Owner-Contract-detail-value">{selectedContract.fullname}</span>
                                </div>
                                <div className="Owner-Contract-detail-row">
                                    <span className="Owner-Contract-detail-label">Unit:</span>
                                    <span className="Owner-Contract-detail-value">{selectedContract.unit_name}</span>
                                </div>
                                <div className="Owner-Contract-detail-row">
                                    <span className="Owner-Contract-detail-label">Current Rent:</span>
                                    <span className="Owner-Contract-detail-value">₱{parseFloat(selectedContract.unit_price || 0).toLocaleString()}</span>
                                </div>
                                <div className="Owner-Contract-detail-row">
                                    <span className="Owner-Contract-detail-label">Requested Move-out:</span>
                                    <span className="Owner-Contract-detail-value">
                                        {selectedContract.end_date ? new Date(selectedContract.end_date).toLocaleDateString() : 'Not specified'}
                                    </span>
                                </div>
                            </div>

                            <div className="Owner-Contract-approval-options">
                                <h4>What would you like to do?</h4>
                                <p>You can either approve the termination request or reject it.</p>
                            </div>
                        </div>

                        <div className="Owner-Contract-modal-footer">
                            <button 
                                className="Owner-Contract-reject-btn" 
                                onClick={handleRejectTermination}
                            >
                                <X size={16} />
                                Reject Request
                            </button>
                            <button 
                                className="Owner-Contract-approve-final-btn"
                                onClick={handleApproveTermination}
                            >
                                <Check size={16} />
                                Approve Termination
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OwnerContract;