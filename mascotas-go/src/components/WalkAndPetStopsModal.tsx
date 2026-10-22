import React, { useState, useEffect } from 'react';
import { X, Navigation, Footprints, Flame, Timer, Sparkles, MapPin, Gift, Check, RotateCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PetStop, PetEgg, PetRecord } from '../types';
import { sounds } from '../services/sound';
import { advanceQuestProgress } from '../services/storage';

interface WalkAndPetStopsModalProps {
  userCoords: { lat: number; lng: number };
  petStops: PetStop[];
  activeBuddyPet?: PetRecord | null;
  onSpinPetStop: (stopId: string) => void;
  onPetHatched?: (newPet: PetRecord) => void;
  onClose: () => void;
  onGainXP?: (xp: number) => void;
}

export const WalkAndPetStopsModal: React.FC<WalkAndPetStopsModalProps> = ({
  userCoords,
  petStops,
  activeBuddyPet,
  onSpinPetStop,
  onPetHatched,
  onClose,
  onGainXP,
}) => {
  // Walk tracker state
  const [isWalking, setIsWalking] = useState<boolean>(true);
  const [walkedMeters, setWalkedMeters] = useState<number>(85);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(140);
  const [steps, setSteps] = useState<number>(120);

  // Active Egg state
  const [currentEgg, setCurrentEgg] = useState<PetEgg>({
    id: 'egg_starter',
    type: '200m',
    requiredMeters: 200,
    walkedMeters: 85,
    hatched: false,
  });

  // Selected PetStop to Spin
  const [selectedStop, setSelectedStop] = useState<PetStop | null>(petStops[0] || null);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [spinRotation, setSpinRotation] = useState<number>(0);
  const [droppedLoot, setDroppedLoot] = useState<{ icon: string; name: string; qty: number }[] | null>(null);

  // Walk simulation timer
  useEffect(() => {
    if (!isWalking) return;
    const interval = setInterval(() => {
      setSecondsElapsed((s) => s + 1);
      // Simulate walking cadence (~1.2 meters per second)
      setWalkedMeters((m) => {
        const next = m + 2;
        advanceQuestProgress('quest_walk_150', 2);
        return next;
      });
      setSteps((st) => st + 3);

      setCurrentEgg((prev) => {
        if (prev.hatched) return prev;
        const nextWalked = Math.min(prev.requiredMeters, prev.walkedMeters + 2);
        return { ...prev, walkedMeters: nextWalked };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isWalking]);

  // Calories estimation (~0.04 kcal per step)
  const calories = Math.round(steps * 0.04);

  // Spin the Photodisc of the selected PetStop
  const handleSpinDisc = () => {
    if (isSpinning || !selectedStop) return;
    sounds.playSpin();
    setIsSpinning(true);
    setSpinRotation((prev) => prev + 1080); // 3 full turns
    setDroppedLoot(null);

    setTimeout(() => {
      sounds.playItemDrop();
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });

      const loot = [
        { icon: '🔴', name: 'Poké-cápsulas', qty: 3 },
        { icon: '🍖', name: 'Bocadillos Gourmet', qty: 2 },
        { icon: '🔵', name: 'Superball', qty: 1 },
      ];
      setDroppedLoot(loot);
      setIsSpinning(false);

      onSpinPetStop(selectedStop.id);
      advanceQuestProgress('quest_spin_stop', 1);
      onGainXP?.(60);
    }, 1200);
  };

  // Hatch egg when ready
  const handleHatchEgg = () => {
    sounds.playEggCrack();
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.5 } });

    const hatchedPet: PetRecord = {
      id: `hatched_${Date.now()}`,
      species: Math.random() > 0.5 ? 'perro' : 'gato',
      name: Math.random() > 0.5 ? 'Apolo Milagroso' : 'Nieve de Seda',
      breed: Math.random() > 0.5 ? 'Husky Siberiano Blanco' : 'Angora Turco Místico',
      color: 'Blanco plateado con destellos dorados',
      mood: 'Recién nacido y rebosante de energía',
      rarity: 'Épico',
      cuteScore: 99,
      xpReward: 250,
      description: '¡Nació de un Huevo Peludo obtenido en una PetStop durante tu caminata urbana!',
      funFact: 'Las mascotas que nacen tras largas caminatas tienen un vínculo de amistad más fuerte.',
      photoUrl:
        'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80',
      lat: userCoords.lat,
      lng: userCoords.lng,
      locationName: 'Eclosión de Paseo',
      timestamp: Date.now(),
      buddyFriendship: 80,
      hunger: 90,
      happiness: 100,
      energy: 100,
      cp: 340,
    };

    onPetHatched?.(hatchedPet);
    onGainXP?.(250);

    setCurrentEgg({
      id: `egg_${Date.now()}`,
      type: '500m',
      requiredMeters: 500,
      walkedMeters: 0,
      hatched: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-gradient-to-b from-slate-900 via-teal-950/60 to-slate-950 border-2 border-teal-500/70 rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl shadow-teal-950/80 flex flex-col relative text-slate-100">
        {/* Header bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur z-20">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-teal-500/20 border border-teal-400 flex items-center justify-center text-xl">
              🗺️
            </div>
            <div>
              <h3 className="text-base font-black text-white font-heading leading-tight">
                Modo Paseo & PetStops
              </h3>
              <p className="text-[10px] text-teal-300 font-medium">
                Camina con tu compañero, gira paradas y eclosiona huevos
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="p-4 space-y-4">
          {/* Walking Companion Banner & Pedometer */}
          <div className="bg-gradient-to-r from-teal-950 to-slate-900 p-3.5 rounded-2xl border border-teal-500/40 shadow-inner">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                {activeBuddyPet ? (
                  <img
                    src={activeBuddyPet.photoUrl}
                    alt={activeBuddyPet.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-teal-400 shadow"
                  />
                ) : (
                  <span className="text-2xl">🐕</span>
                )}
                <div>
                  <span className="text-xs font-black text-white block">
                    {activeBuddyPet ? `Paseando con ${activeBuddyPet.name}` : 'Paseo de Entrenador'}
                  </span>
                  <span className="text-[10px] text-teal-300">
                    {isWalking ? '🟢 Paseo en marcha' : '⏸️ Paseo en pausa'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  sounds.playTap();
                  setIsWalking(!isWalking);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  isWalking
                    ? 'bg-rose-950/80 border border-rose-500/60 text-rose-300'
                    : 'bg-teal-500 text-slate-950 font-black'
                }`}
              >
                {isWalking ? 'Pausar' : 'Reanudar'}
              </button>
            </div>

            {/* 4 Metrics Strip */}
            <div className="grid grid-cols-4 gap-1.5 pt-1 text-center bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
                  <Navigation className="w-3 h-3 text-teal-400" /> Metros
                </span>
                <span className="text-xs font-black text-white">{walkedMeters}m</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
                  <Footprints className="w-3 h-3 text-amber-400" /> Pasos
                </span>
                <span className="text-xs font-black text-white">{steps}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
                  <Flame className="w-3 h-3 text-rose-400" /> Calorías
                </span>
                <span className="text-xs font-black text-white">{calories} kcal</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
                  <Timer className="w-3 h-3 text-sky-400" /> Tiempo
                </span>
                <span className="text-xs font-black text-white">
                  {Math.floor(secondsElapsed / 60)}m {secondsElapsed % 60}s
                </span>
              </div>
            </div>
          </div>

          {/* Interactive PetStop Photodisc Spinner */}
          <div className="bg-slate-950/80 rounded-2xl p-4 border border-teal-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400 block">
                  PetStop Cercana
                </span>
                <h4 className="text-sm font-black text-white">
                  {selectedStop?.name || 'Selecciona una PetStop'}
                </h4>
              </div>
              <span className="text-2xl">{selectedStop?.icon || '📍'}</span>
            </div>

            {/* Spinning Circular Photodisc Stage */}
            {selectedStop && (
              <div className="flex flex-col items-center py-2 space-y-3">
                <div
                  onClick={handleSpinDisc}
                  className="relative w-40 h-40 rounded-full p-2 bg-gradient-to-tr from-teal-500 via-sky-400 to-amber-300 shadow-2xl cursor-pointer active:scale-95 transition-transform flex items-center justify-center"
                  title="¡Toca para girar el fotodisco!"
                >
                  <div
                    className="w-full h-full rounded-full overflow-hidden border-4 border-slate-950 shadow-inner transition-transform duration-1000 ease-out"
                    style={{ transform: `rotate(${spinRotation}deg)` }}
                  >
                    <img
                      src={selectedStop.photoUrl}
                      alt={selectedStop.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Center Pokeball core */}
                  <div className="absolute w-8 h-8 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center shadow-lg pointer-events-none">
                    <div className="w-3 h-3 rounded-full bg-slate-900 animate-ping" />
                  </div>
                </div>

                <button
                  onClick={handleSpinDisc}
                  disabled={isSpinning}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin' : ''}`} />
                  <span>{isSpinning ? 'GIRANDO...' : '¡GIRAR FOTODISCO!'}</span>
                </button>

                {/* Dropped Loot Display */}
                {droppedLoot && (
                  <div className="w-full p-3 rounded-2xl bg-teal-950/80 border border-teal-400/50 space-y-1.5 animate-fade-in text-center">
                    <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">
                      ¡Recompensas Obtenidas!
                    </span>
                    <div className="flex justify-center gap-3 pt-1">
                      {droppedLoot.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-700 text-xs font-bold"
                        >
                          <span>{item.icon}</span>
                          <span>+{item.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* List of other nearby stops to select */}
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block mb-1.5">
                Otras PetStops en los alrededores:
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {petStops.map((stop) => (
                  <button
                    key={stop.id}
                    onClick={() => {
                      sounds.playTap();
                      setSelectedStop(stop);
                      setDroppedLoot(null);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs whitespace-nowrap transition-all ${
                      selectedStop?.id === stop.id
                        ? 'bg-teal-500/20 border-teal-400 text-teal-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>{stop.icon}</span>
                    <span className="truncate max-w-[90px]">{stop.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Incubator Section for Pet Eggs */}
          <div className="bg-slate-950/80 rounded-2xl p-3.5 border border-amber-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl animate-bounce">🥚</span>
                <div>
                  <span className="text-xs font-black text-amber-300 block">
                    Incubadora de Huevo Peludo ({currentEgg.type})
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Camina para eclosionar una nueva mascota sorpresa
                  </span>
                </div>
              </div>

              {currentEgg.walkedMeters >= currentEgg.requiredMeters && (
                <button
                  onClick={handleHatchEgg}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs uppercase shadow-lg shadow-amber-500/30 animate-pulse"
                >
                  ¡Eclosionar!
                </button>
              )}
            </div>

            {/* Egg Walk Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-300">
                <span>Distancia Recorrida</span>
                <span className="text-amber-400">
                  {currentEgg.walkedMeters}m / {currentEgg.requiredMeters}m
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (currentEgg.walkedMeters / currentEgg.requiredMeters) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider active:scale-95 shadow"
          >
            Volver al Mapa 3D
          </button>
        </div>
      </div>
    </div>
  );
};
