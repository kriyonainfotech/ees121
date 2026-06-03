import React, { useEffect, useState } from "react";
import { FaImage } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const backend_API = import.meta.env.VITE_API_URL || "http://localhost:3000";

const BannerCount = ({ label }) => {
  const [bannerCnt, setBannerCnt] = useState(0);
  const navigate = useNavigate();

  const fetchBanners = async () => {
    try {
      const response = await axios.get(`${backend_API}/banner/getAllBanners`);
      if (response.data.success) {
        setBannerCnt(response.data.banners.length);
      }
    } catch (error) {
      console.error("Error fetching banners count:", error);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  return (
    <div
      className="border rounded-xl p-4 bg-white hover:shadow-lg transition duration-300 cursor-pointer"
      onClick={() => navigate("/admin/manageBanner")}
    >
      <div className="flex items-center space-x-4">
        {/* Icon */}
        <div className="w-14 h-14 flex items-center justify-center bg-purple-600 text-white rounded-full">
          <FaImage className="text-2xl" />
        </div>

        {/* Text Content */}
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <h5 className="text-xl font-semibold">{bannerCnt}</h5>
        </div>
      </div>
    </div>
  );
};

export default BannerCount;
