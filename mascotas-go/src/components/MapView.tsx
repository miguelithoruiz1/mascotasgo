import React, { useState, useEffect, useRef, useCallback } from 'react';
import Map, { Marker, MapRef } from 'react-map-gl/maplibre';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

// Set worker URL so Vite serves the MapLibre GL web worker correctly
maplibregl.setWorkerUrl(maplibreWorkerUrl);
import {
  Compass,
  Crosshair,
  Radar,
  Layers,
  Eye,
  Sparkles,
  X,
  ShieldAlert,
  ChevronRight,
  Footprints,
  Swords,
  HeartHandshake,
} from 'lucide-react';
import { PetRecord, WildPetHint, LostPetRecord, PetStop } from '../types';
import { sounds } from '../services/sound';

interface MapViewProps {
  pets: PetRecord[];
  lostPets?: LostPetRecord[];
  petStops?: PetStop[];
  onSelectPet: (pet: PetRecord) => void;
  onSelectLostPet?: (pet: LostPetRecord) => void;
  onOpenCapture: () => void;
  onOpenWalkAndStops?: () => void;
  onOpenArena?: () => void;
  onOpenCare?: () => void;
  onOpenQuests?: () => void;
  targetFocusLocation?: { lat: number; lng: number } | null;
  onClearFocusLocation?: () => void;
  onGpsStatusChange?: (active: boolean) => void;
}

// OpenFreeMap tile styles (free, no API key required, includes 3D buildings)
const OPENFREEMAP_STYLES = {
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  bright: 'https://tiles.openfreemap.org/styles/bright',
};

