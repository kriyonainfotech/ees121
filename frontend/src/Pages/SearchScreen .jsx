import { getAuthToken } from '../utils/auth';

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { TailSpin } from 'react-loader-spinner';

const backend_API = import.meta.env.VITE_API_URL || "http://localhost:3000";;

const SearchScreen = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState(() => {
    // Load cached categories from local storage
    const storedCategories = localStorage.getItem('categories');
    return storedCategories ? JSON.parse(storedCategories) : [];
  });
  const [loading, setLoading] = useState(categories.length === 0); // Load only if empty
  const [error, setError] = useState(null);

  // Fetch all categories at once and cache them
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${backend_API}/category/getAllCategory`);
      console.log(response, "categories");

      if (!response.data || !Array.isArray(response.data.category)) {
        throw new Error("Invalid data format");
      }

      // Ensure unique categories by name (case-insensitive)
      const uniqueCategories = Array.from(
        new Map(
          response.data.category.map((item) => [item.categoryName.toLowerCase(), item])
        ).values()
      ).sort((a, b) => a.categoryName.localeCompare(b.categoryName));

      // Check if images have changed
      const storedCategories = localStorage.getItem("categories");
      if (!storedCategories || JSON.stringify(uniqueCategories) !== storedCategories) {
        // If different, update localStorage
        localStorage.setItem("categories", JSON.stringify(uniqueCategories));
        setCategories(uniqueCategories);
      } else {
        console.log("🟢 No changes in categories, using cached data.");
      }

      setError(null);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setError(error?.response?.data?.message || "Failed to fetch categories");
      toast.error("Error loading categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  if (error) {
    return <div className="text-center p-4 text-danger">{error}</div>;
  }

  return (

    <section className="mt-2">
      <div className="container">
        <div className="row row-cols-3 row-cols-lg-5 g-3">
          {categories.map((item, index) => (
            <div
              key={item._id}
              className="col text-center"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/serviceDetail`, { state: item.categoryName })}
            >
              <div className="border-0 w-100 h-100 rounded-md">
                <figure
                  className="w-100 m-0 py-2 mb-2 border-orange rounded-4 d-flex justify-content-center align-items-center"
                  style={{ backgroundColor: "transparent", overflow: "hidden" }}
                >
                  <img
                    className="img-fluid"
                    style={{
                      width: "100%",
                      aspectRatio: "1/1", // Ensures square shape
                      objectFit: "contain", // Better for logos/icons
                      maxWidth: "120px", // Slightly smaller for better padding
                      padding: "5px"
                    }}
                    src={item.image}
                    alt={item.categoryName}
                  />
                </figure>
                <h6 className="text-md text-capitalize">{item.categoryName}</h6>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SearchScreen;
