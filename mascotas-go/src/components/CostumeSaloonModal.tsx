import React, { useState } from 'react';
import { X, Sparkles, Check, Shirt, Shield, Star, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PetRecord, PetAccessory } from '../types';
import { sounds } from '../services/sound';
import { PET_ACCESSORIES, advanceQuestProgress } from '../services/storage';

interface CostumeSaloonModalProps {
  pet: PetRecord;
  allPets: PetRecord[];
  onSelectPet: (pet: PetRecord) => void;
  onUpdatePet: (pet: PetRecord) => void;
  onClose: () => void;
  onGainXP?: (xp: number) => void;
}

export const CostumeSaloonModal: React.FC<CostumeSaloonModalProps> = ({
  pet,
  allPets,
  onSelectPet,
  onUpdatePet,
  onClose,
  onGainXP,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [equippedId, setEquippedId] = useState<string | undefined>(pet.equippedAccessoryId);
  const [justEquipped, setJustEquipped] = useState<boolean>(false);

  const equippedAccessory = PET_ACCESSORIES.find((a) => a.id === equippedId);

  const filteredAccessories = PET_ACCESSORIES.filter((a) => {
    if (selectedCategory === 'all') return true;
    return a.category === selectedCategory;
  });

  const handleToggleAccessory = (accessory: PetAccessory) => {
    sounds.playCardShine();
    const isAlreadyEquipped = equippedId === accessory.id;
    const newEquippedId = isAlreadyEquipped ? undefined : accessory.id;
    setEquippedId(newEquippedId);

    if (!isAlreadyEquipped) {
      setJustEquipped(true);
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
      setTimeout(() => setJustEquipped(false), 900);
      advanceQuestProgress('quest_dress_up', 1);
      onGainXP?.(40);
    }

    const updated: PetRecord = {
      ...pet,
      equippedAccessoryId: newEquippedId,
      cp: (pet.cp ?? Math.max(120, pet.cuteScore * 10)) + (isAlreadyEquipped ? -accessory.cpBonus : accessory.cpBonus),
    };
    onUpdatePet(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-gradient-to-b from-slate-900 via-purple-950/60 to-slate-950 border-2 border-purple-500/70 rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl shadow-purple-950/80 flex flex-col relative text-slate-100">
        {/* Header bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur z-20">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-purple-500/20 border border-purple-400 flex items-center justify-center text-xl">
              🎩
            </div>
            <div>
              <h3 className="text-base font-black text-white font-heading leading-tight">
                Salón de Disfraces
              </h3>
              <p className="text-[10px] text-purple-300 font-medium">
                Personaliza y equipa accesorios con bonificaciones de CP
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

        {/* Pet selector strip */}
        {allPets.length > 1 && (
          <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/60 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">Mascota:</span>
            {allPets.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  sounds.playTap();
                  onSelectPet(p);
                  setEquippedId(p.equippedAccessoryId);
                }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs whitespace-nowrap border ${
                  p.id === pet.id
                    ? 'bg-purple-600/30 border-purple-400 text-purple-200 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <img src={p.photoUrl} alt={p.name} className="w-4 h-4 rounded-full object-cover" />
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Dressing Room Stage */}
        <div className="p-4 space-y-4">
          <div className="relative w-full h-52 rounded-3xl overflow-hidden border-2 border-purple-500/50 bg-gradient-to-b from-purple-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center shadow-inner">
            {/* Stage lights */}
            <div className="absolute inset-0 bg-radial from-purple-500/20 via-transparent to-transparent pointer-events-none" />

            {/* Pet avatar with equipped accessory */}
            <div className={`relative transition-transform duration-300 ${justEquipped ? 'scale-110' : ''}`}>
              <img
                src={pet.photoUrl}
                alt={pet.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-purple-400/80 shadow-2xl shadow-purple-500/40"
              />

              {equippedAccessory && (
                <div
                  className="absolute -top-3 -right-2 bg-slate-950 border-2 border-amber-400 rounded-full w-12 h-12 flex items-center justify-center text-2xl shadow-xl animate-bounce"
                  title={equippedAccessory.name}
                >
                  {equippedAccessory.icon}
                </div>
              )}
            </div>

            <div className="text-center mt-2 z-10">
              <span className="text-sm font-black text-white block">{pet.name}</span>
              <span className="text-[10px] text-purple-300 font-bold">
                {equippedAccessory ? `Disfraz: ${equippedAccessory.name}` : 'Sin disfraz equipado'}
              </span>
            </div>
          </div>

          {/* Category filter tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'hat', label: 'Sombreros' },
              { id: 'cape', label: 'Capas & Alas' },
              { id: 'glasses', label: 'Gafas' },
              { id: 'neck', label: 'Cuello' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  sounds.playTap();
                  setSelectedCategory(cat.id);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Accessories Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {filteredAccessories.map((acc) => {
              const isEquipped = equippedId === acc.id;
              return (
                <button
                  key={acc.id}
                  onClick={() => handleToggleAccessory(acc)}
                  className={`p-3 rounded-2xl border text-left transition-all active:scale-95 relative group flex flex-col justify-between ${
                    isEquipped
                      ? 'bg-purple-950/80 border-purple-400 ring-2 ring-purple-400/50 shadow-lg shadow-purple-900/40'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-3xl group-hover:scale-110 transition-transform">{acc.icon}</span>
                    {isEquipped && (
                      <span className="px-1.5 py-0.5 rounded-full bg-purple-500 text-slate-950 font-black text-[9px] uppercase tracking-wider flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Equipado
                      </span>
                    )}
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-white group-hover:text-purple-300">
                      {acc.name}
                    </h5>
                    <div className="flex gap-2 text-[10px] font-bold text-amber-400 mt-0.5">
                      <span>+{acc.cpBonus} CP</span>
                      <span>+{acc.charmBonus}% Encanto</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                      {acc.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-semibold">
            {equippedAccessory ? `Bonificación: +${equippedAccessory.cpBonus} CP` : 'Elige un accesorio para vestir'}
          </span>
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black text-xs uppercase tracking-wider active:scale-95 shadow"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
