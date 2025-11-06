import React, { useState, useEffect } from "react";
import {
  Search, ChevronRight, User, Calendar, Wrench, Filter, Download,
  MessageCircle, Clock, CheckCircle, AlertCircle, Trash2
} from "lucide-react";
import "../../styles/owners/Notification.css";

function Notification() {
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  const [problemToDelete, setProblemToDelete] = useState(null);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [problems, setProblems] = useState([]);
  const [uploadedLandlordImage, setUploadedLandlordImage] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ ADD API BASE - same as Billing component
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://rentahanan.onrender.com";

  // ✅ Fetch all concerns from backend (only non-deleted ones) - UPDATED API ENDPOINT
  useEffect(() => {
    const fetchConcerns = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/concerns`);
        const data = await response.json();
        setProblems(data);
      } catch (error) {
        console.error("Error fetching concerns:", error);
      }
    };
    fetchConcerns();
  }, []);

  // ✅ Filter logic
  const filteredProblems = problems.filter(problem => {
    const matchesFilter = activeFilter === "All" || problem.status === activeFilter;
    const matchesSearch =
      (problem.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        problem.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        problem.unit?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const openProblemModal = (problem) => {
    setSelectedProblem(problem);
    setShowProblemModal(true);
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "pending": return <Clock size={16} />;
      case "in progress": return <AlertCircle size={16} />;
      case "resolved": return <CheckCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  // ✅ Updated Delete Function for Owner (Soft Delete) - UPDATED API ENDPOINT
  const handleDeleteClick = (problem, e) => {
    if (e) e.stopPropagation();
    setProblemToDelete(problem);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!problemToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE}/api/delete-concern-landlord/${problemToDelete.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        // Remove from local state
        setProblems(prev => prev.filter(problem => problem.id !== problemToDelete.id));
        setShowDeleteModal(false);
        setProblemToDelete(null);
        if (showProblemModal) setShowProblemModal(false);
        
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
    setProblemToDelete(null);
  };

  const handleCloseDeleteSuccessModal = () => {
    setShowDeleteSuccessModal(false);
  };

  // ✅ UPDATED API ENDPOINT for status update
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedProblem || selectedProblem.status === "Resolved") return;
    try {
      const formData = new FormData();
      formData.append("status", newStatus);

      // If marking as resolved, check if we need to upload an image
      if (newStatus === "Resolved" && !selectedProblem.landlordimage) {
        alert("Please upload a fix photo before marking as resolved.");
        return;
      }

      const response = await fetch(`${API_BASE}/api/concerns/${selectedProblem.id}`, {
        method: "PUT",
        body: formData,
      });

      if (response.ok) {
        const updatedData = await response.json();
        setProblems(prev =>
          prev.map(problem =>
            problem.id === selectedProblem.id ? { ...problem, ...updatedData.concern } : problem
          )
        );
        setSelectedProblem(prev => ({ ...prev, ...updatedData.concern }));
        alert("✅ Status updated successfully!");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "❌ Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("❌ Something went wrong. Please try again.");
    }
  };

  const statusCounts = {
    All: problems.length,
    Pending: problems.filter(p => p.status === "Pending").length,
    "In Progress": problems.filter(p => p.status === "In Progress").length,
    Resolved: problems.filter(p => p.status === "Resolved").length
  };

  // ✅ UPDATED API ENDPOINT for landlord image upload
  const handleUploadLandlordImage = async (file) => {
    if (!file || !selectedProblem) return;

    try {
      const formData = new FormData();
      formData.append("landlordimage", file);
      formData.append("status", "Resolved"); // Auto-mark as resolved when uploading fix photo

      const response = await fetch(`${API_BASE}/api/concerns/${selectedProblem.id}`, {
        method: "PUT",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedProblem((prev) => ({
          ...prev,
          landlordimage: data.concern.landlordimage,
          status: "Resolved"
        }));
        setProblems((prev) =>
          prev.map((p) =>
            p.id === selectedProblem.id
              ? { ...p, landlordimage: data.concern.landlordimage, status: "Resolved" }
              : p
          )
        );
        alert("✅ Fix photo uploaded and issue marked as resolved!");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "❌ Failed to upload fix photo");
      }
    } catch (error) {
      console.error("Error uploading landlord image:", error);
      alert("❌ Something went wrong. Please try again.");
    }
  };

  return (
    <div className="owner-notifications-page-container">
      {/* Header Section */}
      <div className="owner-notifications-header">
        <div className="owner-notifications-title-section">
          <h1>Maintenance Issues</h1>
          <p>Manage and track all tenant-reported problems</p>
        </div>
        <div className="owner-notifications-stats">
          <div className="owner-stat-card">
            <div className="stat-icon pending"><Clock size={20} /></div>
            <div className="stat-info">
              <span className="stat-number">{statusCounts.Pending}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
          <div className="owner-stat-card">
            <div className="stat-icon progress"><AlertCircle size={20} /></div>
            <div className="stat-info">
              <span className="stat-number">{statusCounts["In Progress"]}</span>
              <span className="stat-label">In Progress</span>
            </div>
          </div>
          <div className="owner-stat-card">
            <div className="stat-icon resolved"><CheckCircle size={20} /></div>
            <div className="stat-info">
              <span className="stat-number">{statusCounts.Resolved}</span>
              <span className="stat-label">Resolved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="owner-notifications-content-card">
        <div className="owner-notifications-controls">
          <div className="owner-filter-group">
            <Filter size={18} className="owner-filter-icon" />
            <select
              className="owner-filter-dropdown"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              {Object.keys(statusCounts).map(filter => (
                <option key={filter} value={filter}>
                  {filter} ({statusCounts[filter]})
                </option>
              ))}
            </select>
          </div>

          <div className="owner-notifications-search">
            <Search size={18} className="owner-notifications-search-icon" />
            <input
              type="text"
              placeholder="Search by tenant, unit, or issue..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="owner-notifications-search-input"
            />
          </div>
        </div>

        {/* Problems List */}
        <div className="owner-notifications-list-wrapper">
          {filteredProblems.length === 0 ? (
            <div className="owner-notifications-empty">
              <div className="empty-state">
                <Wrench size={48} className="empty-icon" />
                <h3>No problems found</h3>
                <p>Try adjusting your filters or search terms</p>
              </div>
            </div>
          ) : (
            filteredProblems.map((problem) => (
              <div
                key={problem.id}
                className={`owner-notification-item status-${problem.status.toLowerCase().replace(' ', '-')}`}
                onClick={() => openProblemModal(problem)}
              >
                <div className="owner-notification-header">
                  <div className="owner-notification-main">
                    <div className="owner-notification-icon"><Wrench size={20} /></div>
                    <div className="owner-notification-content">
                      <h4 className="owner-notification-title">{problem.subject}</h4>
                      <p className="owner-notification-description">{problem.description}</p>
                      <div className="owner-notification-meta">
                        <div className="owner-meta-item"><User size={14} /><span>{problem.tenant_name}</span></div>
                        <div className="owner-meta-item"><span className="owner-unit-badge">{problem.unit}</span></div>
                        <div className="owner-meta-item"><Calendar size={14} /><span>{new Date(problem.creationdate).toLocaleDateString()}</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="owner-notification-actions">
                    <div className={`owner-status-badge status-${problem.status.toLowerCase().replace(' ', '-')}`}>
                      {getStatusIcon(problem.status)} {problem.status}
                    </div>
                    <div className="owner-action-buttons">
                      {problem.status === "Resolved" && (
                        <button
                          className="owner-delete-btn"
                          onClick={(e) => handleDeleteClick(problem, e)}
                          title="Delete resolved issue from your view"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <button className="owner-arrow-btn"><ChevronRight size={20} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ✅ Problem Modal */}
      {showProblemModal && selectedProblem && (
        <div className="owner-problem-modal-overlay">
          <div className="owner-problem-modal">
            <div className="owner-problem-modal-header">
              <div className="owner-modal-title-section">
                <h3>{selectedProblem.subject}</h3>
                <div className="owner-modal-badges">
                  <span className={`owner-status-badge status-${selectedProblem.status.toLowerCase().replace(' ', '-')}`}>
                    {getStatusIcon(selectedProblem.status)} {selectedProblem.status}
                  </span>
                </div>
              </div>
              <button className="owner-close-btn" onClick={() => setShowProblemModal(false)}>×</button>
            </div>

            <div className="owner-problem-modal-body">
              <div className="owner-detail-grid">
                <div className="owner-detail-item"><label>Tenant Name</label><p>{selectedProblem.tenant_name}</p></div>
                <div className="owner-detail-item"><label>Unit</label><p>{selectedProblem.unit}</p></div>
                <div className="owner-detail-item"><label>Date Reported</label><p>{new Date(selectedProblem.creationdate).toLocaleString()}</p></div>
              </div>

              <div className="owner-description-section">
                <label>Problem Description</label>
                <p>{selectedProblem.description}</p>
              </div>

              {selectedProblem.image && (
                <div className="owner-problem-photo">
                  <label>Tenant Attached Photo</label>
                  <div className="owner-photo-container">
                    <button
                      className="owner-view-photo-btn"
                      onClick={() =>
                        window.open(`${API_BASE}${selectedProblem.image}`, "_blank", "noopener,noreferrer")
                      }
                    >
                      View Tenant Photo
                    </button>
                  </div>
                </div>
              )}

              {selectedProblem.landlordimage && (
                <div className="owner-problem-photo">
                  <label>Your Fix Photo</label>
                  <div className="owner-photo-container">
                    <button
                      className="owner-view-photo-btn"
                      onClick={() =>
                        window.open(`${API_BASE}${selectedProblem.landlordimage}`, "_blank", "noopener,noreferrer")
                      }
                    >
                      View Your Photo
                    </button>
                  </div>
                </div>
              )}

              {selectedProblem.status !== "Resolved" ? (
                <div className="owner-update-section">
                  <h4>Update Problem Status</h4>
                  <div className="owner-status-actions">
                    <button 
                      className="owner-status-btn progress" 
                      onClick={() => handleUpdateStatus("In Progress")}
                    >
                      <AlertCircle size={16} /> Mark In Progress
                    </button>

                    {/* ✅ Upload Landlord Fix Photo */}
                    <label htmlFor="landlord-image-upload" className="owner-upload-photo-btn">
                      <Wrench size={16} /> Upload Fix Photo
                    </label>
                    <input
                      type="file"
                      id="landlord-image-upload"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => handleUploadLandlordImage(e.target.files[0])}
                    />

                    <button 
                      className="owner-status-btn resolved" 
                      onClick={() => handleUpdateStatus("Resolved")}
                      disabled={!selectedProblem.landlordimage}
                    >
                      <CheckCircle size={16} /> Mark Resolved
                    </button>
                  </div>
                  {!selectedProblem.landlordimage && (
                    <p className="owner-upload-warning">
                      * Please upload a fix photo before marking as resolved
                    </p>
                  )}
                </div>
              ) : (
                <div className="owner-resolved-message">
                  <CheckCircle size={24} className="resolved-check-icon" />
                  <h4>Issue Resolved</h4>
                  <p>This maintenance issue has been successfully resolved.</p>
                </div>
              )}
            </div>

            <div className="owner-problem-modal-footer">
              {selectedProblem.status === "Resolved" && (
                <button 
                  className="owner-delete-modal-btn" 
                  onClick={() => handleDeleteClick(selectedProblem)}
                >
                  <Trash2 size={16} /> Delete From My View
                </button>
              )}
              <button className="owner-close-modal-btn" onClick={() => setShowProblemModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Delete Confirmation Modal */}
      {showDeleteModal && problemToDelete && (
        <div className="owner-delete-modal-overlay">
          <div className="owner-delete-modal">
            <div className="owner-delete-modal-icon">
              <Trash2 size={48} />
            </div>
            <div className="owner-delete-modal-content">
              <h3>Delete From Your View?</h3>
              <p>This concern will be removed from your view but the tenant will still see it. The concern will be permanently deleted including all images only when both you and the tenant have deleted it.</p>
              <div className="owner-delete-modal-details">
                <p><strong>Issue:</strong> {problemToDelete.subject}</p>
                <p><strong>Tenant:</strong> {problemToDelete.tenant_name}</p>
                <p><strong>Unit:</strong> {problemToDelete.unit}</p>
              </div>
            </div>
            <div className="owner-delete-modal-actions">
              <button 
                className="owner-delete-cancel-btn" 
                onClick={cancelDelete}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="owner-delete-confirm-btn" 
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Yes, Remove From My View"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ DELETE SUCCESS MODAL */}
      {showDeleteSuccessModal && (
        <div className="owner-delete-success-modal-overlay">
          <div className="owner-delete-success-modal">
            <div className="owner-delete-success-modal-content">
              <div className="owner-delete-success-animation-container">
                <div className="owner-delete-success-checkmark">
                  <CheckCircle size={80} className="owner-delete-check-icon" />
                </div>
                <div className="owner-delete-success-confetti">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="owner-delete-confetti-piece"></div>
                  ))}
                </div>
              </div>
              
              <h2 className="owner-delete-success-title">Concern Deleted Successfully!</h2>
              
              <p className="owner-delete-success-message">
                The concern has been removed from your view. The tenant can still see it in their records.
              </p>

              <div className="owner-delete-success-details">
                <div className="owner-delete-success-detail-item">
                  <span className="owner-delete-detail-label">Action:</span>
                  <span className="owner-delete-detail-value">
                    <span className="owner-delete-status-badge">
                      <CheckCircle size={14} />
                      Removed From View
                    </span>
                  </span>
                </div>
                <div className="owner-delete-success-detail-item">
                  <span className="owner-delete-detail-label">Removed:</span>
                  <span className="owner-delete-detail-value">{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <button 
                className="owner-delete-success-close-btn"
                onClick={handleCloseDeleteSuccessModal}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Notification;