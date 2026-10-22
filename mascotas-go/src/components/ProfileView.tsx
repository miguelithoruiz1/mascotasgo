import React, { useState } from 'react';
import {
  Trophy,
  Award,
  User,
  Sparkles,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Volume2,
  VolumeX,
  CheckCircle,
} from 'lucide-react';
import { PlayerProfile, PetRecord, BadgeDefinition } from '../types';
import {
  BADGE_DEFINITIONS,
  calculateLevelFromXP,
  getTrainerTitle,
} from '../services/storage';
import { sounds } from '../services/sound';
import { useAuth } from '../context/AuthContext';
import { LogIn, LogOut, Cloud, ShieldCheck, Mail, Lock, X, UserPlus } from 'lucide-react';

interface ProfileViewProps {
  profile: PlayerProfile;
  onUpdateProfile: (p: PlayerProfile) => void;
  pets: PetRecord[];
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSeedDemoData: () => void;
  onClearAll: () => void;
}

const AVATAR_OPTIONS = ['🧑‍🌾', '🦊', '🐱', '🐶', '🦁', '🐯', '🐼', '🦝', '🐰', '🐺'];

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onUpdateProfile,
  pets,
  onExportData,
  onImportData,
  onSeedDemoData,
  onClearAll,
}) => {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, loading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authName, setAuthName] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(profile.name);

  const { level, currentLevelXP, nextLevelXP, progressPercent } = calculateLevelFromXP(profile.xp);
  const trainerTitle = getTrainerTitle(level);

  const total = pets.length;
  const cats = pets.filter((p) => p.species === 'gato').length;
  const dogs = pets.filter((p) => p.species === 'perro').length;
  const rareCount = pets.filter(
    (p) => p.rarity === 'Raro' || p.rarity === 'Épico' || p.rarity === 'Legendario'
  ).length;

  const handleSaveName = () => {
    sounds.playTap();
    if (nameInput.trim()) {
      onUpdateProfile({ ...profile, name: nameInput.trim() });
    }
    setIsEditingName(false);
  };

  const handleSelectAvatar = (emoji: string) => {
    sounds.playTap();
    onUpdateProfile({ ...profile, avatar: emoji });
  };

  return (
    <div className="w-full h-full bg-slate-950 overflow-y-auto pt-[76px] pb-32 px-3 sm:px-4 text-slate-100">
      <div className="max-w-md mx-auto space-y-4">
        {/* Account / Cloud Sync Card */}
        <div className="bg-slate-900/90 rounded-3xl p-3.5 border border-slate-700/80 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center text-lg">
              {user ? (
                user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                )
              ) : (
                <Cloud className="w-5 h-5 text-indigo-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">
                  {user ? (user.displayName || user.email) : 'Modo Invitado (Local)'}
                </span>
                {user && (
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Sincronizado
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                {user
                  ? 'Guardado seguro en Cloud SQL y red comunitaria SOS'
                  : 'Inicia sesión para respaldar tu progreso en la nube'}
              </p>
            </div>
          </div>

          <div>
            {user ? (
              <button
                onClick={async () => {
                  sounds.playTap();
                  await signOut();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-700 active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>
            ) : (
              <button
                disabled={authLoading}
                onClick={() => {
                  sounds.playTap();
                  setAuthError(null);
                  setAuthSuccessMsg(null);
                  setShowAuthModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-black flex items-center gap-1 shadow-lg active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Conectar</span>
              </button>
            )}
          </div>
        </div>

        {/* Trainer Profile Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 border border-slate-700/80 shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            {/* Trainer Avatar */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-300 p-1 shadow-xl flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-3xl select-none">
                  {profile.avatar}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full border border-slate-900 shadow">
                Nv.{level}
              </div>
            </div>

            {/* Trainer Name & Rank */}
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="bg-slate-900 border border-emerald-400 rounded-xl px-2 py-1 text-sm font-bold text-white focus:outline-none w-full"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-2.5 py-1 bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl"
                  >
                    Guardar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white font-heading truncate">
                    {profile.name}
                  </h2>
                  <button
                    onClick={() => {
                      sounds.playTap();
                      setIsEditingName(true);
                    }}
                    className="text-xs text-slate-400 hover:text-emerald-400"
                    title="Editar nombre"
                  >
                    ✏️
                  </button>
                </div>
              )}

              <p className="text-xs text-emerald-400 font-bold mt-0.5">{trainerTitle}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Total de experiencia: <strong className="text-white">{profile.xp} XP</strong>
              </p>
            </div>
          </div>

          {/* Level Progress Bar */}
          <div className="mt-4 pt-3 border-t border-slate-700/60">
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-300">Progreso a Nivel {level + 1}</span>
              <span className="text-amber-400 font-bold">
                {currentLevelXP} / {nextLevelXP} XP
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Quick Avatar Selector */}
          <div className="mt-4 pt-3 border-t border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
              Elige tu avatar:
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSelectAvatar(emoji)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 transition-transform active:scale-90 ${
                    profile.avatar === emoji
                      ? 'bg-emerald-500/20 border-2 border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-slate-800/80 border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Player Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 shadow">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Mascotas Registradas
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-black text-white">{total}</span>
              <span className="text-xs text-emerald-400 font-semibold">🐾 En Petdex</span>
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 shadow">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Insignias Ganadas
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-black text-amber-400">
                {profile.unlockedBadgeIds.length}
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                / {BADGE_DEFINITIONS.length}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 shadow">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Caninos vs Felinos
            </span>
            <div className="flex items-center gap-2 mt-1 text-xs font-bold text-slate-200">
              <span>🐶 {dogs} perros</span>
              <span>•</span>
              <span>🐱 {cats} gatos</span>
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 shadow">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Rarezas Especiales
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-black text-purple-400">{rareCount}</span>
              <span className="text-xs text-slate-400 font-semibold">Raros o +</span>
            </div>
          </div>
        </div>

        {/* Badges / Insignias Showcase */}
        <div className="bg-slate-900/90 rounded-3xl p-4 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Trophy className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-white font-heading">
                Medallero de Insignias
              </h3>
            </div>
            <span className="text-xs font-bold text-amber-400">
              {profile.unlockedBadgeIds.length}/{BADGE_DEFINITIONS.length}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {BADGE_DEFINITIONS.map((badge) => {
              const isUnlocked = profile.unlockedBadgeIds.includes(badge.id);

              return (
                <div
                  key={badge.id}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    isUnlocked
                      ? 'bg-slate-800/90 border-amber-500/40 shadow-lg shadow-amber-950/20'
                      : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                  }`}
                >
                  {/* Badge Icon Disc */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-md ${
                      isUnlocked
                        ? 'bg-gradient-to-tr from-amber-500/30 via-yellow-400/20 to-amber-600/30 border border-amber-400/60'
                        : 'bg-slate-800 border border-slate-700 grayscale'
                    }`}
                  >
                    {badge.icon}
                  </div>

                  {/* Badge Description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-xs font-black truncate ${
                          isUnlocked ? 'text-amber-300' : 'text-slate-400'
                        }`}
                      >
                        {badge.name}
                      </h4>
                      {isUnlocked && (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle className="w-3 h-3" />
                          <span>Logrado</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {badge.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Persistence and Management */}
        <div className="bg-slate-900/90 rounded-3xl p-4 border border-slate-800 shadow-xl space-y-3">
          <h3 className="font-bold text-xs text-slate-300 uppercase tracking-wider">
            Gestión y Respaldo de Datos
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => {
                sounds.playTap();
                onExportData();
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar JSON</span>
            </button>

            <label className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95 transition-all cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-teal-400" />
              <span>Importar JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={onImportData}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex gap-2 text-xs pt-1">
            <button
              onClick={() => {
                sounds.playTap();
                onSeedDemoData();
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-medium flex items-center justify-center gap-1 border border-slate-700/60"
            >
              <RefreshCw className="w-3 h-3 text-amber-400" />
              <span>Restaurar datos demo</span>
            </button>

            <button
              onClick={() => {
                if (confirm('¿Deseas reiniciar todas tus capturas y volver al inicio?')) {
                  sounds.playTap();
                  onClearAll();
                }
              }}
              className="py-2 px-3 rounded-xl text-rose-400 hover:bg-rose-950/40 text-[11px] font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Reiniciar</span>
            </button>
          </div>
        </div>

        {/* Supabase Auth Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-5 shadow-2xl relative space-y-4">
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center space-y-1">
                <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">
                  {authMode === 'signin' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                </h3>
                <p className="text-xs text-slate-400">
                  Conexión segura mediante Supabase Auth
                </p>
              </div>

              {authError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
                  {authError}
                </div>
              )}

              {authSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center">
                  {authSuccessMsg}
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAuthError(null);
                  setAuthSuccessMsg(null);
                  if (!authEmail.trim() || !authPassword) {
                    setAuthError('Por favor completa todos los campos.');
                    return;
                  }
                  if (authPassword.length < 6) {
                    setAuthError('La contraseña debe tener al menos 6 caracteres.');
                    return;
                  }
                  setAuthSubmitting(true);
                  try {
                    if (authMode === 'signup') {
                      await signUpWithEmail(authEmail, authPassword, authName || profile.name);
                      setAuthSuccessMsg('¡Cuenta creada con éxito! Verifica tu correo si tu proyecto requiere confirmación.');
                    } else {
                      await signInWithEmail(authEmail, authPassword);
                      setShowAuthModal(false);
                    }
                  } catch (err: any) {
                    setAuthError(err.message || 'Error en la autenticación');
                  } finally {
                    setAuthSubmitting(false);
                  }
                }}
                className="space-y-3"
              >
                {authMode === 'signup' && (
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Nombre de Entrenador
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Ej. Ash Ketchum"
                        className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="entrenador@ejemplo.com"
                      className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                >
                  {authMode === 'signin' ? (
                    <>
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{authSubmitting ? 'Iniciando...' : 'Entrar con Email'}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{authSubmitting ? 'Registrando...' : 'Crear Cuenta'}</span>
                    </>
                  )}
                </button>
              </form>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800" />
                <span className="flex-shrink mx-2 text-[10px] text-slate-500 font-semibold uppercase">O también</span>
                <div className="flex-grow border-t border-slate-800" />
              </div>

              <button
                type="button"
                onClick={async () => {
                  sounds.playTap();
                  setAuthError(null);
                  try {
                    await signInWithGoogle();
                  } catch (e: any) {
                    setAuthError(e.message || 'Error con Google OAuth en Supabase');
                  }
                }}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <span>🌐 Continuar con Google</span>
              </button>

              <div className="pt-2 text-center border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playTap();
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                  }}
                  className="text-xs text-emerald-400 hover:underline font-medium"
                >
                  {authMode === 'signin'
                    ? '¿No tienes cuenta? Regístrate aquí'
                    : '¿Ya tienes cuenta? Inicia sesión'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
