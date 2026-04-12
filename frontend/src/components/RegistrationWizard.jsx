import React, { useState, useEffect, useContext } from "react";
import Registration from "./Registration";
import RegisterNextPage from "./RegisterNextPage";
import RegisterAadhar from "./RegisterAadhar";
import { RegistrationContext } from "../context/RegistrationContext";
import { UserContext } from "../UserContext";

const RegistrationWizard = () => {
  const { user } = useContext(UserContext);
  const [step, setStep] = useState(1);
  const { setFormData } = useContext(RegistrationContext);

  useEffect(() => {
    // 1. Check if we have a logged-in partial user (re-sync from DB)
    if (user && user.isPartial) {
      console.log("[DEBUG] Wizard: Resyncing from DB step:", user.registrationStep);
      
      // Pre-fill the context with existing user data
      setFormData(prev => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        area: user.address?.area || "",
        city: user.address?.city || "",
        state: user.address?.state || "",
        country: user.address?.country || "",
        pincode: user.address?.pincode || "",
        businessName: user.businessName || "",
        businessCategory: user.businessCategory?.[0] || "", // Assuming it's an array or string
        businessAddress: user.businessAddress || "",
        businessDetaile: user.businessDetaile || "",
        referralCode: user.referredBy?.[0] || prev.referralCode // Keep current if missing
      }));

      setStep(user.registrationStep || 1);
      return;
    }

    // 2. Fallback to session storage for anonymous flow
    const savedStep = sessionStorage.getItem("registrationStep");
    if (savedStep) {
      setStep(parseInt(savedStep));
    }
  }, [user]);

  const handleNext = (data) => {
    console.log("[DEBUG] Wizard: Moving to step:", step + 1);
    const nextStep = step + 1;
    setStep(nextStep);
    sessionStorage.setItem("registrationStep", nextStep.toString());
  };

  const handleBack = () => {
    const prevStep = step - 1;
    if (prevStep >= 1) {
      setStep(prevStep);
      sessionStorage.setItem("registrationStep", prevStep.toString());
    }
  };

  const renderStep = () => {
    console.log("[DEBUG] Wizard: Rendering Step:", step);
    switch (step) {
      case 1:
        return <Registration onNext={handleNext} isStep={true} />;
      case 2:
        return <RegisterNextPage onNext={handleNext} onBack={handleBack} isStep={true} />;
      case 3:
        return <RegisterAadhar onBack={handleBack} isStep={true} />;
      default:
        console.log("[DEBUG] Wizard: Rendering Default Step (1)");
        return <Registration onNext={handleNext} isStep={true} />;
    }
  };

  return (
    <div className="registration-wizard bg-gray-50 min-h-screen">
      {/* Improved Progress Bar */}
      <div className="max-w-4xl mx-auto px-4 pt-10">
        <div className="flex items-center justify-between mb-8 relative">
            {/* Connector Line Area */}
            <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200 z-0" />
            <div className={`absolute top-5 left-0 h-0.5 bg-green-600 z-0 transition-all duration-500`} style={{ 
                width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' 
            }} />

            {[1, 2, 3].map((s) => (
                <div key={s} className="flex flex-col items-center flex-1 z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300 ${
                        step >= s ? "bg-green-600 border-green-600 text-white shadow-lg" : "bg-white border-gray-300 text-gray-400"
                    }`}>
                        {s}
                    </div>
                    <span className={`text-xs mt-2 font-bold uppercase tracking-wider ${step >= s ? "text-green-700 font-extrabold" : "text-gray-400"}`}>
                        {s === 1 ? "Personal" : s === 2 ? "Business" : "Documents"}
                    </span>
                </div>
            ))}
        </div>
      </div>
      
      <div className="wizard-page-container transition-all duration-300 ease-in-out">
        {renderStep()}
      </div>
    </div>
  );
};

export default RegistrationWizard;
