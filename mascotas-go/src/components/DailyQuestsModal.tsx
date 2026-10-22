import React, { useState } from 'react';
import { X, Target, CheckCircle2, Gift, Sparkles, Award, Star, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';
import { DailyQuest, PlayerProfile } from '../types';
import { sounds } from '../services/sound';
import { getDailyQuests, saveDailyQuests } from '../services/storage';

interface DailyQuestsModalProps {
  profile: PlayerProfile;
  onUpdateProfile: (p: PlayerProfile) => void;
  onClose: () => void;
  onGainXP?: (xp: number) => void;
}

export const DailyQuestsModal: React.FC<DailyQuestsModalProps> = ({
  profile,
  onUpdateProfile,
  onClose,
  onGainXP,
}) => {
  const [quests, setQuests] = useState<DailyQuest[]>(getDailyQuests());
  const [claimToast, setClaimToast] = useState<string | null>(null);

  const completedCount = quests.filter((q) => q.progress >= q.target).length;
  const streakDays = 4; // 4-day active streak

  const handleClaimReward = (quest: DailyQuest) => {
    sounds.playCapture();
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });

    // Mark as claimed
    const updated = quests.map((q) => (q.id === quest.id ? { ...q, claimed: true } : q));
    setQuests(updated);
    saveDailyQuests(updated);

    // Apply rewards
    if (quest.rewardType === 'xp') {
      onGainXP?.(quest.rewardAmount);
    } else if (quest.rewardType === 'pokeballs') {
      const nextPoke = (profile.pokeBalls ?? 25) + quest.rewardAmount;
      onUpdateProfile({ ...profile, pokeBalls: nextPoke });
    } else if (quest.rewardType === 'treats') {
      const nextTreats = (profile.treats ?? 10) + quest.rewardAmount;
      onUpdateProfile({ ...profile, treats: nextTreats });
    }

    setClaimToast(`¡Recompensa reclamada: +${quest.rewardAmount} ${quest.rewardType.toUpperCase()}! 🎉`);
    setTimeout(() => setClaimToast(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-gradient-to-b from-slate-900 via-amber-950/40 to-slate-950 border-2 border-amber-400/80 rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl shadow-amber-950/80 flex flex-col relative text-slate-100">
        {/* Header bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur z-20">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-xl">
              🎯
            </div>
            <div>
              <h3 className="text-base font-black text-white font-heading leading-tight">
                Misiones Diarias
              </h3>
              <p className="text-[10px] text-amber-300 font-medium">
                Completa retos cada día para obtener Poké-cápsulas y XP
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

        {/* Streak banner */}
        <div className="p-3 sm:p-4 bg-gradient-to-r from-amber-950/80 to-slate-900 border-b border-slate-800 flex flex-col xs:flex-row xs:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-xl sm:text-2xl shrink-0">
              🔥
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black text-amber-300 block truncate">
                Racha Diaria: ¡{streakDays} Días Seguidos!
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                Llega a 7 días para abrir el Cofre Legendario
              </span>
            </div>
          </div>

          <div className="flex gap-1 shrink-0 self-end xs:self-auto">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-5 rounded flex items-center justify-center text-[9px] font-bold border ${
                  i < streakDays
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
                title={`Día ${i + 1}`}
              >
                {i === 6 ? '🎁' : i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Quests Content */}
        <div className="p-4 space-y-3">
          {claimToast && (
            <div className="p-2.5 rounded-2xl bg-amber-950/90 border border-amber-400 text-xs font-bold text-amber-200 text-center shadow-lg animate-fade-in">
              {claimToast}
            </div>
          )}

          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Progreso del Día</span>
            <span className="text-amber-400">
              {completedCount} de {quests.length} Completadas
            </span>
          </div>

          <div className="space-y-2.5">
            {quests.map((quest) => {
              const isFinished = quest.progress >= quest.target;
              return (
                <div
                  key={quest.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    quest.claimed
                      ? 'bg-slate-950/60 border-slate-800/80 opacity-60'
                      : isFinished
                      ? 'bg-amber-950/40 border-amber-400/80 ring-1 ring-amber-400/50 shadow-md shadow-amber-950/50'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="text-2xl mt-0.5">{quest.icon}</span>
                      <div>
                        <h4 className="text-xs font-black text-white">{quest.title}</h4>
                        <p className="text-[10px] text-slate-300 leading-snug">{quest.description}</p>
                      </div>
                    </div>

                    {/* Reward Badge / Claim Button */}
                    <div className="shrink-0 text-right">
                      {quest.claimed ? (
                        <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Reclamado
                        </span>
                      ) : isFinished ? (
                        <button
                          onClick={() => handleClaimReward(quest)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-lg shadow-amber-500/30 animate-bounce active:scale-95"
                        >
                          ¡Reclamar!
                        </button>
                      ) : (
                        <span className="px-2 py-1 rounded-lg bg-slate-800/90 text-amber-300 text-[10px] font-bold border border-slate-700">
                          +{quest.rewardAmount} {quest.rewardType.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2.5 space-y-1">
                    <div className="flex justify-between text-[9px] font-bold text-slate-400">
                      <span>Avance</span>
                      <span className={isFinished ? 'text-amber-400 font-black' : ''}>
                        {quest.progress} / {quest.target} {quest.unit}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (quest.progress / quest.target) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider active:scale-95 shadow"
          >
            Aceptar & Continuar
          </button>
        </div>
      </div>
    </div>
  );
};
