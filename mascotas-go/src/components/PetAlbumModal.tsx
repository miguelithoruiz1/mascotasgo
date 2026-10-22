import React, { useState, useRef } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Plus,
  Heart,
  Trash2,
  Calendar,
  Sparkles,
  X,
  Scale,
  Share2,
  Upload,
  Clock,
  Check,
  Maximize2,
  ArrowRightLeft,
  Award
} from 'lucide-react';
import { PetRecord, PetAlbumPhoto, GrowthStage } from '../types';
import { sounds } from '../services/sound';
import { copyToClipboard } from '../services/clipboard';
import confetti from 'canvas-confetti';

interface PetAlbumModalProps {
  pet: PetRecord;
  onClose: () => void;
  onUpdatePet: (updatedPet: PetRecord) => void;
  onGainedXP?: (xp: number, reason: string) => void;
}

const STAGES: { stage: GrowthStage; label: string; icon: string; color: string; desc: string }[] = [
  { stage: 'Cachorro', label: 'Cachorro / Bebé', icon: '🍼', color: 'from-amber-400 to-rose-400', desc: 'Primeros meses, juguetón y pequeñito' },
  { stage: 'Joven', label: 'Joven / Adolescente', icon: '🐾', color: 'from-sky-400 to-indigo-500', desc: 'En pleno estirón y aprendiendo trucos' },
  { stage: 'Adulto', label: 'Adulto / Pleno', icon: '👑', color: 'from-emerald-400 to-teal-500', desc: 'Fuerte, leal y en su mejor momento' },
  { stage: 'Senior', label: 'Senior / Sabio', icon: '🌟', color: 'from-purple-400 to-amber-500', desc: 'Años de cariño, sabiduría y calma' },
  { stage: 'Especial', label: 'Momento Especial', icon: '✨', color: 'from-pink-400 to-amber-400', desc: 'Aniversario, viaje o recuerdo único' },
];

const SUGGESTED_MILESTONES = [
  '¡Primer día en casa!',
  '¡Se le levantaron las orejitas!',
  '¡Primer paseo al parque!',
  '¡Aprendió a dar la pata!',
  '¡Cumpleaños / Meses!',
  '¡Ya no cabe en su camita!',
  '¡Gran estirón!',
  '¡Cita con el veterinario!',
  '¡Siesta legendaria!',
];

