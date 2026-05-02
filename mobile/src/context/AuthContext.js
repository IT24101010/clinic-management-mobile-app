import React, { createContext, useState, useEffect, useContext } from 'react';
import { getToken, saveToken, removeToken } from '../utils/tokenStorage';
import axiosInstance from '../api/axiosConfig';
import { ROLES } from '../constants/roles';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadTokenAndProfile = async () => {
            try {
                const storedToken = await getToken();
                if (storedToken) {
                    setToken(storedToken);
                    const response = await axiosInstance.get('/api/users/profile');
                    setUser(response.data);
                }
            } catch (error) {
                console.error('Error loading token and profile:', error);
                await removeToken();
                setToken(null);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadTokenAndProfile();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await axiosInstance.post('/api/users/login', { email, password });
            const { token: newToken, ...basicUserData } = response.data;

            await saveToken(newToken);
            setToken(newToken);

            // Fetch full profile data so patient info fills immediately
            const profileResponse = await axiosInstance.get('/api/users/profile', {
                headers: { Authorization: `Bearer ${newToken}` }
            });
            setUser(profileResponse.data);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Login failed'
            };
        }
    };

    const register = async (userData) => {
        try {
            const response = await axiosInstance.post('/api/users/register', userData);
            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Registration failed'
            };
        }
    };

    const logout = async () => {
        await removeToken();
        setToken(null);
        setUser(null);
    };

    const updateUser = (data) => {
        setUser((prevUser) => ({ ...prevUser, ...data }));
    };

    const isAuthenticated = !!token;
    const isAdmin = user?.role?.toUpperCase() === ROLES.ADMIN;
    const isDoctor = user?.role?.toUpperCase() === ROLES.DOCTOR;
    const isPatient = user?.role?.toUpperCase() === ROLES.PATIENT;

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                login,
                register,
                logout,
                updateUser,
                isAuthenticated,
                isAdmin,
                isDoctor,
                isPatient,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
