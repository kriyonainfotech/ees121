import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MdOutlineDeleteOutline, MdDateRange } from "react-icons/md";
import { FaEdit, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { useNavigate, Link } from 'react-router-dom';
import AdminHeader from '../admincomponents/AdminHeader';
import AdminSidebar from '../admincomponents/AdminSidebar';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast } from 'react-toastify';
import { IoArrowBack } from "react-icons/io5";
import { SiTicktick } from "react-icons/si";
import { RxCrossCircled } from "react-icons/rx";

const backend_API = import.meta.env.VITE_API_URL || "http://localhost:3000";;

const UserDetailsModal = ({ user: initialUser, onClose }) => {
    const [localUser, setLocalUser] = useState(initialUser);
    const user = localUser;
    const [zoomedIndex, setZoomedIndex] = useState(null);
    const [zoomPic, setZoompic] = useState(null)
    const [permanentAddress, setPermanentAddress] = useState(user.address?.area || "");
    const [aadharNumber, setAadharNumber] = useState(user.aadharNumber || "");
    const [name, setName] = useState(user.name || "");
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState(user._id);
    const [rejectStep, setRejectStep] = useState("");
    const [rejectReason, setRejectReason] = useState("");
    const navigate = useNavigate();

    const galleryImages = [user.profilePic, user.frontAadhar, user.backAadhar].filter(Boolean);

    if (!user) return null;

    const approveUser = async (userId) => {
        if (!user.paymentVerified) {
            return toast.error("Cannot approve: Payment is not completed yet");
        }
        if (!user.frontAadhar || !user.backAadhar) {
            return toast.error("Cannot approve: Aadhar card photos are missing");
        }
        if (!user.profilePic) {
            return toast.error("Cannot approve: Profile photo is missing");
        }

        try {
            const response = await axios.put(`${backend_API}/auth/approveUser`, { userId }, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (response.status === 200) {
                toast(response?.data?.message)
                // fetchData(); // Refresh the user list after approval
                navigate("/admin/users")
            }
        } catch (error) {
            console.log(error);
            toast(error?.response?.data?.message)
        }
    };

    const handleRejectStep = async (userId) => {
        if (!rejectStep) {
            toast.error("Please select a step to reject");
            return;
        }
        try {
            const response = await axios.put(`${backend_API}/auth/rejectUserStep`, { 
                userId, 
                stepNumber: parseInt(rejectStep), 
                reason: rejectReason 
            }, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (response.status === 200) {
                toast.success(response?.data?.message);
                onClose(); // close the modal and we can refresh
                window.location.reload(); // Quick way to refresh for now
            }
        } catch (error) {
            console.log(error);
            toast.error(error?.response?.data?.message || "Failed to reject step");
        }
    };

    const handleSave = async () => {
        console.log(permanentAddress, aadharNumber, name, userId, "permanentAddress, aadharNumber, name");
        try {
            setLoading(true);
            const response = await axios.put(`${backend_API}/auth/updateUserAddressAndAadhar`, {
                permanentAddress,
                aadharNumber,
                name,
                userId,
            });
            console.log(response.data);
            if (response.status === 200) {
                toast.success(response?.data?.message);
                setLocalUser(prev => ({
                    ...prev,
                    name,
                    aadharNumber,
                    address: {
                        ...prev.address,
                        area: permanentAddress
                    }
                }));
            }
        } catch (error) {
            console.log("Error updating user details:", error);
            toast.error(error?.response?.data?.message || "Failed to update user details");
        } finally {
            setLoading(false);
        }
    };

    const openZoomModal = (index) => {
        setZoomedIndex(index);
    };

    const closeZoomModal = () => {
        setZoomedIndex(null);
    };

    const handlePrevNext = (step) => {
        setZoomedIndex((prevIndex) => (prevIndex + step + galleryImages.length) % galleryImages.length);
    };

    return (
        <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">

            <div className="modal-content bg-white p-2 rounded shadow-lg w-full sm:w-3/4 md:w-1/2 lg:w-1/3 max-w-4xl h-[80vh] overflow-hidden">
                <h2 className="text-xl font-bold py-3 text-center border">User Details</h2>
                <div className="modal-body overflow-y-auto">
                    <table className="table-auto w-full border-collapse border border-gray-300">
                        <tbody>
                            <tr>
                                <td className="border border-gray-300 px-4 py-2 font-semibold">ProfilePic</td>
                                <td className="border border-gray-300 px-4 py-2">
                                    <img src={user.profilePic} width={50} alt="Profile" className="cursor-pointer" onClick={() => {
                                        const galleryIndex = galleryImages.indexOf(user.profilePic);
                                        openZoomModal(galleryIndex);
                                    }} />
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 px-4 py-2 font-semibold">Name</td>
                                <td className="border border-gray-300 px-4 py-2">{user.name}</td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 px-4 py-2 font-semibold">Email</td>
                                <td className="border border-gray-300 px-4 py-2">{user.email}</td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 px-4 py-2 font-semibold">Contact</td>
                                <td className="border border-gray-300 px-4 py-2">{user.phone}</td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 px-4 py-2 font-semibold">Address</td>
                                <td className="border border-gray-300 px-4 py-2">
                                    {`${user?.address?.area} ${user?.address?.city} ${user?.address?.state} ${user?.address?.country} ${user?.address?.pincode}`}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 px-4 py-2 font-semibold">Business Name</td>
                                <td className="border border-gray-300 px-4 py-2">{user.businessName}</td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 px-4 py-2 font-semibold">Business Category</td>
                                <td className="border border-gray-300 px-4 py-2">{user.businessCategory}</td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 px-4 py-2 font-semibold">Business Address</td>
                                <td className="border border-gray-300 px-4 py-2">{user.businessAddress}</td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 px-4 py-2 font-semibold">Aadhar</td>
                                <td className="border border-gray-300 px-4 py-2 flex gap-2">
                                    {[user.frontAadhar, user.backAadhar].filter(Boolean).map((img, index) => {
                                        const galleryIndex = galleryImages.indexOf(img);
                                        return (
                                            <img
                                                key={index}
                                                src={img}
                                                width={50}
                                                alt={`Aadhar ${index + 1}`}
                                                className="cursor-pointer"
                                                onClick={() => openZoomModal(galleryIndex)}
                                            />
                                        );
                                    })}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 px-4 py-2 font-semibold">Permanent Address</td>
                                <td className="border border-gray-300 px-4 py-2">{permanentAddress}</td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 px-4 py-2 font-semibold">Aadhar Number</td>
                                <td className="border border-gray-300 px-4 py-2">{aadharNumber}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 p-3 border rounded bg-red-50 flex flex-wrap gap-2 items-center">
                    <h3 className="font-bold text-red-600 w-full mb-1">Reject Specific Step</h3>
                    <select className="border p-2 rounded" value={rejectStep} onChange={(e) => setRejectStep(e.target.value)}>
                        <option value="">Select Step to Reject</option>
                        <option value="1">Step 1: Personal Details</option>
                        <option value="2">Step 2: Business Details</option>
                        <option value="3">Step 3: Payment</option>
                        <option value="4">Step 4: Documents (Aadhar)</option>
                    </select>
                    <input type="text" className="border p-2 rounded flex-1" placeholder="Reason for rejection (e.g. Blurry photo)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                    <button onClick={() => handleRejectStep(user._id)} className="bg-red-500 text-white px-4 py-2 rounded font-semibold hover:bg-red-600">Reject Step</button>
                </div>
                <div className="flex justify-end mt-4 gap-1">
                    <button onClick={() => approveUser(user._id)} className="btn btn-primary w-full sm:w-auto">Approve</button>
                    <button onClick={onClose} className="btn btn-secondary w-full sm:w-auto">Close</button>
                </div>
            </div>
            {zoomedIndex !== null && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-[60]">
                    <div className="bg-white p-4 rounded-lg flex relative">
                        <button onClick={closeZoomModal} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full">✖</button>
                        <div className="flex items-center">
                            <button onClick={() => handlePrevNext(-1)} className="px-4 py-2 bg-gray-300 rounded">⬅</button>
                            <img src={galleryImages[zoomedIndex]} className="max-w-[70%] max-h-[90vh] object-contain mx-4" alt="Zoomed Image" />
                            <button onClick={() => handlePrevNext(1)} className="px-4 py-2 bg-gray-300 rounded">➡</button>
                        </div>
                        <div className="flex flex-col gap-4 w-1/3 p-4">
                            <input type="text" className="border p-2 w-full" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
                            <input type="text" className="border p-2 w-full" placeholder="Aadhar Number" value={aadharNumber} onChange={(e) => setAadharNumber(e.target.value)} />
                            <input type="text" className="border p-2 w-full" placeholder="Permanent Address" value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} />
                            <button onClick={handleSave} className="bg-blue-500 text-white px-4 py-2 rounded" disabled={loading}>{loading ? "Saving..." : "Save"}</button>
                        </div>
                    </div>
                </div>
            )}

            {zoomPic && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-[60]">
                    <div className="relative bg-white p-4 rounded-lg shadow-lg">
                        <button
                            onClick={closeZoomModal}
                            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full"
                        >
                            ✖
                        </button>
                        <img
                            src={zoomPic}
                            className="max-w-[90vw] max-h-[90vh] object-contain"
                            alt="Zoomed"
                        />
                    </div>
                </div>
            )}

        </div >
    );
};

