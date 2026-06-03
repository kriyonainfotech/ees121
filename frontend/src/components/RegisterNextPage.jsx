import axios from "axios";
import React, { useState, useEffect, useContext } from "react";
import logo from "../../public/ees-logo.png";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getFcmToken } from "../Firebaseconfig";
import { FCMContext } from "../context/FCMContext";
import { UserContext } from "../UserContext";
import { RegistrationContext } from "../context/RegistrationContext";

// import { categories } from '../ServiceCategory'

const backend_API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

const RegisterNextPage = ({ onNext, onBack, isStep }) => {
  const { user } = useContext(UserContext);
  const { formData, setFormData } = useContext(RegistrationContext); // ✅ Use Context
  const { fcmToken } = useContext(FCMContext);
  const [categories, setCategories] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  if (user && !user.isPartial) {
    // Redirect to a protected page if already logged in
    return <Navigate to="/" />;
  }

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const fetchCategory = async () => {
    try {
      const response = await axios.get(
        `${backend_API}/category/getAllCategory`
      );
      const sortedCategories = response.data.category.sort((a, b) =>
        a.categoryName.localeCompare(b.categoryName)
      );

      setCategories(sortedCategories);
      // console.log(sortedCategories, "sortedCategories");
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    fetchCategory();
  }, []);

  // ✅ Create a single handler for text inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const selectCategory = (category) => {
    // ✅ Update the context state for the category
    setFormData(prevData => ({ ...prevData, businessCategory: category }));
    setIsDropdownOpen(false);
    setSearchQuery("");
  };

  const handleSubmits = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        const token = sessionStorage.getItem("regToken");
        if (!token) {
            toast.error("Session expired. Please start again.");
            if (isStep) onBack(); 
            return;
        }

        // Validate
        const newErrors = {};
        if (!formData.businessName) newErrors.businessName = "Business Name is required";
        if (!formData.businessCategory) newErrors.businessCategory = "Category is required";
        if (!formData.businessAddress) newErrors.businessAddress = "Business Address is required";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setLoading(false);
            return;
        }

        const response = await axios.put(`${backend_API}/auth/registration-step2`, {
            businessName: formData.businessName,
            businessCategory: formData.businessCategory,
            businessAddress: formData.businessAddress,
            businessDetaile: formData.businessDetaile,
            fcmToken: fcmToken
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
            toast.success("Step 2 complete!");
            if (isStep) {
                onNext();
            } else {
                navigate("/RegisterAadhar");
            }
        }
    } catch (error) {
        console.error("Step 2 Error:", error);
        toast.error(error.response?.data?.message || "Registration Step 2 failed.");
    } finally {
        setLoading(false);
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="container flex justify-center items-center min-h-screen">
        <div className="w-full max-w-full overflow-hidden flex flex-col lg:flex-row">
          {!isStep && (
            <button
              onClick={() => navigate(-1)}
              type="button"
              className="btn absolute top-5 start-5 btn-primary"
            >
              Back
            </button>
          )}
          <div className="w-full lg:w-1/2 p-8 flex flex-col justify-center">
            <div className="flex flex-col items-center">
              <img src={logo} width={100} className="mb-6" />
              <h2 className="text-2xl font-semibold text-gray-800">
                Create Your Business Account
              </h2>
            </div>
            <form className="mt-6" onSubmit={handleSubmits}>
              <div className="space-y-4">
                <input
                  type="text"
                  value={formData.businessName}
                  name="businessName"
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-300 text-gray-800 focus:ring focus:ring-green-300 focus:outline-none"
                  placeholder="Business Name"
                />
                {errors.businessName && <p className="text-red-500 text-sm mt-1">{errors.businessName}</p>}

                <div className="relative">
                  <div
                    className="border border-gray-300 bg-gray-100 rounded-lg p-3 cursor-pointer"
                    onClick={toggleDropdown}
                  >
                    {formData.businessCategory.length > 0 ? (
                      <span className="text-gray-800">{formData.businessCategory}</span>
                    ) : (
                      <span className="text-gray-500">Select a category</span>
                    )}
                  </div>
                  {errors.businessCategory && <p className="text-red-500 text-sm mt-1">{errors.businessCategory}</p>}

                  {isDropdownOpen && (
                    <div className="absolute left-0 right-0 border bg-white mt-1 rounded-lg shadow-md max-h-60 overflow-hidden z-10">
                      {/* Search Input */}
                      <div className="p-2">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search category..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-400"
                        />
                      </div>

                      {/* Category List */}
                      <ul className="max-h-40 overflow-y-auto">
                        {filteredCategories.length > 0 ? (
                          filteredCategories.map((category, i) => (
                            <li
                              key={i}
                              className={`cursor-pointer px-4 py-2 hover:bg-green-200 ${formData.businessCategory === category.categoryName ? "bg-green-200" : ""
                                }`}
                              onClick={() => selectCategory(category.categoryName)}
                            >
                              {category.categoryName}
                            </li>
                          ))
                        ) : (
                          <li className="px-4 py-2 text-gray-400">No results found</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={formData.businessAddress}
                  name="businessAddress"
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-300 text-gray-800 focus:ring focus:ring-green-300 focus:outline-none"
                  placeholder="Business Address"
                />
                {errors.businessAddress && <p className="text-red-500 text-sm mt-1">{errors.businessAddress}</p>}

                <textarea
                  value={formData.businessDetaile}
                  onChange={handleChange}
                  name="businessDetaile"
                  className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-300 text-gray-800 focus:ring focus:ring-green-300 focus:outline-none"
                  placeholder="Business Details"
                ></textarea>

                <div className="flex gap-4">
                  {isStep && (
                    <button
                      type="button"
                      onClick={onBack}
                      disabled={loading}
                      className="w-full py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-all flex items-center justify-center focus:ring focus:ring-gray-300 disabled:opacity-50"
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all flex items-center justify-center focus:ring focus:ring-green-300 disabled:opacity-50"
                  >
                    {loading ? (
                        <div className="spinner-border spinner-border-sm" role="status"></div>
                    ) : (
                        <>
                            <svg
                                className="w-6 h-6 mr-2"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                <circle cx="8.5" cy={7} r={4} />
                                <path d="M20 8v6M23 11h-6" />
                            </svg>
                            Next Step
                        </>
                    )}
                  </button>
                </div>

              </div>
            </form>
            <p className="mt-4 text-sm text-center text-gray-600">
              Already have an account?{" "}
              <Link
                to={"/login"}
                className="text-green-600 font-semibold hover:underline"
              >
                Login
              </Link>
            </p>
          </div>

          <div className="d-none d-lg-flex col-lg-6 bg-success align-items-center justify-content-center p-4">
            <img
              src="https://readymadeui.com/signin-image.webp"
              alt="Sign In"
              className="img-fluid"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterNextPage;
