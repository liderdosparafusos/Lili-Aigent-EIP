
import React, { useState } from 'react';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { User, UserRole } from '../types';
import { Logo } from './Logo';

interface LoginStepProps {
  onLogin: (user: User) => void;
}

const LoginStep: React.FC<LoginStepProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Validate Domain
    if (!email.toLowerCase().endsWith('@liderparafusos.com.br')) {
      setError('Acesso restrito aos usuários da Líder dos Parafusos (@liderparafusos.com.br).');
      return;
    }

    const emailLower = email.toLowerCase();

    // 2. Validate Credentials & Assign Role based on specific user rules
    if (emailLower === 'bruno@liderparafusos.com.br' && password === '092') {
      onLogin({ email, role: UserRole.OPERADOR });
    } else if (emailLower === 'leandro@liderparafusos.com.br' && password === '231254') {
      onLogin({ email, role: UserRole.CONSULTA });
    } else {
      // Fallback for generic testing (if strictly required to block others, remove this block)
      // But prompt implies these are THE users.
      // Keeping strict check as per prompt "Registrar estes usuários"
      setError('Credenciais inválidas. Verifique usuário e senha.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-purple-600 rounded-2xl blur opacity-30 animate-pulse"></div>
        
        <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-700 p-8 rounded-2xl shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] mb-4">
              <Logo className="w-12 h-12 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-orbitron text-white tracking-widest uppercase">Acesso Restrito</h2>
            <p className="text-slate-400 text-sm mt-1">LiLi AIgent EIP</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">E-mail Corporativo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="usuario@liderparafusos.com.br"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Chave de Acesso</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-lg shadow-lg shadow-blue-600/30 transition-all transform hover:scale-[1.02] uppercase tracking-wide font-orbitron"
            >
              Entrar no Sistema
            </button>
          </form>

          <div className="mt-6 text-center border-t border-slate-700/50 pt-4">
            <p className="text-xs text-slate-500">
              LiLi AIgent EIP &bull; Conexão Segura
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginStep;
