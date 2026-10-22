import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  Sparkles,
  Share2,
  Trash2,
  X,
  ChevronRight,
  ChevronDown,
  Heart,
  Award,
  Camera,
  Zap,
  Volume2,
  ArrowUpDown,
  Check,
  RotateCcw,
  Compass,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { PetRecord, PetSpecies, PetRarity } from '../types';
import { sounds } from '../services/sound';
import { copyToClipboard } from '../services/clipboard';

export interface PetdexViewProps {
  pets: PetRecord[];
  onDeletePet: (id: string) => void | Promise<void>;
  onLocateOnMap: (pet: PetRecord) => void;
  selectedPetDetail: PetRecord | null;
  onClosePetDetail: () => void;
  onSelectPetForDetail: (pet: PetRecord) => void;
  onOpenCareModal?: (pet: PetRecord) => void;
  onOpenArenaModal?: (pet: PetRecord) => void;
  onOpenCostumeModal?: (pet: PetRecord) => void;
  onOpenTcgModal?: (pet: PetRecord) => void;
  onOpenAlbumModal?: (pet: PetRecord) => void;
  onNavigateToTab?: (tab: 'map' | 'camera' | 'petdex' | 'lost_pets' | 'profile') => void;
  activeBuddyPetId?: string;
  playerLevel?: number;
  playerXP?: number;
}

export const getRarityBadgeStyle = (rarity: PetRarity) => {
  switch (rarity) {
    case 'Legendario':
      return 'bg-gradient-to-r from-amber-500/20 to-yellow-500/30 text-amber-300 border-amber-400 ring-1 ring-amber-400/40 shadow-sm shadow-amber-500/30';
    case 'Épico':
      return 'bg-purple-500/20 text-purple-300 border-purple-400/80 shadow-sm shadow-purple-500/20';
    case 'Raro':
      return 'bg-sky-500/20 text-sky-300 border-sky-400/80 shadow-sm shadow-sky-500/20';
    default:
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/70';
  }
};

export const getRarityCardGlow = (rarity: PetRarity) => {
  switch (rarity) {
    case 'Legendario':
      return 'border-amber-400/50 shadow-lg shadow-amber-500/10 hover:border-amber-400';
    case 'Épico':
      return 'border-purple-500/40 shadow-lg shadow-purple-500/10 hover:border-purple-400';
    case 'Raro':
      return 'border-sky-500/30 hover:border-sky-400';
    default:
      return 'border-[#1F2937] hover:border-emerald-500/40';
  }
};

interface PetCardProps {
  pet: PetRecord;
  isBuddy: boolean;
  onSelect: (pet: PetRecord) => void;
}

