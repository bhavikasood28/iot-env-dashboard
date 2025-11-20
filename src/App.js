// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import Analytics from "./components/Analytics";

const App = () => {
  return (
    <Router>
      <nav className="bg-white border-b border-slate-200 px-4 py-3 flex gap-4 text-sm font-medium">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive
              ? "text-slate-900 border-b-2 border-slate-900 pb-1"
              : "text-slate-500 hover:text-slate-900 pb-1"
          }
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/analytics"
          className={({ isActive }) =>
            isActive
              ? "text-slate-900 border-b-2 border-slate-900 pb-1"
              : "text-slate-500 hover:text-slate-900 pb-1"
          }
        >
          Analytics
        </NavLink>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Router>
  );
};

export default App;
