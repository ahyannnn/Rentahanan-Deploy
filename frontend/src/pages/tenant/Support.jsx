import React, { useState, useEffect } from "react";
import { Search, Plus, FileText, Clock, CheckCircle, AlertCircle, Home, DollarSign, Settings, HelpCircle, X, Upload, Image, Trash2, Info } from "lucide-react";
import "../../styles/tenant/Support.css";

const Support = () => {
    const [isNewConcernModalOpen, setIsNewConcernModalOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [concerns, setConcerns] = useState([]);
    const [formData, setFormData] = useState({
        tenantid: "",
        concerntype: "",
        subject: "",
        description: "",
        tenantimage: null,
    });
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
    const [concernToDelete, setConcernToDelete] = useState(null);

    // ✅ ADD API BASE
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://rentahanan.onrender.com";

    // ✅ ADD: Get image URL function (consistent with other components)
    const getImageUrl = (imagePath, folder = 'concerns') => {
        if (!imagePath) return null;
        
        // If it's already a full URL (Cloudinary), use it directly
        if (imagePath.startsWith('http')) {
            return imagePath;
        }
        
        // Otherwise, construct the local path
        return `${API_BASE}/uploads/${folder}/${imagePath}`;
    };

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            const parsedUser = JSON.parse(userData);
            if (parsedUser.tenantid) {
                setFormData((prev) => ({ ...prev, tenantid: parsedUser.tenantid }));
                fetchConcerns(parsedUser.tenantid);
            }
        }
    }, []);

    const fetchConcerns = (tenantId) => {
        // ✅ UPDATED API ENDPOINT
        fetch(`${API_BASE}/api/get-concerns/${tenantId}`)
            .then((res) => res.json())
            .then((data) => setConcerns(data))
            .catch((err) => console.error("Error fetching concerns:", err));
    };

    const handleOpenNewConcernModal = () => setIsNewConcernModalOpen(true);
    const handleCloseNewConcernModal = () => {
        setIsNewConcernModalOpen(false);
        setFormData({
            ...formData,
            concerntype: "",
            subject: "",
            description: "",
            tenantimage: null,
        });
    };

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData({ ...formData, [id]: value });
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, tenantimage: e.target.files[0] });
    };

    const handleSubmitConcern = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (!formData.tenantid || !formData.concerntype || !formData.subject || !formData.description || !formData.tenantimage) {
            alert("⚠️ All fields including an image are required!");
            setIsSubmitting(false);
            return;
        }

        try {
            const formDataToSend = new FormData();
            Object.keys(formData).forEach((key) => {
                formDataToSend.append(key, formData[key]);
            });

            // ✅ UPDATED API ENDPOINT
            const res = await fetch(`${API_BASE}/api/add-concerns`, {
                method: "POST",
                body: formDataToSend,
            });

            const data = await res.json();

            if (res.ok) {
                setShowSuccessModal(true);
                fetchConcerns(formData.tenantid);
                handleCloseNewConcernModal();
            } else {
                alert(data.error || "❌ Failed to submit concern");
            }
        } catch (error) {
            console.error("Error submitting concern:", error);
            alert("❌ Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
    };

    // ✅ Delete concern function
    const handleDeleteClick = (concernId, e) => {
        if (e) e.stopPropagation();
        const concern = concerns.find(c => c.concernid === concernId);
        setConcernToDelete(concern);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!concernToDelete) return;
        
        setIsDeleting(true);
        try {
            // ✅ UPDATED API ENDPOINT
            const res = await fetch(`${API_BASE}/api/delete-concern-tenant/${concernToDelete.concernid}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (res.ok) {
                // Remove from local state
                setConcerns(concerns.filter(concern => concern.concernid !== concernToDelete.concernid));
                setShowDeleteModal(false);
                setConcernToDelete(null);
                
                // Show success modal instead of alert
                setShowDeleteSuccessModal(true);
                
            } else {
                alert(data.error || "❌ Failed to delete concern");
            }
        } catch (error) {
            console.error("Error deleting concern:", error);
            alert("❌ Something went wrong. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
        setConcernToDelete(null);
    };

    const handleCloseDeleteSuccessModal = () => {
        setShowDeleteSuccessModal(false);
    };

    const filteredConcerns = concerns.filter((concern) => {
        const matchesSearch =
            concern.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            concern.concerntype?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            concern.concernid?.toString().includes(searchTerm);
        
        if (activeFilter === "all") return matchesSearch;
        if (activeFilter === "pending") return concern.status === "Pending" && matchesSearch;
        if (activeFilter === "completed") return concern.status === "Resolved" && matchesSearch;
        return matchesSearch;
    });

    const getStatusIcon = (status) => {
        return status === "Pending" ? <Clock size={16} /> : <CheckCircle size={16} />;
    };

    const getCategoryIcon = (category) => {
        const icons = {
            Maintenance: <Settings size={18} />,
            Billing: <DollarSign size={18} />,
            Contract: <FileText size={18} />,
            Other: <HelpCircle size={18} />,
        };
        return icons[category] || <HelpCircle size={18} />;
    };

    return (
        <div className="support-container-Tenant-Support">
            {/* Header */}
            <div className="page-header-Tenant-Support">
                <div className="header-content-Tenant-Support">
                    <h2 
                        className="page-title-Tenant-Support"
                        title="Manage and track your reported issues and concerns"
                    >
                        Support & Concerns
                    </h2>
                    <p 
                        className="page-description-Tenant-Support"
                        title="Report new issues and monitor the status of existing concerns"
                    >
                        Track the status of your reported issues and create new concerns
                    </p>
                </div>
            </div>

            {/* Controls - Removed the 3 stats cards */}
            <div className="support-top-controls-Tenant-Support">
                <div className="search-container-Tenant-Support">
                    <div className="search-box-Tenant-Support">
                        <Search size={20} className="search-icon-Tenant-Support" />
                        <input
                            type="text"
                            placeholder="Search concerns by ID, subject, or type..."
                            className="search-input-Tenant-Support"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            title="Search through your concerns by ID, subject, or type"
                        />
                    </div>
                </div>

                <div className="controls-right-Tenant-Support">
                    <div className="filter-tabs-Tenant-Support">
                        <button
                            className={`filter-btn-Tenant-Support ${
                                activeFilter === "all" ? "filter-btn-active-Tenant-Support" : ""
                            }`}
                            onClick={() => setActiveFilter("all")}
                            title="Show all concerns regardless of status"
                        >
                            All
                            <span className="filter-count-Tenant-Support">{concerns.length}</span>
                        </button>
                        <button
                            className={`filter-btn-Tenant-Support ${
                                activeFilter === "pending" ? "filter-btn-active-Tenant-Support" : ""
                            }`}
                            onClick={() => setActiveFilter("pending")}
                            title="Show only pending concerns awaiting resolution"
                        >
                            Pending
                            <span className="filter-count-Tenant-Support">
                                {concerns.filter(c => c.status === "Pending").length}
                            </span>
                        </button>
                        <button
                            className={`filter-btn-Tenant-Support ${
                                activeFilter === "completed" ? "filter-btn-active-Tenant-Support" : ""
                            }`}
                            onClick={() => setActiveFilter("completed")}
                            title="Show resolved concerns"
                        >
                            Resolved
                            <span className="filter-count-Tenant-Support">
                                {concerns.filter(c => c.status === "Resolved").length}
                            </span>
                        </button>
                    </div>

                    <button 
                        className="new-concern-btn-Tenant-Support" 
                        onClick={handleOpenNewConcernModal}
                        title="Report a new issue or concern"
                    >
                        <Plus size={20} />
                        New Concern
                    </button>
                </div>
            </div>

            {/* Concerns List */}
            <div className="concerns-list-Tenant-Support">
                {filteredConcerns.length > 0 ? (
                    filteredConcerns.map((concern) => (
                        <div 
                            key={concern.concernid} 
                            className="concern-card-Tenant-Support"
                            title={`${concern.concerntype}: ${concern.subject}`}
                        >
                            <div className="card-header-Tenant-Support">
                                <div 
                                    className="category-badge-Tenant-Support"
                                    title={`Concern type: ${concern.concerntype}`}
                                >
                                    <span className="category-icon-Tenant-Support">
                                        {getCategoryIcon(concern.concerntype)}
                                    </span>
                                    {concern.concerntype}
                                </div>
                                <span
                                    className={`concern-status-Tenant-Support status-${concern.status.toLowerCase()}-Tenant-Support`}
                                    title={`Current status: ${concern.status}`}
                                >
                                    <span className="status-icon-Tenant-Support">
                                        {getStatusIcon(concern.status)}
                                    </span>
                                    {concern.status}
                                </span>
                            </div>

                            <div className="concern-content-Tenant-Support">
                                <h4 
                                    className="concern-title-Tenant-Support"
                                    title={`Subject: ${concern.subject}`}
                                >
                                    {concern.subject}
                                </h4>
                                <p 
                                    className="concern-description-Tenant-Support"
                                    title={`Description: ${concern.description}`}
                                >
                                    {concern.description}
                                </p>
                            </div>

                            <div className="card-footer-Tenant-Support">
                                <div className="concern-meta-Tenant-Support">
                                    <div className="meta-item-Tenant-Support">
                                        <span className="meta-label-Tenant-Support">Concern ID</span>
                                        <span 
                                            className="meta-value-Tenant-Support"
                                            title={`Unique concern identifier: #${concern.concernid}`}
                                        >
                                            #{concern.concernid}
                                        </span>
                                    </div>
                                    <div className="meta-item-Tenant-Support">
                                        <span className="meta-label-Tenant-Support">Date Reported</span>
                                        <span 
                                            className="meta-value-Tenant-Support date-value-Tenant-Support"
                                            title={`Reported on: ${concern.creationdate}`}
                                        >
                                            <Clock size={14} />
                                            {concern.creationdate}
                                        </span>
                                    </div>
                                </div>

                                <div className="image-actions-Tenant-Support">
                                    {concern.tenantimage && (
                                        <button
                                            className="view-image-btn-Tenant-Support"
                                            onClick={() =>
                                                window.open(getImageUrl(concern.tenantimage, 'concerns'), "_blank")
                                            }
                                            title="View the image you attached to this concern"
                                        >
                                            <Image size={16} />
                                            View Image
                                        </button>
                                    )}
                                    {concern.landlordimage && (
                                        <button
                                            className="view-image-btn-Tenant-Support landlord"
                                            onClick={() =>
                                                window.open(getImageUrl(concern.landlordimage, 'concerns'), "_blank")
                                            }
                                            title="View the property owner's response image"
                                        >
                                            <Image size={16} />
                                            Owner's Response
                                        </button>
                                    )}
                                    {/* Delete Button - Only show for resolved concerns */}
                                    {concern.status === "Resolved" && (
                                        <button
                                            className="delete-concern-btn-Tenant-Support"
                                            onClick={(e) => handleDeleteClick(concern.concernid, e)}
                                            disabled={isDeleting}
                                            title="Remove this concern from your view (owner will still see it)"
                                        >
                                            <Trash2 size={16} />
                                            {isDeleting ? "Deleting..." : "Delete"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-concerns-Tenant-Support">
                        <div className="no-concerns-icon-Tenant-Support">
                            <FileText size={64} />
                        </div>
                        <h3 className="no-concerns-title-Tenant-Support">No concerns found</h3>
                        <p className="no-concerns-description-Tenant-Support">
                            {searchTerm
                                ? "No concerns match your search criteria."
                                : "You haven't reported any concerns yet."}
                        </p>
                        {!searchTerm && (
                            <button 
                                className="no-concerns-btn-Tenant-Support" 
                                onClick={handleOpenNewConcernModal}
                                title="Start reporting your first issue or concern"
                            >
                                <Plus size={20} />
                                Report Your First Concern
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* New Concern Modal */}
            {isNewConcernModalOpen && (
                <div className="modal-overlay-Tenant-Support" onClick={handleCloseNewConcernModal}>
                    <div className="concern-modal-Tenant-Support" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-Tenant-Support">
                            <button 
                                className="back-btn-Tenant-Support" 
                                onClick={handleCloseNewConcernModal}
                                title="Close concern form"
                            >
                                <X size={20} />
                            </button>
                            <h3 
                                className="modal-title-Tenant-Support"
                                title="Fill out the form to report a new issue"
                            >
                                Create New Concern
                            </h3>
                            <div className="modal-header-spacer-Tenant-Support"></div>
                        </div>

                        <div className="modal-content-Tenant-Support">
                            <form className="concern-form-Tenant-Support" onSubmit={handleSubmitConcern}>
                                <div className="form-group-Tenant-Support">
                                    <label htmlFor="concerntype" className="form-label-Tenant-Support">
                                        <Settings size={18} />
                                        Concern Type *
                                        <span className="form-tooltip-Tenant-Support" title="Select the category that best describes your issue">
                                            <Info size={14} />
                                        </span>
                                    </label>
                                    <select 
                                        id="concerntype" 
                                        className="form-input-Tenant-Support" 
                                        required 
                                        onChange={handleInputChange}
                                        value={formData.concerntype}
                                        title="Choose the type of concern you're reporting"
                                    >
                                        <option value="">Select Category</option>
                                        <option value="Maintenance">Maintenance</option>
                                        <option value="Billing">Billing</option>
                                        <option value="Contract">Contract</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="form-group-Tenant-Support">
                                    <label htmlFor="subject" className="form-label-Tenant-Support">
                                        <FileText size={18} />
                                        Subject / Title *
                                        <span className="form-tooltip-Tenant-Support" title="Brief summary of your concern">
                                            <Info size={14} />
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        id="subject"
                                        className="form-input-Tenant-Support"
                                        placeholder="e.g., Water Leakage in Unit 1"
                                        required
                                        onChange={handleInputChange}
                                        value={formData.subject}
                                        title="Enter a clear and concise subject for your concern"
                                    />
                                </div>

                                <div className="form-group-Tenant-Support">
                                    <label htmlFor="description" className="form-label-Tenant-Support">
                                        <HelpCircle size={18} />
                                        Details / Description *
                                        <span className="form-tooltip-Tenant-Support" title="Provide detailed information about the issue">
                                            <Info size={14} />
                                        </span>
                                    </label>
                                    <textarea
                                        id="description"
                                        className="form-input-Tenant-Support textarea-Tenant-Support"
                                        rows="4"
                                        placeholder="Please provide detailed information about your concern..."
                                        required
                                        onChange={handleInputChange}
                                        value={formData.description}
                                        title="Describe your concern in detail including location, time, and any relevant information"
                                    ></textarea>
                                </div>

                                <div className="form-group-Tenant-Support">
                                    <label className="form-label-Tenant-Support">
                                        <Upload size={18} />
                                        Attachment *
                                        <span className="form-tooltip-Tenant-Support" title="Upload an image that shows the issue">
                                            <Info size={14} />
                                        </span>
                                    </label>
                                    <div className="upload-container-Tenant-Support">
                                        <div 
                                            className="upload-box-Tenant-Support"
                                            title="Click to upload an image of the issue"
                                        >
                                            <div className="upload-icon-Tenant-Support">
                                                <Image size={32} />
                                            </div>
                                            <div className="upload-text-Tenant-Support">
                                                <p className="upload-title-Tenant-Support">Upload supporting image</p>
                                                <p className="upload-subtitle-Tenant-Support">
                                                    Supports JPG, PNG up to 10MB
                                                </p>
                                            </div>
                                            <label className="upload-btn-Tenant-Support">
                                                Choose File
                                                <input
                                                    type="file"
                                                    className="file-input-Tenant-Support"
                                                    onChange={handleFileChange}
                                                    required
                                                    accept="image/*"
                                                    title="Select an image file to upload"
                                                />
                                            </label>
                                            {formData.tenantimage && (
                                                <div 
                                                    className="file-preview-Tenant-Support"
                                                    title={`Selected file: ${formData.tenantimage.name}`}
                                                >
                                                    Selected: {formData.tenantimage.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer-Tenant-Support">
                                    <div className="footer-actions-Tenant-Support">
                                        <button
                                            type="button"
                                            className="cancel-btn-Tenant-Support"
                                            onClick={handleCloseNewConcernModal}
                                            title="Cancel and close the form"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="submit-btn-Tenant-Support"
                                            disabled={isSubmitting}
                                            title={isSubmitting ? "Submitting your concern..." : "Submit your concern for review"}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <div className="loading-spinner-Tenant-Support"></div>
                                                    Submitting...
                                                </>
                                            ) : (
                                                <>
                                                    Submit Concern
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="modal-overlay-Tenant-Support success-modal-overlay">
                    <div className="success-modal-Tenant-Support">
                        <div className="success-modal-content-Tenant-Support">
                            <div className="success-animation-container-Tenant-Support">
                                <div className="success-checkmark-Tenant-Support">
                                    <CheckCircle size={80} className="check-icon-Tenant-Support" />
                                </div>
                                <div className="success-confetti-Tenant-Support">
                                    {[...Array(12)].map((_, i) => (
                                        <div key={i} className="confetti-piece-Tenant-Support"></div>
                                    ))}
                                </div>
                            </div>
                            
                            <h2 
                                className="success-title-Tenant-Support"
                                title="Your concern has been successfully submitted"
                            >
                                Concern Submitted Successfully!
                            </h2>
                            
                            <p 
                                className="success-message-Tenant-Support"
                                title="Expected response time and next steps"
                            >
                                Your concern has been submitted and is now under review. We'll get back to you within 24-48 hours.
                            </p>

                            <div className="success-details-Tenant-Support">
                                <div className="success-detail-item-Tenant-Support">
                                    <span className="detail-label-Tenant-Support">Status:</span>
                                    <span className="detail-value-Tenant-Support">
                                        <span 
                                            className="status-badge-pending-Tenant-Support"
                                            title="Your concern is awaiting review by the property owner"
                                        >
                                            <Clock size={14} />
                                            Pending Review
                                        </span>
                                    </span>
                                </div>
                                <div className="success-detail-item-Tenant-Support">
                                    <span className="detail-label-Tenant-Support">Submitted:</span>
                                    <span 
                                        className="detail-value-Tenant-Support"
                                        title={`Submitted on ${new Date().toLocaleDateString()}`}
                                    >
                                        {new Date().toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <button 
                                className="success-close-btn-Tenant-Support"
                                onClick={handleCloseSuccessModal}
                                title="Return to concerns list"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ DELETE CONFIRMATION MODAL */}
            {showDeleteModal && concernToDelete && (
                <div className="modal-overlay-Tenant-Support delete-modal-overlay-Tenant-Support">
                    <div className="delete-modal-Tenant-Support">
                        <div className="delete-modal-icon-Tenant-Support">
                            <Trash2 size={48} />
                        </div>
                        <div className="delete-modal-content-Tenant-Support">
                            <h3 
                                className="delete-modal-title-Tenant-Support"
                                title="Confirm removal of this concern from your view"
                            >
                                Delete From Your View?
                            </h3>
                            <p 
                                className="delete-modal-message-Tenant-Support"
                                title="This action only removes the concern from your view, not from the owner's records"
                            >
                                This concern will be removed from your view but the owner will still see it. 
                                If both you and the owner delete this concern, it will be permanently deleted including all images.
                            </p>
                            <div className="delete-modal-details-Tenant-Support">
                                <p><strong>Issue:</strong> {concernToDelete.subject}</p>
                                <p><strong>Type:</strong> {concernToDelete.concerntype}</p>
                                <p><strong>Date Reported:</strong> {concernToDelete.creationdate}</p>
                            </div>
                        </div>
                        <div className="delete-modal-actions-Tenant-Support">
                            <button 
                                className="delete-cancel-btn-Tenant-Support" 
                                onClick={cancelDelete}
                                disabled={isDeleting}
                                title="Keep this concern in your view"
                            >
                                Cancel
                            </button>
                            <button 
                                className="delete-confirm-btn-Tenant-Support" 
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                title={isDeleting ? "Removing concern..." : "Remove this concern from your view"}
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="loading-spinner-Tenant-Support"></div>
                                        Deleting...
                                    </>
                                ) : (
                                    "Yes, Remove From My View"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ DELETE SUCCESS MODAL */}
            {showDeleteSuccessModal && (
                <div className="modal-overlay-Tenant-Support success-modal-overlay">
                    <div className="success-modal-Tenant-Support">
                        <div className="success-modal-content-Tenant-Support">
                            <div className="success-animation-container-Tenant-Support">
                                <div className="success-checkmark-Tenant-Support">
                                    <CheckCircle size={80} className="check-icon-Tenant-Support" />
                                </div>
                                <div className="success-confetti-Tenant-Support">
                                    {[...Array(12)].map((_, i) => (
                                        <div key={i} className="confetti-piece-Tenant-Support"></div>
                                    ))}
                                </div>
                            </div>
                            
                            <h2 
                                className="success-title-Tenant-Support"
                                title="Concern has been removed from your view"
                            >
                                Concern Deleted Successfully!
                            </h2>
                            
                            <p 
                                className="success-message-Tenant-Support"
                                title="The concern is still visible to the property owner"
                            >
                                The concern has been removed from your view. The property owner can still see it in their records.
                            </p>

                            <div className="success-details-Tenant-Support">
                                <div className="success-detail-item-Tenant-Support">
                                    <span className="detail-label-Tenant-Support">Action:</span>
                                    <span className="detail-value-Tenant-Support">
                                        <span 
                                            className="status-badge-pending-Tenant-Support" 
                                            style={{background: '#d4edda', color: '#155724'}}
                                            title="Concern removed from your personal view"
                                        >
                                            <CheckCircle size={14} />
                                            Removed From View
                                        </span>
                                    </span>
                                </div>
                                <div className="success-detail-item-Tenant-Support">
                                    <span className="detail-label-Tenant-Support">Removed:</span>
                                    <span 
                                        className="detail-value-Tenant-Support"
                                        title={`Removed on ${new Date().toLocaleDateString()}`}
                                    >
                                        {new Date().toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <button 
                                className="success-close-btn-Tenant-Support"
                                onClick={handleCloseDeleteSuccessModal}
                                title="Return to concerns list"
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

export default Support;