export const PetAlbumModal: React.FC<PetAlbumModalProps> = ({
  pet,
  onClose,
  onUpdatePet,
  onGainedXP,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'compare' | 'polaroid'>('timeline');
  const [isAddingPhoto, setIsAddingPhoto] = useState<boolean>(false);
  const [selectedPhotoDetail, setSelectedPhotoDetail] = useState<PetAlbumPhoto | null>(null);

  // Form states for new photo
  const [newPhotoUrl, setNewPhotoUrl] = useState<string>('');
  const [newStage, setNewStage] = useState<GrowthStage>('Joven');
  const [newCaption, setNewCaption] = useState<string>('');
  const [newMilestone, setNewMilestone] = useState<string>('');
  const [newWeight, setNewWeight] = useState<string>('');
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Compare slider state (0 to 100%)
  const [sliderPos, setSliderPos] = useState<number>(50);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Ensure pet has photos list
  const photos: PetAlbumPhoto[] = pet.albumPhotos && pet.albumPhotos.length > 0
    ? pet.albumPhotos
    : [
        {
          id: `initial_${pet.id}`,
          photoUrl: pet.photoUrl,
          date: pet.timestamp,
          stage: 'Cachorro',
          caption: '¡Día de captura y primer encuentro en la vida real!',
          milestone: '¡Primer Encuentro / Adopción!',
          isFavorite: true,
          weightKg: pet.species === 'gato' ? 1.5 : 4.0,
        },
      ];

  // Sorted chronologically (oldest to newest for growth timeline)
  const sortedPhotos = [...photos].sort((a, b) => a.date - b.date);
  const oldestPhoto = sortedPhotos[0];
  const newestPhoto = sortedPhotos[sortedPhotos.length - 1];

  // Calculate days together
  const firstDate = new Date(oldestPhoto.date);
  const daysTogether = Math.max(1, Math.floor((Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Handle file upload or camera photo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setNewPhotoUrl(event.target.result as string);
          sounds.playShutter();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit new growth photo
  const handleSavePhoto = () => {
    if (!newPhotoUrl) return;

    sounds.playTap();
    const photoItem: PetAlbumPhoto = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      photoUrl: newPhotoUrl,
      date: Date.now(),
      stage: newStage,
      caption: newCaption.trim() || `Foto de crecimiento en etapa ${newStage}`,
      milestone: newMilestone.trim() || undefined,
      weightKg: newWeight ? parseFloat(newWeight) : undefined,
      isFavorite: false,
    };

    const updatedAlbum = [...photos, photoItem];
    const updatedPet: PetRecord = {
      ...pet,
      albumPhotos: updatedAlbum,
      buddyFriendship: Math.min(100, (pet.buddyFriendship || 50) + 15),
      happiness: Math.min(100, (pet.happiness || 80) + 20),
    };

    onUpdatePet(updatedPet);

    // Reward XP & celebrate
    onGainedXP?.(75, `¡Nueva foto de crecimiento para ${pet.name}!`);
    sounds.playCapture();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#fbbf24', '#f43f5e', '#38bdf8'],
    });

    // Reset form
    setIsAddingPhoto(false);
    setNewPhotoUrl('');
    setNewCaption('');
    setNewMilestone('');
    setNewWeight('');
  };

  // Toggle favorite photo
  const handleToggleFavorite = (photoId: string) => {
    sounds.playTap();
    const updatedAlbum = photos.map((p) =>
      p.id === photoId ? { ...p, isFavorite: !p.isFavorite } : p
    );
    onUpdatePet({ ...pet, albumPhotos: updatedAlbum });
    if (selectedPhotoDetail && selectedPhotoDetail.id === photoId) {
      setSelectedPhotoDetail({ ...selectedPhotoDetail, isFavorite: !selectedPhotoDetail.isFavorite });
    }
  };

  // Delete photo from album
  const handleDeletePhoto = (photoId: string) => {
    if (photos.length <= 1) {
      alert('Debes conservar al menos una foto en el álbum.');
      return;
    }
    if (!confirm('¿Deseas eliminar esta foto del álbum de crecimiento?')) return;

    sounds.playTap();
    const updatedAlbum = photos.filter((p) => p.id !== photoId);
    onUpdatePet({ ...pet, albumPhotos: updatedAlbum });
    setSelectedPhotoDetail(null);
  };

  // Share growth summary
  const handleShareSummary = async () => {
    sounds.playTap();
    const text = `📸 Álbum de Crecimiento de ${pet.name} (${pet.breed})\n` +
      `🐾 ${photos.length} fotos registradas | ${daysTogether} días juntos\n` +
      `🍼 De ${oldestPhoto.stage} (${oldestPhoto.weightKg ? oldestPhoto.weightKg + ' kg' : 'peque'}) a ${newestPhoto.stage} (${newestPhoto.weightKg ? newestPhoto.weightKg + ' kg' : 'pleno'})!\n` +
      `✨ Registrado en Mascotas Go`;

    const success = await copyToClipboard(text);
    if (success) {
      setShareFeedback('¡Resumen de crecimiento copiado al portapapeles!');
    } else {
      setShareFeedback('No se pudo copiar al portapapeles en este dispositivo.');
    }
    setTimeout(() => setShareFeedback(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-11 h-11 rounded-2xl overflow-hidden border-2 border-emerald-400/80 shadow-md shrink-0">
              <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover" />
              <div className="absolute -bottom-0.5 -right-0.5 bg-slate-950 text-xs px-1 rounded-tl-md">
                {pet.species === 'gato' ? '🐱' : '🐶'}
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-white truncate font-heading">{pet.name}</h3>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  {newestPhoto.stage}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Álbum de Crecimiento en la Vida Real · {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleShareSummary}
              className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
              title="Compartir álbum"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                sounds.playTap();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Growth Stats Strip */}
        <div className="bg-slate-950/60 border-b border-slate-800/80 px-3.5 py-2 flex items-center justify-between text-xs text-slate-300 shrink-0">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-white">{daysTogether}</span>
            <span className="text-slate-400 text-[11px]">días de seguimiento</span>
          </div>

          {newestPhoto.weightKg && (
            <div className="flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-white">{newestPhoto.weightKg} kg</span>
              {oldestPhoto.weightKg && oldestPhoto.weightKg !== newestPhoto.weightKg && (
                <span className="text-[10px] text-emerald-400 font-bold">
                  (+{(newestPhoto.weightKg - oldestPhoto.weightKg).toFixed(1)} kg)
                </span>
              )}
            </div>
          )}

          <button
            onClick={() => {
              sounds.playTap();
              setIsAddingPhoto(true);
            }}
            className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-[11px] flex items-center gap-1 shadow hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Foto</span>
          </button>
        </div>

        {/* Share feedback toast */}
        {shareFeedback && (
          <div className="bg-emerald-900/80 border-b border-emerald-500 text-emerald-200 text-xs px-3 py-1.5 text-center font-bold animate-fade-in shrink-0">
            {shareFeedback}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-3 pt-2 gap-1 shrink-0">
          <button
            onClick={() => {
              sounds.playTap();
              setActiveTab('timeline');
            }}
            className={`flex-1 pb-2 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border-b-2 ${
              activeTab === 'timeline'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Línea de Tiempo</span>
          </button>

          <button
            onClick={() => {
              sounds.playTap();
              setActiveTab('compare');
            }}
            className={`flex-1 pb-2 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border-b-2 ${
              activeTab === 'compare'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Antes y Después</span>
          </button>

          <button
            onClick={() => {
              sounds.playTap();
              setActiveTab('polaroid');
            }}
            className={`flex-1 pb-2 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border-b-2 ${
              activeTab === 'polaroid'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Polaroids</span>
          </button>
        </div>

        {/* Tab 1: Chronological Growth Timeline */}
        {activeTab === 'timeline' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Visual Stage Progress Curve */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Evolución de Crecimiento
              </span>
              <div className="flex items-center justify-between relative">
                <div className="absolute left-3 right-3 top-4 h-1 bg-slate-800 -z-0" />
                {STAGES.slice(0, 4).map((s) => {
                  const hasPhotoInStage = photos.some((p) => p.stage === s.stage);
                  const isCurrent = newestPhoto.stage === s.stage;

                  return (
                    <div key={s.stage} className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md border-2 transition-all ${
                          isCurrent
                            ? 'bg-emerald-500 border-white text-slate-950 ring-4 ring-emerald-500/30 scale-110'
                            : hasPhotoInStage
                            ? 'bg-slate-800 border-emerald-400 text-white'
                            : 'bg-slate-900 border-slate-700 text-slate-500 opacity-60'
                        }`}
                      >
                        {s.icon}
                      </div>
                      <span className={`text-[10px] font-bold mt-1 ${isCurrent ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {s.stage}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timeline Cards */}
            <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-emerald-400 before:via-teal-500 before:to-indigo-500">
              {sortedPhotos.map((photo, index) => {
                const isFirst = index === 0;
                const isLatest = index === sortedPhotos.length - 1;

                return (
                  <div key={photo.id} className="relative group">
                    {/* Node Dot */}
                    <div
                      className={`absolute -left-6 top-3 w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] ${
                        isLatest
                          ? 'bg-emerald-400 border-white animate-pulse'
                          : isFirst
                          ? 'bg-amber-400 border-white'
                          : 'bg-slate-700 border-slate-500'
                      }`}
                    />

                    {/* Photo Card */}
                    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg transition-all hover:border-emerald-500/60">
                      <div className="relative aspect-video w-full bg-slate-950">
                        <img
                          src={photo.photoUrl}
                          alt={photo.caption}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setSelectedPhotoDetail(photo)}
                        />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-black/70 backdrop-blur-md text-emerald-300 border border-emerald-400/50">
                            {photo.stage}
                          </span>
                          {photo.weightKg && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 backdrop-blur-md text-amber-300 border border-amber-400/50 flex items-center gap-1">
                              <Scale className="w-2.5 h-2.5" />
                              {photo.weightKg} kg
                            </span>
                          )}
                        </div>

                        {/* Favorite button */}
                        <button
                          onClick={() => handleToggleFavorite(photo.id)}
                          className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-transform active:scale-75 ${
                            photo.isFavorite
                              ? 'bg-rose-500/90 text-white'
                              : 'bg-black/50 text-slate-300 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${photo.isFavorite ? 'fill-white' : ''}`} />
                        </button>
                      </div>

                      {/* Info & Caption */}
                      <div className="p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>
                              {new Date(photo.date).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>

                          {photo.milestone && (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2 py-0.2 rounded-full">
                              ⭐ {photo.milestone}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-200 leading-relaxed font-medium">
                          {photo.caption}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Before & After Growth Comparison */}
        {activeTab === 'compare' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between space-y-4">
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 text-center">
              <h4 className="text-xs font-bold text-white font-heading">
                Comparativa de Crecimiento: {pet.name}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Arrastra el control deslizante para comparar el primer día vs la actualidad
              </p>
            </div>

            {/* Split Screen Slider */}
            <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl bg-black">
              {/* After Image (Newest / Current) */}
              <img
                src={newestPhoto.photoUrl}
                alt="Actualidad"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 bg-emerald-600/90 text-white font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                Hoy ({newestPhoto.stage})
              </div>

              {/* Before Image (Oldest / Day 1) clipped by slider */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderPos}%` }}
              >
                <img
                  src={oldestPhoto.photoUrl}
                  alt="Primer Día"
                  className="absolute inset-0 w-full h-full object-cover max-w-none"
                  style={{ width: '100%', height: '100%' }}
                />
                <div className="absolute top-3 left-3 bg-amber-600/90 text-white font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                  Día 1 ({oldestPhoto.stage})
                </div>
              </div>

              {/* Divider Line */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl z-20 pointer-events-none"
                style={{ left: `calc(${sliderPos}% - 2px)` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -left-3.5 w-8 h-8 rounded-full bg-white text-slate-900 font-bold flex items-center justify-center shadow-xl text-xs">
                  ⬌
                </div>
              </div>

              {/* Interactive Range Slider */}
              <input
                type="range"
                min="5"
                max="95"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
              />
            </div>

            {/* Side-by-side specs */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-2.5">
                <span className="text-[10px] text-amber-400 font-bold uppercase block">
                  🍼 Primer Registro
                </span>
                <span className="font-bold text-white block text-xs mt-0.5">
                  {new Date(oldestPhoto.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Etapa: <strong className="text-slate-200">{oldestPhoto.stage}</strong>
                  {oldestPhoto.weightKg && ` · ${oldestPhoto.weightKg} kg`}
                </span>
              </div>

              <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-2.5">
                <span className="text-[10px] text-emerald-400 font-bold uppercase block">
                  👑 Actualidad
                </span>
                <span className="font-bold text-white block text-xs mt-0.5">
                  {new Date(newestPhoto.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Etapa: <strong className="text-slate-200">{newestPhoto.stage}</strong>
                  {newestPhoto.weightKg && ` · ${newestPhoto.weightKg} kg`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Polaroid Gallery */}
        {activeTab === 'polaroid' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => {
                    sounds.playTap();
                    setSelectedPhotoDetail(photo);
                  }}
                  className="bg-white p-2 pb-3.5 rounded-lg shadow-xl cursor-pointer transition-transform hover:scale-103 active:scale-95 group text-slate-900 border border-slate-300"
                >
                  <div className="relative aspect-square w-full bg-slate-200 rounded-sm overflow-hidden mb-2">
                    <img
                      src={photo.photoUrl}
                      alt={photo.caption}
                      className="w-full h-full object-cover group-hover:contrast-105 transition-all"
                    />
                    {photo.isFavorite && (
                      <span className="absolute top-1.5 right-1.5 text-rose-500 text-xs">
                        ❤️
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black uppercase text-emerald-700 tracking-wider block">
                      {photo.stage}
                    </span>
                    <p className="text-[11px] font-semibold text-slate-800 line-clamp-2 leading-tight">
                      {photo.caption}
                    </p>
                    <span className="text-[9px] text-slate-500 block pt-0.5">
                      {new Date(photo.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Sheet for Adding New Photo */}
        {isAddingPhoto && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm max-h-[92vh] flex flex-col shadow-2xl overflow-y-auto">
              {/* Sheet Header */}
              <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Nueva Foto de Crecimiento</h4>
                    <span className="text-[10px] text-slate-400">Ver crecer a {pet.name} en la vida real</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddingPhoto(false)}
                  className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sheet Body */}
              <div className="p-4 space-y-3.5">
                {/* Photo Preview / Picker Area */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Fotografía de la Mascota
                  </label>
                  {newPhotoUrl ? (
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md">
                      <img src={newPhotoUrl} alt="Nueva" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setNewPhotoUrl('')}
                        className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1.5 hover:bg-black/90"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {/* Take Photo with Camera */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950 to-slate-900 border-2 border-dashed border-emerald-500/60 hover:border-emerald-400 flex flex-col items-center justify-center gap-1.5 text-center active:scale-95 transition-all"
                      >
                        <Camera className="w-6 h-6 text-emerald-400" />
                        <span className="text-xs font-bold text-white">Tomar Foto</span>
                        <span className="text-[9px] text-slate-400">Cámara del móvil</span>
                      </button>

                      {/* Upload from Gallery */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-4 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 hover:border-slate-500 flex flex-col items-center justify-center gap-1.5 text-center active:scale-95 transition-all"
                      >
                        <Upload className="w-6 h-6 text-slate-400" />
                        <span className="text-xs font-bold text-white">Subir Foto</span>
                        <span className="text-[9px] text-slate-400">De la galería</span>
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                {/* Stage Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                    Etapa de Crecimiento
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {STAGES.map((s) => (
                      <button
                        key={s.stage}
                        type="button"
                        onClick={() => {
                          sounds.playTap();
                          setNewStage(s.stage);
                        }}
                        className={`p-2 rounded-xl text-center border transition-all ${
                          newStage === s.stage
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md'
                            : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        <span className="text-base block">{s.icon}</span>
                        <span className="text-[10px] font-bold truncate block mt-0.5">{s.stage}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weight Input (optional) */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Peso Estimado (kg) <span className="text-slate-500 font-normal">opcional</span>
                  </label>
                  <div className="relative">
                    <Scale className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ej: 4.8"
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* Milestone Chips */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Hito o Logro Especial
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {SUGGESTED_MILESTONES.slice(0, 5).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          sounds.playTap();
                          setNewMilestone(m);
                        }}
                        className={`text-[10px] px-2 py-0.8 rounded-full border transition-all ${
                          newMilestone === m
                            ? 'bg-amber-400 text-slate-950 font-bold border-amber-300'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="O escribe un hito personalizado..."
                    value={newMilestone}
                    onChange={(e) => setNewMilestone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                {/* Caption / Note */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Recuerdo o Anécdota
                  </label>
                  <textarea
                    rows={2}
                    placeholder="¿Qué hizo hoy? ¿Cómo ha cambiado en la vida real?"
                    value={newCaption}
                    onChange={(e) => setNewCaption(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 resize-none"
                  />
                </div>

                {/* Save Button */}
                <button
                  type="button"
                  disabled={!newPhotoUrl}
                  onClick={handleSavePhoto}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 disabled:opacity-50 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Guardar en su Álbum (+75 XP)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Full Photo Detail Modal */}
        {selectedPhotoDetail && (
          <div className="fixed inset-0 z-70 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="relative aspect-square w-full bg-black">
                <img
                  src={selectedPhotoDetail.photoUrl}
                  alt={selectedPhotoDetail.caption}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedPhotoDetail(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-black/70 backdrop-blur-md text-emerald-300 border border-emerald-400/50">
                    {selectedPhotoDetail.stage}
                  </span>
                  {selectedPhotoDetail.weightKg && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-black/70 backdrop-blur-md text-amber-300 border border-amber-400/50">
                      ⚖️ {selectedPhotoDetail.weightKg} kg
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {new Date(selectedPhotoDetail.date).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <button
                    onClick={() => handleToggleFavorite(selectedPhotoDetail.id)}
                    className="flex items-center gap-1 text-rose-400 hover:text-rose-300"
                  >
                    <Heart
                      className={`w-4 h-4 ${selectedPhotoDetail.isFavorite ? 'fill-rose-500' : ''}`}
                    />
                    <span>{selectedPhotoDetail.isFavorite ? 'Favorita' : 'Marcar favorita'}</span>
                  </button>
                </div>

                {selectedPhotoDetail.milestone && (
                  <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-2.5 text-xs text-amber-300 font-bold flex items-center gap-2">
                    <Award className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>{selectedPhotoDetail.milestone}</span>
                  </div>
                )}

                <p className="text-xs text-slate-200 italic leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  "{selectedPhotoDetail.caption}"
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => handleDeletePhoto(selectedPhotoDetail.id)}
                    className="w-full py-2 text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar esta foto del álbum</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
