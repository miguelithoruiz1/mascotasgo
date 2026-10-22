import React, { useState } from 'react';
import { X, Trophy, Sparkles, Award, Swords, Heart, Volume2, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PetRecord, PetAccessory } from '../types';
import { sounds } from '../services/sound';
import { PET_ACCESSORIES, advanceQuestProgress } from '../services/storage';

interface PetShowArenaModalProps {
  playerPet: PetRecord;
  allPets: PetRecord[];
  onSelectPet: (p: PetRecord) => void;
  onUpdatePet: (p: PetRecord) => void;
  onClose: () => void;
  onGainXP?: (xp: number) => void;
}

interface Rival {
  name: string;
  breed: string;
  species: 'perro' | 'gato';
  photoUrl: string;
  cp: number;
  accessoryIcon?: string;
}

const RIVALS: Rival[] = [
  {
    name: 'Michi Ninja',
    breed: 'Siamés Ágil',
    species: 'gato',
    photoUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80',
    cp: 280,
    accessoryIcon: '🥋',
  },
  {
    name: 'Pulgoso Campeón',
    breed: 'Pug Acróbata',
    species: 'perro',
    photoUrl: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=400&q=80',
    cp: 310,
    accessoryIcon: '👑',
  },
  {
    name: 'Luna de Cristal',
    breed: 'Persa Espléndida',
    species: 'gato',
    photoUrl: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=400&q=80',
    cp: 350,
    accessoryIcon: '🌸',
  },
  {
    name: 'Bolt el Veloz',
    breed: 'Border Collie Estelar',
    species: 'perro',
    photoUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80',
    cp: 390,
    accessoryIcon: '🦸',
  },
];

