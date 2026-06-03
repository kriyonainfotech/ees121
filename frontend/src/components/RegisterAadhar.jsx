import React, { useState, useContext, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import { UserContext } from "../UserContext";
import { FCMContext } from "../../src/context/FCMContext";
import { toast } from "react-toastify";
import axios from "axios";
import { FiCamera } from "react-icons/fi";
import logo from "../../public/ees-logo.png";
import ProfileIcon from "../../public/User_icon.webp";
import { RegistrationContext } from "../context/RegistrationContext";

const backend_API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // **2MB file size limit**
// const MAX_FILE_SIZE = 50 * 1024; // 50KB
const RegisterAadhar = ({ onBack, isStep }) => {
  const { user } = useContext(UserContext);
  const { fcmToken } = useContext(FCMContext);
  const navigate = useNavigate();
  const { formData, setFormData } = useContext(RegistrationContext); // ✅ Use Context

  if (user && !user.isPartial) {
    return <Navigate to="/" />;
  }

  const [frontAadharPreview, setFrontAadharPreview] = useState(null);
  const [backAadharPreview, setBackAadharPreview] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);

  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [webcamMode, setWebcamMode] = useState(""); // Track which field (front/back/profile) is using the webcam
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState({ frontAadhar: false, backAadhar: false, profilePic: false });
  const webcamRef = useRef(null);
  // ✅ Update your image handler to update the context

  const handleImageChange = (e, fieldName, setPreviewState) => {
    const file = e.target.files[0];
    if (file) {
      setPreviewLoading(prev => ({ ...prev, [fieldName]: true }));
      const blobUrl = URL.createObjectURL(file);
      setFormData(prevData => ({ ...prevData, [fieldName]: file }));
      setPreviewState(blobUrl);
      // Small timeout to simulate or handle UI update if the browser is slow with large images
      setTimeout(() => {
        setPreviewLoading(prev => ({ ...prev, [fieldName]: false }));
      }, 500);
    }
  };

  const toggleWebcam = (mode) => {
    setWebcamMode(mode);
    setIsWebcamOpen(!isWebcamOpen);
  };

  const captureWebcamImage = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setPreviewLoading(prev => ({ ...prev, [webcamMode]: true }));
      fetch(imageSrc)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], `${webcamMode}.jpeg`, {
            type: "image/jpeg",
          });
          if (file.size > MAX_FILE_SIZE) {
            toast.error("Captured image is too large. Please try again.");
            return;
          }

          if (webcamMode === "frontAadhar") {
            setFormData(prev => ({ ...prev, frontAadhar: file }));
            setFrontAadharPreview(imageSrc);
          } else if (webcamMode === "backAadhar") {
            setFormData(prev => ({ ...prev, backAadhar: file }));
            setBackAadharPreview(imageSrc);
          } else if (webcamMode === "profile") {
            setFormData(prev => ({ ...prev, profilePic: file }));
            setProfilePicPreview(imageSrc);
          }
          setPreviewLoading(prev => ({ ...prev, [webcamMode]: false }));
          setIsWebcamOpen(false);
        });
    }
  };

  // In RegisterAadhar.jsx

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = sessionStorage.getItem("regToken");
      if (!token) {
        toast.error("Session expired. Please restart registration.");
        if (isStep) onBack();
        return;
      }

      // Validate required fields from the context
      if (!formData.profilePic || !formData.frontAadhar || !formData.backAadhar) {
        toast.error("Please upload your profile selfie and both sides of the Aadhar card.");
        setLoading(false);
        return;
      }

      // ✅ Create the FormData object
      const formDataToSend = new FormData();
      formDataToSend.append("frontAadhar", formData.frontAadhar);
      formDataToSend.append("backAadhar", formData.backAadhar);
      formDataToSend.append("profilePic", formData.profilePic);
      formDataToSend.append("fcmToken", fcmToken);

      const response = await axios.post(
        `${backend_API}/auth/registration-step3`,
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`
          },
        }
      );

      if (response.data.success) {
        toast.success("Registration complete! Awaiting admin approval.");

        // Clear registration flow data
        sessionStorage.removeItem("regToken");
        sessionStorage.removeItem("registrationStep");

        navigate("/login");
      }
    } catch (error) {
      console.error("Step 3 error:", error);
      toast.error(error.response?.data?.message || "Final registration step failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="sm:m-0  sm:rounded-lg flex justify-center flex-1">
        <div className="text-gray-900 w-full flex justify-center">
          <div className="sm:m-0  w-full flex justify-center flex-1">
            <div className="lg:w-1/2 xl:w-6/12 p-6 sm:p-12">
              <div className="flex flex-col items-center">
                <div className="w-full flex-1">
                  <div className="flex flex-col items-center">
                    <div>
                      <img src={logo} width={100} alt="Logo" />
                    </div>
                  </div>
                  <div className="my-3 border-b text-center">
                    <div className="leading-none px-2 inline-block text-sm text-gray-600 tracking-wide font-medium bg-white transform translate-y-1/2"></div>
                  </div>
                  {!isStep && (
                    <button
                      onClick={() => navigate(-1)}
                      type="button"
                      className="btn absolute top-5 start-5 btn-primary"
                    >
                      Back
                    </button>
                  )}
                  <form onSubmit={handleSubmit}>
                    <div className="mx-auto max-w-full">
                      <h4 className="py-4 text-center">Aadhaar KYC</h4>
                      <div className="d-flex " style={{ position: "relative" }}>
                        <div className="col-6 p-1">
                          <div className="">
                            <div
                              className="upload-box adhaar-front h-[100px] border rounded-2 d-flex justify-content-center align-items-center position-reletive"
                              onClick={() =>
                                document
                                  .getElementById("frontAadharInput")
                                  .click()
                              }
                            >
                              {previewLoading.frontAadhar ? (
                                <div className="spinner-border spinner-border-sm text-green" role="status"></div>
                              ) : frontAadharPreview ? (
                                <img
                                  src={frontAadharPreview}
                                  className="w-100 h-100 img-fluid"
                                  alt="Front Aadhaar"
                                />
                              ) : (
                                <h4>Front</h4>
                              )}
                            </div>

                            <input
                              type="file"
                              id="frontAadharInput"
                              accept="image/*"
                              onChange={(e) => handleImageChange(e, "frontAadhar", setFrontAadharPreview)}
                              hidden
                            />
                            <button
                              type="button"
                              className="btn d-none d-md-flex bg-green text-white position-absolute  p-2 rounded-5 bottom-[-5%] left-[3%]"
                              onClick={() => toggleWebcam("frontAadhar")}
                            >
                              <FiCamera />
                            </button>
                            <div className="d-flex d-md-none">
                              <label
                                htmlFor="cameraInputt"
                                className="position-absolute top-[80%] start-[-5%] p-2 bg-green text-white rounded-full mx-2 cursor-pointer"
                              >
                                <FiCamera />
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                capture="camera"
                                name=""
                                id="cameraInputt"
                                onChange={(e) => handleImageChange(e, "frontAadhar", setFrontAadharPreview)}
                                className="hidden"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="col-6 p-1">
                          <div className="" style={{ position: "relative" }}>
                            <div
                              className="upload-box adhaar-back h-[100px] border rounded-2 d-flex justify-content-center align-items-center position-reletive"
                              onClick={() =>
                                document
                                  .getElementById("backAadharInput")
                                  .click()
                              }
                            >
                              {previewLoading.backAadhar ? (
                                <div className="spinner-border spinner-border-sm text-green" role="status"></div>
                              ) : backAadharPreview ? (
                                <img
                                  src={backAadharPreview}
                                  className="w-100 h-100 img-fluid"
                                  alt="Back Aadhaar"
                                />
                              ) : (
                                <h4>Back</h4>
                              )}
                            </div>
                            <input
                              type="file"
                              id="backAadharInput"
                              accept="image/*"
                              onChange={(e) => handleImageChange(e, "backAadhar", setBackAadharPreview)}
                              hidden
                            />
                            <button
                              type="button"
                              className="btn d-none d-md-flex bg-green text-white position-absolute p-2 rounded-5 bottom-[-9%] left-[5%]"
                              onClick={() => toggleWebcam("backAadhar")}
                            >
                              <FiCamera />
                            </button>
                            <div className="d-flex d-md-none">
                              <label
                                htmlFor="cameraInputs"
                                className="position-absolute top-[80%] start-[-10%]   p-2 bg-green text-white rounded-full mx-2 cursor-pointer"
                              >
                                <FiCamera />
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                capture="camera"
                                id="cameraInputs"
                                onChange={(e) => handleImageChange(e, "backAadhar", setBackAadharPreview)}
                                className="hidden"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-12 d-flex justify-content-center">
                        <div className=" py-3" style={{ position: "relative" }}>
                          <h5 className="py-4">Profile Selfie</h5>
                          <div
                            className="upload-box w-[150px] h-[150px] border rounded-full d-flex justify-content-center align-items-center"
                            onClick={() =>
                              document.getElementById("profilePicInput").click()
                            }
                          >
                            {previewLoading.profilePic ? (
                              <div className="spinner-border text-green" role="status"></div>
                            ) : profilePicPreview ? (
                              <img
                                src={profilePicPreview}
                                alt="Profile"
                                className="w-100 h-100 rounded-full img-fluid"
                              />
                            ) : (
                              <img
                                src={ProfileIcon}
                                alt="Profile"
                                className="w-100 h-100 img-fluid"
                              />
                            )}
                          </div>
                          <input
                            type="file"
                            id="profilePicInput"
                            accept="image/*"
                            onChange={(e) => handleImageChange(e, "profilePic", setProfilePicPreview)}
                            hidden
                          />
                          <button
                            type="button"
                            className="btn  bg-green p-2 text-white rounded-5 position-absolute bottom-[10%]"
                            onClick={() => toggleWebcam("profile")}
                          >
                            <FiCamera />
                          </button>
                          <div className="d-flex d-none ">
                            <label
                              htmlFor="cameraInput"
                              className="position-absolute top-[80%]  p-2 bg-green text-white rounded-full mx-2 cursor-pointer"
                            >
                              <FiCamera />
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              capture="camera"
                              id="cameraInput"
                              // onChange={(e) => handleImageChange(e, setProfilePic, setProfilePicPreview)}
                              onChange={(e) => handleImageChange(e, "profilePic", setProfilePicPreview)}
                              className="hidden"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        {isWebcamOpen && (
                          <div className="webcam-overlay">
                            <div className="webcam-popup">
                              <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                className="webcam"
                              />
                              <button
                                type="button"
                                onClick={captureWebcamImage}
                                className="btn btn-primary mt-2"
                              >
                                Capture
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsWebcamOpen(false)}
                                className="btn btn-secondary mt-2"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap justify-center">
                          <div className="w-full sm:w-auto flex flex-col items-center">
                            <div className="flex gap-4 w-full sm:w-auto">
                              {isStep && (
                                <button
                                  type="button"
                                  onClick={onBack}
                                  disabled={loading}
                                  className="flex items-center justify-center bg-gray-500 hover:bg-gray-600 text-white px-5 py-2.5 rounded-lg shadow-sm font-medium transition ease-in duration-200 disabled:opacity-50"
                                >
                                  Back
                                </button>
                              )}
                              <button
                                type="submit"
                                className="flex items-center justify-center flex-1 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg shadow-sm hover:shadow-lg font-medium transition ease-in duration-200 disabled:opacity-50"
                                disabled={loading}
                              >
                                {loading ? (
                                  <div
                                    className="spinner-border text-white border-2"
                                    role="status"
                                    style={{ width: '1.2rem', height: '1.2rem' }}
                                  ></div>
                                ) : (
                                  "Finish Registration"
                                )}
                              </button>
                            </div>

                            <p className="mt-4 text-sm text-gray-600">
                              Already have an account?{" "}
                              <Link
                                to={"/login"}
                                className="text-success font-semibold hover:underline text-lg ml-1"
                              >
                                login
                              </Link>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            <div className="flex-1 bg-green-100 text-center hidden lg:flex">
              <div className="m-12 xl:m-16 w-full bg-contain bg-center bg-no-repeat">
                <img src="https://readymadeui.com/signin-image.webp" alt="" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterAadhar;
