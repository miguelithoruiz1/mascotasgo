// Generate self-contained local sample images using Canvas so there is zero CORS or external network dependency!

export function generatePresetImage(type: 'golden' | 'siamese' | 'bulldog' | 'coffee'): string {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (type === 'golden') {
    // Background: Outdoor green grass and sunlight
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 600);
    bgGrad.addColorStop(0, '#7dd3fc');
    bgGrad.addColorStop(0.5, '#86efac');
    bgGrad.addColorStop(1, '#15803d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 600, 600);

    // Golden Retriever Head
    ctx.save();
    // Body / chest
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.ellipse(300, 520, 180, 130, 0, 0, Math.PI * 2);
    ctx.fill();

    // Red Collar
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(200, 420, 200, 26, 12);
    ctx.fill();
    // Tag
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(300, 445, 12, 0, Math.PI * 2);
    ctx.fill();

    // Head base
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.ellipse(300, 270, 120, 130, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears (floppy)
    ctx.fillStyle = '#ca8a04';
    // Left ear
    ctx.beginPath();
    ctx.ellipse(190, 280, 40, 95, -0.25, 0, Math.PI * 2);
    ctx.fill();
    // Right ear
    ctx.beginPath();
    ctx.ellipse(410, 280, 40, 95, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(300, 315, 60, 50, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.roundRect(280, 290, 40, 26, 8);
    ctx.fill();

    // Tongue
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.ellipse(300, 355, 22, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(255, 240, 14, 0, Math.PI * 2);
    ctx.arc(345, 240, 14, 0, Math.PI * 2);
    ctx.fill();
    // Eye highlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(259, 236, 5, 0, Math.PI * 2);
    ctx.arc(349, 236, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  } else if (type === 'siamese') {
    // Background: Warm cozy interior room
    const bgGrad = ctx.createLinearGradient(0, 0, 600, 600);
    bgGrad.addColorStop(0, '#fde68a');
    bgGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 600, 600);

    ctx.save();
    // Body / shoulder
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.ellipse(300, 530, 150, 120, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head (triangular/creamy)
    ctx.fillStyle = '#fffbeb';
    ctx.beginPath();
    ctx.ellipse(300, 300, 110, 105, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pointed ears (dark brown)
    ctx.fillStyle = '#451a03';
    // Left ear
    ctx.beginPath();
    ctx.moveTo(210, 230);
    ctx.lineTo(165, 110);
    ctx.lineTo(265, 200);
    ctx.closePath();
    ctx.fill();
    // Right ear
    ctx.beginPath();
    ctx.moveTo(390, 230);
    ctx.lineTo(435, 110);
    ctx.lineTo(335, 200);
    ctx.closePath();
    ctx.fill();

    // Dark seal point mask on face
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.ellipse(300, 310, 75, 65, 0, 0, Math.PI * 2);
    ctx.fill();

    // Piercing Blue Eyes (Classic Siamese)
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(260, 280, 18, 14, -0.1, 0, Math.PI * 2);
    ctx.ellipse(340, 280, 18, 14, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#082f49';
    ctx.beginPath();
    ctx.ellipse(260, 280, 6, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(340, 280, 6, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye catchlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(263, 276, 4, 0, Math.PI * 2);
    ctx.arc(343, 276, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pink nose
    ctx.fillStyle = '#fda4af';
    ctx.beginPath();
    ctx.moveTo(290, 320);
    ctx.lineTo(310, 320);
    ctx.lineTo(300, 332);
    ctx.closePath();
    ctx.fill();

    // Whiskers
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    // Left whiskers
    ctx.beginPath();
    ctx.moveTo(270, 330);
    ctx.lineTo(170, 320);
    ctx.moveTo(270, 335);
    ctx.lineTo(165, 345);
    ctx.moveTo(270, 340);
    ctx.lineTo(180, 365);
    // Right whiskers
    ctx.moveTo(330, 330);
    ctx.lineTo(430, 320);
    ctx.moveTo(330, 335);
    ctx.lineTo(435, 345);
    ctx.moveTo(330, 340);
    ctx.lineTo(420, 365);
    ctx.stroke();

    ctx.restore();
  } else if (type === 'bulldog') {
    // Background: Urban park pavement
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 600);
    bgGrad.addColorStop(0, '#cbd5e1');
    bgGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 600, 600);

    ctx.save();
    // Body
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(300, 520, 160, 110, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bulldog Large Head
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(300, 310, 140, 115, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fawn/Brindle Eye Patch
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.ellipse(240, 280, 48, 52, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Bat ears
    ctx.fillStyle = '#94a3b8';
    // Left ear
    ctx.beginPath();
    ctx.roundRect(175, 120, 55, 120, 26);
    ctx.fill();
    // Right ear
    ctx.beginPath();
    ctx.roundRect(370, 120, 55, 120, 26);
    ctx.fill();

    // Inner pink ears
    ctx.fillStyle = '#fecdd3';
    ctx.beginPath();
    ctx.roundRect(185, 140, 35, 85, 16);
    ctx.roundRect(380, 140, 35, 85, 16);
    ctx.fill();

    // Wrinkled forehead lines
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(300, 250, 40, 0.8 * Math.PI, 0.2 * Math.PI, true);
    ctx.stroke();

    // Dark Muzzle & Jowls
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(300, 350, 75, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wide black nose
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(275, 325, 50, 26, 10);
    ctx.fill();

    // Large Round Dark Eyes
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(240, 285, 16, 0, Math.PI * 2);
    ctx.arc(360, 285, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(244, 280, 6, 0, Math.PI * 2);
    ctx.arc(364, 280, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  } else {
    // type === 'coffee' (Non-pet item for testing rejection)
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(0, 0, 600, 600);

    // Wooden table surface
    const tableGrad = ctx.createLinearGradient(0, 300, 0, 600);
    tableGrad.addColorStop(0, '#78350f');
    tableGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = tableGrad;
    ctx.fillRect(0, 320, 600, 280);

    ctx.save();
    // Saucer
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(300, 480, 150, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ceramic Coffee Cup
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.roundRect(220, 320, 160, 140, [10, 10, 50, 50]);
    ctx.fill();

    // Cup Handle
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.arc(380, 380, 35, 1.5 * Math.PI, 0.5 * Math.PI);
    ctx.stroke();

    // Hot Cappuccino with latte art
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.ellipse(300, 335, 70, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.ellipse(300, 335, 45, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rising steam
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(270, 280);
    ctx.bezierCurveTo(250, 230, 290, 200, 270, 150);
    ctx.moveTo(330, 280);
    ctx.bezierCurveTo(350, 230, 310, 200, 330, 150);
    ctx.stroke();

    // "NO ES MASCOTA" label text for clarity
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('☕ OBJETO: TAZA DE CAFÉ', 300, 90);

    ctx.restore();
  }

  return canvas.toDataURL('image/jpeg', 0.88);
}
