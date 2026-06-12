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

  useEffect(() => {
    fetchRemarks();
  }, [userId]);

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

            {/* Add Remark Input */}
            <div className="mb-3 d-flex">
              <input
                type="text"
                className="form-control"
                placeholder="Add a new remark..."
                value={newRemark}
                onChange={(e) => setNewRemark(e.target.value)}
              />
              <button className="btn btn-sm btn-primary ms-2" onClick={handleAddRemark}>
                Add
              </button>
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
