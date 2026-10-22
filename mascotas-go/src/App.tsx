/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  PetRecord,
  PlayerProfile,
  BadgeDefinition,
  LostPetRecord,
  PetStop,
  DailyQuest,
} from './types';
import {
  getAllPets,
  savePetToDB,
  deletePetFromDB,
  clearAllPetsDB,
  getPlayerProfile,
  savePlayerProfile,
  setCurrentStorageUser,
  DEFAULT_PROFILE,
  calculateLevelFromXP,
  evaluateBadges,
  generateStarterPets,
  BADGE_DEFINITIONS,
  generateLocalPetStops,
  advanceQuestProgress,
} from './services/storage';
import { sounds } from './services/sound';
import { HeaderHUD } from './components/HeaderHUD';
import { Navbar, ActiveTab } from './components/Navbar';
import { MapView } from './components/MapView';
import { CameraView } from './components/CameraView';
import { PetdexView } from './components/PetdexView';
import { LostPetsView } from './components/LostPetsView';
import { ProfileView } from './components/ProfileView';
import { PetCareModal } from './components/PetCareModal';
import { PetShowArenaModal } from './components/PetShowArenaModal';
import { WalkAndPetStopsModal } from './components/WalkAndPetStopsModal';
import { CostumeSaloonModal } from './components/CostumeSaloonModal';
import { HolographicCardModal } from './components/HolographicCardModal';
import { DailyQuestsModal } from './components/DailyQuestsModal';
import { PetAlbumModal } from './components/PetAlbumModal';
import { AuthProvider, useAuth } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [pets, setPets] = useState<PetRecord[]>([]);
  const [lostPets, setLostPets] = useState<LostPetRecord[]>([]);
  const [profile, setProfile] = useState<PlayerProfile>(DEFAULT_PROFILE);
  const [gpsActive, setGpsActive] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: 4.711,
    lng: -74.0721,
  });

  // Navigation & focus helper
  const [targetFocusLocation, setTargetFocusLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPetDetail, setSelectedPetDetail] = useState<PetRecord | null>(null);

  // Gamification notification modal
  const [unlockedNotification, setUnlockedNotification] = useState<{
    title: string;
    description: string;
    icon: string;
    xpGained?: number;
  } | null>(null);

  // Feature States (Default to Bogotá, Colombia)
  const [petStops, setPetStops] = useState<PetStop[]>(() => generateLocalPetStops(4.711, -74.0721));
  const [showPetCarePet, setShowPetCarePet] = useState<PetRecord | null>(null);
  const [showArenaPet, setShowArenaPet] = useState<PetRecord | null>(null);
  const [showCostumePet, setShowCostumePet] = useState<PetRecord | null>(null);
  const [showTcgPet, setShowTcgPet] = useState<PetRecord | null>(null);
  const [showAlbumPet, setShowAlbumPet] = useState<PetRecord | null>(null);
  const [showWalkModal, setShowWalkModal] = useState<boolean>(false);
  const [showQuestsModal, setShowQuestsModal] = useState<boolean>(false);

  // Badge alert ping
  const [hasNewBadgeAlert, setHasNewBadgeAlert] = useState<boolean>(false);

  const { user, getIdToken } = useAuth();
  const sessionGenRef = useRef<number>(0);

  // Load lost pets from backend or seed initial community data
  const loadLostPets = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      const token = await getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/lost-pets', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.lostPets && data.lostPets.length > 0) {
          setLostPets(data.lostPets);
          return;
        }
      }
      // If none, provide starter sample alerts near user location (Bogotá)
      const sampleLostPets: LostPetRecord[] = [
        {
          id: 'sample_lost_1',
          userId: 'system',
          petName: 'Rocky',
          species: 'perro',
          breed: 'Beagle',
          color: 'Tricolor (Blanco, Negro, Marrón)',
          photoUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80',
          description: 'Se asustó con unos truenos y escapó por el parque. Lleva collar rojo con cascabel. Es muy cariñoso.',
          contactName: 'Carlos M.',
          contactPhone: '+57 312 *** 789',
          reward: '$100',
          lastSeenLat: userCoords.lat + 0.001,
          lastSeenLng: userCoords.lng + 0.001,
          lastSeenAddress: 'Cerca del Parque Simón Bolívar, Bogotá',
          status: 'lost',
          createdAt: new Date().toISOString(),
          isProtected: true,
        },
        {
          id: 'sample_lost_2',
          userId: 'system',
          petName: 'Luna',
          species: 'gato',
          breed: 'Siamés',
          color: 'Crema con puntas oscuras y ojos celestes',
          photoUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80',
          description: 'Gatita muy curiosa. Responde a su nombre cuando le ofrecen comida húmeda. Por favor avisen si la ven.',
          contactName: 'Ana Lucía',
          contactPhone: '+57 310 *** 543',
          reward: '$150',
          lastSeenLat: userCoords.lat - 0.001,
          lastSeenLng: userCoords.lng - 0.001,
          lastSeenAddress: 'Carrera 7 con Calle 72, Chapinero',
          status: 'lost',
          createdAt: new Date().toISOString(),
          isProtected: true,
        },
      ];
      setLostPets(sampleLostPets);
    } catch (err) {
      console.warn('Error loading lost pets:', err);
    }
  }, [userCoords.lat, userCoords.lng, getIdToken]);

  useEffect(() => {
    loadLostPets();
  }, [loadLostPets, user]);

  // Handle reporting a new lost pet
  const handleReportLostPet = async (report: Omit<LostPetRecord, 'id' | 'userId' | 'status'>) => {
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Debes iniciar sesión con Google para reportar');
      }

      const res = await fetch('/api/lost-pets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(report),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Fallo al publicar reporte');
      }

      await loadLostPets();
    } catch (err: any) {
      console.error('Report lost pet error:', err);
      // Fallback local persistence so user is never blocked
      const localId = `local_lost_${Date.now()}`;
      const newLostRecord: LostPetRecord = {
        ...report,
        id: localId,
        userId: user ? user.uid : 'anon',
        status: 'lost',
        createdAt: new Date().toISOString(),
      };
      setLostPets((prev) => [newLostRecord, ...prev]);
    }
  };

  // Mark lost pet as found
  const handleMarkFound = async (id: string) => {
    try {
      const token = await getIdToken();
      if (token) {
        await fetch(`/api/lost-pets/${id}/found`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setLostPets((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'found' as const } : p))
      );
    } catch (err) {
      console.warn('Failed to mark found on backend:', err);
      setLostPets((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'found' as const } : p))
      );
    }
  };

  // Synchronize profile and pets isolated per authenticated user or guest
  useEffect(() => {
    const currentGen = ++sessionGenRef.current;
    const currentUid = user?.uid || null;

    // Immediately isolate storage namespace for current user or guest
    setCurrentStorageUser(currentUid);

    // Reset open modal detail references to avoid cross-session contamination
    setSelectedPetDetail(null);
    setShowPetCarePet(null);
    setShowArenaPet(null);
    setShowCostumePet(null);
    setShowTcgPet(null);
    setShowAlbumPet(null);
    setShowWalkModal(false);
    setShowQuestsModal(false);

    // Load active profile for this user namespace
    const loadedProfile = getPlayerProfile();
    setProfile(loadedProfile);
    sounds.setEnabled(loadedProfile.soundEnabled);

    async function loadUserPets() {
      try {
        const storedPets = await getAllPets();
        // Check for stale session race condition
        if (sessionGenRef.current !== currentGen) return;

        if (storedPets.length > 0) {
          setPets(storedPets);
        } else {
          // If guest, provide starters so map is immediately active
          if (!currentUid) {
            const starters = generateStarterPets(userCoords.lat, userCoords.lng);
            for (const starter of starters) {
              await savePetToDB(starter);
            }
            if (sessionGenRef.current !== currentGen) return;
            setPets(starters);
            const initialXP = starters.reduce((acc, p) => acc + p.xpReward, 0);
            const updatedProfile = {
              ...loadedProfile,
              xp: initialXP,
              unlockedBadgeIds: ['first_friend'],
            };
            setProfile(updatedProfile);
            savePlayerProfile(updatedProfile);
          } else {
            // Authenticated user starts with a clean, isolated collection
            setPets([]);
          }
        }
      } catch (err) {
        console.warn('Error loading isolated user pets:', err);
      }
    }

    loadUserPets();
  }, [user?.uid]);

  // Track geolocation
  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(coords);
          setGpsActive(true);
          setPetStops(generateLocalPetStops(coords.lat, coords.lng));
        },
        () => {
          setGpsActive(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Update profile wrapper
  const handleUpdateProfile = useCallback((newProfile: PlayerProfile) => {
    setProfile(newProfile);
    savePlayerProfile(newProfile);
  }, []);

  // Gain XP handler
  const handleGainXP = useCallback(
    (xpAmount: number) => {
      const prevLevel = calculateLevelFromXP(profile.xp).level;
      const nextXP = profile.xp + xpAmount;
      const { level: newLevel } = calculateLevelFromXP(nextXP);

      const updatedProfile = { ...profile, xp: nextXP, level: newLevel };
      handleUpdateProfile(updatedProfile);

      if (newLevel > prevLevel) {
        sounds.playLevelUp();
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
        setUnlockedNotification({
          title: `¡Subiste a Nivel ${newLevel}!`,
          description: `¡Felicidades Entrenador! Has acumulado ${nextXP} XP en Mascotas Go.`,
          icon: '👑',
          xpGained: xpAmount,
        });
      }
    },
    [profile, handleUpdateProfile]
  );

  // Update single pet
  const handleUpdatePet = useCallback(async (updatedPet: PetRecord) => {
    try {
      await savePetToDB(updatedPet);
      setPets((prev) => prev.map((p) => (p.id === updatedPet.id ? updatedPet : p)));
      setSelectedPetDetail((curr) => (curr?.id === updatedPet.id ? updatedPet : curr));
    } catch (err) {
      console.warn('Failed to update pet:', err);
    }
  }, []);

  // Set active buddy companion
  const handleSetAsActiveBuddy = useCallback(
    (petId: string) => {
      const updatedProfile = { ...profile, activeBuddyPetId: petId };
      handleUpdateProfile(updatedProfile);
      sounds.playCapture();
    },
    [profile, handleUpdateProfile]
  );

  // Pet hatched from egg
  const handlePetHatched = useCallback(
    async (newPet: PetRecord) => {
      try {
        await savePetToDB(newPet);
        setPets((prev) => [newPet, ...prev]);
        setUnlockedNotification({
          title: `¡Eclosionó ${newPet.name}! 🐣✨`,
          description: `Un nuevo compañero ${newPet.breed} se ha unido a tu Petdex.`,
          icon: newPet.species === 'perro' ? '🐶' : '🐱',
          xpGained: newPet.xpReward,
        });
      } catch (err) {
        console.warn('Failed to save hatched pet:', err);
      }
    },
    []
  );

  // Spin PetStop
  const handleSpinPetStop = useCallback((stopId: string) => {
    setPetStops((prev) =>
      prev.map((s) => (s.id === stopId ? { ...s, lastSpunTimestamp: Date.now() } : s))
    );
  }, []);

  // Handle new pet captured from camera
  const handlePetCaptured = async (newPet: PetRecord) => {
    try {
      // 1. Save to IndexedDB
      await savePetToDB(newPet);
      const updatedPets = [newPet, ...pets];
      setPets(updatedPets);

      // 2. Calculate new XP and level
      const prevLevel = calculateLevelFromXP(profile.xp).level;
      const nextXP = profile.xp + newPet.xpReward;
      const newLevel = calculateLevelFromXP(nextXP).level;

      // 3. Evaluate unlocked badges
      const newBadges = evaluateBadges(updatedPets, profile.unlockedBadgeIds);
      const newlyEarnedBadges = newBadges.filter(
        (b) => !profile.unlockedBadgeIds.includes(b)
      );

      const updatedProfile: PlayerProfile = {
        ...profile,
        xp: nextXP,
        level: newLevel,
        unlockedBadgeIds: newBadges,
      };

      handleUpdateProfile(updatedProfile);

      // 4. Trigger celebration
      if (newLevel > prevLevel) {
        // Level up!
        sounds.playLevelUp();
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
        });
        setUnlockedNotification({
          title: `¡Subiste a Nivel ${newLevel}!`,
          description: `¡Felicidades Entrenador! Has acumulado ${nextXP} XP en Mascotas Go.`,
          icon: '👑',
          xpGained: newPet.xpReward,
        });
      } else if (newlyEarnedBadges.length > 0) {
        // Unlocked a badge!
        setHasNewBadgeAlert(true);
        const badgeDef = BADGE_DEFINITIONS.find((b) => b.id === newlyEarnedBadges[0]);
        if (badgeDef) {
          sounds.playCapture();
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.5 } });
          setUnlockedNotification({
            title: `¡Nueva Insignia: ${badgeDef.name}!`,
            description: badgeDef.description,
            icon: badgeDef.icon,
            xpGained: newPet.xpReward,
          });
        }
      }

      // Switch to Petdex or Map to show the pet
      setActiveTab('petdex');
      setSelectedPetDetail(newPet);
    } catch (err) {
      console.error('Failed to save pet capture:', err);
    }
  };

  // Delete pet
  const handleDeletePet = async (id: string) => {
    try {
      await deletePetFromDB(id);
      setPets((prev) => prev.filter((p) => p.id !== id));
      if (selectedPetDetail?.id === id) {
        setSelectedPetDetail(null);
      }

      // If deleted pet was the active buddy companion, clean reference from profile
      if (profile.activeBuddyPetId === id) {
        const updatedProfile: PlayerProfile = { ...profile };
        delete updatedProfile.activeBuddyPetId;
        setProfile(updatedProfile);
        savePlayerProfile(updatedProfile);
      }

      // Sync backend if authenticated
      if (user) {
        try {
          const token = await getIdToken();
          if (token) {
            await fetch(`/api/pets/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        } catch (serverErr) {
          console.warn('Backend pet deletion sync error:', serverErr);
        }
      }
    } catch (err) {
      console.error('Failed to delete pet:', err);
      alert('No se pudo eliminar la mascota. Intenta nuevamente.');
      throw err;
    }
  };

  // Locate pet on 3D Map
  const handleLocateOnMap = (pet: PetRecord) => {
    setTargetFocusLocation({ lat: pet.lat, lng: pet.lng });
    setActiveTab('map');
  };

  // Export Petdex data to JSON
  const handleExportData = () => {
    const data = {
      userId: user?.uid || 'guest',
      userEmail: user?.email || null,
      profile,
      pets,
      exportedAt: new Date().toISOString(),
      app: 'Mascotas Go',
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const accountTag = user?.uid ? `user_${user.uid.substring(0, 8)}` : 'guest';
    a.download = `mascotas_go_respaldo_${accountTag}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Petdex data from JSON
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const raw = event.target?.result as string;
        const data = JSON.parse(raw);
        if (data.pets && Array.isArray(data.pets)) {
          for (const pet of data.pets) {
            await savePetToDB(pet);
          }
          setPets(await getAllPets());
        }
        if (data.profile) {
          handleUpdateProfile(data.profile);
        }
        alert('¡Datos de Petdex restaurados con éxito!');
      } catch {
        alert('Error al leer el archivo JSON de respaldo.');
      }
    };
    reader.readAsText(file);
  };

  // Seed demo data
  const handleSeedDemoData = async () => {
    const starters = generateStarterPets(userCoords.lat, userCoords.lng);
    for (const starter of starters) {
      await savePetToDB(starter);
    }
    const current = await getAllPets();
    setPets(current);
    alert('¡Mascotas de demostración añadidas en los alrededores!');
  };

  // Clear all data
  const handleClearAll = async () => {
    await clearAllPetsDB();
    setPets([]);
    const resetProfile = { ...DEFAULT_PROFILE };
    handleUpdateProfile(resetProfile);
    alert('Petdex reiniciada.');
  };

  return (
    <div className="relative w-full h-full bg-[#090D16] text-[#F9FAFB] overflow-hidden flex flex-col">
      {/* Top Header HUD (hidden in camera full-screen mode) */}
      {activeTab !== 'camera' && (
        <HeaderHUD
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          onOpenProfile={() => setActiveTab('profile')}
          onOpenSOS={() => setActiveTab('lost_pets')}
          onOpenQuests={() => setShowQuestsModal(true)}
          onOpenCare={() => {
            const companion = pets.find((p) => p.id === profile.activeBuddyPetId) || pets[0] || null;
            if (companion) setShowPetCarePet(companion);
            else alert('¡Primero captura una mascota para cuidarla!');
          }}
          gpsActive={gpsActive}
          petCount={pets.length}
          lostPetCount={lostPets.filter((p) => p.status === 'lost').length}
        />
      )}

      {/* Main View Area */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {activeTab === 'map' && (
          <MapView
            pets={pets}
            lostPets={lostPets}
            petStops={petStops}
            onSelectPet={(pet) => {
              setSelectedPetDetail(pet);
              setActiveTab('petdex');
            }}
            onSelectLostPet={(lostPet) => {
              setActiveTab('lost_pets');
            }}
            onOpenCapture={() => setActiveTab('camera')}
            onOpenWalkAndStops={() => setShowWalkModal(true)}
            onOpenArena={() => {
              const fighter = pets.find((p) => p.id === profile.activeBuddyPetId) || pets[0] || null;
              if (fighter) setShowArenaPet(fighter);
              else alert('¡Primero captura una mascota para competir en el Concurso de Gracia!');
            }}
            onOpenCare={() => {
              const companion = pets.find((p) => p.id === profile.activeBuddyPetId) || pets[0] || null;
              if (companion) setShowPetCarePet(companion);
              else alert('¡Primero captura una mascota para cuidarla!');
            }}
            onOpenQuests={() => setShowQuestsModal(true)}
            targetFocusLocation={targetFocusLocation}
            onClearFocusLocation={() => setTargetFocusLocation(null)}
            onGpsStatusChange={setGpsActive}
          />
        )}

        {activeTab === 'camera' && (
          <CameraView
            onPetCaptured={handlePetCaptured}
            userCoords={userCoords}
            onClose={() => setActiveTab('map')}
          />
        )}

        {activeTab === 'petdex' && (
          <PetdexView
            pets={pets}
            onDeletePet={handleDeletePet}
            onLocateOnMap={handleLocateOnMap}
            selectedPetDetail={selectedPetDetail}
            onClosePetDetail={() => setSelectedPetDetail(null)}
            onSelectPetForDetail={setSelectedPetDetail}
            onOpenCareModal={(pet) => setShowPetCarePet(pet)}
            onOpenArenaModal={(pet) => setShowArenaPet(pet)}
            onOpenCostumeModal={(pet) => setShowCostumePet(pet)}
            onOpenTcgModal={(pet) => setShowTcgPet(pet)}
            onOpenAlbumModal={(pet) => setShowAlbumPet(pet)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            activeBuddyPetId={profile.activeBuddyPetId}
            playerLevel={profile.level}
            playerXP={profile.xp}
          />
        )}

        {activeTab === 'lost_pets' && (
          <LostPetsView
            lostPets={lostPets}
            onReportLostPet={handleReportLostPet}
            onMarkFound={handleMarkFound}
            onLocateOnMap={(lat, lng) => {
              setTargetFocusLocation({ lat, lng });
              setActiveTab('map');
            }}
            userCoords={userCoords}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            pets={pets}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onSeedDemoData={handleSeedDemoData}
            onClearAll={handleClearAll}
          />
        )}
      </main>

      {/* Bottom Floating Mobile Navbar */}
      {activeTab !== 'camera' && (
        <Navbar
          activeTab={activeTab}
          onChangeTab={(tab) => {
            if (tab === 'profile') setHasNewBadgeAlert(false);
            setActiveTab(tab);
          }}
          badgeAlert={hasNewBadgeAlert}
          lostPetCount={lostPets.filter((p) => p.status === 'lost').length}
        />
      )}

      {/* Feature 1: Pet Care Modal */}
      {showPetCarePet && (
        <PetCareModal
          pet={showPetCarePet}
          allPets={pets}
          onSelectPet={setShowPetCarePet}
          onUpdatePet={handleUpdatePet}
          isActiveBuddy={profile.activeBuddyPetId === showPetCarePet.id}
          onSetAsActiveBuddy={handleSetAsActiveBuddy}
          onClose={() => setShowPetCarePet(null)}
          onGainXP={handleGainXP}
          onOpenAlbum={(pet) => setShowAlbumPet(pet)}
        />
      )}

      {/* Feature 2: Pet Show Arena Modal */}
      {showArenaPet && (
        <PetShowArenaModal
          playerPet={showArenaPet}
          allPets={pets}
          onSelectPet={setShowArenaPet}
          onUpdatePet={handleUpdatePet}
          onClose={() => setShowArenaPet(null)}
          onGainXP={handleGainXP}
        />
      )}

      {/* Feature 3: Walk and PetStops Modal */}
      {showWalkModal && (
        <WalkAndPetStopsModal
          userCoords={userCoords}
          petStops={petStops}
          activeBuddyPet={
            profile.activeBuddyPetId
              ? pets.find((p) => p.id === profile.activeBuddyPetId) || null
              : null
          }
          onSpinPetStop={handleSpinPetStop}
          onPetHatched={handlePetHatched}
          onClose={() => setShowWalkModal(false)}
          onGainXP={handleGainXP}
        />
      )}

      {/* Feature 4: Costume Saloon Modal */}
      {showCostumePet && (
        <CostumeSaloonModal
          pet={showCostumePet}
          allPets={pets}
          onSelectPet={setShowCostumePet}
          onUpdatePet={handleUpdatePet}
          onClose={() => setShowCostumePet(null)}
          onGainXP={handleGainXP}
        />
      )}

      {/* Feature 5: Holographic TCG Card Modal */}
      {showTcgPet && (
        <HolographicCardModal
          pet={showTcgPet}
          trainerName={profile.name}
          onClose={() => setShowTcgPet(null)}
        />
      )}

      {/* Feature 6: Real-Life Growth Photo Album Modal */}
      {showAlbumPet && (
        <PetAlbumModal
          pet={showAlbumPet}
          onClose={() => setShowAlbumPet(null)}
          onUpdatePet={(updatedPet) => {
            handleUpdatePet(updatedPet);
            setShowAlbumPet(updatedPet);
            if (selectedPetDetail?.id === updatedPet.id) {
              setSelectedPetDetail(updatedPet);
            }
          }}
          onGainedXP={(xp) => handleGainXP(xp)}
        />
      )}

      {/* Feature 7: Daily Quests Modal */}
      {showQuestsModal && (
        <DailyQuestsModal
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          onClose={() => setShowQuestsModal(false)}
          onGainXP={handleGainXP}
        />
      )}

      {/* Celebration Notification Modal (Level up or Badge earned) */}
      {unlockedNotification && (
        <div className="fixed inset-0 z-50 bg-[#090D16]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#111827] border border-[#F59E0B]/50 rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl shadow-black/80 relative">
            <div className="w-18 h-18 rounded-2xl bg-[#1A2234] border border-[#F59E0B]/40 text-4xl mx-auto flex items-center justify-center shadow-lg animate-bounce">
              {unlockedNotification.icon}
            </div>

            <h3 className="text-xl font-bold text-amber-300 font-heading mt-4">
              {unlockedNotification.title}
            </h3>

            <p className="text-xs text-[#9CA3AF] mt-2 leading-relaxed">
              {unlockedNotification.description}
            </p>

            {unlockedNotification.xpGained && (
              <div className="mt-3 inline-block px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-xs font-semibold text-emerald-400">
                +{unlockedNotification.xpGained} XP Ganados
              </div>
            )}

            <button
              onClick={() => {
                sounds.playTap();
                setUnlockedNotification(null);
              }}
              className="w-full mt-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-[#090D16] font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
            >
              ¡Genial, a seguir explorando!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
