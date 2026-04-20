import axios from "axios";
import logo from "../../public/ees-logo.png";
import React, { useContext, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { UserContext } from "../UserContext";
import { RegistrationContext } from "../context/RegistrationContext"; // ✅ import context
import { toast } from "react-toastify";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { BiCurrentLocation } from "react-icons/bi";

const backend_API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Registration({ onNext, isStep }) {
  const { user } = useContext(UserContext);
  const { formData, setFormData } = useContext(RegistrationContext);

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigete = useNavigate();
  if (user && !user.isPartial) {
    return <Navigate to="/" />;
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // In Registration.jsx

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const code = queryParams.get("referralCode");
    if (code) {
      // ✅ Use the functional update form to safely update the state
      setFormData(prevData => ({
        ...prevData, // This prevData is guaranteed to be the latest state
        referralCode: code
      }));
    }
  }, []); // The dependency array is correct, no change needed here

  const handleChange = (e) => {
    const { name, value } = e.target; // It gets the input's name and value
    setFormData(prevData => ({
      ...prevData, // Keeps all the old data
      [name]: value // Updates just the one field that changed
    }));
  };

  const handleSubmits = async (e) => {
    e.preventDefault();
    if (!validateInputs()) {
      return;
    }
    
    setLoading(true);

    try {
        const token = sessionStorage.getItem("regToken");
        let response;

        const payload = {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            address: {
                area: formData.area,
                city: formData.city,
                state: formData.state,
                country: formData.country,
                pincode: formData.pincode
            },
            referralCode: formData.referralCode
        };

        if (token) {
            console.log("[DEBUG] Updating Step 1 with existing token...");
            response = await axios.put(`${backend_API}/auth/registration-step1`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } else {
            console.log("[DEBUG] Registering new user (Step 1)...");
            response = await axios.post(`${backend_API}/auth/registerUserweb`, payload);
        }

        if (response.data.success) {
            console.log("[DEBUG] Step 1 Success:", response.data);
            // Store token and userId for subsequent steps
            if (response.data.token) {
                sessionStorage.setItem("regToken", response.data.token);
            }
            if (response.data.user?.id) {
                setFormData(prev => ({ ...prev, userId: response.data.user.id }));
            }
            toast.success(token ? "Details updated!" : "Step 1 complete!");
            
            if (isStep) {
                onNext();
            } else {
                navigete("/registernext");
            }
        }
    } catch (error) {
        console.error("Step 1 Error:", error);
        toast.error(error.response?.data?.message || "Registration Step 1 failed.");
    } finally {
        setLoading(false);
    }
  };


  // ✅ Validation uses formData fields now
  const validateInputs = () => {
    const newErrors = {};
    const { name, email, phone, password, confirmpassword, area, city, state, country, pincode } = formData;

    if (!name) newErrors.name = "Name is required.";
    if (!email) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address.";
    } else if (!email.endsWith("@gmail.com")) {
      newErrors.email = "Please use your @gmail.com email.";
    }
    if (!phone) {
      newErrors.phone = "Phone number is required.";
    } else if (!/^\d{10}$/.test(phone)) {
      newErrors.phone = "Phone number must be exactly 10 digits.";
    }
    if (!password) {
      newErrors.password = "Password is required.";
    } else if (password.length < 4) {
      newErrors.password = "Password must be at least 4 characters long.";
    }
    if (password !== confirmpassword) {
      newErrors.confirmpassword = "Passwords do not match.";
    }
    if (!area) newErrors.area = "Area is required.";
    if (!city) newErrors.city = "City is required.";
    if (!state) newErrors.state = "State is required.";
    if (!country) newErrors.country = "Country is required.";
    if (!pincode) newErrors.pincode = "Pincode is required.";

    if (Object.keys(newErrors).length > 0) {
      console.log("[DEBUG] Validation failed:", newErrors);
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePincodeChange = async (e) => {
    const newPincode = e.target.value;
    setFormData(prev => ({ ...prev, pincode: newPincode }));

    if (newPincode.length === 6) {
      setLoading(true);
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${newPincode}`);
        const data = await response.json();
        if (data[0].Status === "Success") {
          setFormData(prev => ({
            ...prev,
            city: data[0].PostOffice[0].District,
            state: data[0].PostOffice[0].State,
            pincode: newPincode,
          }));
        } else {
          setFormData(prev => ({ ...prev, city: "", state: "", pincode: newPincode }));
          toast.error("Invalid Pincode");
        }
      } catch (error) {
        console.error("Error fetching address:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          if (data.address) {
            const { town, state_district, state, country, postcode } = data.address;
            setFormData(prev => ({
              ...prev,
              area: town || "",
              pincode: postcode || "",
              city: state_district || "",
              state: state || "",
              country: country || "",
            }));
            toast.success("Location fetched successfully!");
          } else {
            toast.error("Failed to fetch location. Try again.");
          }
        } catch (error) {
          toast.error("Failed to fetch location details.");
        }
      },
      () => toast.error("Please allow location access."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <>
      <div className=" min-h-screen flex items-center justify-center">
        <div className="sm:m-10 sm:rounded-lg flex justify-center flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left Side (Logo & Illustration) */}
            <div className="flex flex-col items-center justify-center bg-gray-100 p-8">
              <img src={logo} width={100} alt="Logo" className="mb-6" />
              <img
                src="https://readymadeui.com/signin-image.webp"
                width={300}
                alt="Sign Up Illustration"
                className="max-w-xs"
              />
            </div>

            {/* Right Side (Form) */}
            <div className="p-8">
              <h2 className="text-2xl font-semibold text-gray-800 text-center pb-4">
                Create an Account
              </h2>
              <form onSubmit={handleSubmits}>
                {/* Referral Code (If available) */}
                {formData.referralCode && (
                  <div className="mb-4">
                    <label className="text-gray-600 text-sm">
                      Referral Code:
                    </label>
                    <input
                      type="text"
                      name="referralCode"
                      value={formData.referralCode}
                      disabled
                      className="w-full px-4 py-2 border rounded-md bg-gray-200"
                    />
                  </div>
                )}

                {/* Name & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-400"
                      placeholder="Full Name"
                    />
                    {errors.name && (
                      <span className="text-red-500 text-sm">
                        {errors.name}
                      </span>
                    )}
                  </div>
                  <div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-400"
                      placeholder="Email"
                    />
                    {errors.email ? (
                      <span className="text-red-500 text-sm">
                        {errors.email}
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs">
                        Email must end with @gmail.com
                      </span>
                    )}
                  </div>
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-400"
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-4 top-3 text-gray-600"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                    {errors.password && (
                      <span className="text-red-500 text-sm">
                        {errors.password}
                      </span>
                    )}
                  </div>
                  <div>
                    <input
                      type="password"
                      value={formData.confirmpassword}
                      name="confirmpassword"
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-400"
                      placeholder="Confirm Password"
                    />
                    {errors.confirmpassword && (
                      <span className="text-red-500 text-sm">
                        {errors.confirmpassword}
                      </span>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="mt-4">
                  <input
                    type="text"
                    value={formData.phone}
                    name="phone"
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-400"
                    placeholder="Phone Number"
                  />
                  {errors.phone && (
                    <span className="text-red-500 text-sm">{errors.phone}</span>
                  )}
                </div>

                <div>
                  {/* Pincode & Get Location */}
                  <div className="flex gap-2 mt-4 relative">
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handlePincodeChange}
                      maxLength="6"
                      className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-400"
                      placeholder="Pincode"
                    />
                    {errors.pincode && (
                      <span className="text-red-500 text-sm block absolute -bottom-5 left-0">
                        {errors.pincode}
                      </span>
                    )}
                    {loading && (
                      <div className="absolute right-14 top-2 text-green-500">
                        <div className="spinner-border spinner-border-sm" role="status">
                          <span className="sr-only">Loading...</span>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={fetchCurrentLocation}
                      type="button"
                      className=" px-4 py-2  bg-gray-400 text-white rounded-md"
                    >
                      <BiCurrentLocation size={22} />
                    </button>
                  </div>

                  {/* Address Fields */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="flex flex-col">
                      <input
                        type="text"
                        name="area"
                        value={formData.area}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-400"
                        placeholder="Area"
                      />
                      {errors.area && (
                        <span className="text-red-500 text-sm">{errors.area}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <input
                        type="text"
                        value={formData.city}
                        name="city"
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-400"
                        placeholder="City"
                      />
                      {errors.city && (
                        <span className="text-red-500 text-sm">{errors.city}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="flex flex-col">
                      <input
                        type="text"
                        value={formData.state}
                        name="state"
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-400"
                        placeholder="State"
                      />
                      {errors.state && (
                        <span className="text-red-500 text-sm">{errors.state}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <input
                        type="text"
                        value={formData.country}
                        name="country"
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-400"
                        placeholder="Country"
                      />
                      {errors.country && (
                        <span className="text-red-500 text-sm">{errors.country}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="mt-6 flex justify-center">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-300 flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                    ) : (
                        <svg
                        className="w-5 h-5"
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
                    )}
                    Next Step
                  </button>
                </div>

                {/* Login Link */}
                <p className="mt-4 text-sm text-center text-gray-600">
                  Already have an account?
                  <Link
                    to="/login"
                    className="text-success link-underline-success font-semibold hover:underline text-lg ml-1"
                  >
                    Log in
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Registration;
