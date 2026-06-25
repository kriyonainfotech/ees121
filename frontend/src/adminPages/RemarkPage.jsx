import { useState, useEffect, useContext } from "react";
import { format } from "date-fns";
import axios from "axios";
import { UserContext } from "../UserContext.jsx";
import AdminHeader from "../admincomponents/AdminHeader.jsx";
import AdminSidebar from "../admincomponents/AdminSidebar.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../assets/Veryfymodal.css";
const backend_API = import.meta.env.VITE_API_URL || "http://localhost:3000";;

const RemarkPage = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate()
  const location = useLocation();
  const userId = location.state?.userId || user._id; // Use the user ID from state or context
  const [remarks, setRemarks] = useState([]);
  const [newRemark, setNewRemark] = useState("");
  const [remarkToDelete, setRemarkToDelete] = useState(null);
  const [remarkUser, setRemarkUser] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchRemarks();
      fetchUser();
    }
  }, [userId]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${backend_API}/auth/getUserById/${userId}`);
      if (response.status === 200) {
        setRemarkUser(response.data.user);
      }
    } catch (error) {
      console.log("Error fetching user details:", error);
    }
  };

  const fetchRemarks = async () => {
    try {
      const response = await axios.get(`${backend_API}/remark/user/${userId}`);
      if (response.status === 200) {
        setRemarks(response.data.remarks || []);
      }
    } catch (error) {
      console.log("Error fetching remarks:", error);
    }
  };

  const handleAddRemark = async () => {
    if (!newRemark.trim()) return;
    try {
      const response = await axios.post(`${backend_API}/remark/create`, {
        userId,
        remark: newRemark,
      });
      if (response.status === 201) {
        const addedRemark = response.data.remarks; // backend returns { remarks: newRemark }
        setRemarks(prev => [addedRemark, ...prev]);
      }
      setNewRemark("");
    } catch (error) {
      console.log("Error adding remark:", error);
    }
  };

  const handleDeleteRemark = async (remarkId) => {
    try {
      const response = await axios.delete(`${backend_API}/remark/delete/${remarkId}`);
      console.log(response, "response");
      if (response.status === 200) {
        toast("remark deleted successfully !!");
      }
      setRemarks((prevRemarks) => prevRemarks.filter((r) => r._id !== remarkId));
    } catch (error) {
      console.log("Error deleting remark:", error);
      toast.error("server error deleting remark !!");
    }
  };

  return (
    <div className="container-fluid mt-40">
      <AdminHeader />
      <AdminSidebar />
      <div className="row g-0">
        <div className="p-4 bg-light" style={{ minHeight: "100vh" }}>
          <div className="container">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="text-dark mb-0">Communication Logs</h2>
              <button onClick={() => navigate(-1)} className="btn btn-dark btn-sm btn-primary">Back</button>
            </div>

            {/* User Details Card */}
            {remarkUser && (
              <div className="card mb-4 shadow-sm border-0 border-start border-4 border-info">
                <div className="card-body d-flex align-items-center">
                  {remarkUser.profilePic ? (
                    <img src={remarkUser.profilePic} alt="Profile" className="rounded-circle me-3" style={{ width: '60px', height: '60px', objectFit: 'cover' }} />
                  ) : (
                    <div className="rounded-circle bg-secondary text-white d-flex justify-content-center align-items-center me-3" style={{ width: '60px', height: '60px' }}>
                      <span className="fs-3">{remarkUser.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                  )}
                  <div>
                    <h5 className="mb-1 text-dark fw-bold">{remarkUser.name}</h5>
                    <p className="mb-0 text-muted">
                      <strong>Phone:</strong> {remarkUser.phone} | <strong>Email:</strong> {remarkUser.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Add Remark Input */}
            <div className="card shadow-sm border-0 mb-4 bg-white" style={{ borderRadius: '15px' }}>
              <div className="card-body p-3 d-flex align-items-center gap-3">
                <input
                  type="text"
                  className="form-control border-0 bg-light px-4 py-3 fs-6"
                  style={{ borderRadius: '30px', boxShadow: 'none' }}
                  placeholder="Type a new remark here..."
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRemark()}
                />
                <button 
                  className="btn btn-primary px-4 py-3 fw-bold" 
                  style={{ borderRadius: '30px', whiteSpace: 'nowrap' }}
                  onClick={handleAddRemark}
                  disabled={!newRemark.trim()}
                >
                  Add Remark
                </button>
              </div>
            </div>

            {/* Remark List */}
            <div className="row g-4">
              {remarks?.map((remark) => (
                <div key={remark?._id} className="col-12">
                  <div className="card shadow-sm border-0 border-start border-4 border-primary">
                    <div className="card-body d-flex justify-content-between align-items-center">
                      <div className="d-flex flex-column">
                        <span className="text-dark fs-5 mb-1">{remark.remark}</span>
                        <small className="text-muted">
                          {remark.createdAt ? format(new Date(remark.createdAt), "PPpp") : "Unknown Date"}
                        </small>
                      </div>
                      <button
                        className="btn btn-sm btn-outline-danger ms-3"
                        onClick={() => setRemarkToDelete(remark._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {remarkToDelete && (
        <div className="modals">
          <div className="modal-contents text-center">
            <h5 className="py-3">Confirm Deletion</h5>
            <p className="pb-3">Are you sure you want to delete this log entry?</p>
            <div className="d-flex justify-content-center gap-3">
              <button
                className="btn btn-secondary"
                onClick={() => setRemarkToDelete(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  handleDeleteRemark(remarkToDelete);
                  setRemarkToDelete(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemarkPage;
