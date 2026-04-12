import React, { useEffect, useState } from 'react';
import AdminHeader from '../admincomponents/AdminHeader';
import AdminSidebar from '../admincomponents/AdminSidebar';
import axios from 'axios';
import EditCategory from '../admincomponents/EditCategory';
import { toast } from 'react-toastify';

const backend_API = import.meta.env.VITE_API_URL || "http://localhost:3000";

const ManageCatagory = () => {
    const [categoryName, setCategoryName] = useState("");
    const [categoryImg, setCategoryImg] = useState(null);
    const [preview, setPreview] = useState(null);
    const [categories, setCategories] = useState([]);
    const [editcategory, setEditCategory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!categoryName || !categoryImg) {
            alert("Please fill all fields");
            return;
        }

        const formData = new FormData();
        formData.append("categoryName", categoryName);
        formData.append("category", categoryImg);
        try {
            const response = await axios.post(`${backend_API}/category/addCategory`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast(response?.data?.message);
            fetchCategory(1); // Fetch first page after adding

            const modalCloseButton = document.querySelector("[data-bs-dismiss='modal']");
            if (modalCloseButton) modalCloseButton.click();

            setCategoryName("");
            setCategoryImg(null);
            setPreview(null);
        } catch (error) {
            toast(error?.response?.data?.message);
        }
    };

    const fetchCategory = async (page = 1) => {
        try {
            setLoading(true);
            const response = await axios.get(`${backend_API}/category/getAllCategory`);

            if (response.data.success) {
                setCategories(response.data.category);
            } else {
                toast.error("Failed to fetch categories");
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
            toast.error(error?.response?.data?.message || "Error fetching categories");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategory();
    }, []);

    const handleDelete = async (categoryId) => {
        toast.info(
            <div>
                <p>Are you sure you want to delete this request?</p>
                <div className="d-flex justify-content-center gap-2">
                    <button className="btn btn-danger btn-sm" onClick={() => confirmDelete(categoryId)}>Yes</button>
                    <button className="btn btn-secondary btn-sm" onClick={toast.dismiss}>No</button>
                </div>
            </div>,
            { autoClose: true, closeOnClick: true }
        );
    };
    const confirmDelete = async (categoryId) => {
        toast.dismiss();
        try {
            const response = await axios.delete(`${backend_API}/category/deleteCategory`, {
                headers: { 'Content-Type': 'application/json' },
                data: { categoryId },
            });

            if (response.status === 200) {
                toast.success("Category deleted successfully.");
            } else {
                toast.error("Failed to delete category. Please try again.");
            }
        } catch (error) {
            console.error("Error deleting category:", error);
            toast.error("Failed to delete category. Check console for more details.");
        }
    };

    const handleEdit = (category) => {
        console.log(category, 'category')
        setEditCategory(category);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            setCategoryImg(file);
            setPreview(URL.createObjectURL(file));
        } else {
            alert("Please select a valid image file.");
        }
    };

    return (
        <>
            <AdminHeader />
            <AdminSidebar />
            <section className='mt-32'>
                <div className="container">
                    <div className="row">
                        <div className="col-md-12">
                            <div className="card">
                                <div className="card-header bg-white py-4 d-flex justify-content-between align-items-center flex-wrap gap-4 border-bottom">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="bg-blue-soft p-2 rounded-lg">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="3" width="7" height="7"></rect>
                                                <rect x="14" y="3" width="7" height="7"></rect>
                                                <rect x="14" y="14" width="7" height="7"></rect>
                                                <rect x="3" y="14" width="7" height="7"></rect>
                                            </svg>
                                        </div>
                                        <h4 className="mb-0 fw-bold text-dark">Manage Categories</h4>
                                    </div>
                                    
                                    <div className="d-flex align-items-center gap-3 flex-grow-1 flex-md-grow-0 justify-content-end">
                                        <div className="position-relative flex-grow-1" style={{ maxWidth: '400px' }}>
                                            <div className="position-absolute start-0 top-50 translate-middle-y ps-3 text-muted">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                    <circle cx="11" cy="11" r="8"></circle>
                                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                                </svg>
                                            </div>
                                            <input
                                                type="text"
                                                className="form-control ps-5 py-2.5 rounded-pill border-0 bg-light shadow-none focus-ring transition-all"
                                                placeholder="Search categories..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                style={{ fontSize: '0.95rem' }}
                                            />
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery("")}
                                                    className="position-absolute end-0 top-50 translate-middle-y me-2 btn btn-link text-muted p-1"
                                                    title="Clear search"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                        <button 
                                            className="btn btn-primary px-4 py-2.5 rounded-pill shadow-sm d-flex align-items-center gap-2 transition-all hover-float" 
                                            data-bs-toggle="modal" 
                                            data-bs-target="#exampleModalE"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                            Add Category
                                        </button>
                                    </div>
                                </div>

                                <div className="modal fade" id="exampleModalE" tabIndex={-1} aria-labelledby="exampleModalLabel" aria-hidden="true">
                                    <div className="modal-dialog modal-dialog-centered">
                                        <div className="modal-content">
                                            <div className="modal-header">
                                                <h1 className="modal-title fs-5" id="exampleModalLabel">Add Category</h1>
                                                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                                            </div>
                                            <div className="modal-body">
                                                <form onSubmit={handleSubmit} encType="multipart/form-data">
                                                    <div className="mb-3">
                                                        <label htmlFor="category-name" className="col-form-label">Category Name:</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            placeholder='Category Name'
                                                            value={categoryName}
                                                            onChange={(e) => setCategoryName(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="mb-3">
                                                        <label htmlFor="category-img" className="col-form-label">Category Image:</label>
                                                        <label htmlFor="file-upload" className="btn d-inline-block border border-orange d-flex justify-content-start align-items-center">
                                                            Category Image
                                                        </label>
                                                        <input
                                                            type="file"
                                                            id="file-upload"
                                                            name="categoryImg"
                                                            onChange={handleFileChange}
                                                        />
                                                        {preview && (
                                                            <div className="mt-2 border rounded-3 p-2 d-inline-block bg-white shadow-sm">
                                                                <img src={preview} alt="Preview" width="120" style={{ maxHeight: '120px', objectFit: 'contain' }} className="rounded" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="modal-footer">
                                                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                                        <button type="submit" className="btn btn-primary">Add</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-body overflow-x-auto">
                                    <table className="table text-capitalize table-bordered">
                                        <thead>
                                            <tr>
                                                <th>Sr No</th>
                                                <th>Category Name</th>
                                                <th>Category Image</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {categories
                                                .filter(cat => cat.categoryName?.toLowerCase().includes(searchQuery.toLowerCase()))
                                                .map((category, index) => (
                                                <tr key={category._id} className='text-capitalize'>
                                                    <td>{++index}</td>
                                                    <td className='text-capitalize'>{category.categoryName}</td>
                                                    <td>
                                                        <div style={{
                                                            width: '70px',
                                                            height: '70px',
                                                            backgroundColor: 'white',
                                                            padding: '5px',
                                                            borderRadius: '8px',
                                                            border: '1px solid #ddd',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            <img 
                                                                src={category.image} 
                                                                alt="Category" 
                                                                width={60} 
                                                                height={60}
                                                                style={{ 
                                                                    objectFit: 'contain',
                                                                    backgroundColor: 'white'
                                                                }} 
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className='d-flex gap-2 justify-content-start'>
                                                        <button
                                                            className="btn bg-green text-white"
                                                            onClick={() => handleEdit(category)}
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#exampleModal"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="btn bg-orange text-white ms-2"
                                                            onClick={() => handleDelete(category._id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {categories.filter(cat => cat.categoryName?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="text-center py-5">
                                                        <div className="d-flex flex-column align-items-center gap-2 text-muted">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-25">
                                                                <circle cx="11" cy="11" r="8"></circle>
                                                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                                            </svg>
                                                            <p className="mb-0 mt-2 fs-5">No categories found matching &ldquo;<strong>{searchQuery}</strong>&rdquo;</p>
                                                            <button 
                                                                className="btn btn-link text-primary p-0" 
                                                                onClick={() => setSearchQuery("")}
                                                            >
                                                                Clear search
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="modal fade" id="exampleModal" tabIndex={-1} aria-labelledby="exampleModalLabel" aria-hidden="true">
                                    <div className="modal-dialog modal-dialog-centered">
                                        <EditCategory
                                            editcategory={editcategory}
                                            fetchCategory={fetchCategory}
                                            categoryImg={categoryImg}

                                        />
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

export default ManageCatagory;