export const MapView: React.FC<MapViewProps> = ({
  pets,
  lostPets = [],
  petStops = [],
  onSelectPet,
  onSelectLostPet,
  onOpenCapture,
  onOpenWalkAndStops,
  onOpenArena,
  onOpenCare,
  onOpenQuests,
  targetFocusLocation,
  onClearFocusLocation,
  onGpsStatusChange,
}) => {
  const mapRef = useRef<MapRef | null>(null);

  // Default coordinate: Bogotá, Colombia (Plaza de Bolívar / Parque Simón Bolívar)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 4.711,
    lng: -74.0721,
  });
  const [gpsActive, setGpsActive] = useState<boolean>(false);
  const [cameraHeading, setCameraHeading] = useState<number>(0);
  const [cameraTilt, setCameraTilt] = useState<number>(55); // 3D tilt by default!
  const [currentStyle, setCurrentStyle] = useState<'liberty' | 'bright'>('liberty');
  const [selectedPetPreview, setSelectedPetPreview] = useState<PetRecord | null>(null);
  const [selectedLostPreview, setSelectedLostPreview] = useState<LostPetRecord | null>(null);
  const [radarActive, setRadarActive] = useState<boolean>(false);
  const [wildHints, setWildHints] = useState<WildPetHint[]>([]);

  // Watch geolocation
  useEffect(() => {
    let watchId: number | null = null;
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(coords);
          setGpsActive(true);
          onGpsStatusChange?.(true);
        },
        (err) => {
          console.warn('Geolocation initial error:', err.message);
          setGpsActive(false);
          onGpsStatusChange?.(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(coords);
          setGpsActive(true);
          onGpsStatusChange?.(true);
          if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
            setCameraHeading(pos.coords.heading);
          }
        },
        () => {
          setGpsActive(false);
          onGpsStatusChange?.(false);
        },
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [onGpsStatusChange]);

  // Generate simulated nearby wild pet radar hints around user (Bogotá)
  useEffect(() => {
    const hints: WildPetHint[] = [
      {
        id: 'wild_1',
        species: 'gato',
        hintName: '¡Se escuchó un maullido curioso!',
        distanceMeters: 45,
        direction: 'al Noreste',
        lat: userLocation.lat + 0.0004,
        lng: userLocation.lng + 0.0003,
        rarity: 'Común',
      },
      {
        id: 'wild_2',
        species: 'perro',
        hintName: '¡Un perrito juguetón visto en la esquina!',
        distanceMeters: 85,
        direction: 'al Suroeste',
        lat: userLocation.lat - 0.0007,
        lng: userLocation.lng - 0.0005,
        rarity: 'Raro',
      },
      {
        id: 'wild_3',
        species: 'gato',
        hintName: '¡Aura felina misteriosa detectada!',
        distanceMeters: 130,
        direction: 'al Noroeste',
        lat: userLocation.lat + 0.001,
        lng: userLocation.lng - 0.0008,
        rarity: 'Épico',
      },
    ];
    setWildHints(hints);
  }, [userLocation]);

  // Handle focus on specific pet
  useEffect(() => {
    if (targetFocusLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [targetFocusLocation.lng, targetFocusLocation.lat],
        zoom: 17.5,
        pitch: cameraTilt,
        bearing: cameraHeading,
        duration: 900,
      });

      // Find which pet matches this location
      const matched = pets.find(
        (p) =>
          Math.abs(p.lat - targetFocusLocation.lat) < 0.0001 &&
          Math.abs(p.lng - targetFocusLocation.lng) < 0.0001
      );
      if (matched) {
        setSelectedPetPreview(matched);
      }
    }
  }, [targetFocusLocation, pets, cameraTilt, cameraHeading]);

  // Reset compass & 3D tilt
  const handleResetCompass = useCallback(() => {
    sounds.playTap();
    setCameraHeading(0);
    setCameraTilt(55);
    if (mapRef.current) {
      mapRef.current.easeTo({
        bearing: 0,
        pitch: 55,
        duration: 600,
      });
    }
  }, []);

  // Recenter on user GPS
  const handleRecenter = useCallback(() => {
    sounds.playTap();
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 17,
        pitch: cameraTilt,
        bearing: cameraHeading,
        duration: 900,
      });
    }
    onClearFocusLocation?.();
  }, [userLocation, cameraTilt, cameraHeading, onClearFocusLocation]);

  // Toggle 3D / 2D
  const toggleTilt = useCallback(() => {
    sounds.playTap();
    const nextTilt = cameraTilt > 10 ? 0 : 60;
    setCameraTilt(nextTilt);
    if (mapRef.current) {
      mapRef.current.easeTo({
        pitch: nextTilt,
        duration: 600,
      });
    }
  }, [cameraTilt]);

  // Toggle Radar scanner
  const toggleRadar = useCallback(() => {
    sounds.playRadarPing();
    setRadarActive((prev) => !prev);
  }, []);

  // Toggle map style (Liberty with 3D buildings vs Bright)
  const toggleStyle = useCallback(() => {
    sounds.playTap();
    setCurrentStyle((prev) => (prev === 'liberty' ? 'bright' : 'liberty'));
  }, []);

  // Calculate approximate distance in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
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

  return (
    <div className="relative w-full h-full bg-[#090D16] overflow-hidden select-none">
      {/* MapLibre GL Map with OpenFreeMap tiles (Liberty style with 3D buildings) */}
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        initialViewState={{
          longitude: userLocation.lng,
          latitude: userLocation.lat,
          zoom: 16.5,
          pitch: cameraTilt,
          bearing: cameraHeading,
        }}
        mapStyle={OPENFREEMAP_STYLES[currentStyle]}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        maxPitch={85}
        onPitch={(e) => setCameraTilt(Math.round(e.viewState.pitch))}
        onRotate={(e) => setCameraHeading(Math.round(e.viewState.bearing))}
        onError={(e) => console.warn('MapLibre notice/error:', e.error?.message || e)}
      >
        {/* User Player Trainer Marker */}
        <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
          <div className="relative flex items-center justify-center">
            {/* Pulsing Radar Ring */}
            <div className="absolute w-28 h-28 rounded-full border border-emerald-500/40 bg-emerald-500/10 animate-radar pointer-events-none" />
            <div className="absolute w-28 h-28 rounded-full border border-emerald-400/25 bg-emerald-400/5 animate-radar-delayed pointer-events-none" />

            {/* Direction Heading Indicator */}
            <div
              className="absolute -top-3.5 w-3.5 h-3.5 border-l-4 border-r-4 border-b-6 border-l-transparent border-r-transparent border-b-emerald-400 pointer-events-none transition-transform duration-300"
              style={{ transform: `rotate(${cameraHeading}deg)` }}
            />

            {/* Player Avatar Disc */}
            <div className="w-11 h-11 rounded-2xl bg-[#090D16] border-2 border-emerald-500 shadow-xl shadow-black/80 flex items-center justify-center animate-bob cursor-pointer">
              <span className="text-xl leading-none">🧑‍🌾</span>
            </div>
          </div>
        </Marker>

        {/* Wild Radar Animal Indications (Temporary hints) */}
        {radarActive &&
          wildHints.map((hint) => (
            <Marker key={hint.id} longitude={hint.lng} latitude={hint.lat} anchor="center">
              <div
                onClick={() => {
                  sounds.playTap();
                  onOpenCapture();
                }}
                className="group relative cursor-pointer flex flex-col items-center"
              >
                <div className="px-2 py-0.5 rounded-lg bg-[#090D16]/95 text-amber-300 border border-amber-500/40 text-[10px] font-bold shadow-md whitespace-nowrap mb-1 animate-pulse">
                  🐾 {hint.hintName}
                </div>
                <div className="w-9 h-9 rounded-2xl bg-[#111827] border-2 border-amber-400/80 shadow-lg flex items-center justify-center text-base hover:scale-110 active:scale-95 transition-transform">
                  <span>{hint.species === 'gato' ? '🐱' : '🐶'}</span>
                </div>
              </div>
            </Marker>
          ))}

        {/* Registered Pet Sightings (Paw Markers) */}
        {pets.map((pet) => {
          const isCat = pet.species === 'gato';
          const isLegendary = pet.rarity === 'Legendario';
          const isEpic = pet.rarity === 'Épico';
          const isRare = pet.rarity === 'Raro';

          const borderColor = isLegendary
            ? 'border-amber-400 ring-2 ring-amber-400/40'
            : isEpic
            ? 'border-purple-400 ring-1 ring-purple-400/40'
            : isRare
            ? 'border-teal-400'
            : 'border-emerald-500';

          return (
            <Marker key={pet.id} longitude={pet.lng} latitude={pet.lat} anchor="bottom">
              <div
                onClick={() => {
                  sounds.playTap();
                  setSelectedPetPreview(pet);
                  setSelectedLostPreview(null);
                }}
                className="relative group cursor-pointer flex flex-col items-center transition-transform hover:scale-115 active:scale-95"
              >
                {/* Photo or Icon Pin */}
                <div
                  className={`w-11 h-11 rounded-2xl bg-[#111827] ${borderColor} border-2 shadow-xl shadow-black/70 flex items-center justify-center overflow-hidden`}
                >
                  {pet.photoUrl ? (
                    <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#1A2234] flex items-center justify-center text-lg">
                      {isCat ? '🐱' : '🐶'}
                    </div>
                  )}
                </div>

                {/* Name Badge */}
                <div className="-mt-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-[#F9FAFB] bg-[#090D16]/95 border border-[#1F2937] shadow flex items-center gap-0.5">
                  <span>🐾</span>
                  <span className="truncate max-w-[55px]">{pet.name}</span>
                </div>
              </div>
            </Marker>
          );
        })}

        {/* SOS Community Lost Pet Markers */}
        {lostPets
          .filter((lostPet) => {
            const lat = Number(lostPet.lastSeenLat);
            const lng = Number(lostPet.lastSeenLng);
            return !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);
          })
          .map((lostPet) => {
          const isFound = lostPet.status === 'found';
          return (
            <Marker
              key={`lost_${lostPet.id}`}
              longitude={Number(lostPet.lastSeenLng)}
              latitude={Number(lostPet.lastSeenLat)}
              anchor="bottom"
            >
              <div
                onClick={() => {
                  sounds.playTap();
                  setSelectedLostPreview(lostPet);
                  setSelectedPetPreview(null);
                }}
                className="relative group cursor-pointer flex flex-col items-center transition-transform hover:scale-120 active:scale-95"
              >
                {/* Warning Beacon Ping */}
                {!isFound && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping pointer-events-none" />
                )}
                <div
                  className={`w-11 h-11 rounded-2xl bg-[#111827] shadow-2xl flex items-center justify-center overflow-hidden border-2 ${
                    isFound
                      ? 'border-emerald-400 ring-2 ring-emerald-500/40'
                      : 'border-rose-500 ring-2 ring-rose-500/60 animate-pulse'
                  }`}
                >
                  {lostPet.photoUrl ? (
                    <img
                      src={lostPet.photoUrl}
                      alt={lostPet.petName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-xl">{lostPet.species === 'perro' ? '🐶' : '🐱'}</div>
                  )}
                </div>
                <div
                  className={`-mt-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase text-white shadow flex items-center gap-0.5 ${
                    isFound ? 'bg-emerald-600' : 'bg-rose-600 animate-bounce'
                  }`}
                >
                  <span>{isFound ? '✅' : '🚨'}</span>
                  <span className="truncate max-w-[60px]">{lostPet.petName}</span>
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Feature: PetStops on Map */}
        {petStops.map((stop) => (
          <Marker
            key={`petstop_${stop.id}`}
            longitude={Number(stop.lng)}
            latitude={Number(stop.lat)}
            anchor="bottom"
          >
            <div
              onClick={() => {
                sounds.playTap();
                onOpenWalkAndStops?.();
              }}
              className="relative group cursor-pointer flex flex-col items-center transition-transform hover:scale-120 active:scale-95"
            >
              <span className="absolute -top-1 w-4 h-4 rounded-full bg-teal-400/40 animate-ping pointer-events-none" />
              <div className="w-10 h-10 rounded-2xl bg-[#090D16] border-2 border-teal-400 shadow-xl flex items-center justify-center">
                <span className="text-base">{stop.icon}</span>
              </div>
              <div className="-mt-1 px-1.5 py-0.5 rounded-md bg-[#111827] border border-teal-500/40 text-[9px] font-bold text-teal-300 shadow">
                <span className="truncate max-w-[65px]">{stop.name}</span>
              </div>
            </div>
          </Marker>
        ))}
      </Map>

      {/* Exploration Activity Shortcuts (Left Side) */}
      <div
        className="absolute left-2.5 sm:left-3 z-20 flex flex-col gap-1.5 pointer-events-auto"
        style={{ top: 'calc(68px + env(safe-area-inset-top, 0px))' }}
      >
        {onOpenWalkAndStops && (
          <button
            onClick={() => {
              sounds.playTap();
              onOpenWalkAndStops();
            }}
            className="h-10 px-2.5 rounded-xl bg-[#090D16]/90 backdrop-blur-md border border-[#1F2937] text-teal-300 hover:border-teal-500/50 shadow-xl flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-all touch-target"
            title="Abrir Modo Paseo, PetStops y Huevos"
            aria-label="Abrir modo paseo y paradas"
          >
            <Footprints className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="hidden xs:inline">Paseo & Stops</span>
            <span className="xs:hidden">Paseo</span>
          </button>
        )}

        {onOpenArena && (
          <button
            onClick={() => {
              sounds.playTap();
              onOpenArena();
            }}
            className="h-10 px-2.5 rounded-xl bg-[#090D16]/90 backdrop-blur-md border border-[#1F2937] text-indigo-300 hover:border-indigo-500/50 shadow-xl flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-all touch-target"
            title="Abrir Concurso de Gracia (Arena)"
            aria-label="Abrir arena de concurso de gracia"
          >
            <Swords className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Arena</span>
          </button>
        )}

        {onOpenCare && (
          <button
            onClick={() => {
              sounds.playTap();
              onOpenCare();
            }}
            className="h-10 px-2.5 rounded-xl bg-[#090D16]/90 backdrop-blur-md border border-[#1F2937] text-emerald-300 hover:border-emerald-500/50 shadow-xl flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-all touch-target"
            title="Cuidar y jugar con tu compañero"
            aria-label="Cuidar mascota compañera"
          >
            <HeartHandshake className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Cuidar</span>
          </button>
        )}
      </div>

      {/* Map Camera Controls (Right Side Vertical Cluster - Min 44px touch targets) */}
      <div
        className="absolute right-2 sm:right-3 z-20 flex flex-col gap-2 pointer-events-auto"
        style={{ top: 'calc(68px + env(safe-area-inset-top, 0px))' }}
      >
        {/* Compass / Reset 3D orientation */}
        <button
          onClick={handleResetCompass}
          className="w-11 h-11 rounded-xl bg-[#090D16]/90 backdrop-blur-md border border-[#1F2937] text-[#9CA3AF] hover:text-[#F9FAFB] shadow-xl flex items-center justify-center active:scale-95 transition-all touch-target"
          title="Restablecer norte y vista 3D"
          aria-label="Restablecer orientación al norte"
        >
          <Compass className="w-5 h-5 text-emerald-400" />
        </button>

        {/* Recenter on GPS */}
        <button
          onClick={handleRecenter}
          className={`w-11 h-11 rounded-xl bg-[#090D16]/90 backdrop-blur-md border border-[#1F2937] shadow-xl flex items-center justify-center active:scale-95 transition-all touch-target ${
            gpsActive ? 'text-emerald-400' : 'text-[#9CA3AF]'
          }`}
          title="Centrar en mi ubicación GPS"
          aria-label="Centrar mapa en mi ubicación"
        >
          <Crosshair className="w-5 h-5" />
        </button>

        {/* 3D / 2D Tilt Toggle */}
        <button
          onClick={toggleTilt}
          className="w-11 h-11 rounded-xl bg-[#090D16]/90 backdrop-blur-md border border-[#1F2937] shadow-xl flex items-center justify-center active:scale-95 transition-all touch-target"
          title={cameraTilt > 10 ? 'Cambiar a vista cenital 2D' : 'Activar vista 3D con edificios'}
          aria-label="Alternar vista 2D y 3D"
        >
          <span className="font-heading font-black text-xs text-amber-400">
            {cameraTilt > 10 ? '3D' : '2D'}
          </span>
        </button>

        {/* Radar Scanner Toggle */}
        <button
          onClick={toggleRadar}
          className={`w-11 h-11 rounded-xl backdrop-blur-md border shadow-xl flex items-center justify-center active:scale-95 transition-all touch-target ${
            radarActive
              ? 'bg-amber-950/40 border-amber-400 text-amber-300 ring-2 ring-amber-400/30'
              : 'bg-[#090D16]/90 border-[#1F2937] text-[#9CA3AF] hover:text-[#F9FAFB]'
          }`}
          title="Radar de huellas y peluditos cercanos"
          aria-label="Activar o desactivar radar de mascotas"
        >
          <Radar className="w-5 h-5" />
        </button>

        {/* Map Type Layers Toggle (OpenFreeMap Liberty 3D vs Bright) */}
        <button
          onClick={toggleStyle}
          className="w-11 h-11 rounded-xl bg-[#090D16]/90 backdrop-blur-md border border-[#1F2937] text-[#9CA3AF] hover:text-[#F9FAFB] shadow-xl flex items-center justify-center active:scale-95 transition-all touch-target"
          title="Alternar estilo de mapa (Liberty 3D / Bright)"
          aria-label="Cambiar estilo de mapa"
        >
          <Layers className="w-5 h-5 text-teal-400" />
        </button>
      </div>

      {/* Radar Overlay Drawer/Banner (Positioned safely without collision) */}
      {radarActive && (
        <div
          className="absolute left-2.5 right-2.5 sm:left-auto sm:right-16 z-25 pointer-events-auto max-w-sm sm:w-80 transition-all animate-fade-in"
          style={{ top: 'calc(200px + env(safe-area-inset-top, 0px))' }}
        >
          <div className="bg-[#111827]/96 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-3 shadow-2xl shadow-black/80 text-xs">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#1F2937]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 animate-spin-slow" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-amber-300 text-xs leading-none">
                    Radar Activo
                  </h4>
                  <span className="text-[10px] text-[#9CA3AF]">
                    {wildHints.length} rastros en Bogotá
                  </span>
                </div>
              </div>
              <button
                onClick={() => setRadarActive(false)}
                className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#1A2234] transition-colors"
                title="Cerrar radar"
                aria-label="Cerrar radar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {wildHints.length > 0 ? (
              <div className="mt-2 space-y-1.5">
                {wildHints.slice(0, 2).map((hint) => (
                  <button
                    key={hint.id}
                    onClick={() => {
                      sounds.playTap();
                      onOpenCapture();
                    }}
                    className="w-full text-left p-2 rounded-xl bg-[#1A2234] hover:bg-[#1F2937] border border-[#1F2937] flex items-center justify-between gap-2 transition-colors active:scale-98"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[#F9FAFB] truncate">
                        {hint.hintName}
                      </p>
                      <span className="text-[10px] text-amber-400">
                        {hint.distanceMeters}m {hint.direction}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#9CA3AF] shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[#9CA3AF] mt-2 text-center py-2">
                Sin actividad en este radio. Desplázate hacia un parque para encontrar nuevas
                mascotas.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modern Bottom Sheet: Pet Preview Card */}
      {selectedPetPreview && (
        <div
          className="absolute left-2.5 right-2.5 max-w-md mx-auto z-35 animate-fade-in pointer-events-auto"
          style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="bg-[#111827]/96 backdrop-blur-xl border border-[#1F2937] rounded-3xl p-3.5 shadow-2xl shadow-black/80 flex items-center gap-3">
            {/* Visual Drag Handle Pill */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-[#1F2937]" />

            {/* Thumbnail */}
            <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-[#1F2937] bg-[#1A2234] shadow-inner">
              {selectedPetPreview.photoUrl ? (
                <img
                  src={selectedPetPreview.photoUrl}
                  alt={selectedPetPreview.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">
                  {selectedPetPreview.species === 'gato' ? '🐱' : '🐶'}
                </div>
              )}
            </div>

            {/* Pet Info */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5 leading-none">
                <h3 className="font-heading font-bold text-sm text-[#F9FAFB] truncate">
                  {selectedPetPreview.name}
                </h3>
                <span className="text-[10px] font-semibold text-[#9CA3AF]">
                  · {selectedPetPreview.species === 'gato' ? 'Gato' : 'Perro'}
                </span>
              </div>

              <p className="text-xs text-[#9CA3AF] truncate mt-0.5">
                {selectedPetPreview.breed}
              </p>

              <div className="flex items-center gap-2 mt-1 text-[11px] text-[#9CA3AF]">
                <span className="font-medium text-amber-400">⭐ {selectedPetPreview.cuteScore}%</span>
                <span>·</span>
                <span>
                  {calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    selectedPetPreview.lat,
                    selectedPetPreview.lng
                  )}{' '}
                  m de ti
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={() => {
                  sounds.playTap();
                  onSelectPet(selectedPetPreview);
                  setSelectedPetPreview(null);
                }}
                className="h-9 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-[#090D16] font-bold text-xs shadow flex items-center justify-center gap-1 active:scale-95 transition-all"
                aria-label={`Ver ficha de ${selectedPetPreview.name}`}
              >
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span>Ver Ficha</span>
              </button>
              <button
                onClick={() => setSelectedPetPreview(null)}
                className="h-7 text-xs text-[#9CA3AF] hover:text-[#F9FAFB] flex items-center justify-center transition-colors"
                aria-label="Cerrar vista previa"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Bottom Sheet: SOS Lost Pet Preview Card */}
      {selectedLostPreview && (
        <div
          className="absolute left-2.5 right-2.5 max-w-md mx-auto z-35 animate-fade-in pointer-events-auto"
          style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="bg-[#111827]/96 backdrop-blur-xl border border-rose-500/50 rounded-3xl p-3.5 shadow-2xl shadow-black/80 flex items-center gap-3">
            {/* Visual Drag Handle Pill */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-rose-500/30" />

            {/* Thumbnail */}
            <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-rose-500/40 bg-[#1A2234] relative shadow-inner">
              {selectedLostPreview.photoUrl ? (
                <img
                  src={selectedLostPreview.photoUrl}
                  alt={selectedLostPreview.petName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">
                  {selectedLostPreview.species === 'gato' ? '🐱' : '🐶'}
                </div>
              )}
              <span className="absolute bottom-0 inset-x-0 bg-rose-600 text-white font-black text-[9px] text-center uppercase tracking-wider py-0.5">
                SOS
              </span>
            </div>

            {/* Lost Pet Info */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5 leading-none">
                <h3 className="font-heading font-bold text-sm text-[#F9FAFB] truncate">
                  {selectedLostPreview.petName}
                </h3>
                <span className="text-[10px] font-bold text-rose-400">
                  · {selectedLostPreview.status === 'found' ? 'Reencontrado' : 'Perdido'}
                </span>
              </div>

              <p className="text-xs text-[#9CA3AF] truncate mt-0.5">
                {selectedLostPreview.breed} · {selectedLostPreview.color}
              </p>

              <div className="flex items-center gap-2 mt-1 text-[11px] text-[#9CA3AF]">
                <span className="truncate max-w-[120px]">📍 {selectedLostPreview.lastSeenAddress}</span>
                <span>·</span>
                <span>
                  ~{calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    Number(selectedLostPreview.lastSeenLat),
                    Number(selectedLostPreview.lastSeenLng)
                  )}{' '}
                  m
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={() => {
                  sounds.playTap();
                  if (onSelectLostPet) {
                    onSelectLostPet(selectedLostPreview);
                  }
                  setSelectedLostPreview(null);
                }}
                className="h-9 px-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-[#090D16] font-bold text-xs shadow flex items-center justify-center gap-1 active:scale-95 transition-all"
                aria-label={`Ver reporte SOS de ${selectedLostPreview.petName}`}
              >
                <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-[#090D16]" />
                <span>Ver SOS</span>
              </button>
              <button
                onClick={() => setSelectedLostPreview(null)}
                className="h-7 text-xs text-[#9CA3AF] hover:text-[#F9FAFB] flex items-center justify-center transition-colors"
                aria-label="Cerrar vista previa"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
