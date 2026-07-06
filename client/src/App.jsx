import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import Purchases from "./pages/Purchases.jsx";
import Orders from "./pages/Orders.jsx";
import Customers from "./pages/Customers.jsx";
import Employees from "./pages/Employees.jsx";
import CashBook from "./pages/CashBook.jsx";
import Reports from "./pages/Reports.jsx";
import OnlineSales from "./pages/OnlineSales.jsx";
import TaxAccounting from "./pages/TaxAccounting.jsx";
import "./styles/theme.css";

function PrivateRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="orders" element={<Orders />} />
            <Route path="customers" element={<Customers />} />
            <Route path="employees" element={<Employees />} />
            <Route path="cashbook" element={<CashBook />} />
            <Route path="reports" element={<Reports />} />
            <Route path="online-sales" element={<OnlineSales />} />
            <Route path="tax" element={<TaxAccounting />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
