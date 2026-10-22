import React, { useState } from 'react';
import { X, Sparkles, Share2, RotateCw, Download, Check, Award, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PetRecord, PetAccessory } from '../types';
import { sounds } from '../services/sound';
import { PET_ACCESSORIES } from '../services/storage';
import { copyToClipboard } from '../services/clipboard';

interface HolographicCardModalProps {
  pet: PetRecord;
  trainerName: string;
  onClose: () => void;
}

export const HolographicCardModal: React.FC<HolographicCardModalProps> = ({
  pet,
  trainerName,
  onClose,
}) => {
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [copied, setCopied] = useState<boolean>(false);

  const equippedAccessory: PetAccessory | undefined = PET_ACCESSORIES.find(
    (a) => a.id === pet.equippedAccessoryId
  );

  const totalCP = (pet.cp ?? Math.max(120, pet.cuteScore * 10)) + (equippedAccessory?.cpBonus ?? 0);

  // Elemental Type determination
  const elementType =
    pet.species === 'gato' ? 'Místico / Psíquico 🔮' : 'Fiel / Tierra ⚡';
  const elementColor =
    pet.species === 'gato'
      ? 'from-purple-600 via-pink-500 to-amber-400'
      : 'from-amber-500 via-yellow-400 to-emerald-400';

  // Mouse move tilt effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 20, y: -y * 20 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const handleFlip = () => {
    sounds.playTap();
    setIsFlipped(!isFlipped);
  };

  const handleTriggerShine = () => {
    sounds.playCardShine();
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.5 } });
  };

  const handleShare = async () => {
    sounds.playTap();
    const text = `🎴 ¡Carta Holográfica TCG de "${pet.name}"! Nivel CP: ${totalCP}, Rareza: ${pet.rarity}. Entrenador: ${trainerName} #PetGO`;
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-amber-400/80 rounded-3xl max-w-sm w-full max-h-[95vh] overflow-y-auto shadow-2xl shadow-amber-500/20 flex flex-col relative text-slate-100">
        {/* Header bar */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-lg">
              🎴
            </div>
            <div>
              <h3 className="text-sm font-black text-white font-heading leading-tight">
                Carta Coleccionable TCG
              </h3>
              <p className="text-[10px] text-amber-300 font-medium">Edición Holográfica Limitada</p>
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

        {/* 3D TCG Card Stage */}
        <div className="p-4 flex flex-col items-center">
          <div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleTriggerShine}
            style={{
              perspective: '1000px',
              transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
              transition: 'transform 0.15s ease-out',
            }}
            className="w-full max-w-[280px] h-[410px] rounded-2xl relative cursor-pointer select-none group shadow-2xl"
          >
            {/* FRONT OF THE CARD */}
            {!isFlipped ? (
              <div className="w-full h-full rounded-2xl p-2.5 bg-gradient-to-br from-amber-300 via-yellow-100 to-amber-500 border-4 border-amber-400 shadow-2xl relative flex flex-col justify-between overflow-hidden">
                {/* Holographic foil rainbow sheen overlay */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-40 mix-blend-color-dodge transition-opacity duration-300 group-hover:opacity-75"
                  style={{
                    background: `linear-gradient(${120 + tilt.x * 3}deg, rgba(255,0,128,0.3), rgba(0,255,255,0.4), rgba(255,255,0,0.3), rgba(128,0,255,0.4))`,
                  }}
                />

                {/* Foil sparkle stars */}
                <div className="absolute top-2 right-4 text-xs animate-ping pointer-events-none text-white font-black">
                  ✦
                </div>
                <div className="absolute bottom-10 left-3 text-xs animate-pulse pointer-events-none text-white font-black">
                  ✦
                </div>

                {/* Card Header */}
                <div className="relative z-10 bg-slate-900/90 rounded-xl px-2.5 py-1 border border-amber-300/60 flex items-center justify-between text-slate-100 shadow">
                  <div>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-amber-300 block">
                      BÁSICO • {pet.species === 'perro' ? 'CANINO' : 'FELINO'}
                    </span>
                    <h4 className="text-xs font-black truncate max-w-[120px] text-white">
                      {pet.name}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-amber-400">{totalCP} HP</span>
                    <span className="text-[8px] block text-slate-400 -mt-1 font-bold">
                      {pet.rarity}
                    </span>
                  </div>
                </div>

                {/* Art Frame */}
                <div className="relative z-10 my-1 rounded-xl overflow-hidden border-2 border-amber-400 shadow-inner bg-slate-950 h-44">
                  <img
                    src={pet.photoUrl}
                    alt={pet.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {equippedAccessory && (
                    <div className="absolute top-1 right-1 bg-slate-950/80 border border-amber-400 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-amber-300 flex items-center gap-1 shadow">
                      <span>{equippedAccessory.icon}</span>
                      <span>{equippedAccessory.name}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-1.5 text-center">
                    <span className="text-[9px] font-semibold text-slate-300 italic">
                      "{pet.description.slice(0, 65)}..."
                    </span>
                  </div>
                </div>

                {/* Moves Section */}
                <div className="relative z-10 bg-slate-900/90 rounded-xl p-2 border border-amber-300/50 space-y-1 text-slate-100 shadow">
                  <div className="flex items-center justify-between text-[10px] font-bold border-b border-slate-800 pb-0.5">
                    <span className="flex items-center gap-1 text-amber-300">
                      <span>✨</span> Mirada Tierna Encantadora
                    </span>
                    <span className="text-amber-400 font-black">40+</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="flex items-center gap-1 text-emerald-300">
                      <span>🐾</span>
                      {pet.species === 'perro' ? 'Ladrido Armónico' : 'Ronroneo Místico'}
                    </span>
                    <span className="text-emerald-400 font-black">70</span>
                  </div>
                </div>

                {/* Card Footer: Rarity & Collector details */}
                <div className="relative z-10 flex items-center justify-between text-[8px] font-bold text-slate-800 px-1 pt-0.5">
                  <span>Ilus. PetVision AI</span>
                  <span className="text-amber-900 font-black tracking-wider">
                    ★ HOLO RARE • 042/150
                  </span>
                  <span>© PetGO 2026</span>
                </div>
              </div>
            ) : (
              /* BACK OF THE CARD */
              <div className="w-full h-full rounded-2xl p-4 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 border-4 border-amber-400 shadow-2xl relative flex flex-col items-center justify-between text-center overflow-hidden">
                <div className="w-full text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                    LIGA OFICIAL PETGO
                  </span>
                  <h4 className="text-xs font-black text-white">Certificado de Coleccionista</h4>
                </div>

                {/* Central Poké-Pet Emblem */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 p-1 shadow-2xl flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center text-3xl">
                    <span>🐾</span>
                  </div>
                </div>

                {/* Stats Summary */}
                <div className="w-full bg-slate-950/80 rounded-xl p-2.5 border border-indigo-700/60 text-left space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Entrenador:</span>
                    <span className="font-bold text-amber-300">{trainerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Raza:</span>
                    <span className="font-bold text-white">{pet.breed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nivel de Ternura:</span>
                    <span className="font-bold text-emerald-400">{pet.cuteScore}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Capturado en:</span>
                    <span className="font-bold text-slate-300">
                      {new Date(pet.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <span className="text-[8px] text-slate-400 font-bold tracking-wider">
                  AUTÉNTICA PIEZA DIGITAL HOLOGRAM
                </span>
              </div>
            )}
          </div>

          <span className="text-[10px] text-slate-400 mt-2 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Mueve el cursor o toca para ver el reflejo holográfico
          </span>

          {/* Action buttons */}
          <div className="flex gap-2 w-full mt-3">
            <button
              onClick={handleFlip}
              className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 active:scale-95"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{isFlipped ? 'Ver Frontal' : 'Voltear Carta'}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-1.5 active:scale-95 shadow"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? '¡Copiado!' : 'Compartir'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