const AllUsers = () => {
    const [userList, setUserList] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [filter, setFilter] = useState('');
    const [selectedDate, setSelectedDate] = useState(null);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [paymentToToggle, setPaymentToToggle] = useState(null);
    const navigate = useNavigate();

    const fetchData = async () => {
        try {
            const response = await axios.get(`${backend_API}/auth/getAllUser`, {
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.data;
            console.log(data, 'data');
            const filteredUsers = data.user
                .filter(user => user.isAdminApproved === false)
                .map(user => ({
                    ...user,
                    referredBy: Array.isArray(user.referredBy) ? user.referredBy : []
                }));
            console.log('Users with referral info:', filteredUsers);
            setUserList(filteredUsers);
        } catch (error) {
            console.error('Error:', error.message);
            toast(error?.response?.data?.message)
        }
    };

    const handleReferredUserClick = async (referredById) => {
        console.log(referredById, "referredById");
        if (!referredById) return;

        try {
            const response = await axios.get(`${backend_API}/auth/getUserById/${referredById}`);
            setSelectedUser(response.data.user);
        } catch (error) {
            console.error("Error fetching referred user:", error.message);
            toast(error?.response?.data?.message || "Failed to fetch referred user details");
        }
    };

    const handlePaymentToggle = async (userId, currentStatus) => {
        try {
            const newStatus = !currentStatus;
            const res = await axios.post(`${backend_API}/payment/paymentVerified`, {
                userId,
                paymentVerified: newStatus
            });
            if (res.data.success) {
                setUserList(prev => prev.map(u => u._id === userId ? { ...u, paymentVerified: newStatus } : u));
                toast.success(`Payment marked as ${newStatus ? 'Verified' : 'Unverified'}`);
                setPaymentToToggle(null);
            }
        } catch (error) {
            toast.error("Failed to update payment status");
            console.error(error);
        }
    };

    // Fetch Categories from backend
    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${backend_API}/category/getAllCategory`);
            const sortedCategories = response.data.category.sort((a, b) =>
                a.categoryName.localeCompare(b.categoryName)
            );
            setCategories(sortedCategories);
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    useEffect(() => {
        fetchData();
        fetchCategories();
    }, []);

    const deleteUser = async (uid) => {
        toast.info(
            <div>
                <p>Are you sure you want to delete ?</p>
                <div className="d-flex justify-content-center gap-2">
                    <button className="btn btn-danger btn-sm" onClick={() => confirmDelete(uid)}>Yes</button>
                    <button className="btn btn-secondary btn-sm" onClick={toast.dismiss}>No</button>
                </div>
            </div>,
            { autoClose: true, closeOnClick: true }
        );
    };
    const confirmDelete = async (uid) => {
        toast.dismiss(); // Close the confirmation toast


        try {
            const response = await axios.delete(`${backend_API}/auth/deleteUser`, {
                headers: { 'Content-Type': 'application/json' },
                data: { id: uid },
            });
            if (response.status === 200) {
                toast(response?.data?.message)
                fetchData();
            }
        } catch (error) {
            console.error('Error:', error.message);
            toast(error?.response?.data?.message)
        }
    };

    // const handleRowClick = (user) => {
    //     setSelectedUser(user);
    // };

    const filteredUserList = userList
        .filter(user => {
            if (selectedDate && filter === 'date') {
                const userDate = new Date(user.createdAt).toLocaleDateString();
                const filterDate = selectedDate.toLocaleDateString();
                return userDate === filterDate;
            }
            if (selectedCategory && filter === 'category') {
                return user.businessCategory.includes(selectedCategory);
            }
            return true;
        })
        .sort((a, b) => {
            if (filter === 'A-Z') {
                return b.name.localeCompare(a.name);
            } else if (filter === 'Z-A') {
                return a.name.localeCompare(b.name);
            } else if (filter === 'date') {
                return new Date(b.date) - new Date(a.date);
            }
            return 0;
        });

    return (
        <>
            <AdminHeader />
            <AdminSidebar />
            <div className="my-32">

                <section>
                    <div className="container-fluid">
                        <div className="row">
                            <div className="col-12">
                                <div className="d-flex justify-content-between align-items-end">
                                    <div className="d-none d-md-flex col-md-2 justify-content-center">
                                        <button
                                            onClick={() => navigate('/admin')}
                                            className="btn btn-light d-flex align-items-center gap-2 border hover:bg-gray-100"
                                        >
                                            <IoArrowBack size={20} />
                                            <span>Back to Dashboard</span>
                                        </button>
                                    </div>
                                    <div className="col-12 col-md-8 flex align-items-end justify-content-between justify-content-md-end">
                                        <div className="col-6 col-md-5">
                                            <div>
                                                <label htmlFor="role" className="form-label">Select filter</label>


                                                <select
                                                    id="role"
                                                    className="form-select"
                                                    value={filter}
                                                    onChange={(e) => setFilter(e.target.value)}
                                                >
                                                    <option value="">All</option>
                                                    <option value="A-Z">A-Z</option>
                                                    <option value="Z-A">Z-A</option>
                                                    <option value="date">DATE</option>
                                                    <option value="category">Category</option>
                                                </select>
                                            </div>
                                            {filter === 'date' && (
                                                <div className="mt-3">
                                                    <label className="form-label">Select Date</label>
                                                    <div className="input-group">
                                                        <DatePicker
                                                            selected={selectedDate}
                                                            onChange={(date) => setSelectedDate(date)}
                                                            dateFormat="yyyy-MM-dd"
                                                            className="form-control"
                                                        />
                                                        <span className="input-group-text">
                                                            <MdDateRange />
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            {filter === 'category' && (
                                                <div className="mt-3">
                                                    <label className="form-label">Select Category</label>
                                                    <select
                                                        className="form-select"
                                                        value={selectedCategory}
                                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                                    >
                                                        <option value="">All Categories</option>
                                                        {categories.map((category) => (
                                                            <option key={category._id} value={category.categoryName}>
                                                                {category.categoryName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                        <div className="col-6 col-md-3 mt-4 flex justify-content-center">
                                            <button
                                                onClick={() => navigate('/admin/users')}
                                                className="btn btn-primary d-flex align-items-center gap-2"
                                            >
                                                <span>View All Users</span>
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="16"
                                                    height="16"
                                                    fill="currentColor"
                                                    className="bi bi-arrow-right"
                                                    viewBox="0 0 16 16"
                                                >
                                                    <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="container-fluid">
                        <div className="card bg-base-100 shadow-xl mt-5">
                            <div className="card-header text-xl text-bold z-0 py-3">Register Users</div>
                            <div className="table-container">
                                <table className="table table-bordered z-30 border">
                                    <thead className="text-bold text-[15px] text-black z-30">
                                        <tr>
                                            <th>SrNo</th>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Contact</th>
                                            <th>Address</th>
                                            <th>Referred By</th>
                                            <th>Payment Status</th>
                                            <th>Date & Time</th>
                                            <th>Remarks</th>
                                            <th>Approve</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUserList.reverse().map((user, index) => (
                                            <tr key={user._id}>
                                                <th>{index + 1}</th>
                                                <td>{user.name}</td>
                                                <td>{user.email}</td>
                                                <td>{user.phone}</td>
                                                <td>
                                                    {user?.address?.area} {user?.address?.city} {user?.address?.state}
                                                    {user?.address?.country} {user?.address?.pincode}
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-info text-white btn-sm hover:bg-blue-700"
                                                        onClick={() => handleReferredUserClick(user?.referredBy[0]?._id)}
                                                    >
                                                        {user?.referredBy?.length > 0 ? user?.referredBy[0]?.name : "N/A"}
                                                    </button>
                                                </td>
                                                <td>
                                                    {user.paymentVerified ? (
                                                        <button 
                                                            className="btn btn-success btn-sm flex items-center gap-1" 
                                                            title="Payment Verified"
                                                            onClick={(e) => { e.stopPropagation(); setPaymentToToggle({ userId: user._id, status: true }); }}
                                                        >
                                                            <span className="text-white flex items-center gap-2">Payment <SiTicktick /></span>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            title="Payment Not Verified"
                                                            onClick={(e) => { e.stopPropagation(); setPaymentToToggle({ userId: user._id, status: false }); }}
                                                        >
                                                            <span className="text-white flex items-center gap-2">Payment <RxCrossCircled size={17} className='' /></span>
                                                        </button>
                                                    )}
                                                </td>
                                                <td>
                                                    {new Date(user.createdAt).toLocaleString("en-CA", {
                                                        year: "numeric",
                                                        month: "2-digit",
                                                        day: "2-digit",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        second: "2-digit",
                                                        hour12: true, // Enable 12-hour format
                                                    })}
                                                </td>
                                                <td>
                                                    <Link
                                                        className="btn btn-dark btn-sm text-white"
                                                        to="/admin/users/addremark"
                                                        state={{ userId: user._id }}
                                                    >
                                                        Add Remarks
                                                    </Link>
                                                </td>
                                                <td>
                                                    <button
                                                        // onClick={(e) => {
                                                        //     e.stopPropagation();
                                                        //     approveUser(user._id);
                                                        // }}
                                                        onClick={() => setSelectedUser(user)}
                                                        className="btn fs-6 bg-blue text-white py-1 px-2 sm:px-4 rounded">
                                                        Approve
                                                    </button>
                                                </td>
                                                <td className="flex space-x-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteUser(user._id); }}
                                                        className="btn-xl m-1 fs-3 text-primary">
                                                        <MdOutlineDeleteOutline />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/editUser`, { state: user }); }}
                                                        className="btn-xl fs-4 text-green-500">
                                                        <FaEdit />
                                                    </button>

                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </section>

                {selectedUser && <UserDetailsModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
                
                {paymentToToggle && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-[60]">
                        <div className="bg-white p-6 rounded-lg text-center shadow-lg w-96">
                            <h3 className="text-xl font-semibold mb-4">
                                {paymentToToggle.status ? "Unverify Payment?" : "Verify Payment?"}
                            </h3>
                            <p className="mb-6 text-gray-600">
                                Are you sure you want to {paymentToToggle.status ? "mark this payment as unverified" : "verify this payment"}?
                            </p>
                            <div className="flex justify-center gap-4">
                                <button
                                    className="btn btn-secondary px-6"
                                    onClick={() => setPaymentToToggle(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className={`btn px-6 ${paymentToToggle.status ? "btn-danger" : "btn-success"}`}
                                    onClick={() => handlePaymentToggle(paymentToToggle.userId, paymentToToggle.status)}
                                >
                                    Yes, {paymentToToggle.status ? "Unverify" : "Verify"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default AllUsers;
