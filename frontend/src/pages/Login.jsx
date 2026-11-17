import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login = ({ onSwitchToRegister }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@cybershield.io');
  const [password, setPassword] = useState('Admin@123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (role) => {
    if (role === 'admin') {
      setEmail('admin@cybershield.io');
      setPassword('Admin@123456');
    } else {
      setEmail('analyst@cybershield.io');
      setPassword('Analyst@123456');
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background cyber radar grid decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md bg-[#0d1424] border border-[#1e293b] rounded-2xl p-8 shadow-2xl shadow-cyan-950/30">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30 mb-3">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wider">
            CYBER<span className="text-cyan-400">SHIELD</span> SOC
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Distributed Intrusion Detection & Alert System
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2.5 text-xs text-red-400 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Operator Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                placeholder="operator@cybershield.io"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Secret Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#111a2e] border border-[#1e293b] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-medium rounded-lg text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/25 transition-all"
          >
            <span>{loading ? 'AUTHENTICATING...' : 'ACCESS SOC TERMINAL'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast Fill Buttons */}
        <div className="mt-6 pt-5 border-t border-[#1e293b]/70">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono block text-center mb-2">
            Quick Fill Demo Credentials
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={() => setDemoCredentials('admin')}
              className="py-1.5 px-2 bg-[#111a2e] hover:bg-slate-800 text-cyan-300 border border-[#1e293b] rounded text-[11px] transition-colors"
            >
              Admin (CSO)
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('analyst')}
              className="py-1.5 px-2 bg-[#111a2e] hover:bg-slate-800 text-slate-300 border border-[#1e293b] rounded text-[11px] transition-colors"
            >
              Lead Analyst
            </button>
          </div>
        </div>

        {/* Switch to Register */}
        <div className="mt-5 text-center text-xs text-slate-400">
          <span>Need a new operator account? </span>
          <button
            onClick={onSwitchToRegister}
            className="text-cyan-400 hover:underline font-semibold"
          >
            Register Operator
          </button>
        </div>
      </div>
    </div>
  );
};
