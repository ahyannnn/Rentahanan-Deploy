import React, { useState, useEffect } from "react";
import { Home, Plus, X, Users, Calendar, Edit, CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";
import "../../styles/owners/Units.css";

function Units() {
  const [activeTab, setActiveTab] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    type: "success" // success, error, warning
  });
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    status: "Available",
    image: null,
  });

  // ✅ UPDATED API BASE
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://rentahanan.onrender.com";

  // ✅ Show modal function
  const showModal = (title, message, type = "success") => {
    setModalConfig({ title, message, type });
    if (type === "success") {
      setShowSuccessModal(true);
    } else if (type === "error") {
      setShowErrorModal(true);
    } else if (type === "warning") {
      setShowConfirmModal(true);
    }
  };

  // ✅ Close all modals
  const closeAllModals = () => {
    setShowSuccessModal(false);
    setShowErrorModal(false);
    setShowConfirmModal(false);
  };

  // ✅ Fetch all units
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/houses`);
        const data = await response.json();
        setUnits(data);
      } catch (err) {
        console.error("Error fetching units:", err);
        showModal("Error", "Failed to load units. Please try again.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
  }, [API_BASE]);

  // ✅ Handle form inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Handle image selection (only 1 image allowed)
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  // ✅ Add new unit
  const handleAddUnit = async () => {
    if (!formData.name || !formData.price || !formData.image) {
      showModal("Missing Information", "Please fill in all required fields and select an image.", "error");
      return;
    }

    const newFormData = new FormData();
    newFormData.append("name", formData.name);
    newFormData.append("description", formData.description);
    newFormData.append("price", formData.price);
    newFormData.append("status", formData.status);
    newFormData.append("image", formData.image);

    try {
      
      
      const response = await fetch(`${API_BASE}/api/add-houses`, {
        method: "POST",
        body: newFormData,
      });

      
      
      if (response.ok) {
        const result = await response.json();
       
        showModal("Success", "Unit added successfully!", "success");
        setShowAddModal(false);
        resetForm();
        
        // Refresh units
        const updatedUnits = await fetch(`${API_BASE}/api/houses`).then((res) => res.json());
        setUnits(updatedUnits);
      } else {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        showModal("Error", `Failed to add unit: ${response.status} ${errorText}`, "error");
      }
    } catch (err) {
      console.error("Network error:", err);
      showModal("Network Error", "Cannot connect to server. Please check your connection.", "error");
    }
  };

  // ✅ Edit unit
  const handleEditUnit = async () => {
    if (!formData.name || !formData.price) {
      showModal("Missing Information", "Please fill in all required fields.", "error");
      return;
    }

    // Check if selectedUnit and unitid exist
    if (!selectedUnit || !selectedUnit.unitid) { // ✅ FIXED: Changed from 'id' to 'unitid'
      showModal("Error", "Unit ID is missing. Please try again.", "error");
      return;
    }

    const editFormData = new FormData();
    editFormData.append("name", formData.name);
    editFormData.append("description", formData.description);
    editFormData.append("price", formData.price);
    editFormData.append("status", formData.status);

    // Only append image if a new one was selected
    if (formData.image) {
      editFormData.append("image", formData.image);
    }

    try {
      const response = await fetch(`${API_BASE}/api/houses/${selectedUnit.unitid}`, { // ✅ FIXED: Changed from 'id' to 'unitid'
        method: "PUT",
        body: editFormData,
      });

      if (response.ok) {
        showModal("Success", "Unit updated successfully!", "success");
        setShowEditModal(false);
        resetForm();
        // Refresh units
        const updatedUnits = await fetch(`${API_BASE}/api/houses`).then((res) => res.json());
        setUnits(updatedUnits);
      } else {
        const errorData = await response.json();
        showModal("Error", `Failed to update unit: ${errorData.error || "Unknown error"}`, "error");
      }
    } catch (err) {
      console.error("Error updating unit:", err);
      showModal("Error", "An error occurred while updating the unit.", "error");
    }
  };

  // ✅ Reset form data
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      status: "Available",
      image: null,
    });
    setPreviewImage(null);
  };

  // ✅ Open edit modal with unit data
  const handleOpenEditModal = (unit) => {
    if (!unit.unitid) { // ✅ FIXED: Changed from 'id' to 'unitid'
      showModal("Error", "This unit cannot be edited because it's missing an ID.", "error");
      return;
    }

    setSelectedUnit(unit);
    setFormData({
      name: unit.name,
      description: unit.description || "",
      price: unit.price,
      status: unit.status,
      image: null,
    });
    // ✅ FIXED: Use the full Cloudinary URL directly, no need to construct path
    setPreviewImage(unit.imagepath || null); // ✅ unit.imagepath already contains the full Cloudinary URL
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setShowViewModal(false);
    setShowEditModal(false);
    setPreviewImage(null);
    setSelectedUnit(null);
    resetForm();
  };

  // ✅ Filter units by status
  const filteredUnits =
    activeTab === "All"
      ? units
      : units.filter(
        (unit) => unit.status.toLowerCase() === activeTab.toLowerCase()
      );

  // ✅ Get stats for badges
  const getStats = () => {
    const total = units.length;
    const available = units.filter(unit => unit.status.toLowerCase() === 'available').length;
    const occupied = units.filter(unit => unit.status.toLowerCase() === 'occupied').length;

    return { total, available, occupied };
  };

  const stats = getStats();

  return (
    <div className="Owner-Units-container">
      {/* --- Header Section --- */}
      <div className="Owner-Units-header">
        <div className="Owner-Units-header-content">
          <h1 className="Owner-Units-title">Property Units</h1>
          <p className="Owner-Units-subtitle">Manage your rental properties and units</p>
        </div>
        <div className="Owner-Units-stats">
          <div className="Owner-Units-stat-card" title="Total number of property units">
            <div className="Owner-Units-stat-icon total">
              <Home size={20} />
            </div>
            <div className="Owner-Units-stat-info">
              <span className="Owner-Units-stat-number">{stats.total}</span>
              <span className="Owner-Units-stat-label">Total Units</span>
            </div>
          </div>
          <div className="Owner-Units-stat-card" title="Number of available units for rent">
            <div className="Owner-Units-stat-icon available">
              <Users size={20} />
            </div>
            <div className="Owner-Units-stat-info">
              <span className="Owner-Units-stat-number">{stats.available}</span>
              <span className="Owner-Units-stat-label">Available</span>
            </div>
          </div>
          <div className="Owner-Units-stat-card" title="Number of currently occupied units">
            <div className="Owner-Units-stat-icon occupied">
              <Calendar size={20} />
            </div>
            <div className="Owner-Units-stat-info">
              <span className="Owner-Units-stat-number">{stats.occupied}</span>
              <span className="Owner-Units-stat-label">Occupied</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- Top Controls --- */}
      <div className="Owner-Units-control-bar">
        <div className="Owner-Units-tab-group">
          {["All", "Available", "Occupied"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`Owner-Units-tab-btn ${activeTab === tab ? "Owner-Units-tab-active" : ""}`}
              title={`View ${tab.toLowerCase()} units`}
            >
              {tab}
              {tab === "All" && <span className="Owner-Units-tab-badge" title={`${stats.total} total units`}>{stats.total}</span>}
              {tab === "Available" && <span className="Owner-Units-tab-badge" title={`${stats.available} available units`}>{stats.available}</span>}
              {tab === "Occupied" && <span className="Owner-Units-tab-badge" title={`${stats.occupied} occupied units`}>{stats.occupied}</span>}
            </button>
          ))}
        </div>

        <button className="Owner-Units-add-btn" onClick={() => setShowAddModal(true)} title="Add a new property unit">
          <Plus size={18} />
          Add New Unit
        </button>
      </div>

      {/* --- Units Grid --- */}
      {loading ? (
        <div className="Owner-Units-loading">
          <div className="Owner-Units-loading-spinner"></div>
          <p>Loading units...</p>
        </div>
      ) : (
        <div className="Owner-Units-grid">
          {filteredUnits.length > 0 ? (
            filteredUnits.map((unit) => (
              <div key={unit.unitid} className="Owner-Units-card" title={`View details for ${unit.name}`}>
                <div className="Owner-Units-image-container">
                  {unit.imagepath ? (
                    // ✅ FIXED: Use the full Cloudinary URL directly
                    <img
                      src={unit.imagepath}
                      alt={unit.name}
                      className="Owner-Units-thumbnail"
                      title={`Image of ${unit.name}`}
                    />
                  ) : (
                    <div className="Owner-Units-image-placeholder" title="No image available">
                      <Home size={32} className="Owner-Units-placeholder-icon" />
                    </div>
                  )}
                  <div className="Owner-Units-image-overlay">
                    <span className={`Owner-Units-status-badge ${unit.status.toLowerCase()}`} title={`Status: ${unit.status}`}>
                      {unit.status}
                    </span>
                    <span className="Owner-Units-name-tag" title={`Unit: ${unit.name}`}>{unit.name}</span>
                  </div>
                </div>

                <div className="Owner-Units-card-content">
                  <h3 className="Owner-Units-card-title" title={unit.name}>{unit.name}</h3>
                  <p className="Owner-Units-card-description" title={unit.description || "No description available"}>
                    {unit.description || "No description available"}
                  </p>

                  <div className="Owner-Units-price-section">
                    <span className="Owner-Units-price" title={`Monthly rent: ₱${Number(unit.price).toLocaleString()}`}>
                      ₱{Number(unit.price).toLocaleString()}
                    </span>
                    <span className="Owner-Units-price-period">/month</span>
                  </div>

                  <div className="Owner-Units-card-actions">
                    <button
                      className="Owner-Units-view-btn"
                      onClick={() => {
                        setSelectedUnit(unit);
                        setShowViewModal(true);
                      }}
                      title={`View details for ${unit.name}`}
                    >
                      View
                    </button>
                    <button
                      className={`Owner-Units-edit-btn ${unit.status.toLowerCase() === 'occupied' ? 'Owner-Units-edit-btn-disabled' : ''}`}
                      onClick={() => unit.status.toLowerCase() !== 'occupied' && handleOpenEditModal(unit)}
                      disabled={unit.status.toLowerCase() === 'occupied'}
                      title={unit.status.toLowerCase() === 'occupied' ? 'Cannot edit occupied units' : `Edit ${unit.name}`}
                    >
                      <Edit size={16} />
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="Owner-Units-empty">
              <Home size={48} className="Owner-Units-empty-icon" />
              <h3>No units found</h3>
              <p>There are no units matching your current filter.</p>
            </div>
          )}
        </div>
      )}

      {/* --- Add Unit Modal --- */}
      {showAddModal && (
        <div className="Owner-Units-modal-overlay">
          <div className="Owner-Units-modal Owner-Units-add-modal">
            <div className="Owner-Units-modal-header">
              <h3>Add New Unit</h3>
              <button className="Owner-Units-close-btn" onClick={handleCloseModal} title="Close add unit modal">
                <X size={20} />
              </button>
            </div>

            <div className="Owner-Units-modal-body">
              <div className="Owner-Units-form-group">
                <label className="Owner-Units-form-label">Unit Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Unit 101 - Studio"
                  className="Owner-Units-form-input"
                  title="Enter a name for the unit"
                />
              </div>

              <div className="Owner-Units-form-group">
                <label className="Owner-Units-form-label">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="e.g. Spacious studio with balcony and city view..."
                  className="Owner-Units-form-textarea"
                  rows="3"
                  title="Enter a description for the unit"
                ></textarea>
              </div>

              <div className="Owner-Units-form-row">
                <div className="Owner-Units-form-group">
                  <label className="Owner-Units-form-label">Price (₱) *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="15000"
                    className="Owner-Units-form-input"
                    title="Enter the monthly rental price"
                  />
                </div>

                <div className="Owner-Units-form-group">
                  <label className="Owner-Units-form-label">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="Owner-Units-form-select"
                    title="Select the current status of the unit"
                  >
                    <option value="Available" title="Unit is available for rent">Available</option>
                    <option value="Occupied" title="Unit is currently occupied">Occupied</option>
                    <option value="Maintenance" title="Unit is under maintenance">Under Maintenance</option>
                    <option value="Renovation" title="Unit is under renovation">Under Renovation</option>
                  </select>
                </div>
              </div>

              <div className="Owner-Units-form-group">
                <label className="Owner-Units-form-label">Unit Image *</label>
                <div className="Owner-Units-file-upload">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="Owner-Units-file-input"
                    title="Select an image for the unit"
                  />
                  <div className="Owner-Units-file-label" title="Click to choose an image">
                    <Plus size={16} />
                    Choose Image
                  </div>
                </div>

                {previewImage && (
                  <div className="Owner-Units-preview-container">
                    <img src={previewImage} alt="Preview" className="Owner-Units-preview-image" title="Image preview" />
                  </div>
                )}
              </div>
            </div>

            <div className="Owner-Units-modal-footer">
              <button className="Owner-Units-cancel-btn" onClick={handleCloseModal} title="Cancel adding unit">
                Cancel
              </button>
              <button className="Owner-Units-save-btn" onClick={handleAddUnit} title="Save new unit">
                Save Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Edit Unit Modal --- */}
      {showEditModal && selectedUnit && (
        <div className="Owner-Units-modal-overlay">
          <div className="Owner-Units-modal Owner-Units-edit-modal">
            <div className="Owner-Units-modal-header">
              <h3>Edit Unit</h3>
              <button className="Owner-Units-close-btn" onClick={handleCloseModal} title="Close edit modal">
                <X size={20} />
              </button>
            </div>

            <div className="Owner-Units-modal-body">
              <div className="Owner-Units-form-group">
                <label className="Owner-Units-form-label">Unit Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Unit 101 - Studio"
                  className="Owner-Units-form-input"
                  title="Edit the unit name"
                />
              </div>

              <div className="Owner-Units-form-group">
                <label className="Owner-Units-form-label">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="e.g. Spacious studio with balcony and city view..."
                  className="Owner-Units-form-textarea"
                  rows="3"
                  title="Edit the unit description"
                ></textarea>
              </div>

              <div className="Owner-Units-form-row">
                <div className="Owner-Units-form-group">
                  <label className="Owner-Units-form-label">Price (₱) *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="15000"
                    className="Owner-Units-form-input"
                    title="Edit the monthly rental price"
                  />
                </div>

                <div className="Owner-Units-form-group">
                  <label className="Owner-Units-form-label">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="Owner-Units-form-select"
                    title="Update the unit status"
                  >
                    <option value="Available" title="Unit is available for rent">Available</option>
                    <option value="Occupied" title="Unit is currently occupied">Occupied</option>
                    <option value="Maintenance" title="Unit is under maintenance">Under Maintenance</option>
                    <option value="Renovation" title="Unit is under renovation">Under Renovation</option>
                  </select>
                </div>
              </div>

              <div className="Owner-Units-form-group">
                <label className="Owner-Units-form-label">Unit Image</label>
                <div className="Owner-Units-file-upload">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="Owner-Units-file-input"
                    title="Select a new image for the unit"
                  />
                  <div className="Owner-Units-file-label" title="Click to change the image">
                    <Plus size={16} />
                    {previewImage ? "Change Image" : "Choose Image"}
                  </div>
                </div>

                {previewImage && (
                  <div className="Owner-Units-preview-container">
                    <img src={previewImage} alt="Preview" className="Owner-Units-preview-image" title="New image preview" />
                    <p className="Owner-Units-preview-note">New image selected</p>
                  </div>
                )}

                {!previewImage && selectedUnit.imagepath && (
                  <div className="Owner-Units-current-image">
                    <p className="Owner-Units-current-image-label">Current Image:</p>
                    {/* ✅ FIXED: Use the full Cloudinary URL directly */}
                    <img
                      src={selectedUnit.imagepath}
                      alt={selectedUnit.name}
                      className="Owner-Units-preview-image"
                      title="Current unit image"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="Owner-Units-modal-footer">
              <button className="Owner-Units-cancel-btn" onClick={handleCloseModal} title="Cancel editing">
                Cancel
              </button>
              <button className="Owner-Units-save-btn" onClick={handleEditUnit} title="Update unit information">
                Update Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- View Details Modal --- */}
      {showViewModal && selectedUnit && (
        <div className="Owner-Units-modal-overlay">
          <div className="Owner-Units-modal Owner-Units-view-modal">
            <div className="Owner-Units-modal-header">
              <h3>Unit Details</h3>
              <button className="Owner-Units-close-btn" onClick={handleCloseModal} title="Close details modal">
                <X size={20} />
              </button>
            </div>

            <div className="Owner-Units-modal-body">
              <div className="Owner-Units-detail-image">
                {selectedUnit.imagepath ? (
                  // ✅ FIXED: Use the full Cloudinary URL directly
                  <img
                    src={selectedUnit.imagepath}
                    alt={selectedUnit.name}
                    className="Owner-Units-detail-thumbnail"
                    title={`Image of ${selectedUnit.name}`}
                  />
                ) : (
                  <div className="Owner-Units-detail-placeholder" title="No image available">
                    <Home size={48} className="Owner-Units-detail-icon" />
                    <p>No Image Available</p>
                  </div>
                )}
              </div>

              <div className="Owner-Units-detail-info">
                <div className="Owner-Units-detail-row" title={`Unit name: ${selectedUnit.name}`}>
                  <span className="Owner-Units-detail-label">Unit Name</span>
                  <span className="Owner-Units-detail-value">{selectedUnit.name}</span>
                </div>

                <div className="Owner-Units-detail-row" title={`Description: ${selectedUnit.description || "No description provided"}`}>
                  <span className="Owner-Units-detail-label">Description</span>
                  <span className="Owner-Units-detail-value">
                    {selectedUnit.description || "No description provided"}
                  </span>
                </div>

                <div className="Owner-Units-detail-row" title={`Monthly price: ₱${Number(selectedUnit.price).toLocaleString()}`}>
                  <span className="Owner-Units-detail-label">Monthly Price</span>
                  <span className="Owner-Units-detail-value Owner-Units-detail-price">
                    ₱{Number(selectedUnit.price).toLocaleString()}
                  </span>
                </div>

                <div className="Owner-Units-detail-row" title={`Status: ${selectedUnit.status}`}>
                  <span className="Owner-Units-detail-label">Status</span>
                  <span className={`Owner-Units-detail-status ${selectedUnit.status.toLowerCase()}`}>
                    {selectedUnit.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="Owner-Units-modal-footer">
              <button className="Owner-Units-close-detail-btn" onClick={handleCloseModal} title="Close this view">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Success Modal --- */}
      {showSuccessModal && (
        <div className="modal-overlay-transactions success-modal-overlay-transactions">
          <div className="modal-content-transactions success-modal-transactions">
            <button className="close-btn-transactions" onClick={closeAllModals} title="Close success message">
              <X size={20} />
            </button>
            <div className="modal-icon-transactions">
              <CheckCircle size={60} className="modal-icon-success" />
            </div>
            <h3 className="modal-title-transactions">{modalConfig.title}</h3>
            <p className="modal-message-transactions">{modalConfig.message}</p>
            <div className="modal-actions-transactions">
              <button className="modal-btn-transactions modal-btn-success" onClick={closeAllModals} title="Continue managing units">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Error Modal --- */}
      {showErrorModal && (
        <div className="modal-overlay-transactions">
          <div className="modal-content-transactions">
            <button className="close-btn-transactions" onClick={closeAllModals} title="Close error message">
              <X size={20} />
            </button>
            <div className="modal-icon-transactions">
              <AlertCircle size={60} className="modal-icon-danger" />
            </div>
            <h3 className="modal-title-transactions">{modalConfig.title}</h3>
            <p className="modal-message-transactions">{modalConfig.message}</p>
            <div className="modal-actions-transactions">
              <button className="modal-btn-transactions modal-btn-cancel" onClick={closeAllModals} title="Close this message">
                Close
              </button>
              <button className="modal-btn-transactions modal-btn-confirm" onClick={closeAllModals} title="Try the action again">
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Warning/Confirm Modal --- */}
      {showConfirmModal && (
        <div className="modal-overlay-transactions">
          <div className="modal-content-transactions">
            <button className="close-btn-transactions" onClick={closeAllModals} title="Close confirmation modal">
              <X size={20} />
            </button>
            <div className="modal-icon-transactions">
              <AlertTriangle size={60} className="modal-icon-warning" />
            </div>
            <h3 className="modal-title-transactions">{modalConfig.title}</h3>
            <p className="modal-message-transactions">{modalConfig.message}</p>
            <div className="modal-actions-transactions">
              <button className="modal-btn-transactions modal-btn-cancel" onClick={closeAllModals} title="Cancel the action">
                Cancel
              </button>
              <button className="modal-btn-transactions modal-btn-confirm" onClick={closeAllModals} title="Confirm and proceed">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Units;