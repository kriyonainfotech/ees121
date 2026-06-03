import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaCamera } from 'react-icons/fa';

const backend_API = import.meta.env.VITE_API_URL || "http://localhost:3000";

const EditBanner = ({ editbanner, fetchBanner }) => {
    const [bannerImg, setBannerImg] = useState(null);
    const [preview, setPreview] = useState("");
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            setBannerImg(file);
            setPreview(URL.createObjectURL(file));
        } else {
            toast.error("Please select a valid image file.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        if (bannerImg) {
            formData.append("banner", bannerImg);
        }
        formData.append("bannerId", editbanner._id);

        try {
            setLoading(true);
            const response = await axios.post(`${backend_API}/banner/updateBanner`, formData, {
                headers: { 
                    "Content-Type": "multipart/form-data",
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                },
            });

            if (response.status === 200) {
                toast.success("Banner updated successfully");
                fetchBanner();
                
                const modalCloseButton = document.querySelector("#editBannerModal [data-bs-dismiss='modal']");
                if (modalCloseButton) {
                    modalCloseButton.click();
                }
            }
        } catch (error) {
            console.error("Error updating banner:", error);
            toast.error(error?.response?.data?.message || "Failed to update banner.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (editbanner) {
            setPreview(editbanner.imageUrl);
            setBannerImg(null);
        }
    }, [editbanner]);

    if (!editbanner) return null;

    return (
        <div className="modal-content">
            <div className="modal-header">
                <h5 className="modal-title font-bold">Edit Banner Image</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body p-4">
                <div className="mb-4">
                    <p className="text-muted small mb-1">Owner</p>
                    <div className="bg-light p-2 rounded border">
                        <div className="ms-2">
                            <p className="mb-0 font-bold">{editbanner.userId?.name || 'Unknown'}</p>
                            <p className="mb-0 small text-muted">{editbanner.userId?.email || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label font-semibold">Change Banner Image</label>
                        <input
                                type="file"
                                className="form-control"
                                onChange={handleFileChange}
                            />
                        
                        {preview && (
                            <div className="mt-4 p-2 bg-white rounded border text-center">
                                <img src={preview} alt="Banner Preview" className="img-thumbnail border-0 max-h-48" />
                            </div>
                        )}
                    </div>
                    
                    <div className="modal-footer px-0 pb-0 pt-3">
                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? "Updating..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditBanner;
