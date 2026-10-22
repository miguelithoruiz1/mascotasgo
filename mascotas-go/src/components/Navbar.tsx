import React from 'react';
import { Map, Camera, BookOpen, Trophy, ShieldAlert } from 'lucide-react';
import { sounds } from '../services/sound';

export type ActiveTab = 'map' | 'camera' | 'petdex' | 'lost_pets' | 'profile';

interface NavbarProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  badgeAlert?: boolean;
  lostPetCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onChangeTab,
  badgeAlert = false,
  lostPetCount = 0,
}) => {
  const handleTabClick = (tab: ActiveTab) => {
    sounds.playTap();
    onChangeTab(tab);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 px-2 sm:px-3 pt-1 pointer-events-none select-none transition-all"
      style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom, 0px))' }}
      aria-label="Navegación principal de Mascotas Go"
    >
      <div className="max-w-md mx-auto relative pointer-events-auto">
        <div className="bg-[#090D16]/95 backdrop-blur-xl border border-[#1F2937] rounded-3xl px-1.5 sm:px-2 py-1.5 shadow-2xl shadow-black/80 flex items-center justify-between">
          {/* 1. Mapa */}
          <button
            onClick={() => handleTabClick('map')}
            className={`flex flex-col items-center justify-center gap-1 transition-all py-1.5 px-2 rounded-2xl flex-1 min-h-[48px] active:scale-95 ${
              activeTab === 'map'
                ? 'text-emerald-400 font-bold bg-emerald-500/10'
                : 'text-[#9CA3AF] hover:text-[#F9FAFB]'
            }`}
            aria-label="Ver mapa y explorar"
          >
            <Map className="w-5 h-5 shrink-0" />
            <span className="text-[10px] sm:text-[11px] leading-none tracking-tight">Mapa</span>
          </button>

          {/* 2. Petdex */}
          <button
            onClick={() => handleTabClick('petdex')}
            className={`flex flex-col items-center justify-center gap-1 transition-all py-1.5 px-2 rounded-2xl flex-1 min-h-[48px] active:scale-95 ${
              activeTab === 'petdex'
                ? 'text-emerald-400 font-bold bg-emerald-500/10'
                : 'text-[#9CA3AF] hover:text-[#F9FAFB]'
            }`}
            aria-label="Abrir Petdex y colección"
          >
            <BookOpen className="w-5 h-5 shrink-0" />
            <span className="text-[10px] sm:text-[11px] leading-none tracking-tight">Petdex</span>
          </button>

          {/* 3. Center Capture Action Button */}
          <div className="relative -top-4 sm:-top-5 flex flex-col items-center px-1 shrink-0">
            <button
              onClick={() => handleTabClick('camera')}
              className={`w-14 h-14 sm:w-15 sm:h-15 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 ${
                activeTab === 'camera'
                  ? 'bg-[#10B981] text-[#090D16] ring-4 ring-emerald-500/30 shadow-emerald-950/60'
                  : 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white hover:brightness-110 shadow-black/60'
              } border-2 border-[#1F2937]`}
              title="Iniciar escaneo y captura de mascota"
              aria-label="Capturar mascota con cámara AR"
            >
              <Camera className="w-6 h-6 shrink-0 drop-shadow-sm" />
            </button>
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-400 mt-0.5 tracking-tight uppercase">
              Capturar
            </span>
          </div>

          {/* 4. SOS Mascotas Perdidas */}
          <button
            onClick={() => handleTabClick('lost_pets')}
            className={`flex flex-col items-center justify-center gap-1 transition-all py-1.5 px-2 rounded-2xl flex-1 min-h-[48px] relative active:scale-95 ${
              activeTab === 'lost_pets'
                ? 'text-rose-400 font-bold bg-rose-500/10'
                : 'text-[#9CA3AF] hover:text-rose-300'
            }`}
            title="Red Comunitaria SOS de Mascotas Perdidas"
            aria-label="Alertas SOS de mascotas perdidas"
          >
            <div className="relative shrink-0">
              <ShieldAlert className="w-5 h-5" />
              {lostPetCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] leading-none tracking-tight">SOS</span>
          </button>

          {/* 5. Insignias / Perfil */}
          <button
            onClick={() => handleTabClick('profile')}
            className={`flex flex-col items-center justify-center gap-1 transition-all py-1.5 px-2 rounded-2xl flex-1 min-h-[48px] relative active:scale-95 ${
              activeTab === 'profile'
                ? 'text-emerald-400 font-bold bg-emerald-500/10'
                : 'text-[#9CA3AF] hover:text-[#F9FAFB]'
            }`}
            aria-label="Ver perfil de entrenador e insignias"
          >
            <div className="relative shrink-0">
              <Trophy className="w-5 h-5" />
              {badgeAlert && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] leading-none tracking-tight">Insignias</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
