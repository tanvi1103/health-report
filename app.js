// Application State
const state = {
    patients: [],
    searchQuery: "",
    activePatientId: null,
    deletePatientId: null
};

// DOM Elements
const elements = {
    patientRows: document.getElementById("patient-rows"),
    noRecords: document.getElementById("no-records"),
    searchField: document.getElementById("patient-search"),
    btnAddPatient: document.getElementById("btn-add-patient"),
    btnCreateFirst: document.getElementById("btn-create-first"),
    formModal: document.getElementById("form-modal"),
    deleteModal: document.getElementById("delete-modal"),
    patientForm: document.getElementById("patient-form"),
    modalTitle: document.getElementById("modal-title"),
    btnCloseModal: document.getElementById("btn-close-modal"),
    btnCancelForm: document.getElementById("btn-cancel-form"),
    btnCancelDelete: document.getElementById("btn-cancel-delete"),
    btnConfirmDelete: document.getElementById("btn-confirm-delete"),
    deletePatientName: document.getElementById("delete-patient-name"),
    submitText: document.getElementById("submit-text"),
    submitLoader: document.getElementById("submit-loader"),
    toastContainer: document.getElementById("toast-container"),

    // Form Fields
    pId: document.getElementById("patient-id"),
    pName: document.getElementById("p-name"),
    pDob: document.getElementById("p-dob"),
    pEmail: document.getElementById("p-email"),
    pKGlucose: document.getElementById("p-glucose"),
    pKaemoglobin: document.getElementById("p-haemoglobin"),
    pKCholesterol: document.getElementById("p-cholesterol"),

    // Form Errors
    errName: document.getElementById("err-name"),
    errDob: document.getElementById("err-dob"),
    errEmail: document.getElementById("err-email"),
    errGlucose: document.getElementById("err-glucose"),
    errHaemoglobin: document.getElementById("err-haemoglobin"),
    errCholesterol: document.getElementById("err-cholesterol"),

    // Statistics Fields
    valTotalRecords: document.getElementById("val-total-records"),
    valCriticalAlerts: document.getElementById("val-critical-alerts"),
    valAvgGlucose: document.getElementById("val-avg-glucose"),
    valAvgCholesterol: document.getElementById("val-avg-cholesterol")
};

// API Base URL
const API_URL = "/api/patients";

// Toast System
function showToast(message, type = "success", duration = 4000) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let iconSvg = "";
    if (type === "success") {
        iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === "error") {
        iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    } else {
        iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
        <div class="toast-icon">${iconSvg}</div>
        <div class="toast-message">${message}</div>
        <div class="toast-progress"></div>
    `;

    elements.toastContainer.appendChild(toast);

    // Animate progress bar
    const progress = toast.querySelector(".toast-progress");
    progress.style.transition = `width ${duration}ms linear`;
    // Force a reflow
    progress.offsetHeight;
    progress.style.width = "0%";

    // Auto dismiss
    const dismissTimeout = setTimeout(() => {
        toast.style.animation = "slideInToast 0.3s cubic-bezier(0.175, 0.885, 0.32, 1) reverse forwards";
        setTimeout(() => toast.remove(), 300);
    }, duration);

    // Dismiss on click
    toast.addEventListener("click", () => {
        clearTimeout(dismissTimeout);
        toast.remove();
    });
}

// Calculate Age
function getAge(dobStr) {
    if (!dobStr) return 0;
    const dob = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
}

// Format Date
function formatDate(dobStr) {
    if (!dobStr) return "";
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dobStr).toLocaleDateString(undefined, options);
}

// Load Patients Data
async function loadPatients() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Failed to load records.");
        state.patients = await response.json();
        renderDashboard();
    } catch (error) {
        console.error(error);
        showToast("Error retrieving clinical records from server.", "error");
        elements.patientRows.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: var(--color-critical); padding: 3rem;">
                    Failed to communicate with database server. Please check application log.
                </td>
            </tr>
        `;
    }
}

