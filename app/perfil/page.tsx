'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { UserCircle, Save, Edit2, Mail, Phone, Briefcase, ShieldCheck } from 'lucide-react';

export default function PerfilPage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  if (!user) return <div className="p-6 text-center text-slate-500">Cargando perfil...</div>;

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { name, phone });
      setMessage('¡Perfil actualizado con éxito!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error al actualizar:', error);
      setMessage('Error al actualizar. Intenta de nuevo.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mi Perfil</h1>
          <p className="text-slate-500 mt-2">Gestiona tu información personal en la plataforma.</p>
        </div>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 transition-colors">
            <Edit2 className="w-4 h-4" /> Editar
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-6 flex items-center gap-6 border-b border-slate-200">
          <UserCircle className="w-20 h-20 text-slate-300" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
            <div className="flex items-center gap-2 text-slate-500 mt-1">
              <ShieldCheck className="w-4 h-4" />
              <span className="capitalize">{user.role}</span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {message && (
            <div className={`p-4 rounded-lg text-sm font-medium ${message.includes('éxito') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <UserCircle className="w-4 h-4 text-slate-400" /> Nombre Completo
              </label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={!isEditing} className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500 transition-all" />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Mail className="w-4 h-4 text-slate-400" /> Correo Electrónico
              </label>
              <input type="email" value={user.email} disabled className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500" />
              <p className="text-xs text-slate-400">El correo de acceso no se puede cambiar.</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Phone className="w-4 h-4 text-slate-400" /> Teléfono
              </label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isEditing} placeholder="Ej. 300 123 4567" className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500 transition-all" />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Briefcase className="w-4 h-4 text-slate-400" /> Rol en el Sistema
              </label>
              <input type="text" value={user.role} disabled className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 capitalize" />
            </div>
          </div>

          {isEditing && (
            <div className="pt-6 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => { setIsEditing(false); setName(user.name || ''); setPhone(user.phone || ''); setMessage(''); }} className="px-6 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors">
                {loading ? 'Guardando...' : <><Save className="w-4 h-4" /> Guardar Cambios</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
