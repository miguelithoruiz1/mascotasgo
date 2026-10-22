import React, { useState } from 'react';
import {
  AlertTriangle,
  PlusCircle,
  Phone,
  MapPin,
  Calendar,
  Share2,
  CheckCircle2,
  X,
  Search,
  Heart,
  Dog,
  Cat,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { LostPetRecord, PetSpecies } from '../types';
import { sounds } from '../services/sound';
import { useAuth } from '../context/AuthContext';

interface LostPetsViewProps {
  lostPets: LostPetRecord[];
  onReportLostPet: (report: Omit<LostPetRecord, 'id' | 'userId' | 'status'>) => Promise<void>;
  onMarkFound: (id: string) => Promise<void>;
  onLocateOnMap: (lat: number, lng: number) => void;
  userCoords: { lat: number; lng: number };
}

export const LostPetsView: React.FC<LostPetsViewProps> = ({
  lostPets,
  onReportLostPet,
  onMarkFound,
  onLocateOnMap,
  userCoords,
}) => {
  const { user, signInWithGoogle, getIdToken } = useAuth();
  const [filterSpecies, setFilterSpecies] = useState<'all' | 'perro' | 'gato'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [selectedLostPet, setSelectedLostPet] = useState<LostPetRecord | null>(null);

  // Form State
  const [petName, setPetName] = useState<string>('');
  const [species, setSpecies] = useState<PetSpecies>('perro');
  const [breed, setBreed] = useState<string>('');
  const [color, setColor] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [reward, setReward] = useState<string>('');
  const [lastSeenAddress, setLastSeenAddress] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Distance helper
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const filteredPets = lostPets.filter((pet) => {
    const matchesSpecies = filterSpecies === 'all' || pet.species === filterSpecies;
    const matchesSearch =
      pet.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.breed.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.lastSeenAddress.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSpecies && matchesSearch;
  });

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Debes iniciar sesión con Google para publicar un reporte de mascota perdida.');
      signInWithGoogle();
      return;
    }

    if (!petName.trim() || !contactPhone.trim() || !description.trim()) {
      alert('Por favor completa el nombre, teléfono de contacto y descripción.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onReportLostPet({
        petName: petName.trim(),
        species,
        breed: breed.trim() || (species === 'perro' ? 'Mestizo' : 'Común'),
        color: color.trim() || 'No especificado',
        description: description.trim(),
        contactName: contactName.trim() || user.displayName || 'Propietario',
        contactPhone: contactPhone.trim(),
        reward: reward.trim() || null,
        lastSeenLat: userCoords.lat,
        lastSeenLng: userCoords.lng,
        lastSeenAddress: lastSeenAddress.trim() || 'Cerca de mi ubicación GPS',
        photoUrl:
          species === 'perro'
            ? 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80'
            : 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80',
      });

      sounds.playCapture();
      setIsReportModalOpen(false);
      // Reset form
      setPetName('');
      setBreed('');
      setColor('');
      setDescription('');
      setContactPhone('');
      setReward('');
      setLastSeenAddress('');
      alert('¡Alerta de mascota perdida publicada con éxito en la red comunitaria!');
    } catch (err: any) {
      alert(`Error al publicar reporte: ${err.message || 'Inténtalo de nuevo'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full bg-slate-950 overflow-y-auto pt-[76px] pb-32 px-3 sm:px-4 text-slate-100">
      <div className="max-w-md mx-auto space-y-4">
        {/* Banner SOS Header */}
        <div className="bg-gradient-to-br from-rose-950/80 via-slate-900 to-amber-950/40 rounded-3xl p-4.5 border border-rose-500/50 shadow-2xl relative overflow-hidden">
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/50 text-[10px] font-black uppercase tracking-wider w-fit mb-2 animate-pulse">
                <ShieldAlert className="w-3 h-3 text-rose-400" />
                <span>Radar Comunitario SOS</span>
              </div>
              <h2 className="text-xl font-black text-white font-heading">
                Mascotas Perdidas
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xs leading-relaxed">
                Reporta a tu compañero extraviado o ayuda a otros entrenadores a reunirse con sus peluditos en tu vecindario.
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/50 flex items-center justify-center text-rose-400 shrink-0 shadow-lg">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
          </div>

          {/* Action to Report */}
          <div className="mt-4 pt-3 border-t border-rose-500/30 flex items-center justify-between">
            <span className="text-xs text-rose-200 font-semibold">
              ¿Perdiste a tu perro o gato?
            </span>
            <button
              onClick={() => {
                sounds.playTap();
                if (!user) {
                  alert('Inicia sesión con Google para publicar un reporte.');
                  signInWithGoogle();
                } else {
                  setIsReportModalOpen(true);
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Crear Reporte SOS</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, raza o zona..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 shadow-inner"
            />
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => {
                sounds.playTap();
                setFilterSpecies('all');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterSpecies === 'all'
                  ? 'bg-rose-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-300'
              }`}
            >
              Todos ({lostPets.length})
            </button>
            <button
              onClick={() => {
                sounds.playTap();
                setFilterSpecies('perro');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                filterSpecies === 'perro'
                  ? 'bg-rose-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-300'
              }`}
            >
              <Dog className="w-3.5 h-3.5" />
              <span>Perros</span>
            </button>
            <button
              onClick={() => {
                sounds.playTap();
                setFilterSpecies('gato');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                filterSpecies === 'gato'
                  ? 'bg-rose-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-300'
              }`}
            >
              <Cat className="w-3.5 h-3.5" />
              <span>Gatos</span>
            </button>
          </div>
        </div>

        {/* Lost Pets Cards List */}
        <div className="space-y-3">
          {filteredPets.length === 0 ? (
            <div className="bg-slate-900/60 rounded-3xl p-8 border border-slate-800 text-center flex flex-col items-center justify-center">
              <span className="text-4xl mb-2">🐾</span>
              <h3 className="text-sm font-bold text-white font-heading">
                No hay alertas activas con este filtro
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                Afortunadamente no hay mascotas reportadas perdidas en este momento o no coinciden con tu búsqueda.
              </p>
            </div>
          ) : (
            filteredPets.map((pet) => {
              const distance = calculateDistance(
                userCoords.lat,
                userCoords.lng,
                Number(pet.lastSeenLat),
                Number(pet.lastSeenLng)
              );
              const isFound = pet.status === 'found';

              return (
                <div
                  key={pet.id}
                  onClick={() => {
                    sounds.playTap();
                    setSelectedLostPet(pet);
                  }}
                  className={`bg-slate-900/90 rounded-2xl border p-3.5 shadow-xl transition-all cursor-pointer active:scale-98 ${
                    isFound
                      ? 'border-emerald-600/50 bg-emerald-950/20'
                      : 'border-rose-500/40 hover:border-rose-400'
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Pet Image / Avatar */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-700 bg-slate-800 relative">
                      {pet.photoUrl ? (
                        <img
                          src={pet.photoUrl}
                          alt={pet.petName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          {pet.species === 'perro' ? '🐶' : '🐱'}
                        </div>
                      )}

                      {/* Status Tag */}
                      <div
                        className={`absolute top-1 left-1 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase shadow ${
                          isFound
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-rose-500 text-white animate-pulse'
                        }`}
                      >
                        {isFound ? 'Reencontrado' : 'PERDIDO'}
                      </div>
                    </div>

                    {/* Pet Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-sm text-white font-heading truncate">
                            {pet.petName}
                          </h4>
                          {pet.reward && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950">
                              🏆 {pet.reward}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-rose-300 font-bold truncate">
                          {pet.breed} • {pet.color}
                        </p>

                        <p className="text-[11px] text-slate-300 line-clamp-2 mt-1 leading-snug">
                          {pet.description}
                        </p>
                      </div>

                      {/* Location & Distance */}
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                        <span className="truncate max-w-[150px] flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                          <span>{pet.lastSeenAddress}</span>
                        </span>
                        <span className="font-bold text-slate-300">a ~{distance} m</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal: Report Lost Pet */}
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
            <div className="bg-slate-900 border border-rose-500/50 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-4.5 shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-base text-white font-heading">
                    Reportar Mascota Extraviada
                  </h3>
                </div>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitReport} className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Nombre de la Mascota *
                  </label>
                  <input
                    type="text"
                    required
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    placeholder="Ej: Firulais, Mishi..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Especie *
                    </label>
                    <select
                      value={species}
                      onChange={(e) => setSpecies(e.target.value as PetSpecies)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-rose-400"
                    >
                      <option value="perro">🐶 Perro</option>
                      <option value="gato">🐱 Gato</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Raza
                    </label>
                    <input
                      type="text"
                      value={breed}
                      onChange={(e) => setBreed(e.target.value)}
                      placeholder="Ej: Golden, Siamés..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Color / Pelaje
                    </label>
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="Ej: Atigrado, Blanco con manchas..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Recompensa (Opcional)
                    </label>
                    <input
                      type="text"
                      value={reward}
                      onChange={(e) => setReward(e.target.value)}
                      placeholder="Ej: $200 o Gratitud"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Última Dirección / Zona Vista
                  </label>
                  <input
                    type="text"
                    value={lastSeenAddress}
                    onChange={(e) => setLastSeenAddress(e.target.value)}
                    placeholder="Ej: Carrera 7 con Calle 72, Parque Simón Bolívar"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+57 300 123 4567"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Tu Nombre
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Nombre de contacto"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Descripción y señas particulares *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Llevaba collar azul, responde a su nombre, es tímido..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-400 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>{isSubmitting ? 'Publicando...' : 'Publicar Alerta SOS en la Red'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Lost Pet Detail & Direct Action */}
        {selectedLostPet && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
            <div className="bg-slate-900 border border-rose-500/50 rounded-3xl w-full max-w-sm max-h-[92vh] overflow-y-auto p-4.5 shadow-2xl space-y-3.5">
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-700">
                {selectedLostPet.photoUrl ? (
                  <img
                    src={selectedLostPet.photoUrl}
                    alt={selectedLostPet.petName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    {selectedLostPet.species === 'perro' ? '🐶' : '🐱'}
                  </div>
                )}
                <button
                  onClick={() => setSelectedLostPet(null)}
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider shadow">
                  🚨 {selectedLostPet.status === 'found' ? '¡REENCONTRADO!' : 'ALERTA SOS ACTIVA'}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-white font-heading">
                    {selectedLostPet.petName}
                  </h3>
                  {selectedLostPet.reward && (
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-amber-400 text-slate-950">
                      🏆 Recompensa: {selectedLostPet.reward}
                    </span>
                  )}
                </div>
                <p className="text-xs text-rose-300 font-bold mt-0.5">
                  {selectedLostPet.species === 'perro' ? 'Perro' : 'Gato'} • {selectedLostPet.breed} • {selectedLostPet.color}
                </p>
              </div>

              {/* Description */}
              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <span className="font-bold text-slate-200 block mb-0.5">Detalles del extravío:</span>
                "{selectedLostPet.description}"
              </div>

              {/* Location */}
              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 text-xs space-y-1">
                <span className="font-bold text-slate-200 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>Última ubicación vista:</span>
                </span>
                <p className="text-slate-300 pl-4.5">{selectedLostPet.lastSeenAddress}</p>
              </div>

              {/* Contact Button & Direct Call */}
              <div className="space-y-2 pt-1">
                <a
                  href={selectedLostPet.contactPhone.includes('***') ? '#' : `tel:${selectedLostPet.contactPhone}`}
                  onClick={async (e) => {
                    sounds.playTap();
                    if (selectedLostPet.contactPhone.includes('***')) {
                      e.preventDefault();
                      if (!user) {
                        alert('Para proteger la privacidad de la comunidad, inicia sesión con Google para ver el teléfono verificado y llamar.');
                        signInWithGoogle();
                        return;
                      }
                      try {
                        const token = await getIdToken();
                        if (token) {
                          const res = await fetch(`/api/lost-pets/${selectedLostPet.id}/contact`, {
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          if (res.ok) {
                            const data = await res.json();
                            if (data.contactPhone) {
                              setSelectedLostPet((prev) =>
                                prev ? { ...prev, contactPhone: data.contactPhone } : null
                              );
                              window.location.href = `tel:${data.contactPhone}`;
                            }
                          } else {
                            alert('No se pudo obtener el teléfono de contacto.');
                          }
                        }
                      } catch (err) {
                        console.error('Error fetching contact:', err);
                      }
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                >
                  <Phone className="w-4 h-4 fill-current" />
                  <span>
                    {selectedLostPet.contactPhone.includes('***')
                      ? `Llamar a ${selectedLostPet.contactName} (${selectedLostPet.contactPhone})`
                      : `Llamar a ${selectedLostPet.contactName} (${selectedLostPet.contactPhone})`}
                  </span>
                </a>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      sounds.playTap();
                      onLocateOnMap(Number(selectedLostPet.lastSeenLat), Number(selectedLostPet.lastSeenLng));
                      setSelectedLostPet(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>Ver en Mapa 3D</span>
                  </button>

                  {user && selectedLostPet.status === 'lost' && (
                    <button
                      onClick={async () => {
                        sounds.playCapture();
                        await onMarkFound(selectedLostPet.id);
                        setSelectedLostPet(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1 active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Marcar Reencontrado</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
