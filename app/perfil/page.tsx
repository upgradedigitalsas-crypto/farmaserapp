'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Save, Edit2, Mail, Phone, Briefcase, ShieldCheck } from 'lucide-react';

function getInitials(name: string) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Super Admin',
  manager: 'Gerente',
  visitador: 'Visitador Médico',
};

export default function PerfilPage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      const userData = user as any;
      setName(userData.name || '');
      setPhone(userData.phone || '');
    }
  }, [user]);

  if (!user) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
      Cargando perfil...
    </div>
  );

  const userData = user as any;

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { name, phone });
      setMessage('¡Perfil actualizado con éxito!');
      setIsEditing(false);
    } catch {
      setMessage('Error al actualizar. Intenta de nuevo.');
    }
    setLoading(false);
  };

  return (
    <div className="p-4 pt-20 lg:p-10 max-w-2xl min-h-screen">

      {/* ── Header de perfil ─────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden mb-6 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-8 shadow-xl">
        {/* Blob decorativo */}
        <div className="absolute w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -top-10 -right-10 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-5">
          {/* Avatar con iniciales */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-700/30 shrink-0">
            {getInitials(userData.name || userData.email || '')}
          </div>

          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white tracking-tight truncate">
              {userData.name || 'Sin nombre'}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5 truncate">{userData.email}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <ShieldCheck size={13} className="text-blue-400 shrink-0" />
              <span className="text-xs text-blue-300 font-medium">
                {ROLE_LABEL[userData.role] || userData.role}
              </span>
            </div>
          </div>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="ml-auto flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl shrink-0 backdrop-blur-sm"
            >
              <Edit2 size={14} /> Editar
            </button>
          )}
        </div>
      </div>

      {/* ── Formulario ───────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl shadow-sm border border-black/[0.06] overflow-hidden">

        {message && (
          <div className={`mx-6 mt-6 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2
            ${message.includes('éxito') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
            {message.includes('éxito') ? '✓' : '⚠'} {message}
          </div>
        )}

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <Edit2 size={11} className="text-gray-400" /> Nombre Completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isEditing}
              className="w-full bg-gray-50 border border-transparent rounded-xl py-3 px-4 text-sm font-medium text-gray-900 outline-none focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 disabled:text-gray-500 disabled:cursor-default"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <Mail size={11} className="text-gray-400" /> Correo Electrónico
            </label>
            <input
              type="email"
              value={userData.email}
              disabled
              className="w-full bg-gray-50 rounded-xl py-3 px-4 text-sm text-gray-400 border border-transparent cursor-default"
            />
            <p className="text-[11px] text-gray-400 px-1">No se puede modificar</p>
          </div>

          {/* Teléfono */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <Phone size={11} className="text-gray-400" /> Teléfono
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!isEditing}
              placeholder="Ej. 300 123 4567"
              className="w-full bg-gray-50 border border-transparent rounded-xl py-3 px-4 text-sm font-medium text-gray-900 outline-none focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 disabled:text-gray-500 disabled:cursor-default placeholder-gray-400"
            />
          </div>

          {/* Rol */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <Briefcase size={11} className="text-gray-400" /> Rol en el Sistema
            </label>
            <div className="bg-gray-50 rounded-xl py-3 px-4 flex items-center gap-2">
              <ShieldCheck size={14} className="text-blue-500 shrink-0" />
              <span className="text-sm font-medium text-gray-700">
                {ROLE_LABEL[userData.role] || userData.role}
              </span>
            </div>
          </div>
        </div>

        {/* Footer de acciones */}
        {isEditing && (
          <div className="border-t border-gray-100 px-6 py-4 flex gap-3 justify-end bg-gray-50/50">
            <button
              onClick={() => {
                setIsEditing(false);
                setName(userData.name || '');
                setPhone(userData.phone || '');
                setMessage('');
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 shadow-md shadow-blue-600/20 active:scale-[0.98]"
            >
              {loading ? 'Guardando...' : <><Save size={14} /> Guardar Cambios</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
