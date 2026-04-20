import React, { createContext, useState } from 'react';

// 1. Create the context
export const RegistrationContext = createContext();

// 2. Create the provider component that will hold all the data
export const RegistrationProvider = ({ children }) => {
    const [formData, setFormData] = useState({
        // Internal tracking
        userId: "",

        // Fields from Registration.jsx
        name: "",
        email: "",
        password: "",
        confirmpassword: "",
        phone: "",
        pincode: "",
        area: "",
        city: "",
        state: "",
        country: "",
        referralCode: null,

        // Fields from RegisterNextPage.jsx
        businessName: "",
        businessCategory: "",
        businessAddress: "",
        businessDetaile: "",

        // Fields from RegisterAadhar.jsx
        frontAadhar: null,
        backAadhar: null,
        profilePic: null,
    });

    return (
        <RegistrationContext.Provider value={{ formData, setFormData }}>
            {children}
        </RegistrationContext.Provider>
    );
};