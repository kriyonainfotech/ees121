export const getAuthToken = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    // If the token starts and ends with double quotes, it was likely stored with JSON.stringify
    if (token.startsWith('"') && token.endsWith('"')) {
        try {
            return JSON.parse(token);
        } catch (e) {
            // If parsing fails for some reason, just strip the quotes manually
            return token.slice(1, -1);
        }
    }

    return token;
};
