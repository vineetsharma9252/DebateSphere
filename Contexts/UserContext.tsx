// UserContext.js
import { createContext, useContext, useState } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [username, setUsername] = useState(null); // Start with null

  const login = (userData) => {
    setUsername(userData.username);
  };

  const logout = () => {
    setUsername(null);
  };

  return (
    <UserContext.Provider value={{ username, setUsername, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};