import React from 'react';
import { Volume2, VolumeX, Navigation, ShieldAlert, Target, HeartHandshake } from 'lucide-react';
import { PlayerProfile } from '../types';
import { calculateLevelFromXP, getTrainerTitle } from '../services/storage';
import { sounds } from '../services/sound';

interface HeaderHUDProps {
  profile: PlayerProfile;
  onUpdateProfile: (p: PlayerProfile) => void;
  onOpenProfile: () => void;
  onOpenSOS?: () => void;
  onOpenQuests?: () => void;
  onOpenCare?: () => void;
  gpsActive: boolean;
  petCount: number;
  lostPetCount?: number;
}

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  profile,
  onUpdateProfile,
  onOpenProfile,
  onOpenSOS,
  onOpenQuests,
  onOpenCare,
  gpsActive,
  petCount,
  lostPetCount = 0,
}) => {
  const { level, currentLevelXP, nextLevelXP, progressPercent } = calculateLevelFromXP(profile.xp);
  const trainerTitle = getTrainerTitle(level);

  const toggleSound = () => {
    const nextVal = !profile.soundEnabled;
    sounds.setEnabled(nextVal);
    onUpdateProfile({ ...profile, soundEnabled: nextVal });
    if (nextVal) {
      sounds.playTap();
    }
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 px-2 sm:px-3 pt-2 pb-1 pointer-events-none select-none transition-all"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
    >
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="bg-[#090D16]/92 backdrop-blur-xl border border-[#1F2937] rounded-2xl px-2.5 sm:px-3 py-2 shadow-2xl shadow-black/50 flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Left: Trainer Profile & Progress Widget */}
          <button
            onClick={() => {
              sounds.playTap();
              onOpenProfile();
            }}
            className="flex items-center gap-2 sm:gap-2.5 text-left group transition-all active:scale-98 min-w-0 flex-1 relative before:absolute before:-inset-1 before:content-['']"
            title={`Perfil de ${profile.name} (${trainerTitle})`}
            aria-label={`Ver perfil de ${profile.name}, Nivel ${level}`}
          >
            {/* Avatar with Level Badge */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-[#1A2234] border border-[#1F2937] flex items-center justify-center text-xl shadow-inner group-hover:border-emerald-500/50 transition-colors">
                <span className="leading-none">{profile.avatar || '🧑‍🌾'}</span>
              </div>
              <span className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-500 to-amber-600 text-[#090D16] font-black text-[10px] leading-none px-1.5 py-0.5 rounded-full border border-[#090D16] shadow-sm font-heading">
                N{level}
              </span>
            </div>

            {/* Name, Pet Count & XP Progress */}
            <div className="flex flex-col min-w-0 flex-1 pr-1">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-heading font-bold text-xs sm:text-sm text-[#F9FAFB] truncate max-w-[85px] xs:max-w-[110px] sm:max-w-[140px]">
                  {profile.name}
                </span>
                <span className="text-[11px] font-semibold text-[#9CA3AF] shrink-0">
                  · {petCount} 🐾
                </span>
              </div>

              {/* XP Bar & Numeric Feedback */}
              <div className="flex items-center gap-1.5 mt-1">
                <div
                  className="h-1.5 w-16 xs:w-20 sm:w-24 bg-[#1A2234] rounded-full overflow-hidden border border-[#1F2937] shrink-0"
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#9CA3AF] font-medium tracking-tight shrink-0">
                  {currentLevelXP}/{nextLevelXP}
                </span>
              </div>
            </div>
          </button>

          {/* Right: Quick Action Controls (Min 44px tap target via padding) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Daily Quests / Retos */}
            {onOpenQuests && (
              <button
                onClick={() => {
                  sounds.playTap();
                  onOpenQuests();
                }}
                className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#111827] border border-[#1F2937] text-amber-400 hover:border-amber-500/40 hover:text-amber-300 active:scale-95 transition-all flex items-center justify-center before:absolute before:-inset-1.5 before:content-['']"
                title="Misiones diarias y retos"
                aria-label="Abrir misiones diarias"
              >
                <Target className="w-4 h-4" />
                <span className="sr-only">Misiones</span>
              </button>
            )}

            {/* Pet Care Shortcut */}
            {onOpenCare && (
              <button
                onClick={() => {
                  sounds.playTap();
                  onOpenCare();
                }}
                className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#111827] border border-[#1F2937] text-emerald-400 hover:border-emerald-500/40 hover:text-emerald-300 active:scale-95 transition-all flex items-center justify-center before:absolute before:-inset-1.5 before:content-['']"
                title="Cuidar y alimentar a tu mascota compañera"
                aria-label="Cuidar compañero"
              >
                <HeartHandshake className="w-4 h-4" />
                <span className="sr-only">Cuidar</span>
              </button>
            )}

            {/* Quick SOS Radar Shortcut */}
            {onOpenSOS && (
              <button
                onClick={() => {
                  sounds.playTap();
                  onOpenSOS();
                }}
                className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#111827] border border-[#1F2937] text-rose-400 hover:border-rose-500/40 hover:text-rose-300 active:scale-95 transition-all flex items-center justify-center before:absolute before:-inset-1.5 before:content-['']"
                title="Alertas SOS de mascotas perdidas"
                aria-label="Radar comunitario SOS de mascotas perdidas"
              >
                <ShieldAlert className="w-4 h-4" />
                {lostPetCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
                <span className="sr-only">SOS</span>
              </button>
            )}

            {/* GPS Sat Status (Informational) */}
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border transition-colors ${
                gpsActive
                  ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-400'
                  : 'bg-amber-950/30 border-amber-600/40 text-amber-400'
              }`}
              title={gpsActive ? 'GPS conectado y calibrado' : 'Buscando satélites GPS...'}
              aria-label={gpsActive ? 'GPS activo' : 'GPS buscando señal'}
            >
              <Navigation className={`w-3.5 h-3.5 ${gpsActive ? '' : 'animate-pulse'}`} />
            </div>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#111827] border border-[#1F2937] text-[#9CA3AF] hover:text-[#F9FAFB] active:scale-95 transition-all flex items-center justify-center before:absolute before:-inset-1.5 before:content-['']"
              title={profile.soundEnabled ? 'Silenciar sonidos del juego' : 'Activar efectos sonoros'}
              aria-label={profile.soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
            >
              {profile.soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
