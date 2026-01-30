import React from 'react';

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="admin-layout-container">
            {children}
        </div>
    );
};

export default AdminLayout;
