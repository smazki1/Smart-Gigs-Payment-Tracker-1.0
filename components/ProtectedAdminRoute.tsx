export const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="admin-layout">
            {children}
        </div>
    );
};
