import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { UserContext } from "../UserContext";
import { RegistrationContext } from "../context/RegistrationContext";
import logo from "../../public/ees-logo.png";

const backend_API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

const PaymentIntegration = ({ onNext, onBack, isStep }) => {
    const { user, setUser } = useContext(UserContext);
    const { formData } = useContext(RegistrationContext);
    const [loading, setLoading] = useState(false);
    const [isPaid, setIsPaid] = useState(false);
    const registrationFee = 121; // Example amount

    useEffect(() => {
        // Load Razorpay script
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);

        // Check if already paid
        checkStatus();
    }, []);

    const checkStatus = async () => {
        const token = sessionStorage.getItem("regToken");
        if (!token) return;

        try {
            const res = await axios.get(`${backend_API}/auth/getuser`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success && res.data.user.paymentVerified) {
                setIsPaid(true);
                setUser(res.data.user); // Sync local context
                onNext(); // Auto-proceed to KYC
            }
        } catch (err) {
            console.warn("Could not verify existing payment status:", err);
        }
    };

    const handlePayment = async () => {
        if (isPaid) {
            onNext();
            return;
        }

        setLoading(true);
        try {
            const token = sessionStorage.getItem("regToken");
            const effectiveUserId = user?._id || formData.userId;

            if (!token || !effectiveUserId) {
                toast.error("Session expired or user not found. Please log in.");
                return;
            }

            // 1. Create Order
            const orderRes = await axios.post(`${backend_API}/payment/create-order`, {
                amount: registrationFee,
                user_id: effectiveUserId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!orderRes.data.success) {
                throw new Error(orderRes.data.message || "Failed to create order");
            }

            const { order } = orderRes.data.data;

            // 2. Open Razorpay Checkout
            const options = {
                key: RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "EES Registration",
                description: "Registration Fee for EES Services",
                image: logo,
                order_id: order.id,
                handler: async (response) => {
                    try {
                        const verifyRes = await axios.post(`${backend_API}/payment/verify-payment`, {
                            payment_id: response.razorpay_payment_id,
                            user_id: effectiveUserId
                        }, {
                            headers: { Authorization: `Bearer ${token}` }
                        });

                        if (verifyRes.data.success) {
                            toast.success("Payment successful!");
                            setIsPaid(true);
                            // Update user in context to reflect new registrationStep
                            if (verifyRes.data.user) {
                                setUser(verifyRes.data.user);
                            }
                            onNext(); // Move to KYC
                        } else {
                            toast.error("Payment verification failed.");
                        }
                    } catch (err) {
                        console.error("Verification error:", err);
                        toast.error("Failed to verify payment.");
                    }
                },
                prefill: {
                    name: user?.name || formData.name,
                    email: user?.email || formData.email,
                    contact: user?.phone || formData.phone
                },
                theme: {
                    color: "#16a34a" // green-600
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", (response) => {
                toast.error(`Payment failed: ${response.error.description}`);
            });
            rzp.open();

        } catch (error) {
            console.error("Payment Error:", error);
            toast.error(error.response?.data?.message || error.message || "Failed to initiate payment.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl">
                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                    <div className="flex flex-col lg:flex-row">
                        {/* Left Side - Info */}
                        <div className="w-full lg:w-2/5 bg-gradient-to-br from-green-600 to-green-700 p-8 lg:p-12 text-white flex flex-col justify-center relative overflow-hidden">
                            {/* Decorative circles */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
                            
                            <div className="relative z-10 text-center">
                                <div className="mb-8">
                                    <img src={logo} width={100} alt="EES Logo" className="mb-6 drop-shadow-lg mx-auto brightness-0 invert" />
                                    <h2 className="text-3xl lg:text-4xl font-bold mb-3 leading-tight">
                                        {isPaid ? "Payment Verified" : "Complete Your Registration"}
                                    </h2>
                                    <p className="text-green-50 text-sm lg:text-base leading-relaxed">
                                        {isPaid 
                                            ? "Thank you! Your payment is confirmed. Please proceed to the final step." 
                                            : "One simple payment to unlock 1 year access to all EES services and benefits."}
                                    </p>
                                </div>

                                {/* Price Card */}
                                <div className="bg-white/15 backdrop-blur-md p-6 rounded-2xl border border-white/30 shadow-xl">
                                    <div className="flex items-baseline justify-center gap-2 mb-2">
                                        <span className="text-6xl font-black">₹{registrationFee}</span>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-xs uppercase tracking-widest text-green-100 font-semibold">One-Time Registration Fee</span>
                                        <p className="text-xs mt-2 text-green-200">GST Included • No Hidden Charges</p>
                                    </div>
                                </div>

                                {/* Trust Badge */}
                                <div className="mt-8 flex items-center justify-center gap-2 text-sm text-green-100">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-medium">100% Secure Payment</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Action */}
                        <div className="w-full lg:w-3/5 p-8 lg:p-12 flex flex-col justify-center">
                            <div className="mb-8">
                                <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                    Secure Payment Gateway
                                </div>
                                <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                                    {isPaid ? "Proceed to Documents" : "Choose Your Payment Method"}
                                </h3>
                                <p className="text-gray-500">
                                    {isPaid ? "Your payment is already settled. Continue to upload your documents." : "Pay safely using UPI, Cards, NetBanking, or Wallets"}
                                </p>
                            </div>

                            {/* Benefits List */}
                            <div className="bg-gradient-to-br from-gray-50 to-green-50 rounded-2xl p-6 mb-8">
                                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">What You Get</h4>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3 text-gray-700">
                                        <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-gray-900">1 Year Membership</span>
                                            <p className="text-xs text-gray-500 mt-0.5">Annual renewal required</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-700">
                                        <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-gray-900">Full Dashboard Access</span>
                                            <p className="text-xs text-gray-500 mt-0.5">Manage your business seamlessly</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <button
                                    onClick={handlePayment}
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg shadow-green-200 hover:shadow-xl hover:shadow-green-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Processing...</span>
                                        </>
                                    ) : isPaid ? (
                                        <>
                                            <span>Continue to KYC</span>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 7l5 5-5 5" />
                                            </svg>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            <span>Proceed to Payment</span>
                                        </>
                                    )}
                                </button>
                                
                                {isStep && (
                                    <button
                                        onClick={onBack}
                                        className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Back to Business Info
                                    </button>
                                )}
                            </div>

                            {/* Payment Methods */}
                            <div className="mt-8 pt-6 border-t border-gray-200">
                                <p className="text-xs text-gray-400 text-center mb-3 uppercase tracking-wider font-semibold">Accepted Payment Methods</p>
                                <div className="flex items-center justify-center gap-6 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-5" alt="PayPal" />
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-5" alt="Visa" />
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-5" alt="Mastercard" />
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" className="h-5" alt="UPI" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Note */}
                <div className="text-center mt-6 text-sm text-gray-500 pb-10">
                    <p>🔒 Your payment information is encrypted and secure</p>
                </div>
            </div>
        </div>
    );
};

export default PaymentIntegration;
