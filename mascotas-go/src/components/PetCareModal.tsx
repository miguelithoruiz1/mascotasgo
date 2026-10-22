import React, { useState } from 'react';
import { X, Heart, Sparkles, Utensils, Smile, Zap, Award, Star, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PetRecord, PetAccessory } from '../types';
import { sounds } from '../services/sound';
import { PET_ACCESSORIES, advanceQuestProgress } from '../services/storage';

interface PetCareModalProps {
  pet: PetRecord;
  allPets: PetRecord[];
  onSelectPet: (pet: PetRecord) => void;
  onUpdatePet: (pet: PetRecord) => void;
  isActiveBuddy: boolean;
  onSetAsActiveBuddy: (petId: string) => void;
  onClose: () => void;
  onGainXP?: (xp: number) => void;
  onOpenAlbum?: (pet: PetRecord) => void;
}

export const PetCareModal: React.FC<PetCareModalProps> = ({
  pet,
  allPets,
  onSelectPet,
  onUpdatePet,
  isActiveBuddy,
  onSetAsActiveBuddy,
  onClose,
  onGainXP,
  onOpenAlbum,
}) => {
  const [friendship, setFriendship] = useState<number>(pet.buddyFriendship ?? 35);
  const [hunger, setHunger] = useState<number>(pet.hunger ?? 70);
  const [happiness, setHappiness] = useState<number>(pet.happiness ?? 60);
  const [energy, setEnergy] = useState<number>(pet.energy ?? 80);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [pettingHearts, setPettingHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [isJumping, setIsJumping] = useState<boolean>(false);
  const [bubbleShower, setBubbleShower] = useState<boolean>(false);

  // Equipped accessory details
  const equippedAccessory: PetAccessory | undefined = PET_ACCESSORIES.find(
    (a) => a.id === pet.equippedAccessoryId
  );

  // Buddy Level calculation (1 to 5 stars)
  const buddyLevel = Math.min(5, Math.floor(friendship / 20) + 1);

  const saveStats = (newFriendship: number, newHunger: number, newHappiness: number, newEnergy: number) => {
    setFriendship(newFriendship);
    setHunger(newHunger);
    setHappiness(newHappiness);
    setEnergy(newEnergy);

    const updated: PetRecord = {
      ...pet,
      buddyFriendship: newFriendship,
      hunger: newHunger,
      happiness: newHappiness,
      energy: newEnergy,
      cp: (pet.cp ?? Math.max(120, pet.cuteScore * 10)) + 5,
    };
    onUpdatePet(updated);
  };

  // 1. Feed action
  const handleFeed = (treatName: string, icon: string) => {
    sounds.playEating();
    const nextHunger = Math.min(100, hunger + 25);
    const nextFriendship = Math.min(100, friendship + 5);
    const nextHappiness = Math.min(100, happiness + 10);
    saveStats(nextFriendship, nextHunger, nextHappiness, energy);

    advanceQuestProgress('quest_pet_care', 1);
    onGainXP?.(25);

    setActionFeedback(`¡${pet.name} disfrutó un delicioso ${treatName}! ${icon}`);
    setIsJumping(true);
    setTimeout(() => setIsJumping(false), 700);
    setTimeout(() => setActionFeedback(null), 2500);
  };

  // 2. Petting action
  const handlePetInteraction = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    sounds.playPurr();
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const newHeart = { id: Date.now() + Math.random(), x, y };
    setPettingHearts((prev) => [...prev, newHeart]);
    setTimeout(() => {
      setPettingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1200);

    const nextHappiness = Math.min(100, happiness + 8);
    const nextFriendship = Math.min(100, friendship + 4);
    saveStats(nextFriendship, hunger, nextHappiness, energy);

    advanceQuestProgress('quest_pet_care', 1);
    onGainXP?.(15);

    setActionFeedback(`¡Acariciaste a ${pet.name}! Ronronea de felicidad ❤️`);
    setTimeout(() => setActionFeedback(null), 2000);
  };

  // 3. Play with toy ball
  const handlePlayToy = () => {
    sounds.playItemDrop();
    setIsJumping(true);
    confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } });

    const nextHappiness = Math.min(100, happiness + 20);
    const nextEnergy = Math.max(10, energy - 15);
    const nextFriendship = Math.min(100, friendship + 8);
    saveStats(nextFriendship, hunger, nextHappiness, nextEnergy);

    advanceQuestProgress('quest_pet_care', 1);
    onGainXP?.(30);

    setActionFeedback(`¡${pet.name} atrapó la pelota en el aire con pirueta! 🎾✨`);
    setTimeout(() => setIsJumping(false), 900);
    setTimeout(() => setActionFeedback(null), 2500);
  };

  // 4. Bath & grooming
  const handleGrooming = () => {
    sounds.playCardShine();
    setBubbleShower(true);
    const nextHappiness = Math.min(100, happiness + 15);
    const nextFriendship = Math.min(100, friendship + 6);
    saveStats(nextFriendship, hunger, nextHappiness, energy);

    advanceQuestProgress('quest_pet_care', 1);
    onGainXP?.(20);

    setActionFeedback(`¡Bañaste y cepillaste a ${pet.name}! Brilla con esplendor 🛁✨`);
    setTimeout(() => setBubbleShower(false), 1800);
    setTimeout(() => setActionFeedback(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/70 rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl shadow-emerald-950/80 flex flex-col relative text-slate-100">
        {/* Header bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur z-20">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-xl">
              🎾
            </div>
            <div>
              <h3 className="text-base font-black text-white font-heading leading-tight">
                Guardería & Cuidado
              </h3>
              <p className="text-[10px] text-emerald-400 font-medium">
                Fortalece el vínculo y sube sus Puntos de Combate (CP)
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

        {/* Pet selector thumbnail strip */}
        {allPets.length > 1 && (
          <div className="px-4 pt-3 pb-1 border-b border-slate-800/80 bg-slate-950/50">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5 tracking-wider">
              Tus Mascotas ({allPets.length})
            </span>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {allPets.map((p) => {
                const isSelected = p.id === pet.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      sounds.playTap();
                      onSelectPet(p);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold scale-102 ring-1 ring-emerald-400/50'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <img
                      src={p.photoUrl}
                      alt={p.name}
                      className="w-5 h-5 rounded-full object-cover border border-slate-700"
                    />
                    <span className="truncate max-w-[80px]">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Pet Stage Area */}
        <div className="p-4 space-y-4">
          <div
            onClick={handlePetInteraction}
            className="relative w-full h-56 rounded-3xl overflow-hidden border-2 border-emerald-500/40 bg-gradient-to-b from-teal-950/60 via-slate-900 to-slate-950 shadow-inner flex items-center justify-center cursor-pointer select-none group"
            title="¡Toca o haz clic sobre tu mascota para acariciarla!"
          >
            {/* Background ambiance glow */}
            <div className="absolute inset-0 bg-radial from-emerald-500/15 via-transparent to-transparent pointer-events-none" />

            {/* Real-Life Growth Album Button */}
            {onOpenAlbum && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  sounds.playTap();
                  onOpenAlbum(pet);
                }}
                className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-emerald-400/60 text-emerald-300 text-[10px] font-bold flex items-center gap-1 shadow-lg active:scale-95 transition-all"
                title="Abrir álbum de crecimiento en la vida real"
              >
                <span>📸</span>
                <span>Álbum ({pet.albumPhotos?.length || 1})</span>
              </button>
            )}

            {/* Bubble shower overlay */}
            {bubbleShower && (
              <div className="absolute inset-0 z-30 pointer-events-none flex flex-wrap justify-around items-center animate-pulse">
                {Array.from({ length: 14 }).map((_, i) => (
                  <span
                    key={i}
                    className="text-2xl animate-bounce"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    🫧
                  </span>
                ))}
              </div>
            )}

            {/* Pet Image with Costume Badge */}
            <div
              className={`relative z-10 transition-transform duration-300 ${
                isJumping ? '-translate-y-6 scale-110' : 'group-hover:scale-102'
              }`}
            >
              <img
                src={pet.photoUrl}
                alt={pet.name}
                className="w-40 h-40 object-cover rounded-full border-4 border-emerald-400/80 shadow-2xl shadow-emerald-500/30"
              />

              {/* Equipped accessory sticker */}
              {equippedAccessory && (
                <div
                  className="absolute -top-3 -right-2 bg-slate-950/90 border-2 border-amber-400 rounded-full w-11 h-11 flex items-center justify-center text-2xl shadow-lg animate-bounce"
                  title={`Disfraz: ${equippedAccessory.name}`}
                >
                  {equippedAccessory.icon}
                </div>
              )}

              {/* Species badge */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-emerald-500/60 px-3 py-0.5 rounded-full text-[10px] font-black uppercase text-emerald-300 shadow">
                {pet.species === 'perro' ? '🐶 Canino' : '🐱 Felino'} • CP {pet.cp ?? Math.max(120, pet.cuteScore * 10)}
              </div>
            </div>

            {/* Floating petting hearts */}
            {pettingHearts.map((h) => (
              <span
                key={h.id}
                style={{ left: h.x, top: h.y }}
                className="absolute z-20 text-2xl pointer-events-none animate-ping text-rose-400 font-bold"
              >
                ❤️
              </span>
            ))}

            {/* Tap cue overlay */}
            <div className="absolute bottom-2 right-3 pointer-events-none text-[10px] font-bold text-slate-400/80 flex items-center gap-1 bg-slate-950/70 px-2 py-0.5 rounded-full border border-slate-800">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Toca para Acariciar</span>
            </div>
          </div>

          {/* Action Feedback Toast */}
          {actionFeedback && (
            <div className="p-2.5 rounded-2xl bg-emerald-950/90 border border-emerald-400/60 text-xs font-bold text-emerald-200 text-center shadow-lg animate-fade-in">
              {actionFeedback}
            </div>
          )}

          {/* Buddy & Stats Overview */}
          <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800 space-y-2.5">
            {/* Buddy Level & Active Companion Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-400 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> Nivel de Vínculo: {buddyLevel}/5
                </span>
                <div className="flex gap-1 mt-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < buddyLevel
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  sounds.playTap();
                  onSetAsActiveBuddy(pet.id);
                  advanceQuestProgress('quest_pet_care', 1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActiveBuddy
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {isActiveBuddy ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Compañero Activo</span>
                  </>
                ) : (
                  <span>⭐ Nombrar Compañero</span>
                )}
              </button>
            </div>

            {/* 3 Vital Meters */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
              {/* Friendship */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-slate-300">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-400" /> Vínculo
                  </span>
                  <span>{friendship}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-300"
                    style={{ width: `${friendship}%` }}
                  />
                </div>
              </div>

              {/* Hunger */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-slate-300">
                  <span className="flex items-center gap-1">
                    <Utensils className="w-3 h-3 text-amber-400" /> Saciedad
                  </span>
                  <span>{hunger}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${hunger}%` }}
                  />
                </div>
              </div>

              {/* Happiness */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-slate-300">
                  <span className="flex items-center gap-1">
                    <Smile className="w-3 h-3 text-emerald-400" /> Alegría
                  </span>
                  <span>{happiness}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${happiness}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Care Actions Grid */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Acciones de Cuidado
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Feeding Treats */}
              <button
                onClick={() => handleFeed('Premio Gourmet', '🍖')}
                className="p-3 rounded-2xl bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-500/40 hover:border-amber-400 flex flex-col items-center gap-1 active:scale-95 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  🍖
                </div>
                <span className="text-xs font-bold text-amber-300">Dar Bocadillo</span>
                <span className="text-[10px] text-slate-400">+25 Saciedad • +5 Amor</span>
              </button>

              {/* Fish / Biscuit alternative */}
              <button
                onClick={() => handleFeed(pet.species === 'gato' ? 'Atún Supremo' : 'Galleta de Hueso', pet.species === 'gato' ? '🐟' : '🦴')}
                className="p-3 rounded-2xl bg-gradient-to-br from-teal-950/60 to-slate-900 border border-teal-500/40 hover:border-teal-400 flex flex-col items-center gap-1 active:scale-95 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-full bg-teal-500/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  {pet.species === 'gato' ? '🐟' : '🦴'}
                </div>
                <span className="text-xs font-bold text-teal-300">
                  {pet.species === 'gato' ? 'Filete Atún' : 'Hueso Crujiente'}
                </span>
                <span className="text-[10px] text-slate-400">+25 Saciedad • +5 Amor</span>
              </button>

              {/* Play with ball */}
              <button
                onClick={handlePlayToy}
                className="p-3 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40 hover:border-emerald-400 flex flex-col items-center gap-1 active:scale-95 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  🎾
                </div>
                <span className="text-xs font-bold text-emerald-300">Lanzar Pelota</span>
                <span className="text-[10px] text-slate-400">+20 Alegría • Salto AR</span>
              </button>

              {/* Groom & Bath */}
              <button
                onClick={handleGrooming}
                className="p-3 rounded-2xl bg-gradient-to-br from-sky-950/60 to-slate-900 border border-sky-500/40 hover:border-sky-400 flex flex-col items-center gap-1 active:scale-95 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-full bg-sky-500/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  🛁
                </div>
                <span className="text-xs font-bold text-sky-300">Bañar & Cepillar</span>
                <span className="text-[10px] text-slate-400">+15 Alegría • Brillo Pelaje</span>
              </button>
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
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider active:scale-95 shadow-lg shadow-emerald-500/20"
          >
            Guardar & Continuar
          </button>
        </div>
      </div>
    </div>
  );
};
