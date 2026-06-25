import React, { useEffect, useState } from 'react';
import AdminHeader from '../admincomponents/AdminHeader';
import AdminSidebar from '../admincomponents/AdminSidebar';
import axios from 'axios';
import EditBanner from '../admincomponents/EditBanner';
import { toast } from 'react-toastify';

const backend_API = import.meta.env.VITE_API_URL || "http://localhost:3000";

const ManageBanner = () => {
    const [bannerImg, setBannerImg] = useState(null);
    const [preview, setPreview] = useState(null);
    const [banners, setBanners] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [editBannerData, setEditBannerData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [zoomedBanner, setZoomedBanner] = useState(null);

    const fetchBanners = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${backend_API}/banner/getAllBanners`);
            if (response.data.success) {
                setBanners(response.data.banners);
            } else {
                toast.error("Failed to fetch banners");
            }
        } catch (error) {
            console.error("Error fetching banners:", error);
            toast.error("Error fetching banners");
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${backend_API}/auth/getAllUser`);
            if (response.status === 200) {
                setUsers(response.data.user);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    useEffect(() => {
        fetchBanners();
        fetchUsers();
    }, []);

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
        if (!bannerImg || !selectedUserId) {
            toast.error("Please select an image and a user");
            return;
        }

        const formData = new FormData();
        formData.append("banner", bannerImg);
        formData.append("userId", selectedUserId);

        try {
            const response = await axios.post(`${backend_API}/banner/addBanner`, formData, {
                headers: { 
                    "Content-Type": "multipart/form-data",
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                },
            });
            toast.success(response?.data?.message || "Banner added successfully");
            fetchBanners();

            const modalCloseButton = document.querySelector("[data-bs-dismiss='modal']");
            if (modalCloseButton) modalCloseButton.click();

            setBannerImg(null);
            setPreview(null);
            setSelectedUserId("");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Error adding banner");
        }
    };

    const handleDelete = async (bannerId) => {
        toast.info(
            <div>
                <p>Are you sure you want to delete this banner?</p>
                <div className="d-flex justify-content-center gap-2">
                    <button className="btn btn-danger btn-sm" onClick={() => confirmDelete(bannerId)}>Yes</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => toast.dismiss()}>No</button>
                </div>
            </div>,
            { autoClose: true, closeOnClick: true }
        );
    };

    const confirmDelete = async (bannerId) => {
        toast.dismiss();
        try {
            const response = await axios.delete(`${backend_API}/banner/deleteBanner`, {
                headers: { 
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                },
                data: { bannerId },
            });

            if (response.status === 200) {
                toast.success("Banner deleted successfully.");
                fetchBanners();
            } else {
                toast.error("Failed to delete banner.");
            }
        } catch (error) {
            console.error("Error deleting banner:", error);
            toast.error("Failed to delete banner.");
        }
    };

    const handleEdit = (banner) => {
        setEditBannerData(banner);
    };

    return (
        <>
            <AdminHeader />
            <AdminSidebar />
            <div className="my-32">
                <section>
                    <div className="container-fluid">
                        <div className="card shadow-xl">
                            <div className="card-header d-flex justify-content-between align-items-center py-3 bg-white">
                                <h4 className='mb-0 font-bold'>Manage Banners</h4>
                                <button className="btn bg-blue text-white" data-bs-toggle="modal" data-bs-target="#addBannerModal">
                                    Add Banner
                                </button>
                            </div>

                            {/* Add Banner Modal */}
                            <div className="modal fade" id="addBannerModal" tabIndex={-1} aria-hidden="true">
                                <div className="modal-dialog modal-dialog-centered">
                                    <div className="modal-content">
                                        <div className="modal-header">
                                            <h5 className="modal-title font-bold">Add New Banner</h5>
                                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                        </div>
                                        <div className="modal-body">
                                            <form onSubmit={handleSubmit}>
                                                <div className="mb-3">
                                                    <label className="form-label">Select User:</label>
                                                    <select 
                                                        className="form-select"
                                                        value={selectedUserId}
                                                        onChange={(e) => setSelectedUserId(e.target.value)}
                                                        required
                                                    >
                                                        <option value="">-- Select User --</option>
                                                        {users.map(user => (
                                                            <option key={user._id} value={user._id}>
                                                                {user.name} ({user.email})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Banner Image:</label>
                                                    <input
                                                        type="file"
                                                        className="form-control"
                                                        onChange={handleFileChange}
                                                        required
                                                    />
                                                    {preview && (
                                                        <div className="mt-3 text-center border p-2 rounded bg-light">
                                                            <img src={preview} alt="Preview" width="150" className="img-fluid rounded" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="modal-footer">
                                                    <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                                    <button type="submit" className="btn btn-primary">Add Banner</button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="table-container p-3">
                                <table className="table table-bordered border text-capitalize">
                                    <thead className="text-bold text-[15px] text-black bg-gray-100">
                                        <tr>
                                            <th>Sr No</th>
                                            <th>Banner Image</th>
                                            <th>Owner (User)</th>
                                            <th>Role</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan="5" className="text-center py-4">Loading banners...</td>
                                            </tr>
                                        ) : banners.length > 0 ? (
                                            banners.map((banner, index) => (
                                                <tr key={banner._id}>
                                                    <td>{index + 1}</td>
                                                    <td>
                                                        <img src={banner.imageUrl} alt="Banner" width={100} className="rounded border cursor-pointer" onClick={() => setZoomedBanner(banner.imageUrl)} />
                                                    </td>
                                                    <td>
                                                        <div className="font-bold">{banner.userId?.name || 'Unknown'}</div>
                                                        <small className='text-muted lowercase'>{banner.userId?.email || 'N/A'}</small>
                                                    </td>
                                                    <td>
                                                        <span className={`btn btn-sm ${banner.userId?.role === 'Admin' ? 'btn-primary' : 'btn-info'}`}>
                                                            {banner.userId?.role || 'User'}
                                                        </span>
                                                    </td>
                                                    <td className="d-flex gap-2">
                                                        <button
                                                            className="btn btn-warning text-white btn-sm"
                                                            onClick={() => handleEdit(banner)}
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#editBannerModal"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => handleDelete(banner._id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="text-center py-5">No banners found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Edit Banner Modal */}
                            <div className="modal fade" id="editBannerModal" tabIndex={-1} aria-hidden="true">
                                <div className="modal-dialog modal-dialog-centered">
                                    <EditBanner
                                        editbanner={editBannerData}
                                        fetchBanner={fetchBanners}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {zoomedBanner && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1060, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', padding: '1rem' }}>
                        <button
                            onClick={() => setZoomedBanner(null)}
                            className="btn btn-danger rounded-circle"
                            style={{ position: 'absolute', top: '-15px', right: '-15px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1061 }}
                        >
                            <i className="bi bi-x-lg fw-bold"></i>✖
                        </button>
                        <img
                            src={zoomedBanner}
                            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }}
                            alt="Zoomed Banner"
                        />
                    </div>
                </div>
            )}
        </>
    );
};

export default ManageBanner;