// Render Dashboard (Stats & Table)
function renderDashboard() {
    const filtered = state.patients.filter(p => {
        const q = state.searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
    });

    // Render Table Rows
    if (filtered.length === 0) {
        elements.patientRows.innerHTML = "";
        elements.noRecords.classList.remove("hidden");
    } else {
        elements.noRecords.classList.add("hidden");
        elements.patientRows.innerHTML = filtered.map(patient => {
            const age = getAge(patient.dob);
            
            // Determine risk level badge based on AI remarks text content
            let badgeClass = "badge-healthy";
            let statusLabel = "Healthy";
            if (patient.remarks.includes("CRITICAL")) {
                badgeClass = "badge-critical";
                statusLabel = "Critical";
            } else if (patient.remarks.includes("WARNING")) {
                badgeClass = "badge-warning";
                statusLabel = "Warning";
            }

            // Flag individual biomarker warning colors
            const glucWarn = patient.glucose < 70 || patient.glucose > 100 ? "color: var(--color-warning);" : "";
            const haemWarn = patient.haemoglobin < 12.0 || patient.haemoglobin > 17.5 ? "color: var(--color-warning);" : "";
            const cholWarn = patient.cholesterol >= 200 ? "color: var(--color-warning);" : "";

            return `
                <tr id="row-${patient.id}">
                    <td>
                        <div class="patient-info-cell">
                            <span class="patient-name-text">${escapeHtml(patient.name)}</span>
                            <span class="patient-meta-text">DOB: ${formatDate(patient.dob)} (${age} yrs)</span>
                        </div>
                    </td>
                    <td>
                        <div class="patient-email-cell">
                            <a href="mailto:${escapeHtml(patient.email)}" class="email-link">${escapeHtml(patient.email)}</a>
                        </div>
                    </td>
                    <td class="num-col num-col-val" style="${glucWarn}">${patient.glucose.toFixed(1)}</td>
                    <td class="num-col num-col-val" style="${haemWarn}">${patient.haemoglobin.toFixed(1)}</td>
                    <td class="num-col num-col-val" style="${cholWarn}">${patient.cholesterol.toFixed(1)}</td>
                    <td class="remarks-cell">
                        <div class="remark-text">
                            <span class="badge ${badgeClass}">${statusLabel}</span>
                            <span>${escapeHtml(patient.remarks)}</span>
                        </div>
                    </td>
                    <td class="actions-col">
                        <div class="actions-cell">
                            <button class="btn-icon btn-edit-cell" onclick="editPatient(${patient.id})" title="Edit Patient Record">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="btn-icon btn-delete-cell" onclick="confirmDelete(${patient.id}, '${escapeJs(patient.name)}')" title="Delete Patient Record">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    // Update Statistics Panels
    const totalCount = state.patients.length;
    elements.valTotalRecords.innerText = totalCount;

    const criticalCount = state.patients.filter(p => p.remarks.includes("CRITICAL")).length;
    elements.valCriticalAlerts.innerText = criticalCount;
    if (criticalCount > 0) {
        elements.valCriticalAlerts.classList.add("text-critical");
    } else {
        elements.valCriticalAlerts.classList.remove("text-critical");
    }

    if (totalCount > 0) {
        const avgGlucose = state.patients.reduce((sum, p) => sum + p.glucose, 0) / totalCount;
        const avgCholesterol = state.patients.reduce((sum, p) => sum + p.cholesterol, 0) / totalCount;
        
        elements.valAvgGlucose.innerHTML = `${avgGlucose.toFixed(1)} <span class="unit">mg/dL</span>`;
        elements.valAvgCholesterol.innerHTML = `${avgCholesterol.toFixed(1)} <span class="unit">mg/dL</span>`;
    } else {
        elements.valAvgGlucose.innerHTML = `0 <span class="unit">mg/dL</span>`;
        elements.valAvgCholesterol.innerHTML = `0 <span class="unit">mg/dL</span>`;
    }
}

// Clear Form Validation State
function clearFormErrors() {
    elements.errName.innerText = "";
    elements.errDob.innerText = "";
    elements.errEmail.innerText = "";
    elements.errGlucose.innerText = "";
    elements.errHaemoglobin.innerText = "";
    elements.errCholesterol.innerText = "";

    elements.pName.style.borderColor = "";
    elements.pDob.style.borderColor = "";
    elements.pEmail.style.borderColor = "";
    elements.pKGlucose.style.borderColor = "";
    elements.pKaemoglobin.style.borderColor = "";
    elements.pKCholesterol.style.borderColor = "";
}

// Client Side Form Validation
function validateForm() {
    clearFormErrors();
    let isValid = true;

    // 1. Name Check
    if (!elements.pName.value.trim()) {
        elements.errName.innerText = "Full Name is required.";
        elements.pName.style.borderColor = "var(--color-critical)";
        isValid = false;
    }

    // 2. Date of Birth Check
    const dobValue = elements.pDob.value;
    if (!dobValue) {
        elements.errDob.innerText = "Date of Birth is required.";
        elements.pDob.style.borderColor = "var(--color-critical)";
        isValid = false;
    } else {
        const dobDate = new Date(dobValue);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dobDate > today) {
            elements.errDob.innerText = "Date of Birth cannot be a future date.";
            elements.pDob.style.borderColor = "var(--color-critical)";
            isValid = false;
        }
    }

    // 3. Email Check
    const emailValue = elements.pEmail.value.trim();
    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailValue) {
        elements.errEmail.innerText = "Email Address is required.";
        elements.pEmail.style.borderColor = "var(--color-critical)";
        isValid = false;
    } else if (!emailRegex.test(emailValue)) {
        elements.errEmail.innerText = "Invalid email address format.";
        elements.pEmail.style.borderColor = "var(--color-critical)";
        isValid = false;
    }

    // 4. Glucose Check
    const glucoseValue = elements.pKGlucose.value;
    if (!glucoseValue) {
        elements.errGlucose.innerText = "Glucose is required.";
        elements.pKGlucose.style.borderColor = "var(--color-critical)";
        isValid = false;
    } else if (isNaN(glucoseValue) || parseFloat(glucoseValue) < 0) {
        elements.errGlucose.innerText = "Must be a non-negative number.";
        elements.pKGlucose.style.borderColor = "var(--color-critical)";
        isValid = false;
    }

    // 5. Haemoglobin Check
    const haemoglobinValue = elements.pKaemoglobin.value;
    if (!haemoglobinValue) {
        elements.errHaemoglobin.innerText = "Haemoglobin is required.";
        elements.pKaemoglobin.style.borderColor = "var(--color-critical)";
        isValid = false;
    } else if (isNaN(haemoglobinValue) || parseFloat(haemoglobinValue) < 0) {
        elements.errHaemoglobin.innerText = "Must be a non-negative number.";
        elements.pKaemoglobin.style.borderColor = "var(--color-critical)";
        isValid = false;
    }

    // 6. Cholesterol Check
    const cholesterolValue = elements.pKCholesterol.value;
    if (!cholesterolValue) {
        elements.errCholesterol.innerText = "Cholesterol is required.";
        elements.pKCholesterol.style.borderColor = "var(--color-critical)";
        isValid = false;
    } else if (isNaN(cholesterolValue) || parseFloat(cholesterolValue) < 0) {
        elements.errCholesterol.innerText = "Must be a non-negative number.";
        elements.pKCholesterol.style.borderColor = "var(--color-critical)";
        isValid = false;
    }

    return isValid;
}

// Modal Handlers
function openFormModal(patientId = null) {
    state.activePatientId = patientId;
    clearFormErrors();
    
    if (patientId) {
        elements.modalTitle.innerText = "Edit Patient Record";
        elements.submitText.innerText = "Re-Diagnose & Update";
        
        const patient = state.patients.find(p => p.id === patientId);
        if (patient) {
            elements.pId.value = patient.id;
            elements.pName.value = patient.name;
            elements.pDob.value = patient.dob;
            elements.pEmail.value = patient.email;
            elements.pKGlucose.value = patient.glucose;
            elements.pKaemoglobin.value = patient.haemoglobin;
            elements.pKCholesterol.value = patient.cholesterol;
        }
    } else {
        elements.modalTitle.innerText = "New Patient Record";
        elements.submitText.innerText = "Run Diagnosis & Save";
        elements.patientForm.reset();
        elements.pId.value = "";
    }
    
    elements.formModal.classList.remove("hidden");
    // Animation fade-in trigger
    elements.formModal.style.opacity = "0";
    elements.formModal.offsetHeight; // Force reflow
    elements.formModal.style.opacity = "1";
    document.body.style.overflow = "hidden"; // Prevent background scroll
}

function closeFormModal() {
    elements.formModal.style.opacity = "0";
    setTimeout(() => {
        elements.formModal.classList.add("hidden");
        document.body.style.overflow = "";
    }, 300);
}

// Submit Form Handler
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        showToast("Please correct the errors in the form.", "error");
        return;
    }

    const payload = {
        name: elements.pName.value.trim(),
        dob: elements.pDob.value,
        email: elements.pEmail.value.trim(),
        glucose: parseFloat(elements.pKGlucose.value),
        haemoglobin: parseFloat(elements.pKaemoglobin.value),
        cholesterol: parseFloat(elements.pKCholesterol.value)
    };

    elements.submitText.innerText = state.activePatientId ? "Updating..." : "Diagnosing...";
    elements.submitLoader.classList.remove("hidden");
    elements.btnCancelForm.disabled = true;
    document.getElementById("btn-submit-form").disabled = true;

    const url = state.activePatientId ? `${API_URL}/${state.activePatientId}` : API_URL;
    const method = state.activePatientId ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || "Failed to process record.");
        }

        showToast(
            state.activePatientId 
                ? "Clinical record updated successfully." 
                : "Clinical record created successfully.",
            "success"
        );
        
        closeFormModal();
        loadPatients();
    } catch (error) {
        console.error(error);
        showToast(error.message || "An unexpected error occurred.", "error");
    } finally {
        elements.submitLoader.classList.add("hidden");
        elements.btnCancelForm.disabled = false;
        document.getElementById("btn-submit-form").disabled = false;
    }
}

// Edit Patient Global Call
window.editPatient = function(id) {
    openFormModal(id);
};

// Delete Confirmation Modal
window.confirmDelete = function(id, name) {
    state.deletePatientId = id;
    elements.deletePatientName.innerText = name;
    elements.deleteModal.classList.remove("hidden");
    elements.deleteModal.style.opacity = "0";
    elements.deleteModal.offsetHeight;
    elements.deleteModal.style.opacity = "1";
    document.body.style.overflow = "hidden";
};

function closeDeleteModal() {
    elements.deleteModal.style.opacity = "0";
    setTimeout(() => {
        elements.deleteModal.classList.add("hidden");
        document.body.style.overflow = "";
    }, 300);
}

// Confirm Delete Handler
async function handleDeleteConfirm() {
    if (!state.deletePatientId) return;

    elements.btnConfirmDelete.disabled = true;
    elements.btnConfirmDelete.innerText = "Deleting...";
    elements.btnCancelDelete.disabled = true;

    try {
        const response = await fetch(`${API_URL}/${state.deletePatientId}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || "Failed to delete record.");
        }

        showToast("Clinical record deleted successfully.", "success");
        closeDeleteModal();
        loadPatients();
    } catch (error) {
        console.error(error);
        showToast(error.message || "Could not delete record.", "error");
    } finally {
        elements.btnConfirmDelete.disabled = false;
        elements.btnConfirmDelete.innerText = "Delete Record";
        elements.btnCancelDelete.disabled = false;
    }
}

// Search Filter Input Handler
elements.searchField.addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    renderDashboard();
});

// Event Listeners
elements.btnAddPatient.addEventListener("click", () => openFormModal());
elements.btnCreateFirst.addEventListener("click", () => openFormModal());
elements.btnCloseModal.addEventListener("click", closeFormModal);
elements.btnCancelForm.addEventListener("click", closeFormModal);
elements.btnCancelDelete.addEventListener("click", closeDeleteModal);
elements.btnConfirmDelete.addEventListener("click", handleDeleteConfirm);
elements.patientForm.addEventListener("submit", handleFormSubmit);

// Close modals when clicking backdrop
window.addEventListener("click", (e) => {
    if (e.target === elements.formModal) {
        closeFormModal();
    }
    if (e.target === elements.deleteModal) {
        closeDeleteModal();
    }
});

// Escape HTML Utility to prevent XSS injection
function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Escape JS String utility
function escapeJs(text) {
    if (!text) return "";
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Initial Launch
document.addEventListener("DOMContentLoaded", () => {
    loadPatients();
});