export const PetShowArenaModal: React.FC<PetShowArenaModalProps> = ({
  playerPet,
  allPets,
  onSelectPet,
  onUpdatePet,
  onClose,
  onGainXP,
}) => {
  const [rivalIndex, setRivalIndex] = useState<number>(0);
  const rival = RIVALS[rivalIndex];

  // Battle State: 0 to 100 points
  const [playerApplause, setPlayerApplause] = useState<number>(10);
  const [rivalApplause, setRivalApplause] = useState<number>(10);
  const [turn, setTurn] = useState<'player' | 'rival' | 'gameover'>('player');
  const [battleLog, setBattleLog] = useState<string>('¡Comienza el Concurso de Gracia! El jurado espera tu primer movimiento.');
  const [winner, setWinner] = useState<'player' | 'rival' | null>(null);
  const [activeFX, setActiveFX] = useState<string | null>(null);

  const equippedAccessory: PetAccessory | undefined = PET_ACCESSORIES.find(
    (a) => a.id === playerPet.equippedAccessoryId
  );

  const playerCP = (playerPet.cp ?? Math.max(120, playerPet.cuteScore * 10)) + (equippedAccessory?.cpBonus ?? 0);

  // Player Moves
  const moves = [
    {
      id: 'move_1',
      name: 'Mirada Tierna ✨',
      desc: 'Ojos brillantes que derriten al jurado.',
      power: 22,
      fx: '✨',
    },
    {
      id: 'move_2',
      name: 'Pata Amiga 🐾',
      desc: 'Choca la patita con simpatía deslumbrante.',
      power: 26,
      fx: '🐾',
    },
    {
      id: 'move_3',
      name: 'Salto Acrobático 🤸',
      desc: 'Pirueta limpia en el aire con caída suave.',
      power: 32,
      fx: '🌟',
    },
    {
      id: 'move_4',
      name: playerPet.species === 'perro' ? 'Ladrido Armónico 🎶' : 'Ronroneo Sinfónico 🎶',
      desc: 'Sonido musical que hace vibrar al público.',
      power: 38,
      fx: '🎵',
    },
  ];

  // Rival AI Move
  const handleRivalTurn = (currentScores: { player: number; rival: number }) => {
    setTurn('rival');
    setTimeout(() => {
      sounds.playBattleAttack();
      const rivalMoves = [
        'hizo una pose regia de estatua',
        'dio una vuelta sobre su cola',
        'lanzó un guiño adorable al jurado',
        'saltó ágilmente con gracia felina/canina',
      ];
      const randomMove = rivalMoves[Math.floor(Math.random() * rivalMoves.length)];
      const gain = Math.floor(Math.random() * 15) + 18;
      const nextRivalScore = Math.min(100, currentScores.rival + gain);

      setRivalApplause(nextRivalScore);
      setActiveFX('⚡');
      setTimeout(() => setActiveFX(null), 800);

      if (nextRivalScore >= 100) {
        setWinner('rival');
        setTurn('gameover');
        setBattleLog(`¡${rival.name} se llevó la ovación final del jurado! Buen intento.`);
      } else {
        setBattleLog(`¡${rival.name} ${randomMove}! Ganó +${gain} aplausos.`);
        setTurn('player');
      }
    }, 1100);
  };

  // Player executes move
  const handlePlayerMove = (move: typeof moves[0]) => {
    if (turn !== 'player' || winner) return;

    sounds.playBattleAttack();
    setActiveFX(move.fx);
    setTimeout(() => setActiveFX(null), 800);

    // Boost move slightly based on CP
    const cpBonus = Math.floor(playerCP / 100);
    const gain = move.power + cpBonus;
    const nextPlayerScore = Math.min(100, playerApplause + gain);
    setPlayerApplause(nextPlayerScore);

    if (nextPlayerScore >= 100) {
      setWinner('player');
      setTurn('gameover');
      sounds.playCrowdCheer();
      sounds.playCapture();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });

      const updatedWins = (playerPet.arenaWins ?? 0) + 1;
      onUpdatePet({ ...playerPet, arenaWins: updatedWins, cp: playerCP + 20 });
      advanceQuestProgress('quest_win_arena', 1);
      onGainXP?.(200);

      setBattleLog(`¡VICTORIA! ¡${playerPet.name} cautivó al 100% al jurado y gana el Trofeo de Gracia! 🏆✨`);
    } else {
      setBattleLog(`¡${playerPet.name} usó ${move.name}! El público estalla con +${gain} aplausos.`);
      handleRivalTurn({ player: nextPlayerScore, rival: rivalApplause });
    }
  };

  // Reset match or next rival
  const handleReset = (nextRival: boolean = false) => {
    sounds.playTap();
    if (nextRival) {
      setRivalIndex((prev) => (prev + 1) % RIVALS.length);
    }
    setPlayerApplause(10);
    setRivalApplause(10);
    setWinner(null);
    setTurn('player');
    setBattleLog('¡Nueva ronda! Demuestra la ternura de tu compañero.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-gradient-to-b from-slate-900 via-indigo-950/60 to-slate-950 border-2 border-indigo-500/70 rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl shadow-indigo-950/80 flex flex-col relative text-slate-100">
        {/* Header bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur z-20">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-400 flex items-center justify-center text-xl">
              ⚔️
            </div>
            <div>
              <h3 className="text-base font-black text-white font-heading leading-tight">
                Concurso de Gracia
              </h3>
              <p className="text-[10px] text-indigo-300 font-medium">
                Arena de Exhibición y Duelo de Carisma
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

        {/* Pet selection strip if multiple pets */}
        {allPets.length > 1 && (
          <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/60 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">Tu Campeón:</span>
            {allPets.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  sounds.playTap();
                  onSelectPet(p);
                  handleReset(false);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs whitespace-nowrap border ${
                  p.id === playerPet.id
                    ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <img src={p.photoUrl} alt={p.name} className="w-4 h-4 rounded-full object-cover" />
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Arena Stage */}
        <div className="p-4 space-y-4">
          <div className="relative w-full h-52 rounded-3xl overflow-hidden border-2 border-indigo-500/50 bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 p-3 flex items-center justify-between shadow-inner">
            {/* Spotlight & Ambiance */}
            <div className="absolute inset-0 bg-radial from-indigo-500/20 via-transparent to-transparent pointer-events-none" />

            {/* Central FX particle */}
            {activeFX && (
              <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none animate-ping text-5xl">
                {activeFX}
              </div>
            )}

            {/* Left: Player Pet Stage */}
            <div className="flex flex-col items-center z-10 w-36">
              <div className="relative">
                <img
                  src={playerPet.photoUrl}
                  alt={playerPet.name}
                  className="w-20 h-20 rounded-full object-cover border-3 border-emerald-400 shadow-xl"
                />
                {equippedAccessory && (
                  <span className="absolute -top-1 -right-1 bg-slate-900 border border-amber-400 rounded-full w-6 h-6 flex items-center justify-center text-sm">
                    {equippedAccessory.icon}
                  </span>
                )}
              </div>
              <span className="text-xs font-black text-emerald-300 mt-1 truncate max-w-[120px]">
                {playerPet.name}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">CP {playerCP}</span>

              {/* Player Applause Bar */}
              <div className="w-full mt-1 space-y-0.5">
                <div className="flex justify-between text-[9px] font-bold text-slate-300">
                  <span>Aplausos</span>
                  <span className="text-emerald-400">{playerApplause}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${playerApplause}%` }}
                  />
                </div>
              </div>
            </div>

            {/* VS Badge */}
            <div className="z-10 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg border-2 border-white/40 animate-pulse">
                VS
              </div>
            </div>

            {/* Right: Rival Pet Stage */}
            <div className="flex flex-col items-center z-10 w-36">
              <div className="relative">
                <img
                  src={rival.photoUrl}
                  alt={rival.name}
                  className="w-20 h-20 rounded-full object-cover border-3 border-rose-400 shadow-xl"
                />
                {rival.accessoryIcon && (
                  <span className="absolute -top-1 -right-1 bg-slate-900 border border-rose-400 rounded-full w-6 h-6 flex items-center justify-center text-sm">
                    {rival.accessoryIcon}
                  </span>
                )}
              </div>
              <span className="text-xs font-black text-rose-300 mt-1 truncate max-w-[120px]">
                {rival.name}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">CP {rival.cp}</span>

              {/* Rival Applause Bar */}
              <div className="w-full mt-1 space-y-0.5">
                <div className="flex justify-between text-[9px] font-bold text-slate-300">
                  <span>Aplausos</span>
                  <span className="text-rose-400">{rivalApplause}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-pink-400 rounded-full transition-all duration-500"
                    style={{ width: `${rivalApplause}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Commentator Log */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-indigo-900/60 text-xs text-indigo-200 flex items-start gap-2 shadow">
            <Volume2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="leading-snug">{battleLog}</p>
          </div>

          {/* Victory Modal Overlay inside arena */}
          {winner && (
            <div className="p-4 rounded-3xl bg-gradient-to-b from-indigo-950/90 to-slate-950 border-2 border-amber-400/80 text-center space-y-3 animate-fade-in shadow-2xl">
              <div className="w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-400 text-3xl mx-auto flex items-center justify-center shadow-lg animate-bounce">
                {winner === 'player' ? '🏆' : '🥈'}
              </div>
              <div>
                <h4 className="text-base font-black text-amber-300">
                  {winner === 'player' ? '¡Campeón de la Arena!' : '¡Buen Espectáculo!'}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  {winner === 'player'
                    ? `¡${playerPet.name} se llevó el trofeo y +200 XP de Entrenador!`
                    : `${rival.name} ganó esta ronda, pero tu mascota demostró gran carisma.`}
                </p>
              </div>

              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleReset(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
                >
                  Revancha
                </button>
                <button
                  onClick={() => handleReset(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 text-xs font-black"
                >
                  Siguiente Rival ➡️
                </button>
              </div>
            </div>
          )}

          {/* Move Buttons Grid (only when turn is player) */}
          {!winner && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>Elige tu Movimiento</span>
                <span className={turn === 'player' ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}>
                  {turn === 'player' ? '🟢 Tu Turno' : '⏳ Esperando al Rival...'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {moves.map((m) => (
                  <button
                    key={m.id}
                    disabled={turn !== 'player'}
                    onClick={() => handlePlayerMove(m)}
                    className="p-3 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/30 hover:border-indigo-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all text-left group shadow"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white group-hover:text-indigo-300">
                        {m.name}
                      </span>
                      <span className="text-[10px] font-bold text-amber-400">+{m.power}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-semibold">
            Victorias de {playerPet.name}: {playerPet.arenaWins ?? 0} 🏅
          </span>
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
          >
            Salir de la Arena
          </button>
        </div>
      </div>
    </div>
  );
};