export const PetCard: React.FC<PetCardProps> = React.memo(({ pet, isBuddy, onSelect }) => {
  const isCat = pet.species === 'gato';
  const petPhotosCount = pet.albumPhotos && pet.albumPhotos.length > 0 ? pet.albumPhotos.length : 1;
  const effectiveCP = pet.cp ?? Math.max(120, Math.round(pet.cuteScore * 10));

  return (
    <div
      onClick={() => {
        sounds.playTap();
        onSelect(pet);
      }}
      className={`bg-[#111827] rounded-2xl border overflow-hidden transition-all duration-200 active:scale-[0.98] cursor-pointer flex flex-col group relative ${getRarityCardGlow(
        pet.rarity
      )}`}
    >
      {/* Photo Container */}
      <div className="relative aspect-square w-full bg-[#1A2234] overflow-hidden">
        <img
          src={pet.photoUrl}
          alt={pet.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Gradient Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/90 via-transparent to-black/30 pointer-events-none" />

        {/* Top-Left: Species Badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 border border-white/10 shadow">
          <span>{isCat ? '🐱' : '🐶'}</span>
        </div>

        {/* Top-Right: Rarity Badge */}
        <div
          className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase border shadow backdrop-blur-md ${getRarityBadgeStyle(
            pet.rarity
          )}`}
        >
          {pet.rarity}
        </div>

        {/* Active Buddy Tag if selected as companion */}
        {isBuddy && (
          <div className="absolute top-8 left-2 px-1.5 py-0.5 rounded-md bg-rose-500/90 text-[8px] font-black uppercase text-white tracking-wider flex items-center gap-0.5 shadow">
            <Heart className="w-2.5 h-2.5 fill-white" />
            <span>Compañero</span>
          </div>
        )}

        {/* Bottom-Left: Real Growth Album Photos Count */}
        <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded-lg flex items-center gap-1 border border-emerald-500/40 shadow-sm">
          <Camera className="w-2.5 h-2.5 text-emerald-400" />
          <span>{petPhotosCount}</span>
        </div>

        {/* Bottom-Right: Combat Power / CP */}
        <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 border border-amber-400/30 shadow-sm">
          <Zap className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          <span>{effectiveCP}</span>
        </div>
      </div>

      {/* Pet Info Card Bottom */}
      <div className="p-2.5 flex flex-col flex-1 justify-between bg-[#111827]">
        <div>
          <h4 className="font-black text-xs text-[#F9FAFB] truncate leading-tight font-heading group-hover:text-emerald-400 transition-colors">
            {pet.name}
          </h4>
          <p className="text-[10px] text-[#9CA3AF] truncate mt-0.5 font-medium">
            {pet.breed}
          </p>
        </div>

        <div className="flex items-center justify-between text-[10px] text-[#9CA3AF] mt-2 pt-1.5 border-t border-[#1F2937]">
          <div className="flex items-center gap-1 truncate">
            <Heart className="w-2.5 h-2.5 text-rose-400 fill-rose-500/40" />
            <span className="font-semibold text-rose-300">{pet.cuteScore}%</span>
          </div>

          <div className="flex items-center gap-0.5 text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform">
            <span className="text-[9px]">Ficha</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
});
PetCard.displayName = 'PetCard';

type FilterOption = 'all' | 'perro' | 'gato' | 'rare';
type SortOption = 'recent' | 'cp' | 'cute' | 'name' | 'photos';

export const PetdexView: React.FC<PetdexViewProps> = ({
  pets,
  onDeletePet,
  onLocateOnMap,
  selectedPetDetail,
  onClosePetDetail,
  onSelectPetForDetail,
  onOpenCareModal,
  onOpenArenaModal,
  onOpenCostumeModal,
  onOpenTcgModal,
  onOpenAlbumModal,
  onNavigateToTab,
  activeBuddyPetId,
  playerLevel,
  playerXP,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentFilter, setCurrentFilter] = useState<FilterOption>('all');
  const [currentSort, setCurrentSort] = useState<SortOption>('recent');
  const [showSortDropdown, setShowSortDropdown] = useState<boolean>(false);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [petPendingDeletion, setPetPendingDeletion] = useState<PetRecord | null>(null);

  // Statistics calculation
  const total = pets.length;
  const cats = useMemo(() => pets.filter((p) => p.species === 'gato').length, [pets]);
  const dogs = useMemo(() => pets.filter((p) => p.species === 'perro').length, [pets]);
  const rareCount = useMemo(
    () =>
      pets.filter(
        (p) => p.rarity === 'Raro' || p.rarity === 'Épico' || p.rarity === 'Legendario'
      ).length,
    [pets]
  );

  // Goal of 30 unique species / discoveries for visual progress
  const targetGoal = 30;
  const progressPercent = Math.min(100, Math.round((total / targetGoal) * 100));

  // Filtered & Sorted pet list
  const filteredPets = useMemo(() => {
    const list = pets.filter((pet) => {
      // Search matching
      const matchesSearch =
        pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.breed.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pet.locationName && pet.locationName.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (currentFilter === 'perro') return pet.species === 'perro';
      if (currentFilter === 'gato') return pet.species === 'gato';
      if (currentFilter === 'rare')
        return pet.rarity === 'Raro' || pet.rarity === 'Épico' || pet.rarity === 'Legendario';

      return true;
    });

    // Sorting
    return list.sort((a, b) => {
      if (currentSort === 'recent') {
        return b.timestamp - a.timestamp;
      }
      if (currentSort === 'cp') {
        const cpA = a.cp ?? Math.round(a.cuteScore * 10);
        const cpB = b.cp ?? Math.round(b.cuteScore * 10);
        return cpB - cpA;
      }
      if (currentSort === 'cute') {
        return b.cuteScore - a.cuteScore;
      }
      if (currentSort === 'name') {
        return a.name.localeCompare(b.name, 'es');
      }
      if (currentSort === 'photos') {
        const photosA = a.albumPhotos?.length || 1;
        const photosB = b.albumPhotos?.length || 1;
        return photosB - photosA;
      }
      return 0;
    });
  }, [pets, searchTerm, currentFilter, currentSort]);

  const handleShareCard = async (pet: PetRecord) => {
    sounds.playTap();
    setShareError(null);
    const petPhotosCount = pet.albumPhotos?.length || 1;
    const shareText = `🐾 ¡Conoce a ${pet.name} (${pet.breed}) en mi Petdex de Mascotas Go!\n✨ Rareza: ${pet.rarity} | ⚡ CP: ${pet.cp || Math.round(pet.cuteScore * 10)} | 📸 Álbum: ${petPhotosCount} fotos reales.`;
    
    try {
      const copied = await copyToClipboard(shareText);
      if (copied) {
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2500);
      } else {
        setShareError('No se pudo copiar la ficha al portapapeles. Intenta nuevamente.');
        setTimeout(() => setShareError(null), 3000);
      }
    } catch (err) {
      console.error('Error sharing card:', err);
      setShareError('Ocurrió un error inesperado al copiar la ficha.');
      setTimeout(() => setShareError(null), 3000);
    }
  };

  const handlePetVoice = (species: PetSpecies) => {
    if (species === 'gato') {
      sounds.playPurr();
    } else {
      sounds.playCapture();
    }
  };

  const sortLabels: Record<SortOption, { label: string; icon: string }> = {
    recent: { label: 'Más recientes', icon: '🕒' },
    cp: { label: 'Mayor CP', icon: '⚡' },
    cute: { label: 'Más tiernos', icon: '💖' },
    name: { label: 'Nombre A-Z', icon: '🔤' },
    photos: { label: 'Álbum activo', icon: '📸' },
  };

  return (
    <div
      className="w-full h-full bg-[#090D16] overflow-y-auto px-3 sm:px-4 text-[#F9FAFB] select-none"
      style={{
        paddingTop: 'calc(max(0.5rem, env(safe-area-inset-top, 0px)) + 64px)',
        paddingBottom: 'calc(max(0.75rem, env(safe-area-inset-bottom, 0px)) + 84px)',
      }}
    >
      <div className="max-w-md mx-auto space-y-3.5 sm:space-y-4">
        {/* Header Title & Progress Dashboard */}
        <div className="bg-[#111827] rounded-3xl p-3.5 sm:p-4 border border-[#1F2937] shadow-xl shadow-black/40 relative overflow-hidden">
          {/* Subtle Ambient Light Glow */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Row: Title, Subtitle & Total Counter */}
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Enciclopedia de Fauna Urbana
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#F9FAFB] font-heading tracking-tight mt-0.5">
                Mi Petdex
              </h2>
            </div>

            <div className="bg-[#1A2234] border border-[#1F2937] rounded-2xl px-3 py-1.5 text-right shadow-inner">
              <span className="text-xl sm:text-2xl font-black text-amber-400 leading-none block">
                {total}
              </span>
              <span className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-wider block mt-0.5">
                Mascotas
              </span>
            </div>
          </div>

          {/* Discovery Progress Bar */}
          <div className="space-y-1.5 relative z-10">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#9CA3AF] font-medium flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                Progreso de Colección
              </span>
              <span className="text-emerald-400 font-black">
                {total}/{targetGoal} ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#090D16] rounded-full overflow-hidden border border-[#1F2937] p-0.5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-700 shadow-sm shadow-emerald-500/50"
                style={{ width: `${Math.max(4, progressPercent)}%` }}
              />
            </div>
          </div>

          {/* Species & Rarity Breakdown Quick Stats */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#1F2937] relative z-10">
            <div className="flex items-center gap-1.5 bg-[#1A2234]/80 rounded-xl px-2 py-1.5 border border-[#1F2937]">
              <span className="text-base sm:text-lg">🐶</span>
              <div className="min-w-0">
                <span className="text-xs font-black text-[#F9FAFB] block leading-tight">{dogs}</span>
                <span className="text-[9px] text-[#9CA3AF] truncate block">Perros</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-[#1A2234]/80 rounded-xl px-2 py-1.5 border border-[#1F2937]">
              <span className="text-base sm:text-lg">🐱</span>
              <div className="min-w-0">
                <span className="text-xs font-black text-[#F9FAFB] block leading-tight">{cats}</span>
                <span className="text-[9px] text-[#9CA3AF] truncate block">Gatos</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-[#1A2234]/80 rounded-xl px-2 py-1.5 border border-[#1F2937]">
              <span className="text-base sm:text-lg">✨</span>
              <div className="min-w-0">
                <span className="text-xs font-black text-amber-300 block leading-tight">{rareCount}</span>
                <span className="text-[9px] text-[#9CA3AF] truncate block">Raros+</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search, Filter Pills & Sort Bar */}
        <div className="space-y-2.5">
          {/* Search Input Row with Sort Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, raza o pelaje..."
                className="w-full bg-[#111827] border border-[#1F2937] rounded-2xl pl-10 pr-9 py-2.5 text-xs text-[#F9FAFB] placeholder-[#9CA3AF]/60 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 shadow-inner transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Toggle Button */}
            <div className="relative">
              <button
                onClick={() => {
                  sounds.playTap();
                  setShowSortDropdown(!showSortDropdown);
                }}
                className={`px-3 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 touch-target ${
                  showSortDropdown || currentSort !== 'recent'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                    : 'bg-[#111827] text-[#9CA3AF] border-[#1F2937] hover:text-[#F9FAFB]'
                }`}
                title="Ordenar colección"
                aria-label="Ordenar colección"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{sortLabels[currentSort].label}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Sort Dropdown Menu */}
              {showSortDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowSortDropdown(false)}
                  />
                  <div className="absolute right-0 top-12 z-40 bg-[#1A2234] border border-[#1F2937] rounded-2xl p-1.5 shadow-2xl shadow-black/80 w-44 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                    {(Object.keys(sortLabels) as SortOption[]).map((sortKey) => (
                      <button
                        key={sortKey}
                        onClick={() => {
                          sounds.playTap();
                          setCurrentSort(sortKey);
                          setShowSortDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          currentSort === sortKey
                            ? 'bg-emerald-500 text-[#090D16] font-bold'
                            : 'text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#111827]'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>{sortLabels[sortKey].icon}</span>
                          <span>{sortLabels[sortKey].label}</span>
                        </span>
                        {currentSort === sortKey && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Filter Pills with Counters */}
          <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  sounds.playTap();
                  setCurrentFilter('all');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 ${
                  currentFilter === 'all'
                    ? 'bg-emerald-500 text-[#090D16] shadow-md shadow-emerald-500/20'
                    : 'bg-[#111827] border border-[#1F2937] text-[#9CA3AF] hover:text-[#F9FAFB]'
                }`}
              >
                Todos ({total})
              </button>

              <button
                onClick={() => {
                  sounds.playTap();
                  setCurrentFilter('perro');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 active:scale-95 ${
                  currentFilter === 'perro'
                    ? 'bg-emerald-500 text-[#090D16] shadow-md shadow-emerald-500/20'
                    : 'bg-[#111827] border border-[#1F2937] text-[#9CA3AF] hover:text-[#F9FAFB]'
                }`}
              >
                <span>🐶</span>
                <span>Perros ({dogs})</span>
              </button>

              <button
                onClick={() => {
                  sounds.playTap();
                  setCurrentFilter('gato');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 active:scale-95 ${
                  currentFilter === 'gato'
                    ? 'bg-emerald-500 text-[#090D16] shadow-md shadow-emerald-500/20'
                    : 'bg-[#111827] border border-[#1F2937] text-[#9CA3AF] hover:text-[#F9FAFB]'
                }`}
              >
                <span>🐱</span>
                <span>Gatos ({cats})</span>
              </button>

              <button
                onClick={() => {
                  sounds.playTap();
                  setCurrentFilter('rare');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 active:scale-95 ${
                  currentFilter === 'rare'
                    ? 'bg-amber-400 text-[#090D16] shadow-md shadow-amber-400/20'
                    : 'bg-[#111827] border border-[#1F2937] text-[#9CA3AF] hover:text-[#F9FAFB]'
                }`}
              >
                <span>✨</span>
                <span>Raros ({rareCount})</span>
              </button>
            </div>

            {/* Quick Result Indicator */}
            <span className="text-[10px] text-[#9CA3AF] font-bold shrink-0 hidden sm:inline">
              {filteredPets.length} resultado{filteredPets.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Pet Cards Grid */}
        {filteredPets.length === 0 ? (
          /* Empty State */
          <div className="bg-[#111827]/70 rounded-3xl p-8 border border-[#1F2937] text-center flex flex-col items-center justify-center animate-in fade-in duration-200">
            {searchTerm || currentFilter !== 'all' ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-[#1A2234] border border-[#1F2937] flex items-center justify-center text-2xl mb-3 shadow-inner">
                  🔍
                </div>
                <h3 className="text-base font-bold text-[#F9FAFB] font-heading">
                  Sin coincidencias
                </h3>
                <p className="text-xs text-[#9CA3AF] mt-1.5 max-w-xs leading-relaxed">
                  No encontramos ninguna mascota que coincida con tus filtros de búsqueda actuales.
                </p>
                <button
                  onClick={() => {
                    sounds.playTap();
                    setSearchTerm('');
                    setCurrentFilter('all');
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#1A2234] hover:bg-[#1F2937] text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restablecer Filtros</span>
                </button>
              </>
            ) : (
              /* Global Zero Pets Empty State */
              <>
                <div className="relative mb-3">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/10">
                    🐾
                  </div>
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-[#111827] flex items-center justify-center text-[9px] text-[#090D16] font-black">
                    !
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-[#F9FAFB] font-heading">
                  ¡Tu Petdex está esperando!
                </h3>
                <p className="text-xs text-[#9CA3AF] mt-1.5 max-w-xs leading-relaxed">
                  Sal a explorar tu vecindario con la cámara de Mascotas Go. Fotografía perros y gatos reales para identificarlos con IA y añadirlos a tu colección.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 mt-5 w-full max-w-xs">
                  <button
                    onClick={() => {
                      sounds.playTap();
                      onNavigateToTab?.('camera');
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-[#090D16] font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Abrir Cámara</span>
                  </button>

                  <button
                    onClick={() => {
                      sounds.playTap();
                      onNavigateToTab?.('map');
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#1A2234] border border-[#1F2937] hover:border-slate-600 text-[#F9FAFB] font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>Explorar Mapa</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Pet Cards Grid */
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {filteredPets.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                isBuddy={activeBuddyPetId === pet.id}
                onSelect={onSelectPetForDetail}
              />
            ))}
          </div>
        )}

        {/* Modal: Detailed Inspection of Selected Pet */}
        {selectedPetDetail && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div
              className="bg-[#111827] border-t sm:border border-[#1F2937] rounded-t-3xl sm:rounded-3xl w-full max-w-sm max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col text-[#F9FAFB] relative"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
            >
              {/* Modal Photo Header */}
              <div className="relative aspect-video w-full bg-[#090D16] overflow-hidden shrink-0">
                <img
                  src={selectedPetDetail.photoUrl}
                  alt={selectedPetDetail.name}
                  className="w-full h-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-black/60 pointer-events-none" />

                {/* Close Button (44x44px touch target) */}
                <button
                  onClick={() => {
                    sounds.playTap();
                    onClosePetDetail();
                  }}
                  className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 active:scale-95 transition-all border border-white/20 shadow-lg"
                  aria-label="Cerrar detalle"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Sound / Voice Button */}
                <button
                  onClick={() => {
                    handlePetVoice(selectedPetDetail.species);
                  }}
                  className="absolute top-3 left-3 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 active:scale-95 transition-all border border-white/20 shadow-lg"
                  title="Escuchar sonido de la mascota"
                  aria-label="Escuchar mascota"
                >
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                </button>

                {/* Rarity & Companion Badge */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                  <div
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border backdrop-blur-md ${getRarityBadgeStyle(
                      selectedPetDetail.rarity
                    )}`}
                  >
                    ★ {selectedPetDetail.rarity}
                  </div>

                  {activeBuddyPetId === selectedPetDetail.id && (
                    <div className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/90 text-white border border-rose-400/50 shadow flex items-center gap-1">
                      <Heart className="w-2.5 h-2.5 fill-white" />
                      <span>Compañero Activo</span>
                    </div>
                  )}
                </div>

                {/* Growth Album Direct Shortcut Badge */}
                <button
                  onClick={() => {
                    sounds.playTap();
                    onOpenAlbumModal?.(selectedPetDetail);
                  }}
                  className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-black/80 backdrop-blur-md text-emerald-300 border border-emerald-400/60 shadow hover:bg-black/95 flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Álbum ({selectedPetDetail.albumPhotos?.length || 1})</span>
                </button>
              </div>

              {/* Modal Body Content */}
              <div className="p-4 space-y-3.5 flex-1">
                {/* Title, Breed & Species Badge */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-black text-[#F9FAFB] font-heading leading-tight">
                      {selectedPetDetail.name}
                    </h3>
                    <span className="text-xs text-emerald-400 font-bold block mt-0.5">
                      {selectedPetDetail.breed}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      selectedPetDetail.species === 'gato'
                        ? 'bg-amber-950/60 border-amber-700/60 text-amber-300'
                        : 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                    }`}
                  >
                    {selectedPetDetail.species === 'gato' ? '🐱 Gato' : '🐶 Perro'}
                  </span>
                </div>

                {/* 4 Essential Stats Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#1A2234] rounded-xl p-2.5 border border-[#1F2937]">
                    <span className="text-[10px] text-[#9CA3AF] block font-semibold">Pelaje / Color</span>
                    <span className="font-bold text-[#F9FAFB] truncate block mt-0.5">
                      {selectedPetDetail.color}
                    </span>
                  </div>

                  <div className="bg-[#1A2234] rounded-xl p-2.5 border border-[#1F2937]">
                    <span className="text-[10px] text-[#9CA3AF] block font-semibold">Temperamento</span>
                    <span className="font-bold text-[#F9FAFB] truncate block mt-0.5">
                      {selectedPetDetail.mood}
                    </span>
                  </div>

                  <div className="bg-[#1A2234] rounded-xl p-2.5 border border-[#1F2937]">
                    <span className="text-[10px] text-[#9CA3AF] block font-semibold">Ternura</span>
                    <span className="font-bold text-amber-400 flex items-center gap-1 mt-0.5">
                      ⭐ {selectedPetDetail.cuteScore}%
                    </span>
                  </div>

                  <div className="bg-[#1A2234] rounded-xl p-2.5 border border-[#1F2937]">
                    <span className="text-[10px] text-[#9CA3AF] block font-semibold">Poder de Batalla</span>
                    <span className="font-black text-emerald-400 flex items-center gap-1 mt-0.5">
                      ⚡ {selectedPetDetail.cp ?? Math.max(120, Math.round(selectedPetDetail.cuteScore * 10))} CP
                    </span>
                  </div>
                </div>

                {/* Description & Fun Fact Box */}
                <div className="bg-[#1A2234]/70 rounded-xl p-3 border border-[#1F2937] text-xs text-[#9CA3AF] italic leading-relaxed">
                  "{selectedPetDetail.description}"
                </div>

                {selectedPetDetail.funFact && (
                  <div className="bg-emerald-950/40 rounded-xl p-3 border border-emerald-800/50 text-xs text-emerald-300">
                    <span className="font-bold block mb-1 flex items-center gap-1">
                      <span>💡</span>
                      <span>Dato Curioso</span>
                    </span>
                    <p className="text-[11px] leading-relaxed text-emerald-200/90">
                      {selectedPetDetail.funFact}
                    </p>
                  </div>
                )}

                {/* Location & Capture Timestamp */}
                <div className="flex items-center justify-between text-[11px] text-[#9CA3AF] pt-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {new Date(selectedPetDetail.timestamp).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>
                      {selectedPetDetail.lat.toFixed(4)}, {selectedPetDetail.lng.toFixed(4)}
                    </span>
                  </div>
                </div>

                {/* Share Notification Toasts */}
                {shareSuccess && (
                  <div className="bg-emerald-900/80 border border-emerald-400 text-emerald-200 text-xs rounded-xl p-2 text-center animate-in fade-in duration-200 font-bold flex items-center justify-center gap-1.5 shadow-lg">
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>¡Ficha copiada al portapapeles para compartir!</span>
                  </div>
                )}
                {shareError && (
                  <div className="bg-rose-950/80 border border-rose-500/80 text-rose-200 text-xs rounded-xl p-2 text-center animate-in fade-in duration-200 font-bold flex items-center justify-center gap-1.5 shadow-lg">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{shareError}</span>
                  </div>
                )}

                {/* Activities & Ecosystem Hub */}
                <div className="pt-1 pb-1 space-y-2">
                  <span className="text-[10px] uppercase font-black text-[#9CA3AF] block tracking-wider">
                    Ecosistema y Actividades
                  </span>

                  {/* Growth Album (Vida Real) Hero Button */}
                  <button
                    onClick={() => {
                      sounds.playTap();
                      onOpenAlbumModal?.(selectedPetDetail);
                    }}
                    className="w-full p-2.5 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-950 to-[#1A2234] border border-emerald-500/60 hover:border-emerald-400 flex items-center justify-between active:scale-95 transition-all text-left shadow-lg group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-[#090D16] shadow shrink-0">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white">Álbum de Crecimiento</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                            Vida Real
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-300 truncate block">
                          Fotos reales, etapas de cachorro a adulto y antes/después
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400 font-bold text-[10px] shrink-0">
                      <span>{selectedPetDetail.albumPhotos?.length || 1} fotos</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>

                  {/* 4 Feature Action Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Feature 1: Pet Care */}
                    <button
                      onClick={() => {
                        sounds.playTap();
                        onOpenCareModal?.(selectedPetDetail);
                      }}
                      className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-950/80 to-[#1A2234] border border-emerald-500/50 hover:border-emerald-400 flex items-center gap-2 active:scale-95 transition-all text-left shadow"
                    >
                      <span className="text-xl">🎾</span>
                      <div>
                        <span className="text-xs font-bold text-emerald-300 block leading-tight">Cuidar & Jugar</span>
                        <span className="text-[9px] text-[#9CA3AF]">Alimentar / Mimos</span>
                      </div>
                    </button>

                    {/* Feature 2: Arena */}
                    <button
                      onClick={() => {
                        sounds.playTap();
                        onOpenArenaModal?.(selectedPetDetail);
                      }}
                      className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-950/80 to-[#1A2234] border border-indigo-500/50 hover:border-indigo-400 flex items-center gap-2 active:scale-95 transition-all text-left shadow"
                    >
                      <span className="text-xl">⚔️</span>
                      <div>
                        <span className="text-xs font-bold text-indigo-300 block leading-tight">Concurso</span>
                        <span className="text-[9px] text-[#9CA3AF]">Arena de Gracia</span>
                      </div>
                    </button>

                    {/* Feature 3: Costumes */}
                    <button
                      onClick={() => {
                        sounds.playTap();
                        onOpenCostumeModal?.(selectedPetDetail);
                      }}
                      className="p-2.5 rounded-xl bg-gradient-to-br from-purple-950/80 to-[#1A2234] border border-purple-500/50 hover:border-purple-400 flex items-center gap-2 active:scale-95 transition-all text-left shadow"
                    >
                      <span className="text-xl">🎩</span>
                      <div>
                        <span className="text-xs font-bold text-purple-300 block leading-tight">Disfraces</span>
                        <span className="text-[9px] text-[#9CA3AF]">Salón de Moda</span>
                      </div>
                    </button>

                    {/* Feature 4: Holographic TCG Card */}
                    <button
                      onClick={() => {
                        sounds.playTap();
                        onOpenTcgModal?.(selectedPetDetail);
                      }}
                      className="p-2.5 rounded-xl bg-gradient-to-br from-amber-950/80 to-[#1A2234] border border-amber-500/50 hover:border-amber-400 flex items-center gap-2 active:scale-95 transition-all text-left shadow"
                    >
                      <span className="text-xl">🎴</span>
                      <div>
                        <span className="text-xs font-bold text-amber-300 block leading-tight">Carta TCG</span>
                        <span className="text-[9px] text-[#9CA3AF]">Holo Coleccionable</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Modal Navigation & Action Buttons */}
                <div className="pt-1 space-y-2">
                  <div className="flex gap-2">
                    {/* Locate on 3D Map */}
                    <button
                      onClick={() => {
                        sounds.playTap();
                        onLocateOnMap(selectedPetDetail);
                        onClosePetDetail();
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-[#090D16] font-bold text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition-transform"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Ver en Mapa 3D</span>
                    </button>

                    {/* Share Button */}
                    <button
                      onClick={() => handleShareCard(selectedPetDetail)}
                      className="py-2.5 px-3 rounded-xl bg-[#1A2234] hover:bg-slate-700 text-[#F9FAFB] font-bold text-xs flex items-center justify-center gap-1 border border-[#1F2937] active:scale-95 transition-transform"
                      title="Compartir tarjeta"
                      aria-label="Compartir ficha de mascota"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                  </div>

                  {/* Safe Release / Delete Pet Trigger */}
                  <button
                    onClick={() => {
                      sounds.playTap();
                      setPetPendingDeletion(selectedPetDetail);
                    }}
                    className="w-full py-2 text-[11px] text-rose-400/80 hover:text-rose-300 font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Liberar mascota de la Petdex</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Safe Deletion (No accidental loss) */}
        {petPendingDeletion && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-[#111827] border border-[#1F2937] rounded-3xl p-5 w-full max-w-xs shadow-2xl space-y-3.5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center text-xl">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>

              <div>
                <h4 className="text-sm font-black text-[#F9FAFB] font-heading">
                  ¿Liberar a {petPendingDeletion.name}?
                </h4>
                <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
                  Esta acción eliminará el registro de la Petdex y todas las fotografías asociadas. Esta acción no se puede deshacer.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  disabled={isDeleting}
                  onClick={() => {
                    sounds.playTap();
                    setPetPendingDeletion(null);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#1A2234] border border-[#1F2937] text-xs font-bold text-[#F9FAFB] active:scale-95 transition-transform disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  disabled={isDeleting}
                  onClick={async () => {
                    sounds.playTap();
                    const petId = petPendingDeletion.id;
                    try {
                      setIsDeleting(true);
                      await onDeletePet(petId);
                      setPetPendingDeletion(null);
                      onClosePetDetail();
                    } catch (err) {
                      console.error('Error al liberar mascota:', err);
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold active:scale-95 transition-transform shadow-md shadow-rose-600/30 disabled:opacity-50"
                >
                  {isDeleting ? 'Liberando...' : 'Sí, liberar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
