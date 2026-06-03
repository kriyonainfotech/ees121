
import React, { createContext, useContext, useState } from "react";

import { getAuthToken } from "../utils/auth";

export const AuthContext = createContext();
export default function AuthProvider({ children }) {
  const initialAuthUser = getAuthToken();
  const [authUser, setAuthUser] = useState(
    initialAuthUser // getAuthToken already handles JSON.parse if needed
  );
  return (
    <AuthContext.Provider value={[authUser, setAuthUser]}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
