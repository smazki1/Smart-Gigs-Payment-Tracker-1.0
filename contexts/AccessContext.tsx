import React, { createContext, useContext, useState } from 'react';

const AccessContext = createContext({
    isAdmin: false,
    loading: false
});

export const AccessProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <AccessContext.Provider value={{ isAdmin: true, loading: false }}>
            {children}
        </AccessContext.Provider>
    );
};

export const useAccess = () => useContext(AccessContext);
