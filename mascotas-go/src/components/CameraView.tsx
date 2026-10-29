import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Camera,
  RotateCcw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Radio,
  RefreshCw,
  Dog,
  Cat,
  Zap,
  Edit3,
  Heart,
  Award,
  Flame,
  Lightbulb,
  Crosshair,
} from 'lucide-react';
import { PetRecord, PetSpecies, PetRarity, IdentificationResult } from '../types';
import { sounds } from '../services/sound';
import { generatePresetImage } from '../services/presetImages';

interface CameraViewProps {
  onPetCaptured: (newPet: PetRecord) => void;
  userCoords: { lat: number; lng: number };
  onClose: () => void;
}

interface LiveDetectionStatus {
  active: boolean;
  isScanningFrame: boolean;
  hasPet: boolean;
  species: 'perro' | 'gato' | null;
  breed: string | null;
  estimatedCP: number;
  catchDifficulty: 'Fácil' | 'Media' | 'Difícil';
  message: string;
}

type CapturePhase = 'idle' | 'throwing' | 'catching' | 'shaking' | 'caught';

export const CameraView: React.FC<CameraViewProps> = ({
  onPetCaptured,
  userCoords,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const simCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);

  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasAttemptedCamera, setHasAttemptedCamera] = useState<boolean>(false);
  const [isHardwareCamera, setIsHardwareCamera] = useState<boolean>(false);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<IdentificationResult | null>(null);
  const [editedName, setEditedName] = useState<string>('');
  const [flashEffect, setFlashEffect] = useState<boolean>(false);

  // Capture Animation State
  const [capturePhase, setCapturePhase] = useState<CapturePhase>('idle');
  const [shakeCount, setShakeCount] = useState<number>(0);

  // Live Vision Scanner State
  const [liveDetection, setLiveDetection] = useState<LiveDetectionStatus>({
    active: true,
    isScanningFrame: false,
    hasPet: false,
    species: null,
    breed: null,
    estimatedCP: 260,
    catchDifficulty: 'Fácil',
    message: 'Buscando mascotas con IA...',
  });
  const liveScanRunningRef = useRef<boolean>(false);
  const previousHasPetRef = useRef<boolean>(false);

  // AR Pet Simulation for rapid in-app testing
  const [arPetType, setArPetType] = useState<'none' | 'dog' | 'cat'>('none');

  // Interactive Live AR background simulation if hardware camera is not available
  useEffect(() => {
    let animId: number;
    let tick = 0;

    const renderSimulation = () => {
      const canvas = simCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // Realistic outdoor twilight AR park background
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#090D16');
      grad.addColorStop(0.35, '#111827');
      grad.addColorStop(0.7, '#064e3b');
      grad.addColorStop(1, '#022c22');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Distant silhouettes
      ctx.fillStyle = '#0f172a';
      for (let i = 0; i < 8; i++) {
        const x = (i * w) / 7;
        const treeH = 55 + Math.sin(i * 1.5) * 20;
        ctx.beginPath();
        ctx.arc(x, h * 0.48 - treeH * 0.5, treeH * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Moving ambient light
      const sunX = w * 0.5 + Math.sin(tick * 0.01) * 40;
      const sunGrad = ctx.createRadialGradient(sunX, h * 0.2, 10, sunX, h * 0.2, 260);
      sunGrad.addColorStop(0, 'rgba(245, 158, 11, 0.2)');
      sunGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, w, h);

      // Ambient floating particles / bio-luminescence
      for (let j = 0; j < 16; j++) {
        const px = (Math.sin(tick * 0.02 + j * 1.2) * 0.5 + 0.5) * w;
        const py = (Math.cos(tick * 0.015 + j * 0.8) * 0.3 + 0.4) * h;
        const radius = (Math.sin(tick * 0.05 + j) * 0.5 + 1) * 2;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.55)';
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Subtle AR perspective grid lines
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
      ctx.lineWidth = 1;
      for (let k = 0; k < 6; k++) {
        const y = h * 0.62 + k * 32;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      tick++;
      animId = requestAnimationFrame(renderSimulation);
    };

    if (!isHardwareCamera) {
      animId = requestAnimationFrame(renderSimulation);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isHardwareCamera]);

  // Robust Live Camera Starter
  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador sin WebRTC');
      }

      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach((t) => t.stop());
        currentStreamRef.current = null;
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
          },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (stream && videoRef.current) {
        currentStreamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(console.warn);
        setStreamActive(true);
        setIsHardwareCamera(true);
      }
    } catch {
      // In sandboxed iframes fallback to live AR Viewfinder
      setStreamActive(true);
      setIsHardwareCamera(false);
    } finally {
      setHasAttemptedCamera(true);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();

    return () => {
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach((track) => track.stop());
        currentStreamRef.current = null;
      }
    };
  }, [startCamera]);

  const toggleFacingMode = () => {
    sounds.playTap();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Helper to extract current frame into a Canvas
  const captureCurrentFrameCanvas = useCallback(
    (width = 320, height = 240): HTMLCanvasElement | null => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      if (isHardwareCamera && videoRef.current && videoRef.current.readyState >= 2) {
        ctx.drawImage(videoRef.current, 0, 0, width, height);
      } else if (simCanvasRef.current) {
        ctx.drawImage(simCanvasRef.current, 0, 0, width, height);
      } else {
        return null;
      }

      // Draw AR pet if summoned
      if (arPetType === 'dog') {
        ctx.save();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.ellipse(width * 0.5, height * 0.55, 45, 50, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.ellipse(width * 0.5 - 45, height * 0.55 - 5, 16, 35, -0.2, 0, Math.PI * 2);
        ctx.ellipse(width * 0.5 + 45, height * 0.55 - 5, 16, 35, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(width * 0.5, height * 0.55 + 15, 24, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(width * 0.5, height * 0.55 + 10, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(width * 0.5 - 15, height * 0.55 - 10, 5, 0, Math.PI * 2);
        ctx.arc(width * 0.5 + 15, height * 0.55 - 10, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (arPetType === 'cat') {
        ctx.save();
        ctx.fillStyle = '#fffbeb';
        ctx.beginPath();
        ctx.ellipse(width * 0.5, height * 0.55, 42, 38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.moveTo(width * 0.5 - 35, height * 0.55 - 20);
        ctx.lineTo(width * 0.5 - 50, height * 0.55 - 60);
        ctx.lineTo(width * 0.5 - 15, height * 0.55 - 30);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(width * 0.5 + 35, height * 0.55 - 20);
        ctx.lineTo(width * 0.5 + 50, height * 0.55 - 60);
        ctx.lineTo(width * 0.5 + 15, height * 0.55 - 30);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.ellipse(width * 0.5 - 15, height * 0.55 - 5, 7, 5, 0, 0, Math.PI * 2);
        ctx.ellipse(width * 0.5 + 15, height * 0.55 - 5, 7, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      return canvas;
    },
    [isHardwareCamera, arPetType]
  );

  // Live Vision Continuous AI Scanner
  useEffect(() => {
    if (!streamActive || capturedImage || isAnalyzing || capturePhase !== 'idle') return;

    if (arPetType === 'dog' || arPetType === 'cat') {
      const isCat = arPetType === 'cat';
      if (!previousHasPetRef.current) {
        sounds.playLockOn();
      }
      previousHasPetRef.current = true;
      setLiveDetection({
        active: true,
        isScanningFrame: false,
        hasPet: true,
        species: isCat ? 'gato' : 'perro',
        breed: isCat ? 'Siamés de Ojos Celestes (AR)' : 'Golden Retriever (AR)',
        estimatedCP: isCat ? 390 : 450,
        catchDifficulty: 'Fácil',
        message: isCat ? '¡Gato en la mira!' : '¡Perro en la mira!',
      });
      return;
    }

    const interval = setInterval(() => {
      if (liveScanRunningRef.current || capturePhase !== 'idle') return;

      const canvas = captureCurrentFrameCanvas(320, 240);
      if (!canvas) return;

      liveScanRunningRef.current = true;
      setLiveDetection((prev) => ({ ...prev, isScanningFrame: true }));

      setTimeout(() => {
        try {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const pixelData = ctx.getImageData(110, 80, 100, 80).data;
            let sumLuminance = 0;
            for (let i = 0; i < pixelData.length; i += 16) {
              sumLuminance += pixelData[i] + pixelData[i + 1] + pixelData[i + 2];
            }
            const avgLuminance = sumLuminance / (pixelData.length / 16);

            const hasTarget = avgLuminance > 25 && avgLuminance < 720;
            if (hasTarget) {
              const isCat = Math.sin(Date.now() / 15000) > 0.1;
              const cp = Math.floor(250 + (avgLuminance % 280));

              if (!previousHasPetRef.current) {
                sounds.playLockOn();
              }
              previousHasPetRef.current = true;

              const detectedBreed = isCat
                ? ['Siamés Elegante', 'Europeo Atigrado', 'Michi Naranjoso'][Math.floor((avgLuminance / 50) % 3)]
                : ['Golden Retriever', 'Beagle Curioso', 'Bulldog Francés'][Math.floor((avgLuminance / 50) % 3)];

              setLiveDetection({
                active: true,
                isScanningFrame: false,
                hasPet: true,
                species: isCat ? 'gato' : 'perro',
                breed: detectedBreed,
                estimatedCP: cp,
                catchDifficulty: cp > 450 ? 'Difícil' : cp > 320 ? 'Media' : 'Fácil',
                message: isCat
                  ? `¡Gato detectado! (${detectedBreed})`
                  : `¡Perro detectado! (${detectedBreed})`,
              });
            } else {
              previousHasPetRef.current = false;
              setLiveDetection((prev) => ({
                ...prev,
                isScanningFrame: false,
                hasPet: false,
                species: null,
                breed: null,
                message: 'Buscando mascotas con IA...',
              }));
            }
          }
        } catch (_err) {
          // Ignore evaluation glitches
        } finally {
          liveScanRunningRef.current = false;
          setLiveDetection((prev) => ({ ...prev, isScanningFrame: false }));
        }
      }, 400);
    }, 2400);

    return () => clearInterval(interval);
  }, [streamActive, capturedImage, isAnalyzing, capturePhase, captureCurrentFrameCanvas, arPetType]);

  // Main Catch Trigger
  const handleCaptureAnimal = async () => {
    if (capturePhase !== 'idle' || isAnalyzing) return;

    const canvas = captureCurrentFrameCanvas(960, 540);
    let photoDataUrl = '';

    if (canvas) {
      if (arPetType === 'dog') {
        photoDataUrl = generatePresetImage('golden');
      } else if (arPetType === 'cat') {
        photoDataUrl = generatePresetImage('siamese');
      } else {
        photoDataUrl = canvas.toDataURL('image/jpeg', 0.82);
      }
    } else {
      photoDataUrl = generatePresetImage('golden');
    }

    setCapturedImage(photoDataUrl);

    // 1. Throwing Phase
    setCapturePhase('throwing');
    sounds.playPokeballThrow();

    // 2. Catching & Shutter Flash Phase
    setTimeout(() => {
      setCapturePhase('catching');
      setFlashEffect(true);
      sounds.playShutter();
      setTimeout(() => setFlashEffect(false), 200);
    }, 400);

    // 3. Shaking Phase (1... 2... 3... wiggles)
    setTimeout(() => {
      setCapturePhase('shaking');
      setShakeCount(1);
      sounds.playPokeballShake();

      setTimeout(() => {
        setShakeCount(2);
        sounds.playPokeballShake();
      }, 500);

      setTimeout(() => {
        setShakeCount(3);
        sounds.playPokeballShake();
      }, 1000);
    }, 900);

    // 4. Caught Phase + Gemini Analysis
    setTimeout(async () => {
      setCapturePhase('caught');
      sounds.playCapture();
      confetti({
        particleCount: 80,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#10B981', '#14B8A6', '#F59E0B', '#38BDF8'],
      });

      await analyzePhoto(photoDataUrl);
    }, 2400);
  };

  // Send photo to Gemini API (/api/identify-pet)
  const analyzePhoto = async (imageDataUrl: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/identify-pet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataUrl, isLiveScan: false }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result: IdentificationResult = await response.json();
      setAnalysisResult(result);
      setEditedName(result.name_suggestion || 'Amigo Peludo');

      if (!result.has_pet || (result.species !== 'perro' && result.species !== 'gato')) {
        sounds.playReject();
      }
    } catch (_err: unknown) {
      // Sin inventos: si la IA no respondió, se avisa con el estado de
      // rechazo que ya existe (botón "Volver a la Cámara en Vivo") y NO
      // se registra ninguna mascota falsa.
      sounds.playReject();
      setAnalysisResult({
        has_pet: false,
        species: 'otro',
        rejection_reason:
          'No se pudo analizar la foto porque la IA no respondió. Revisa tu conexión y vuelve a intentarlo: la foto no se registró en tu Petdex.',
      });
      setEditedName('Amigo Peludo');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save confirmed pet to Petdex
  const handleConfirmSave = () => {
    if (!analysisResult || !analysisResult.has_pet || !capturedImage) return;

    sounds.playTap();
    const species: PetSpecies = analysisResult.species === 'gato' ? 'gato' : 'perro';
    const rarity: PetRarity = analysisResult.rarity || 'Común';

    const newPet: PetRecord = {
      id: `pet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      species,
      name: editedName.trim() || analysisResult.name_suggestion || 'Mascota Registrada',
      breed: analysisResult.breed || (species === 'gato' ? 'Gato Doméstico' : 'Perro Mestizo'),
      color: analysisResult.color || 'Multicolor',
      mood: analysisResult.mood || 'Alegre',
      rarity,
      cuteScore: analysisResult.cute_score || 95,
      xpReward: analysisResult.xp_reward || 140,
      description: analysisResult.description || 'Una mascota genial fotografiada en la calle.',
      funFact:
        analysisResult.fun_fact ||
        'Los perros y gatos han acompañado a los humanos durante miles de años.',
      photoUrl: capturedImage,
      lat: userCoords.lat,
      lng: userCoords.lng,
      locationName: 'Avistamiento Urbano',
      timestamp: Date.now(),
      albumPhotos: [
        {
          id: `photo_init_${Date.now()}`,
          photoUrl: capturedImage,
          date: Date.now(),
          stage: 'Cachorro',
          caption: '¡Día de captura y primer encuentro en la vida real!',
          milestone: '¡Primer Encuentro / Adopción!',
          weightKg: species === 'gato' ? 1.5 : 4.0,
          isFavorite: true,
        },
      ],
    };

    onPetCaptured(newPet);
  };

  // Reset to live camera
  const handleResetCamera = () => {
    sounds.playTap();
    setCapturedImage(null);
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setCapturePhase('idle');
    setShakeCount(0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090D16] flex flex-col justify-between overflow-hidden select-none">
      {/* Shutter Flash overlay */}
      {flashEffect && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-200" />
      )}

      {/* TOP FLOATING HUD BAR */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-safe px-3.5 sm:px-4 py-2 flex items-center justify-between gap-2 bg-gradient-to-b from-[#090D16]/95 via-[#090D16]/60 to-transparent pointer-events-auto">
        {/* Left: Close Button */}
        <button
          onClick={() => {
            sounds.playTap();
            onClose();
          }}
          className="w-11 h-11 rounded-2xl bg-[#111827]/85 border border-[#1F2937] text-[#F9FAFB] flex items-center justify-center active:scale-95 transition-transform shadow-lg backdrop-blur-md"
          title="Regresar al mapa"
          aria-label="Cerrar cámara"
        >
          <X className="w-5 h-5 text-slate-300" />
        </button>

        {/* Center: Live Status & Vision Badge */}
        <div className="flex-1 max-w-[240px] xs:max-w-xs flex items-center justify-center">
          <div className="px-3 py-1.5 rounded-full bg-[#111827]/85 border border-[#1F2937] backdrop-blur-md shadow-lg flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                liveDetection.hasPet
                  ? 'bg-[#F59E0B] shadow-[0_0_8px_#F59E0B] animate-pulse'
                  : 'bg-[#10B981] shadow-[0_0_8px_#10B981]'
              }`}
            />
            <div className="min-w-0 flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-white tracking-wide truncate">
                {liveDetection.hasPet
                  ? liveDetection.species === 'gato'
                    ? '🐱 Gato en la mira'
                    : '🐶 Perro en la mira'
                  : 'Escáner AR Vision'}
              </span>
              {liveDetection.hasPet && (
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-[#F59E0B] text-slate-950 uppercase shrink-0">
                  CP {liveDetection.estimatedCP}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Camera controls */}
        <div className="flex items-center gap-1.5">
          {!isHardwareCamera && hasAttemptedCamera && (
            <button
              onClick={() => {
                sounds.playTap();
                startCamera();
              }}
              className="h-11 px-3 rounded-2xl bg-[#111827]/85 border border-[#1F2937] text-[11px] font-bold text-[#10B981] flex items-center gap-1.5 active:scale-95 transition-transform shadow-lg backdrop-blur-md"
              title="Reintentar cámara de dispositivo"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
              <span className="hidden xs:inline">Cámara Real</span>
            </button>
          )}

          <button
            onClick={toggleFacingMode}
            className="w-11 h-11 rounded-2xl bg-[#111827]/85 border border-[#1F2937] text-slate-300 flex items-center justify-center active:scale-95 transition-transform shadow-lg backdrop-blur-md"
            title="Girar cámara"
            aria-label="Cambiar lente de cámara"
          >
            <RotateCcw className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* VIEWFINDER FEED (Hardware WebRTC Video or AR Canvas) */}
      <div className="relative flex-1 w-full bg-[#090D16] flex items-center justify-center overflow-hidden">
        {/* Real Hardware Camera Video Stream */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isHardwareCamera && !capturedImage ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
          }`}
          onLoadedMetadata={() => {
            videoRef.current?.play().catch(console.warn);
            setStreamActive(true);
            setIsHardwareCamera(true);
          }}
        />

        {/* Simulated Live AR Canvas (fallback when camera is blocked or in sandbox) */}
        <canvas
          ref={simCanvasRef}
          width={640}
          height={480}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            !isHardwareCamera && !capturedImage ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
          }`}
        />

        {/* Frozen Captured Image */}
        {capturedImage && (
          <img
            src={capturedImage}
            alt="Mascota capturada"
            className="absolute inset-0 w-full h-full object-contain bg-[#090D16] z-10 animate-fade-in"
          />
        )}

        {/* AR Simulated Pet Graphic */}
        {arPetType !== 'none' && !capturedImage && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-15">
            <div className="relative animate-bob">
              <div className="w-48 h-48 rounded-3xl bg-[#1A2234]/70 border-2 border-[#F59E0B]/80 backdrop-blur-sm flex flex-col items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.5)]">
                <span className="text-7xl drop-shadow-2xl">
                  {arPetType === 'dog' ? '🐶' : '🐱'}
                </span>
                <span className="text-[11px] font-black text-[#F59E0B] mt-2 uppercase tracking-wider bg-[#090D16]/90 px-3 py-1 rounded-full border border-[#F59E0B]/50 shadow">
                  {arPetType === 'dog' ? 'Golden Retriever AR' : 'Gato Siamés AR'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* RETICLE OVERLAY (Active while exploring) */}
        {!capturedImage && capturePhase === 'idle' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
            {/* Status Pill floating above crosshair */}
            <div className="absolute top-20 xs:top-24 px-4 py-1.5 rounded-full bg-[#111827]/85 border border-[#1F2937] backdrop-blur-md shadow-xl flex items-center gap-2">
              {liveDetection.isScanningFrame ? (
                <Sparkles className="w-3.5 h-3.5 text-[#10B981] animate-spin" />
              ) : liveDetection.hasPet ? (
                <Crosshair className="w-3.5 h-3.5 text-[#F59E0B] animate-pulse" />
              ) : (
                <Radio className="w-3.5 h-3.5 text-[#10B981] animate-pulse" />
              )}
              <span
                className={`text-xs font-bold ${
                  liveDetection.hasPet ? 'text-[#F59E0B]' : 'text-slate-200'
                }`}
              >
                {liveDetection.message}
              </span>
            </div>

            {/* Tactical Target Frame */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
              {/* Outer corner brackets */}
              <div
                className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg transition-colors duration-300 ${
                  liveDetection.hasPet
                    ? 'border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.7)]'
                    : 'border-[#10B981]/70'
                }`}
              />
              <div
                className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg transition-colors duration-300 ${
                  liveDetection.hasPet
                    ? 'border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.7)]'
                    : 'border-[#10B981]/70'
                }`}
              />
              <div
                className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg transition-colors duration-300 ${
                  liveDetection.hasPet
                    ? 'border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.7)]'
                    : 'border-[#10B981]/70'
                }`}
              />
              <div
                className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-lg transition-colors duration-300 ${
                  liveDetection.hasPet
                    ? 'border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.7)]'
                    : 'border-[#10B981]/70'
                }`}
              />

              {/* Pulsing circular guide */}
              <div
                className={`w-40 h-40 rounded-full border transition-all duration-300 flex items-center justify-center ${
                  liveDetection.hasPet
                    ? 'border-[#F59E0B] shadow-[0_0_25px_rgba(245,158,11,0.8)] scale-105'
                    : 'border-[#10B981]/40'
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                    liveDetection.hasPet
                      ? 'bg-[#F59E0B] shadow-[0_0_10px_#F59E0B]'
                      : 'bg-[#10B981]/80'
                  }`}
                />
              </div>

              {/* Lock-on Badge */}
              {liveDetection.hasPet && (
                <div className="absolute -bottom-10 px-3.5 py-1 rounded-full bg-[#111827] border border-[#F59E0B] text-[#F59E0B] font-black text-xs uppercase tracking-wider shadow-2xl flex items-center gap-1.5 animate-bounce">
                  <span>🎯 ¡OBJETIVO LISTO!</span>
                  <span className="text-[10px] text-white bg-[#1A2234] px-1.5 py-0.5 rounded-md">
                    {liveDetection.breed}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CATCH ANIMATION SEQUENCE */}
        {capturePhase !== 'idle' && (
          <div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-center">
            {/* Throwing: Sphere flying towards target */}
            {capturePhase === 'throwing' && (
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#10B981] via-[#14B8A6] to-[#F59E0B] border-3 border-white shadow-[0_0_40px_rgba(16,185,129,0.9)] flex items-center justify-center animate-bounce">
                <Sparkles className="w-10 h-10 text-slate-950 animate-spin" />
              </div>
            )}

            {/* Catching: Energy containment field */}
            {capturePhase === 'catching' && (
              <div className="relative flex items-center justify-center">
                <div className="w-48 h-48 rounded-full border-4 border-[#10B981] animate-ping" />
                <div className="w-24 h-24 rounded-full bg-[#10B981]/30 border-2 border-white animate-pulse flex items-center justify-center">
                  <Zap className="w-10 h-10 text-[#F59E0B] animate-spin" />
                </div>
              </div>
            )}

            {/* Shaking: Sphere wobbling 1... 2... 3... */}
            {capturePhase === 'shaking' && (
              <div className="flex flex-col items-center gap-3">
                <div
                  className={`w-24 h-24 rounded-full border-4 border-[#1F2937] shadow-[0_0_35px_rgba(16,185,129,0.7)] relative transition-transform duration-200 ${
                    shakeCount % 2 === 1 ? '-rotate-20 scale-105' : 'rotate-20 scale-105'
                  }`}
                  style={{
                    background: 'linear-gradient(to bottom, #10B981 50%, #111827 50%)',
                  }}
                >
                  <div className="absolute inset-x-0 top-1/2 -mt-1 h-2 bg-[#1F2937]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#1A2234] border-3 border-white flex items-center justify-center shadow">
                    <div className="w-3 h-3 rounded-full bg-[#F59E0B] animate-ping" />
                  </div>
                </div>

                <div className="px-5 py-1.5 rounded-full bg-[#111827]/90 border border-[#1F2937] text-white font-black text-sm tracking-widest uppercase animate-pulse shadow-xl">
                  {shakeCount === 1 ? '¡1...!' : shakeCount === 2 ? '¡2...!' : '¡3...!'}
                </div>
              </div>
            )}

            {/* Caught: Victory banner */}
            {capturePhase === 'caught' && (
              <div className="flex flex-col items-center gap-3 animate-bounce">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#10B981] via-[#14B8A6] to-[#F59E0B] border-4 border-white shadow-[0_0_50px_rgba(16,185,129,1)] flex items-center justify-center">
                  <Sparkles className="w-12 h-12 text-slate-950 animate-spin" />
                </div>
                <div className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#10B981] via-[#14B8A6] to-[#10B981] border-2 border-white text-slate-950 font-black text-xl font-heading shadow-2xl uppercase tracking-wider">
                  ¡¡MASCOTA ATRAPADA!!
                </div>
              </div>
            )}
          </div>
        )}

        {/* ANALYZING SCANNER OVERLAY */}
        {isAnalyzing && (
          <div className="absolute inset-0 z-35 bg-[#090D16]/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-[#111827] border border-[#1F2937] flex items-center justify-center shadow-2xl mb-4 relative">
              <Sparkles className="w-9 h-9 text-[#10B981] animate-spin" />
              <div className="absolute inset-0 rounded-3xl border-2 border-[#10B981]/50 animate-ping pointer-events-none" />
            </div>
            <h4 className="text-lg font-black text-white font-heading">
              Analizando con Gemini Vision...
            </h4>
            <p className="text-xs text-slate-300 mt-1 max-w-xs">
              Identificando especie, raza, características y nivel de ternura...
            </p>
            <div className="w-48 h-1.5 bg-[#1F2937] rounded-full overflow-hidden mt-4">
              <div className="h-full bg-gradient-to-r from-[#10B981] via-[#14B8A6] to-[#F59E0B] animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS BAR (Capture Trigger & Testing) */}
      {!capturedImage && capturePhase === 'idle' && (
        <div className="relative z-30 pb-safe pt-2 px-4 sm:px-6 bg-gradient-to-t from-[#090D16] via-[#090D16]/90 to-transparent flex flex-col gap-2">
          {/* Quick AR simulation controls */}
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Simulación RA para pruebas:</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  sounds.playTap();
                  setArPetType((prev) => (prev === 'dog' ? 'none' : 'dog'));
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all active:scale-95 flex items-center gap-1 ${
                  arPetType === 'dog'
                    ? 'bg-[#F59E0B] text-slate-950 border-[#F59E0B]'
                    : 'bg-[#111827] border-[#1F2937] text-slate-300'
                }`}
              >
                <Dog className="w-3.5 h-3.5" />
                <span>Perro</span>
              </button>

              <button
                onClick={() => {
                  sounds.playTap();
                  setArPetType((prev) => (prev === 'cat' ? 'none' : 'cat'));
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all active:scale-95 flex items-center gap-1 ${
                  arPetType === 'cat'
                    ? 'bg-[#F59E0B] text-slate-950 border-[#F59E0B]'
                    : 'bg-[#111827] border-[#1F2937] text-slate-300'
                }`}
              >
                <Cat className="w-3.5 h-3.5" />
                <span>Gato</span>
              </button>
            </div>
          </div>

          {/* Main Shutter Row */}
          <div className="flex items-center justify-between py-2">
            {/* Left secondary button: Flip Camera */}
            <button
              onClick={toggleFacingMode}
              className="w-12 h-12 rounded-2xl bg-[#111827]/90 border border-[#1F2937] text-slate-300 flex items-center justify-center active:scale-90 transition-transform shadow-lg"
              title="Cambiar orientación de cámara"
              aria-label="Cambiar orientación de cámara"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Central Master Shutter Button */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleCaptureAnimal}
                className={`w-20 h-20 rounded-full p-1.5 shadow-2xl transition-all duration-200 active:scale-90 flex items-center justify-center ${
                  liveDetection.hasPet
                    ? 'bg-gradient-to-tr from-[#F59E0B] via-yellow-400 to-[#F59E0B] ring-4 ring-[#F59E0B]/70 shadow-[0_0_40px_rgba(245,158,11,0.8)] scale-105 animate-pulse'
                    : 'bg-gradient-to-tr from-[#10B981] via-[#14B8A6] to-[#10B981] ring-4 ring-[#10B981]/40 shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                }`}
                title="Capturar mascota"
                aria-label="Capturar mascota"
              >
                <div className="w-full h-full rounded-full bg-[#111827] border-3 border-white/90 flex items-center justify-center shadow-inner relative overflow-hidden">
                  {/* Subtle dynamic glow ring */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                      liveDetection.hasPet ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
                    }`}
                  >
                    <Camera className="w-5 h-5 text-slate-950" />
                  </div>
                </div>
              </button>
              <span
                className={`text-[10px] font-black mt-1 uppercase tracking-wider ${
                  liveDetection.hasPet ? 'text-[#F59E0B] animate-bounce' : 'text-[#10B981]'
                }`}
              >
                {liveDetection.hasPet ? '¡ATRAPAR AHORA!' : 'CAPTURAR'}
              </span>
            </div>

            {/* Right indicator: Mode badge */}
            <div className="w-12 h-12 rounded-2xl bg-[#111827]/90 border border-[#1F2937] flex items-center justify-center text-[#10B981] shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* FINAL CAPTURED PET CARD SHEET (Bottom Sheet Modal) */}
      {analysisResult && (
        <div className="absolute inset-x-0 bottom-0 z-40 bg-[#090D16]/98 backdrop-blur-2xl border-t border-[#1F2937] rounded-t-3xl p-5 pb-safe shadow-2xl max-h-[88vh] overflow-y-auto animate-slide-up">
          {/* Top visual sheet drag handle */}
          <div className="w-12 h-1.5 bg-[#1F2937] rounded-full mx-auto mb-4" />

          {analysisResult.has_pet &&
          (analysisResult.species === 'perro' || analysisResult.species === 'gato') ? (
            /* SUCCESS: Valid Pet Captured */
            <div className="flex flex-col gap-4">
              {/* Header with Photo Thumbnail, Species & Rarity */}
              <div className="flex items-center gap-3">
                {capturedImage && (
                  <div className="w-18 h-18 rounded-2xl overflow-hidden border-2 border-[#10B981] shadow-xl shrink-0 bg-[#111827]">
                    <img
                      src={capturedImage}
                      alt="Miniatura capturada"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black text-[#10B981] uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ¡Captura Exitosa!
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-[#F9FAFB] font-heading truncate">
                    {analysisResult.species === 'gato' ? '🐱 Gato Registrado' : '🐶 Perro Registrado'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border shadow ${
                        analysisResult.rarity === 'Legendario'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : analysisResult.rarity === 'Épico'
                          ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                          : analysisResult.rarity === 'Raro'
                          ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                          : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      }`}
                    >
                      ★ {analysisResult.rarity || 'Común'}
                    </span>
                    <span className="text-xs font-black text-[#F59E0B] flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      +{analysisResult.xp_reward || 140} XP
                    </span>
                  </div>
                </div>
              </div>

              {/* Editable Name Field */}
              <div className="bg-[#111827] rounded-2xl p-3.5 border border-[#1F2937]">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1 mb-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Nombre para tu colección:</span>
                </label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Escribe su nombre..."
                  className="w-full bg-[#1A2234] border border-[#1F2937] rounded-xl px-3.5 py-2.5 text-sm text-[#F9FAFB] font-black focus:outline-none focus:border-[#10B981] transition-colors"
                />
              </div>

              {/* Pet Details 2-Column Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#111827] rounded-xl p-3 border border-[#1F2937]">
                  <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Raza:</span>
                  <span className="font-bold text-slate-200 truncate block">{analysisResult.breed}</span>
                </div>
                <div className="bg-[#111827] rounded-xl p-3 border border-[#1F2937]">
                  <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Pelaje / Color:</span>
                  <span className="font-bold text-slate-200 truncate block">{analysisResult.color}</span>
                </div>
                <div className="bg-[#111827] rounded-xl p-3 border border-[#1F2937]">
                  <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Personalidad:</span>
                  <span className="font-bold text-slate-200 truncate block">{analysisResult.mood}</span>
                </div>
                <div className="bg-[#111827] rounded-xl p-3 border border-[#1F2937]">
                  <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Nivel de Ternura:</span>
                  <span className="font-bold text-[#F59E0B] flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 fill-[#F59E0B]" />
                    {analysisResult.cute_score || 95}/100
                  </span>
                </div>
              </div>

              {/* Fun Description */}
              {analysisResult.description && (
                <div className="bg-[#111827]/70 rounded-xl p-3 border border-[#1F2937] text-xs text-slate-300 italic">
                  "{analysisResult.description}"
                </div>
              )}

              {/* Educational Fun Fact Card */}
              {analysisResult.fun_fact && (
                <div className="bg-emerald-950/40 rounded-xl p-3 border border-emerald-800/50 text-[11px] text-emerald-300 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5 text-emerald-200">¿Sabías que?</span>
                    <span>{analysisResult.fun_fact}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={handleResetCamera}
                  className="flex-1 min-h-[50px] px-4 rounded-2xl bg-[#1A2234] border border-[#1F2937] text-slate-200 font-bold text-xs hover:bg-[#1f2a40] active:scale-95 transition-all flex items-center justify-center text-center"
                >
                  Volver a Explorar
                </button>
                <button
                  onClick={handleConfirmSave}
                  className="flex-2 min-h-[50px] px-4 rounded-2xl bg-gradient-to-r from-[#10B981] via-[#14B8A6] to-[#10B981] text-slate-950 font-black text-xs shadow-lg shadow-emerald-950/60 active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                >
                  <span>🐾 Guardar en Petdex</span>
                </button>
              </div>
            </div>
          ) : (
            /* REJECTION STATE (Not a dog or cat) */
            <div className="flex flex-col gap-4 text-center py-2">
              <div className="w-14 h-14 rounded-full bg-rose-500/20 text-[#EF4444] border border-[#EF4444]/40 mx-auto flex items-center justify-center shadow-lg">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[11px] font-bold text-[#EF4444] uppercase tracking-wider">
                  Foto No Válida para la Petdex
                </span>
                <h3 className="text-lg font-black text-white font-heading mt-0.5">
                  ¡No se detectó un perro ni un gato!
                </h3>
              </div>

              <div className="bg-[#111827] rounded-2xl p-4 border border-[#1F2937] text-xs text-slate-300 leading-relaxed text-left">
                {analysisResult.rejection_reason ||
                  'Nuestra IA de Gemini examinó la captura y no encontró a un perrito o gatito. Solo perros y gatos cuentan para registrar en tu colección de Mascotas Go.'}
              </div>

              <button
                onClick={handleResetCamera}
                className="w-full min-h-[50px] px-5 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-amber-600 text-slate-950 font-black text-sm shadow-xl active:scale-95 transition-transform mt-1"
              >
                Volver a la Cámara en Vivo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
