// ============================================
// BOMSKUY: ESCAPE THE MAZE - GAME ENGINE v4
// ============================================

const MAPS = {
    small:  { cols: 11, rows: 7,  tileSize: 64 },
    medium: { cols: 15, rows: 9,  tileSize: 56 },
    large:  { cols: 19, rows: 13, tileSize: 48 }
};

const MODES = {
    easy:   { name: 'MUDAH',   playerHp: 150, enemyDamage: 15, enemySpeed: 0.7, enemyCount: 3,  bombDamage: 50, bossHp: 120, bossSpeed: 3.0, labelColor: '#00b894' },
    medium: { name: 'SEDANG',  playerHp: 100, enemyDamage: 25, enemySpeed: 1.0, enemyCount: 5,  bombDamage: 50, bossHp: 200, bossSpeed: 5.5, labelColor: '#fdcb6e' },
    hard:   { name: 'SULIT',   playerHp: 60,  enemyDamage: 40, enemySpeed: 1.5, enemyCount: 8,  bombDamage: 60, bossHp: 300, bossSpeed: 7.0, labelColor: '#ff4757' }
};

let TILE_SIZE = 56;
let COLS = 15;
let ROWS = 9;
let CANVAS_WIDTH = COLS * TILE_SIZE;
let CANVAS_HEIGHT = ROWS * TILE_SIZE;

const TILE = { FLOOR: 0, SOLID: 1, BRICK: 2 };

const COLORS = {
    floor: '#2d3436', floorAlt: '#353b48', solid: '#636e72', solidBorder: '#2d3436',
    brick: '#e17055', brickBorder: '#d63031', bomb: '#2d3436', bombPulse: '#fdcb6e',
    explosion: '#e17055', explosionCore: '#fdcb6e', player: '#00b894',
    enemySlime: '#55efc4', enemyGhost: '#a29bfe', enemyRobot: '#74b9ff', enemyMonster: '#ff7675',
    healthPack: '#00b894', bombUp: '#e84393', radiusUp: '#0984e3', scoreBonus: '#fdcb6e',
    exitKey: '#fdcb6e', exitDoor: '#e17055', exitDoorOpen: '#00b894',
    text: '#dfe6e9', damage: '#ff7675', score: '#fdcb6e'
};

const CHARACTERS = [
    { id: 'cat', name: 'Cat', emoji: '🐱', color: '#e17055' },
    { id: 'panda', name: 'Panda', emoji: '🐼', color: '#dfe6e9' },
    { id: 'bunny', name: 'Bunny', emoji: '🐰', color: '#fd79a8' },
    { id: 'bear', name: 'Bear', emoji: '🐻', color: '#8B4513' },
    { id: 'dog', name: 'Dog', emoji: '🐶', color: '#f39c12' },
    { id: 'fox', name: 'Fox', emoji: '🦊', color: '#e67e22' },
    { id: 'tiger', name: 'Tiger', emoji: '🐯', color: '#fdcb6e' },
    { id: 'hamster', name: 'Hamster', emoji: '🐹', color: '#fab1a0' }
];

const ENEMY_TYPES = {
    slime: { name: 'Slime', emoji: '🐙', hp: 30, speed: 1.5, detectionRadius: 4, dangerRadius: 3, color: COLORS.enemySlime, score: 50 },
    ghost: { name: 'Ghost', emoji: '👻', hp: 40, speed: 2.2, detectionRadius: 5, dangerRadius: 3, color: COLORS.enemyGhost, score: 50 },
    robot: { name: 'Robot', emoji: '🤖', hp: 60, speed: 1.2, detectionRadius: 6, dangerRadius: 4, color: COLORS.enemyRobot, score: 50 },
    monster: { name: 'Monster', emoji: '👾', hp: 50, speed: 1.8, detectionRadius: 5, dangerRadius: 3, color: COLORS.enemyMonster, score: 50 },
    boss: { name: 'BOSS', emoji: '👹', hp: 200, speed: 5.5, detectionRadius: 10, dangerRadius: 6, color: '#ff4757', score: 1000, isBoss: true }
};

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = randInt(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
function manhattan(a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function formatTime(seconds) { const m = Math.floor(seconds / 60).toString().padStart(2, '0'); const s = Math.floor(seconds % 60).toString().padStart(2, '0'); return `${m}:${s}`; }

// ============================================
// AUDIO MANAGER
// ============================================
class AudioManager {
    constructor() {
        this.ctx = null; this.masterGain = null; this.musicGain = null; this.sfxGain = null;
        this.enabled = true; this.volMaster = 0.8; this.volSFX = 0.8; this.volMusic = 0.6;
        this.bgmInterval = null; this.bgmPlaying = false; this.bgmPattern = 0;
        this.menuBgmInterval = null; this.menuBgmPlaying = false;
    }
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.musicGain = this.ctx.createGain();
            this.sfxGain = this.ctx.createGain();
            this.musicGain.connect(this.masterGain);
            this.sfxGain.connect(this.masterGain);
            this.masterGain.connect(this.ctx.destination);
            this.updateVolumes();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }
    updateVolumes() {
        if (this.masterGain) this.masterGain.gain.value = this.volMaster;
        if (this.musicGain) this.musicGain.gain.value = this.volMusic;
        if (this.sfxGain) this.sfxGain.gain.value = this.volSFX;
    }
    playTone(freq, duration, type = 'square', vol = 0.3, slide = 0, dest = null) {
        if (!this.enabled || !this.ctx) return;
        const d = dest || this.sfxGain;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(freq + slide, this.ctx.currentTime + duration);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain); gain.connect(d);
        osc.start(); osc.stop(this.ctx.currentTime + duration);
    }
    playNoise(duration, vol = 0.3, dest = null) {
        if (!this.enabled || !this.ctx) return;
        const d = dest || this.sfxGain;
        const bs = this.ctx.sampleRate * duration;
        const buf = this.ctx.createBuffer(1, bs, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bs; i++) data[i] = Math.random() * 2 - 1;
        const n = this.ctx.createBufferSource(); n.buffer = buf;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        n.connect(g); g.connect(d); n.start();
    }
    startMenuBGM() {
        if (!this.ctx || this.menuBgmPlaying) return;
        this.menuBgmPlaying = true;
        const beat = 60 / 100;
        const notes = [[262, 330, 392], [294, 370, 440], [330, 415, 494], [349, 440, 523]];
        this.menuBgmInterval = setInterval(() => {
            if (!this.menuBgmPlaying || !this.ctx) return;
            const chord = notes[this.bgmPattern % notes.length];
            chord.forEach(f => this.playTone(f, beat * 1.5, 'sine', 0.05, 0, this.musicGain));
            if (this.bgmPattern % 4 === 0) this.playTone(chord[0] / 2, beat * 2, 'triangle', 0.04, 0, this.musicGain);
            this.bgmPattern++;
        }, beat * 1000);
    }
    stopMenuBGM() {
        this.menuBgmPlaying = false;
        if (this.menuBgmInterval) { clearInterval(this.menuBgmInterval); this.menuBgmInterval = null; }
    }
    startGameBGM() {
        if (!this.ctx || this.bgmPlaying) return;
        this.bgmPlaying = true;
        this.bgmPattern = 0;
        const beat = 60 / 140;
        const notes = [[261.63, 329.63, 392.00, 523.25], [293.66, 349.23, 440.00, 587.33], [329.63, 415.30, 493.88, 659.25], [349.23, 440.00, 523.25, 698.46]];
        this.bgmInterval = setInterval(() => {
            if (!this.bgmPlaying || !this.ctx) return;
            const chord = notes[this.bgmPattern % notes.length];
            const note = chord[randInt(0, 3)];
            this.playTone(note, beat * 0.8, 'square', 0.08, 0, this.musicGain);
            if (this.bgmPattern % 4 === 0) this.playTone(note / 2, beat * 1.5, 'triangle', 0.06, 0, this.musicGain);
            this.bgmPattern++;
        }, beat * 1000);
    }
    stopGameBGM() {
        this.bgmPlaying = false;
        if (this.bgmInterval) { clearInterval(this.bgmInterval); this.bgmInterval = null; }
    }
    stopAllBGM() { this.stopMenuBGM(); this.stopGameBGM(); }
    playClick() { this.playTone(800, 0.08, 'square', 0.2); }
    playHover() { this.playTone(400, 0.05, 'sine', 0.15); }
    playStep() { this.playTone(180, 0.04, 'triangle', 0.08); }
    playPlaceBomb() { this.playTone(300, 0.15, 'square', 0.25, -100); }
    playWarning() { this.playTone(900, 0.1, 'sawtooth', 0.25); }
    playExplosion() { this.playNoise(0.4, 0.4); this.playTone(100, 0.3, 'sawtooth', 0.3, -80); }
    playChainExplosion() { this.playNoise(0.5, 0.5); this.playTone(80, 0.4, 'sawtooth', 0.35, -60); }
    playBrickBreak() { this.playNoise(0.15, 0.2); this.playTone(300, 0.1, 'square', 0.15); }
    playWallImpact() { this.playTone(150, 0.08, 'square', 0.15); }
    playPickup() { this.playTone(523, 0.1, 'square', 0.2); this.playTone(659, 0.1, 'square', 0.2); this.playTone(784, 0.15, 'square', 0.2); }
    playUpgrade() { this.playTone(440, 0.1, 'square', 0.25); this.playTone(554, 0.1, 'square', 0.25); this.playTone(659, 0.2, 'square', 0.25); }
    playHealth() { this.playTone(523, 0.15, 'sine', 0.2); this.playTone(659, 0.2, 'sine', 0.2); }
    playKeyFound() { this.playTone(523, 0.1, 'square', 0.3); this.playTone(659, 0.1, 'square', 0.3); this.playTone(784, 0.1, 'square', 0.3); this.playTone(1047, 0.3, 'square', 0.3); }
    playDoorUnlock() { this.playTone(400, 0.2, 'square', 0.25); this.playTone(600, 0.3, 'square', 0.25); }
    playLevelComplete() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => setTimeout(() => this.playTone(f, 0.2, 'square', 0.25), i * 120)); }
    playEnemyHurt() { this.playTone(200, 0.1, 'sawtooth', 0.2); }
    playEnemyDeath() { this.playTone(150, 0.2, 'sawtooth', 0.25, -80); }
    playPlayerHurt() { this.playTone(100, 0.3, 'sawtooth', 0.3); this.playNoise(0.2, 0.2); }
    playPlayerDeath() { this.playTone(80, 0.5, 'sawtooth', 0.35, -60); this.playNoise(0.4, 0.3); }
    playRespawn() { this.playTone(400, 0.15, 'sine', 0.2); this.playTone(600, 0.2, 'sine', 0.2); }
    playCombo() { this.playTone(600, 0.1, 'square', 0.3); this.playTone(800, 0.15, 'square', 0.3); }
    playVictory() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this.playTone(f, 0.25, 'square', 0.3), i * 150)); }
    playDefeat() { [400, 350, 300, 250, 200, 150].forEach((f, i) => setTimeout(() => this.playTone(f, 0.3, 'sawtooth', 0.3), i * 200)); }
    playPause() { this.playTone(300, 0.15, 'triangle', 0.2); }
    playResume() { this.playTone(500, 0.15, 'triangle', 0.2); }
    playSpawn() { this.playTone(300, 0.1, 'sine', 0.15); this.playTone(400, 0.1, 'sine', 0.15); }
    playMenuOpen() { this.playTone(600, 0.1, 'sine', 0.2); this.playTone(800, 0.15, 'sine', 0.2); }
    playMenuClose() { this.playTone(800, 0.1, 'sine', 0.2); this.playTone(600, 0.15, 'sine', 0.2); }
    playStartGame() { [262, 330, 392, 523, 659, 784].forEach((f, i) => setTimeout(() => this.playTone(f, 0.15, 'square', 0.25), i * 100)); }
    playError() { this.playTone(200, 0.2, 'sawtooth', 0.2); this.playTone(150, 0.2, 'sawtooth', 0.2); }
    playCoin() { this.playTone(988, 0.08, 'square', 0.2); this.playTone(1319, 0.12, 'square', 0.2); }
    playHit() { this.playNoise(0.1, 0.15); this.playTone(120, 0.1, 'sawtooth', 0.25); }
    playMagic() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.playTone(f, 0.15, 'sine', 0.15), i * 80)); }
    playThud() { this.playTone(80, 0.2, 'square', 0.3); this.playNoise(0.15, 0.2); }
    playJingle() { [523, 659, 523, 784, 659, 1047].forEach((f, i) => setTimeout(() => this.playTone(f, 0.1, 'square', 0.15), i * 100)); }
    playEscape() { [400, 500, 600, 800, 1000, 1200].forEach((f, i) => setTimeout(() => this.playTone(f, 0.15, 'square', 0.2), i * 100)); }
    playWinFanfare() { [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => setTimeout(() => this.playTone(f, 0.3, 'square', 0.25), i * 150)); }
    playLoseTune() { [300, 280, 260, 240, 220, 200].forEach((f, i) => setTimeout(() => this.playTone(f, 0.4, 'sawtooth', 0.25), i * 250)); }
    playEscapeJingle() { [600, 800, 1000, 1200, 1000, 1400].forEach((f, i) => setTimeout(() => this.playTone(f, 0.2, 'square', 0.2), i * 120)); }
    playBossAlert() { [200, 150, 200, 150, 300, 250, 300, 250, 400, 350, 400, 350].forEach((f, i) => setTimeout(() => this.playTone(f, 0.3, 'sawtooth', 0.35), i * 150)); }
    playDramatic() { [150, 200, 250, 300, 350, 400, 450, 500, 550, 600].forEach((f, i) => setTimeout(() => this.playTone(f, 0.4, 'sawtooth', 0.3), i * 200)); }
    playBossLaugh() { [300, 250, 200, 180, 220, 180, 160, 140].forEach((f, i) => setTimeout(() => this.playTone(f, 0.25, 'sawtooth', 0.25), i * 180)); }
    playBossCry() { [400, 350, 300, 280, 250, 220, 200, 180, 150, 120].forEach((f, i) => setTimeout(() => this.playTone(f, 0.35, 'sawtooth', 0.3), i * 200)); }
}

// ============================================
// PARTICLE SYSTEM
// ============================================
class Particle {
    constructor(x, y, color, vx, vy, size, life) {
        this.x = x; this.y = y; this.color = color;
        this.vx = vx; this.vy = vy; this.size = size;
        this.life = life; this.maxLife = life;
    }
    update(dt) {
        this.x += this.vx * dt; this.y += this.vy * dt;
        this.vy += 150 * dt; this.life -= dt; this.size *= 0.98;
    }
    draw(ctx) {
        const a = clamp(this.life / this.maxLife, 0, 1);
        ctx.globalAlpha = a;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

class ParticleSystem {
    constructor() { this.particles = []; }
    spawnExplosion(x, y, color, count = 15) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 150;
            this.particles.push(new Particle(x, y, color, Math.cos(angle) * speed, Math.sin(angle) * speed - 50, 4 + Math.random() * 6, 0.5 + Math.random() * 0.5));
        }
    }
    spawnConfetti(x, y, count = 30) {
        const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#fd79a8', '#a8e6cf', '#ff9f43'];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 200;
            this.particles.push(new Particle(x, y, colors[randInt(0, colors.length - 1)], Math.cos(angle) * speed, Math.sin(angle) * speed - 100, 6 + Math.random() * 4, 1.5 + Math.random() * 1));
        }
    }
    spawnStars(x, y, count = 20) {
        const colors = ['#fdcb6e', '#fff', '#ffeaa7', '#fab1a0'];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 120;
            this.particles.push(new Particle(x, y, colors[randInt(0, colors.length - 1)], Math.cos(angle) * speed, Math.sin(angle) * speed - 80, 3 + Math.random() * 5, 1.0 + Math.random() * 0.8));
        }
    }
    spawnSparks(x, y, count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 100;
            this.particles.push(new Particle(x, y, '#fdcb6e', Math.cos(angle) * speed, Math.sin(angle) * speed - 40, 2 + Math.random() * 3, 0.3 + Math.random() * 0.3));
        }
    }
    spawnSmoke(x, y, count = 8) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 40;
            this.particles.push(new Particle(x, y, '#636e72', Math.cos(angle) * speed, Math.sin(angle) * speed - 30, 8 + Math.random() * 10, 0.8 + Math.random() * 0.5));
        }
    }
    spawnHearts(x, y, count = 6) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 60;
            this.particles.push(new Particle(x, y, '#ff7675', Math.cos(angle) * speed, Math.sin(angle) * speed - 60, 5 + Math.random() * 4, 0.8 + Math.random() * 0.4));
        }
    }
    update(dt) { this.particles.forEach(p => p.update(dt)); this.particles = this.particles.filter(p => p.life > 0); }
    draw(ctx) { this.particles.forEach(p => p.draw(ctx)); }
}

// ============================================
// FLOATING TEXT
// ============================================
class FloatingText {
    constructor(x, y, text, color, size = 14) {
        this.x = x; this.y = y; this.text = text; this.color = color; this.size = size;
        this.life = 1.0; this.vy = -60;
    }
    update(dt) { this.y += this.vy * dt; this.life -= dt * 0.8; }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = clamp(this.life, 0, 1);
        ctx.fillStyle = '#000';
        ctx.font = `bold ${this.size}px "Press Start 2P", monospace`;
        ctx.fillText(this.text, this.x + 1, this.y + 1);
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1;
    }
}

// ============================================
// INTERACTIVE MENU PIXELS
// ============================================
class MenuPixel {
    constructor(x, y, color, size) {
        this.x = x; this.y = y; this.color = color; this.size = size;
        this.vx = (Math.random() - 0.5) * 30;
        this.vy = (Math.random() - 0.5) * 30;
        this.origX = x; this.origY = y;
        this.scattered = false;
        this.life = 1.0;
    }
    update(dt, mouseX, mouseY, canvasWidth, canvasHeight) {
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 60) {
            this.scattered = true;
            const angle = Math.atan2(dy, dx);
            this.vx -= Math.cos(angle) * 300 * dt;
            this.vy -= Math.sin(angle) * 300 * dt;
        } else if (this.scattered && dist > 100) {
            this.vx += (this.origX - this.x) * 2 * dt;
            this.vy += (this.origY - this.y) * 2 * dt;
            this.vx *= 0.95;
            this.vy *= 0.95;
            if (Math.abs(this.x - this.origX) < 2 && Math.abs(this.y - this.origY) < 2) {
                this.scattered = false;
                this.x = this.origX; this.y = this.origY;
                this.vx = (Math.random() - 0.5) * 30;
                this.vy = (Math.random() - 0.5) * 30;
            }
        }
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Boundary checks - keep pixels within screen
        if (this.x < 0) { this.x = 0; this.vx = Math.abs(this.vx) * 0.8; }
        if (this.x > canvasWidth - this.size) { this.x = canvasWidth - this.size; this.vx = -Math.abs(this.vx) * 0.8; }
        if (this.y < 0) { this.y = 0; this.vy = Math.abs(this.vy) * 0.8; }
        if (this.y > canvasHeight - this.size) { this.y = canvasHeight - this.size; this.vy = -Math.abs(this.vy) * 0.8; }

        if (!this.scattered) {
            this.x += Math.sin(Date.now() * 0.001 + this.origX) * 0.3;
            this.y += Math.cos(Date.now() * 0.001 + this.origY) * 0.3;
            this.x = clamp(this.x, 0, canvasWidth - this.size);
            this.y = clamp(this.y, 0, canvasHeight - this.size);
        }
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

class MenuPixelSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.pixels = [];
        this.mouseX = -1000;
        this.mouseY = -1000;
        this.active = false;
        this._setupMouse();
        this._spawnPixels();
        this._resizeHandler = () => {
            if (this.canvas) {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', this._resizeHandler);
    }
    _setupMouse() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        this.canvas.addEventListener('mouseleave', () => {
            this.mouseX = -1000; this.mouseY = -1000;
        });
    }
    _spawnPixels() {
        const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#fd79a8', '#a8e6cf', '#ff9f43', '#74b9ff', '#a29bfe'];
        const w = this.canvas.width;
        const h = this.canvas.height;
        for (let i = 0; i < 80; i++) {
            const x = Math.random() * (w - 12);
            const y = Math.random() * (h - 12);
            const size = 4 + Math.random() * 8;
            const color = colors[randInt(0, colors.length - 1)];
            this.pixels.push(new MenuPixel(x, y, color, size));
        }
    }
    start() { 
        this.active = true; 
        this._resizeHandler();
        this._loop(); 
    }
    stop() { this.active = false; }
    _loop() {
        if (!this.active) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const dt = 0.016;
        const w = this.canvas.width;
        const h = this.canvas.height;
        for (const p of this.pixels) {
            p.update(dt, this.mouseX, this.mouseY, w, h);
            p.draw(this.ctx);
        }
        requestAnimationFrame(() => this._loop());
    }
}

// ============================================
// MAP GENERATOR
// ============================================
class MapGenerator {
    generate(level, mapConfig, modeConfig) {
        let result;
        let attempts = 0;
        do { result = this._generate(level, mapConfig, modeConfig); attempts++; }
        while (!this._validate(result, mapConfig) && attempts < 100);
        return result;
    }
    _generate(level, cfg, modeCfg) {
        const cols = cfg.cols, rows = cfg.rows;
        let grid = Array(rows).fill().map(() => Array(cols).fill(TILE.SOLID));
        const stack = [{r: 1, c: 1}];
        grid[1][1] = TILE.FLOOR;
        const dirs = [{r: -2, c: 0}, {r: 2, c: 0}, {r: 0, c: -2}, {r: 0, c: 2}];
        while (stack.length > 0) {
            const curr = stack[stack.length - 1];
            const neighbors = [];
            for (const d of dirs) {
                const nr = curr.r + d.r, nc = curr.c + d.c;
                if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && grid[nr][nc] === TILE.SOLID) {
                    neighbors.push({r: nr, c: nc, wr: curr.r + d.r/2, wc: curr.c + d.c/2});
                }
            }
            if (neighbors.length > 0) {
                const next = neighbors[randInt(0, neighbors.length - 1)];
                grid[next.wr][next.wc] = TILE.FLOOR;
                grid[next.r][next.c] = TILE.FLOOR;
                stack.push({r: next.r, c: next.c});
            } else stack.pop();
        }
        const loopChance = Math.min(0.12 + level * 0.015, 0.35);
        for (let r = 1; r < rows - 1; r++) {
            for (let c = 1; c < cols - 1; c++) {
                if (grid[r][c] === TILE.SOLID) {
                    let fn = 0;
                    if (grid[r-1] && grid[r-1][c] === TILE.FLOOR && grid[r+1] && grid[r+1][c] === TILE.FLOOR) fn++;
                    if (grid[r][c-1] === TILE.FLOOR && grid[r][c+1] === TILE.FLOOR) fn++;
                    if (fn > 0 && Math.random() < loopChance) grid[r][c] = TILE.FLOOR;
                }
            }
        }
        const spawn = this._findSpawn(grid, rows, cols);
        let floorCells = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c] === TILE.FLOOR && !(Math.abs(r - spawn.r) <= 1 && Math.abs(c - spawn.c) <= 1)) {
                    floorCells.push({r, c});
                }
            }
        }
        floorCells = shuffle(floorCells);
        const brickRatio = Math.min(0.22 + level * 0.025, 0.45);
        const maxBricks = Math.floor(floorCells.length * brickRatio);
        let bricksPlaced = 0;
        const brickCells = [];
        for (const cell of floorCells) {
            if (bricksPlaced >= maxBricks) break;
            grid[cell.r][cell.c] = TILE.BRICK;
            brickCells.push(cell);
            bricksPlaced++;
        }
        const exitDoor = this._findFarthest(grid, spawn, TILE.FLOOR, rows, cols);
        if (exitDoor) grid[exitDoor.r][exitDoor.c] = TILE.FLOOR;
        else grid[rows-2][cols-2] = TILE.FLOOR;
        let exitKey = null;
        const farBricks = brickCells.filter(b => manhattan(b, spawn) >= 5).sort((a, b) => manhattan(b, spawn) - manhattan(a, spawn));
        if (farBricks.length > 0) {
            const candidates = farBricks.slice(0, Math.max(1, Math.floor(farBricks.length * 0.4)));
            exitKey = candidates[randInt(0, candidates.length - 1)];
        } else if (brickCells.length > 0) exitKey = brickCells[brickCells.length - 1];
        if (!exitKey) {
            let farFloors = [];
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (grid[r][c] === TILE.FLOOR && manhattan({r, c}, spawn) >= 5) farFloors.push({r, c});
                }
            }
            if (farFloors.length > 0) {
                farFloors.sort((a, b) => manhattan(b, spawn) - manhattan(a, spawn));
                exitKey = farFloors[0];
                grid[exitKey.r][exitKey.c] = TILE.BRICK;
            }
        }
        // Enemy spawning with mode config
        let enemies = [];
        if (level === 5) {
            // Boss + regular enemies based on mode
            let bossPlaced = false, bossAttempts = 0;
            while (!bossPlaced && bossAttempts < 300) {
                bossAttempts++;
                const r = randInt(0, rows - 1), c = randInt(0, cols - 1);
                if (grid[r][c] !== TILE.FLOOR) continue;
                if (manhattan({r, c}, spawn) < 8) continue;
                enemies.push({r, c, type: 'boss'});
                bossPlaced = true;
            }
            // Add regular enemies too
            const regularCount = Math.max(2, Math.floor(modeCfg.enemyCount * 0.6));
            const regular = this._placeRegularEnemies(grid, spawn, regularCount, rows, cols, enemies);
            enemies = enemies.concat(regular);
        } else {
            const count = Math.min(modeCfg.enemyCount + level - 1, 15);
            enemies = this._placeRegularEnemies(grid, spawn, count, rows, cols, []);
        }
        const items = this._placeItems(grid, spawn, exitKey, level, rows, cols);
        return { grid, spawn, exitDoor: exitDoor || {r: rows-2, c: cols-2}, exitKey, enemies, items };
    }
    _findSpawn(grid, rows, cols) {
        const corners = [{r: 1, c: 1}, {r: 1, c: cols-2}, {r: rows-2, c: 1}, {r: rows-2, c: cols-2}];
        for (const p of corners) if (this._isSafeZone(grid, p.r, p.c, rows, cols)) return p;
        for (let r = 1; r < rows - 1; r++) {
            for (let c = 1; c < cols - 1; c++) {
                if (this._isSafeZone(grid, r, c, rows, cols)) return {r, c};
            }
        }
        return {r: 1, c: 1};
    }
    _isSafeZone(grid, r, c, rows, cols) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr, nc = c + dc;
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return false;
                if (grid[nr][nc] === TILE.SOLID) return false;
            }
        }
        return true;
    }
    _findFarthest(grid, from, tileType, rows, cols) {
        const queue = [{r: from.r, c: from.c, d: 0}];
        const visited = new Set([`${from.r},${from.c}`]);
        let farthest = from, maxDist = 0;
        while (queue.length > 0) {
            const curr = queue.shift();
            if (curr.d > maxDist && grid[curr.r][curr.c] === tileType) { maxDist = curr.d; farthest = {r: curr.r, c: curr.c}; }
            const moves = [{r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}];
            for (const m of moves) {
                const nr = curr.r + m.r, nc = curr.c + m.c;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(`${nr},${nc}`)) {
                    if (grid[nr][nc] !== TILE.SOLID) { visited.add(`${nr},${nc}`); queue.push({r: nr, c: nc, d: curr.d + 1}); }
                }
            }
        }
        return farthest;
    }
    _placeRegularEnemies(grid, spawn, count, rows, cols, existing) {
        const enemies = [...existing];
        const types = Object.keys(ENEMY_TYPES).filter(t => t !== 'boss');
        let attempts = 0;
        while (enemies.length < count + existing.length && attempts < 500) {
            attempts++;
            const r = randInt(0, rows - 1), c = randInt(0, cols - 1);
            if (grid[r][c] !== TILE.FLOOR) continue;
            if (manhattan({r, c}, spawn) < 6) continue;
            let tooClose = false;
            for (const e of enemies) { if (manhattan({r, c}, e) < 3) { tooClose = true; break; } }
            if (tooClose) continue;
            const type = types[randInt(0, types.length - 1)];
            enemies.push({r, c, type});
        }
        return enemies.slice(existing.length);
    }
    _placeItems(grid, spawn, exitKey, level, rows, cols) {
        const items = [];
        const itemTypes = ['health', 'bombUp', 'radiusUp', 'score'];
        const itemCount = 3 + Math.floor(level * 0.5);
        let floorItems = 0, attempts = 0;
        while (floorItems < Math.floor(itemCount / 2) && attempts < 200) {
            attempts++;
            const r = randInt(0, rows - 1), c = randInt(0, cols - 1);
            if (grid[r][c] !== TILE.FLOOR) continue;
            if (manhattan({r, c}, spawn) < 3) continue;
            items.push({r, c, type: itemTypes[randInt(0, itemTypes.length - 1)], hidden: false});
            floorItems++;
        }
        let brickItems = 0; attempts = 0;
        while (brickItems < Math.floor(itemCount / 2) && attempts < 200) {
            attempts++;
            const r = randInt(0, rows - 1), c = randInt(0, cols - 1);
            if (grid[r][c] !== TILE.BRICK) continue;
            if (exitKey && r === exitKey.r && c === exitKey.c) continue;
            if (manhattan({r, c}, spawn) < 3) continue;
            items.push({r, c, type: itemTypes[randInt(0, itemTypes.length - 1)], hidden: true});
            brickItems++;
        }
        return items;
    }
    _validate(result, cfg) {
        if (!result || !result.grid || !result.spawn || !result.exitKey) return false;
        let walkable = 0;
        for (let r = 0; r < cfg.rows; r++) {
            for (let c = 0; c < cfg.cols; c++) {
                if (result.grid[r][c] !== TILE.SOLID) walkable++;
            }
        }
        if (walkable < 30) return false;
        if (!this._hasPath(result.grid, result.spawn, result.exitDoor, cfg.rows, cfg.cols)) return false;
        if (!this._hasPath(result.grid, result.spawn, result.exitKey, cfg.rows, cfg.cols)) return false;
        return true;
    }
    _hasPath(grid, from, to, rows, cols) {
        const queue = [{r: from.r, c: from.c}];
        const visited = new Set([`${from.r},${from.c}`]);
        while (queue.length > 0) {
            const curr = queue.shift();
            if (curr.r === to.r && curr.c === to.c) return true;
            const moves = [{r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}];
            for (const m of moves) {
                const nr = curr.r + m.r, nc = curr.c + m.c;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(`${nr},${nc}`)) {
                    if (grid[nr][nc] !== TILE.SOLID) { visited.add(`${nr},${nc}`); queue.push({r: nr, c: nc}); }
                }
            }
        }
        return false;
    }
}

// ============================================
// SAVE MANAGER
// ============================================
class SaveManager {
    static load() { try { const d = localStorage.getItem('bomskuy_save'); return d ? JSON.parse(d) : {}; } catch (e) { return {}; } }
    static save(data) { try { localStorage.setItem('bomskuy_save', JSON.stringify(data)); } catch (e) {} }
}

// ============================================
// PLAYER
// ============================================
class Player {
    constructor(r, c, character, modeCfg) {
        this.r = r; this.c = c;
        this.x = c * TILE_SIZE; this.y = r * TILE_SIZE;
        this.character = character;
        this.hp = modeCfg.playerHp;
        this.maxHp = modeCfg.playerHp;
        this.lives = 3;
        this.bombCapacity = 2;
        this.bombRadius = 2;
        this.activeBombs = 0;
        this.hasKey = false;
        this.score = 0;
        this.invincible = 0;
        this.moving = false;
        this.targetR = r; this.targetC = c;
        this.moveProgress = 0;
        this.speed = 5;
        this.moveCooldown = 0;
        this.facing = 'down';
    }
    update(dt, game) {
        if (this.invincible > 0) this.invincible -= dt;
        if (this.moveCooldown > 0) this.moveCooldown -= dt;
        if (this.moving) {
            this.moveProgress += this.speed * dt;
            if (this.moveProgress >= 1) {
                this.r = this.targetR; this.c = this.targetC;
                this.x = this.c * TILE_SIZE; this.y = this.r * TILE_SIZE;
                this.moving = false; this.moveProgress = 0;
                this.onReachTile(game);
            } else {
                this.x = (this.c + (this.targetC - this.c) * this.moveProgress) * TILE_SIZE;
                this.y = (this.r + (this.targetR - this.r) * this.moveProgress) * TILE_SIZE;
            }
        } else {
            const item = game.items.find(i => i.r === this.r && i.c === this.c && !i.collected && !i.hidden);
            if (item) this.collectItem(item, game);
        }
    }
    tryMove(dr, dc, game) {
        if (this.moving || this.moveCooldown > 0) return false;
        const nr = this.r + dr, nc = this.c + dc;
        if (!game.isWalkable(nr, nc)) return false;
        this.facing = dr === -1 ? 'up' : dr === 1 ? 'down' : dc === -1 ? 'left' : 'right';
        this.targetR = nr; this.targetC = nc;
        this.moving = true; this.moveProgress = 0; this.moveCooldown = 0.05;
        game.audio.playStep();
        return true;
    }
    onReachTile(game) {
        const item = game.items.find(i => i.r === this.r && i.c === this.c && !i.collected && !i.hidden);
        if (item) this.collectItem(item, game);
        if (this.r === game.exitDoor.r && this.c === game.exitDoor.c && this.hasKey) game.completeLevel();
    }
    collectItem(item, game) {
        item.collected = true;
        switch(item.type) {
            case 'health':
                this.hp = Math.min(this.maxHp, this.hp + 25);
                game.audio.playHealth();
                game.addFloatingText(this.x + TILE_SIZE/2, this.y, '+25 HP', COLORS.healthPack);
                game.particles.spawnHearts(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, 5);
                break;
            case 'bombUp':
                this.bombCapacity++;
                game.audio.playUpgrade();
                game.addFloatingText(this.x + TILE_SIZE/2, this.y, 'BOMB UP!', COLORS.bombUp);
                game.showNotification('Bomb Capacity Up!');
                game.particles.spawnSparks(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, 8);
                break;
            case 'radiusUp':
                this.bombRadius++;
                game.audio.playUpgrade();
                game.addFloatingText(this.x + TILE_SIZE/2, this.y, 'RADIUS UP!', COLORS.radiusUp);
                game.showNotification('Explosion Radius Up!');
                game.particles.spawnSparks(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, 8);
                break;
            case 'score':
                this.score += 10;
                game.audio.playCoin();
                game.addFloatingText(this.x + TILE_SIZE/2, this.y, '+10', COLORS.scoreBonus);
                break;
            case 'exitKey':
                this.hasKey = true;
                this.score += 100;
                game.audio.playKeyFound();
                game.showNotification('EXIT KEY FOUND!');
                game.addFloatingText(this.x + TILE_SIZE/2, this.y - 10, 'KEY!', COLORS.exitKey, 18);
                game.particles.spawnStars(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, 15);
                break;
        }
        game.particles.spawnExplosion(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, item.color || COLORS.scoreBonus, 6);
    }
    takeDamage(amount, game) {
        if (this.invincible > 0) return;
        this.hp -= amount;
        this.invincible = 1.5;
        game.audio.playPlayerHurt();
        game.shakeScreen(12, 0.4);
        game.addFloatingText(this.x + TILE_SIZE/2, this.y - 10, `-${amount}`, COLORS.damage, 18);
        game.particles.spawnExplosion(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, '#ff7675', 10);
        if (this.hp <= 0) { this.hp = 0; this.die(game); }
    }
    die(game) {
        this.lives--;
        game.audio.playPlayerDeath();
        game.particles.spawnExplosion(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, this.character.color, 25);
        if (this.lives > 0) this.respawn(game);
        else game.gameOver();
    }
    respawn(game) {
        this.hp = this.maxHp;
        this.r = game.spawn.r; this.c = game.spawn.c;
        this.x = this.c * TILE_SIZE; this.y = this.r * TILE_SIZE;
        this.moving = false; this.invincible = 2.0; this.activeBombs = 0;
        game.audio.playRespawn();
        game.showNotification('Lives: ' + this.lives);
    }
    draw(ctx, time) {
        const px = this.x + TILE_SIZE/2, py = this.y + TILE_SIZE/2;
        if (this.invincible > 0 && Math.floor(time * 10) % 2 === 0) return;
        ctx.save();
        ctx.globalAlpha = 1.0;

        // Vibrant radial glow behind player
        const glowPulse = 1 + Math.sin(time * 3) * 0.1;
        const glowSize = TILE_SIZE * 0.55 * glowPulse;
        const glowGrad = ctx.createRadialGradient(px, py, 2, px, py, glowSize);
        glowGrad.addColorStop(0, this.character.color + '44');
        glowGrad.addColorStop(0.5, this.character.color + '22');
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath(); ctx.arc(px, py, glowSize, 0, Math.PI * 2); ctx.fill();

        // Solid shadow beneath player
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.ellipse(px + 3, py + TILE_SIZE * 0.42, TILE_SIZE * 0.35, TILE_SIZE * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Emoji with crisp shadow for depth
        const fontSize = Math.floor(TILE_SIZE * 0.72);
        ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", emoji, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Drop shadow for emoji
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;
        ctx.fillText(this.character.emoji, px, py);

        // Subtle inner highlight for vibrancy
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.restore();
    }
}

// ============================================
// ENEMY - ALWAYS CHASES PLAYER
// ============================================
class Enemy {
    constructor(r, c, typeKey) {
        this.r = r; this.c = c;
        this.x = c * TILE_SIZE; this.y = r * TILE_SIZE;
        this.typeKey = typeKey;
        this.type = ENEMY_TYPES[typeKey];
        this.hp = this.type.hp;
        this.maxHp = this.type.hp;
        this.state = 'CHASE';
        this.wanderTimer = 0;
        this.wanderDir = {r: 0, c: 0};
        this.stuckTimer = 0;
        this.moving = false;
        this.targetR = r; this.targetC = c;
        this.moveProgress = 0;
        this.moveSpeed = this.type.speed;
        this.invincible = 0;
        this.animOffset = Math.random() * 1000;
    }
    update(dt, game) {
        if (this.invincible > 0) this.invincible -= dt;
        if (this.moving) {
            this.moveProgress += this.moveSpeed * dt;
            if (this.moveProgress >= 1) {
                this.r = this.targetR; this.c = this.targetC;
                this.x = this.c * TILE_SIZE; this.y = this.r * TILE_SIZE;
                this.moving = false; this.moveProgress = 0;
            } else {
                this.x = (this.c + (this.targetC - this.c) * this.moveProgress) * TILE_SIZE;
                this.y = (this.r + (this.targetR - this.r) * this.moveProgress) * TILE_SIZE;
            }
            return;
        }
        // Always chase player, but check for bombs to escape
        const distPlayer = manhattan(this, game.player);
        let nearestBomb = null, minBombDist = 999;
        for (const bomb of game.bombs) {
            const d = manhattan(this, bomb);
            if (d < minBombDist) { minBombDist = d; nearestBomb = bomb; }
        }
        if (minBombDist <= this.type.dangerRadius) {
            this._escape(game, nearestBomb);
        } else {
            this._chase(game);
        }
        if (!this.moving) {
            this.stuckTimer += dt;
            if (this.stuckTimer > 1.5) { this._stuckRecovery(game); this.stuckTimer = 0; }
        } else this.stuckTimer = 0;
    }
    _chase(game) {
        const dr = game.player.r - this.r, dc = game.player.c - this.c;
        let moveR = 0, moveC = 0;
        if (Math.abs(dr) >= Math.abs(dc)) moveR = Math.sign(dr);
        else moveC = Math.sign(dc);
        if (!this._tryMove(moveR, moveC, game)) {
            if (moveR !== 0 && !this._tryMove(0, Math.sign(dc), game)) {
                if (dr !== 0 && this._tryMove(Math.sign(dr), 0, game)) return;
                if (dc !== 0 && this._tryMove(0, Math.sign(dc), game)) return;
            }
        }
    }
    _escape(game, bomb) {
        const dr = this.r - bomb.r, dc = this.c - bomb.c;
        let moveR = 0, moveC = 0;
        if (Math.abs(dr) >= Math.abs(dc)) moveR = Math.sign(dr) || (Math.random() > 0.5 ? 1 : -1);
        else moveC = Math.sign(dc) || (Math.random() > 0.5 ? 1 : -1);
        if (!this._tryMove(moveR, moveC, game)) {
            const perp = [{r: moveC, c: -moveR}, {r: -moveC, c: moveR}];
            for (const p of perp) { if (this._tryMove(p.r, p.c, game)) return; }
            const dirs = [{r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}];
            shuffle(dirs);
            for (const d of dirs) { if ((d.r !== 0 || d.c !== 0) && this._tryMove(d.r, d.c, game)) return; }
        }
    }
    _stuckRecovery(game) {
        const dirs = [{r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}];
        shuffle(dirs);
        for (const d of dirs) { if (this._tryMove(d.r, d.c, game)) return; }
    }
    _tryMove(dr, dc, game) {
        if (dr === 0 && dc === 0) return false;
        const nr = this.r + dr, nc = this.c + dc;
        if (game.isInExplosion(nr, nc)) return false;
        if (this.type.isBoss) {
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false;
            if (game.grid[nr][nc] === TILE.SOLID || game.grid[nr][nc] === TILE.BRICK) return false;
            if (game.bombs.some(b => b.r === nr && b.c === nc)) return false;
        } else {
            if (!game.isWalkableForEnemy(nr, nc, this)) return false;
        }
        this.targetR = nr; this.targetC = nc;
        this.moving = true; this.moveProgress = 0;
        return true;
    }
    takeDamage(amount, game) {
        if (this.invincible > 0) return;
        this.hp -= amount;
        this.invincible = 0.3;
        game.audio.playEnemyHurt();
        game.addFloatingText(this.x + TILE_SIZE/2, this.y, `-${amount}`, COLORS.damage, 12);
        if (this.hp <= 0) this.die(game);
    }
    die(game) {
        const isBoss = this.type.isBoss;
        if (isBoss) {
            game.audio.playBossCry();
            game.audio.playThud();
            game.particles.spawnExplosion(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, '#ff4757', 40);
            game.particles.spawnConfetti(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, 50);
            game.particles.spawnStars(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, 25);
            game.player.score += this.type.score;
            game.addFloatingText(this.x + TILE_SIZE/2, this.y - 30, 'BOSS DEFEATED!', '#ff4757', 22);
            game.addFloatingText(this.x + TILE_SIZE/2, this.y - 50, '+1000', '#fdcb6e', 20);
            game.shakeScreen(20, 1.0);
            game.showAchievement('BOSS SLAYER', 'Kamu telah mengalahkan bos dan mendapatkan piala!');
            game.showNotification('🏆 ACHIEVEMENT: BOSS SLAYER! Kamu mendapatkan piala!', 'win');
            game.saveBossDefeated();
            game.removeEnemy(this);
            return;
        }
        game.audio.playEnemyDeath();
        game.particles.spawnExplosion(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, this.type.color, 20);
        game.player.score += this.type.score;
        game.addFloatingText(this.x + TILE_SIZE/2, this.y, `+${this.type.score}`, COLORS.scoreBonus, 14);
        game.registerKill();
        if (Math.random() < 0.3) {
            const dropType = Math.random() < 0.5 ? 'health' : 'score';
            game.items.push({ r: this.r, c: this.c, type: dropType, hidden: false, collected: false, color: dropType === 'health' ? COLORS.healthPack : COLORS.scoreBonus });
        }
        game.removeEnemy(this);
    }
    draw(ctx, time) {
        const px = this.x + TILE_SIZE/2, py = this.y + TILE_SIZE/2;
        const isBoss = this.type.isBoss;
        const bob = Math.sin((time + this.animOffset) * (isBoss ? 6 : 4)) * (isBoss ? 5 : 3);
        if (this.invincible > 0 && Math.floor(time * 15) % 2 === 0) return;
        ctx.save();
        ctx.globalAlpha = 1.0;

        if (isBoss) {
            // Enhanced boss glow
            const glowSize = 44 + Math.sin(time * 8) * 12;
            ctx.fillStyle = `rgba(255, 71, 87, ${0.35 + Math.sin(time * 6) * 0.15})`;
            ctx.beginPath(); ctx.arc(px, py + bob, glowSize, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = `rgba(255, 165, 2, ${0.25 + Math.sin(time * 10) * 0.15})`;
            ctx.beginPath(); ctx.arc(px, py + bob, glowSize * 0.7, 0, Math.PI * 2); ctx.fill();
            if (Math.floor(time * 20) % 3 === 0) {
                ctx.fillStyle = `rgba(255, 0, 0, 0.18)`;
                ctx.fillRect(px - 38, py - 38 + bob, 76, 76);
            }
        } else {
            // Vibrant radial glow for regular enemies
            const glowPulse = 1 + Math.sin(time * 4 + this.animOffset) * 0.12;
            const glowSize = TILE_SIZE * 0.5 * glowPulse;
            const glowGrad = ctx.createRadialGradient(px, py + bob, 2, px, py + bob, glowSize);
            glowGrad.addColorStop(0, this.type.color + '55');
            glowGrad.addColorStop(0.6, this.type.color + '22');
            glowGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGrad;
            ctx.beginPath(); ctx.arc(px, py + bob, glowSize, 0, Math.PI * 2); ctx.fill();
        }

        // Solid shadow beneath enemy
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.ellipse(px + 3, py + TILE_SIZE * 0.42 + bob * 0.3, isBoss ? TILE_SIZE * 0.55 : TILE_SIZE * 0.35, isBoss ? TILE_SIZE * 0.18 : TILE_SIZE * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Emoji with crisp shadow
        const fontSize = Math.floor(TILE_SIZE * (isBoss ? 1.42 : 0.72));
        ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", emoji, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = isBoss ? 6 : 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;
        ctx.fillText(this.type.emoji, px, py + bob);

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        if (isBoss) {
            ctx.fillStyle = '#ff4757';
            ctx.font = 'bold 10px "Press Start 2P"';
            ctx.fillText('BOSS', px, py - 50 + bob);
        }
        if (this.hp < this.maxHp) {
            const barW = isBoss ? 80 : 44, barH = isBoss ? 12 : 5;
            const barX = px - barW/2, barY = py - (isBoss ? 52 : 32) + bob;
            ctx.fillStyle = '#000';
            ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
            ctx.fillStyle = '#ff7675';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = isBoss ? '#ffa502' : '#00b894';
            ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
            if (isBoss) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`${this.hp}/${this.maxHp}`, px, barY + barH - 1);
            }
        }
        ctx.restore();
    }
}

// ============================================
// BOMB
// ============================================
class Bomb {
    constructor(r, c, radius, owner) {
        this.r = r; this.c = c;
        this.x = c * TILE_SIZE; this.y = r * TILE_SIZE;
        this.radius = radius;
        this.owner = owner;
        this.timer = 2.5;
        this.maxTimer = 2.5;
        this.exploded = false;
        this.pulsePhase = 0;
    }
    update(dt, game) {
        this.timer -= dt;
        this.pulsePhase += dt * 8;
        if (this.timer <= 0 && !this.exploded) this.explode(game);
        if (this.timer <= 0.5 && this.timer > 0 && Math.floor(this.timer * 10) % 2 === 0) {
            if (Math.random() < 0.3) game.audio.playWarning();
        }
    }
    explode(game) {
        this.exploded = true;
        game.audio.playExplosion();
        game.shakeScreen(15, 0.5);
        game.particles.spawnExplosion(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, COLORS.explosion, 25);
        game.particles.spawnSmoke(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, 10);
        game.particles.spawnSparks(this.x + TILE_SIZE/2, this.y + TILE_SIZE/2, 15);
        const explosionCells = [{r: this.r, c: this.c}];
        const dirs = [{r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}];
        for (const d of dirs) {
            for (let i = 1; i <= this.radius; i++) {
                const nr = this.r + d.r * i, nc = this.c + d.c * i;
                if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break;
                explosionCells.push({r: nr, c: nc});
                if (game.grid[nr][nc] === TILE.SOLID || game.grid[nr][nc] === TILE.BRICK) break;
            }
        }
        game.addExplosion(new Explosion(explosionCells, this.radius));
        if (this.owner) this.owner.activeBombs--;
        game.removeBomb(this);
    }
    draw(ctx, time) {
        const px = this.x + TILE_SIZE/2, py = this.y + TILE_SIZE/2;
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.15;
        const size = TILE_SIZE * 0.5 * pulse;
        if (this.timer < 1) {
            ctx.fillStyle = `rgba(253, 203, 110, ${0.3 + Math.sin(time * 20) * 0.2})`;
            ctx.beginPath(); ctx.arc(px, py, size * 1.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = COLORS.bomb;
        ctx.beginPath(); ctx.arc(px, py, size/2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = '#fdcb6e'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px, py - size/2); ctx.quadraticCurveTo(px + 5, py - size/2 - 8, px + 8, py - size/2 - 5); ctx.stroke();
        if (this.timer > 0) {
            ctx.fillStyle = '#fdcb6e';
            ctx.beginPath(); ctx.arc(px + 8 + Math.sin(time * 15) * 2, py - size/2 - 5 + Math.cos(time * 15) * 2, 2, 0, Math.PI * 2); ctx.fill();
        }
        if (this.timer < 1) {
            ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillText(this.timer.toFixed(1), px, py + 3);
        }
    }
}

// ============================================
// EXPLOSION
// ============================================
class Explosion {
    constructor(cells, radius) {
        this.cells = cells; this.radius = radius;
        this.life = 0.5; this.maxLife = 0.5; this.effectsApplied = false;
    }
    update(dt, game) {
        if (!this.effectsApplied) { this._applyEffects(game); this.effectsApplied = true; }
        this.life -= dt;
        if (this.life <= 0) { game.removeExplosion(this); return; }
    }
    _applyEffects(game) {
        for (const cell of this.cells) {
            const r = cell.r, c = cell.c;
            if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
            if (game.grid[r][c] === TILE.BRICK) {
                game.grid[r][c] = TILE.FLOOR;
                game.audio.playBrickBreak();
                game.particles.spawnExplosion(c * TILE_SIZE + TILE_SIZE/2, r * TILE_SIZE + TILE_SIZE/2, '#e17055', 12);
                game.particles.spawnSmoke(c * TILE_SIZE + TILE_SIZE/2, r * TILE_SIZE + TILE_SIZE/2, 6);
                game.addFloatingText(c * TILE_SIZE + TILE_SIZE/2, r * TILE_SIZE, 'BREAK!', '#e17055', 11);
                const item = game.items.find(i => i.r === r && i.c === c && i.hidden && !i.collected);
                if (item) item.hidden = false;
                if (game.exitKey && r === game.exitKey.r && c === game.exitKey.c) {
                    game.items.push({ r, c, type: 'exitKey', hidden: false, collected: false, color: COLORS.exitKey });
                }
            }
            if (game.player && game.player.r === r && game.player.c === c) game.player.takeDamage(game.modeConfig.bombDamage, game);
            for (const enemy of game.enemies) { if (enemy.r === r && enemy.c === c) enemy.takeDamage(game.modeConfig.bombDamage, game); }
            for (const bomb of game.bombs) { if (bomb.r === r && bomb.c === c && !bomb.exploded) { bomb.timer = 0; game.audio.playChainExplosion(); } }
        }
    }
    draw(ctx, time) {
        const alpha = clamp(this.life / this.maxLife, 0, 1);
        for (const cell of this.cells) {
            const x = cell.c * TILE_SIZE, y = cell.r * TILE_SIZE;
            ctx.fillStyle = `rgba(253, 203, 110, ${alpha * 0.6})`; ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            ctx.fillStyle = `rgba(225, 112, 85, ${alpha * 0.8})`; ctx.fillRect(x + 5, y + 5, TILE_SIZE - 10, TILE_SIZE - 10);
            ctx.strokeStyle = `rgba(253, 203, 110, ${alpha})`; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        }
    }
}

// ============================================
// GAME MANAGER
// ============================================
class GameManager {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.audio = new AudioManager();
        this.particles = new ParticleSystem();
        this.mapGen = new MapGenerator();
        this.state = 'WELCOME';
        this.level = 1;
        this.maxLevel = 5;
        this.time = 0;
        this.levelTime = 0;
        this.grid = null;
        this.spawn = null;
        this.exitDoor = null;
        this.exitKey = null;
        this.player = null;
        this.enemies = [];
        this.bombs = [];
        this.explosions = [];
        this.items = [];
        this.floatingTexts = [];
        this.notifications = [];
        this.shakeX = 0; this.shakeY = 0;
        this.shakeIntensity = 0; this.shakeDuration = 0;
        this.lastTime = 0;
        this.comboKills = [];
        this.totalKills = 0;
        this.totalBombs = 0;
        this.totalLevels = 0;
        this.playerScore = 0;
        this.fastestTime = Infinity;
        this.settings = { shake: 1.0, particles: 1.0 };
        this.playerName = '';
        this.selectedChar = null;
        this.selectedMap = 'medium';
        this.selectedMode = 'medium';
        this.modeConfig = MODES.medium;
        this.saveData = SaveManager.load();
        this.menuPixels = null;
        this._setupInput();
        this._setupUI();
        this._renderLoop = this._renderLoop.bind(this);
        requestAnimationFrame(this._renderLoop);
    }

    shakeScreen(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
    }

    _setupInput() {
        this.keys = {}; this.keysPressed = {};
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (!this.keysPressed[e.code]) { this.keysPressed[e.code] = true; this._onKeyDown(e); }
        });
        document.addEventListener('keyup', (e) => { this.keys[e.code] = false; this.keysPressed[e.code] = false; });
    }

    _onKeyDown(e) {
        if (this.state === 'WELCOME') { if (e.code === 'Enter') this.startGame(); return; }
        if (e.code === 'Escape') {
            if (this.state === 'PLAYING') this.pause();
            else if (this.state === 'PAUSED') this.resume();
            return;
        }
        if (this.state !== 'PLAYING') return;
        switch(e.code) {
            case 'KeyW': case 'ArrowUp': if (this.player) this.player.tryMove(-1, 0, this); break;
            case 'KeyS': case 'ArrowDown': if (this.player) this.player.tryMove(1, 0, this); break;
            case 'KeyA': case 'ArrowLeft': if (this.player) this.player.tryMove(0, -1, this); break;
            case 'KeyD': case 'ArrowRight': if (this.player) this.player.tryMove(0, 1, this); break;
            case 'Space': this.placeBomb(); break;
            case 'KeyF': this.interact(); break;
        }
    }

    _setupUI() {
        const charGrid = document.getElementById('character-grid');
        CHARACTERS.forEach((char, idx) => {
            const card = document.createElement('div');
            card.className = 'character-card' + (idx === 0 ? ' selected' : '');
            card.innerHTML = `<div class="character-emoji" style="font-size:42px;line-height:1;">${char.emoji}</div><div class="character-name">${char.name}</div>`;
            card.addEventListener('click', () => {
                document.querySelectorAll('.character-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedChar = char;
            });
            card.addEventListener('mouseenter', () => this.audio.playHover());
            charGrid.appendChild(card);
        });
        this.selectedChar = CHARACTERS[0];

        const mapCards = document.querySelectorAll('.map-card');
        mapCards.forEach(card => {
            card.addEventListener('click', () => {
                mapCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedMap = card.dataset.map;
                this.audio.playClick();
            });
            card.addEventListener('mouseenter', () => this.audio.playHover());
        });

        const modeCards = document.querySelectorAll('.mode-card');
        modeCards.forEach(card => {
            card.addEventListener('click', () => {
                modeCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedMode = card.dataset.mode;
                this.audio.playClick();
            });
            card.addEventListener('mouseenter', () => this.audio.playHover());
        });

        const bindBtn = (id, action) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => { this.audio.playClick(); action(); });
                btn.addEventListener('mouseenter', () => this.audio.playHover());
            }
        };

        bindBtn('btn-start', () => this.startGame());
        bindBtn('btn-howto', () => this.showScreen('howto-screen'));
        bindBtn('btn-settings', () => this.showScreen('settings-screen'));
        bindBtn('btn-history', () => this.showHistory());
        bindBtn('btn-resume', () => this.resume());
        bindBtn('btn-restart', () => this.restartLevel());
        bindBtn('btn-pause-settings', () => this.showScreen('settings-screen'));
        bindBtn('btn-menu', () => this.returnToMenu());
        bindBtn('btn-settings-back', () => this.goBackFromSettings());
        bindBtn('btn-howto-back', () => this.showScreen('welcome-screen'));
        bindBtn('btn-go-restart', () => this.restartGame());
        bindBtn('btn-go-menu', () => this.returnToMenu());
        bindBtn('btn-next-level', () => this.nextLevel());
        bindBtn('btn-lc-menu', () => this.returnToMenu());
        bindBtn('btn-victory-menu', () => this.returnToMenu());
        bindBtn('btn-map-start', () => this.showModeSelect());
        bindBtn('btn-map-back', () => this.showScreen('welcome-screen'));
        bindBtn('btn-mode-start', () => this.modeStart());
        bindBtn('btn-mode-back', () => this.showScreen('map-screen'));
        bindBtn('btn-history-back', () => this.showScreen('welcome-screen'));
        bindBtn('popup-btn-continue', () => {
            document.getElementById('popup-overlay').style.display = 'none';
            this.showScreen('map-screen');
        });
        bindBtn('popup-btn-later', () => {
            document.getElementById('popup-overlay').style.display = 'none';
        });
        bindBtn('btn-history-delete', () => {
            if (confirm('Apakah kamu yakin ingin menghapus semua riwayat permainan?')) {
                const data = SaveManager.load();
                data.history = [];
                SaveManager.save(data);
                this.showHistory();
                this.audio.playClick();
            }
        });

        const nameInput = document.getElementById('player-name');
        nameInput.addEventListener('keydown', (e) => { if (e.code === 'Enter') this.startGame(); });

        ['vol-master', 'vol-music', 'vol-sfx', 'setting-shake', 'setting-particles'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.updateSettings());
        });

        // Trophy click handler
        const trophy = document.getElementById('menu-trophy');
        if (trophy) {
            trophy.addEventListener('click', () => {
                const data = SaveManager.load();
                if (data.bossDefeated) {
                    this.audio.playCoin();
                    this.showPopup('🏆 Piala: BOSS SLAYER', 'Kamu sudah mengalahkan bos level! Mau kalahkan lagi?', 'win', true, 'boss-defeated');
                } else {
                    this.audio.playError();
                    this.showPopup('🔒 Piala Terkunci', 'Kamu harus mengalahkan bos terlebih dahulu!', 'lose', true, 'boss-locked');
                }
            });
            trophy.addEventListener('mouseenter', () => this.audio.playHover());
        }

        this.loadSettings();
        this.updateTrophy();

        // Start menu BGM and pixels
        this.audio.init();
        this.audio.startMenuBGM();
        const pixelCanvas = document.getElementById('menu-pixel-canvas');
        if (pixelCanvas) {
            pixelCanvas.width = window.innerWidth;
            pixelCanvas.height = window.innerHeight;
            this.menuPixels = new MenuPixelSystem(pixelCanvas);
            this.menuPixels.start();
        }
    }

    updateTrophy() {
        const trophy = document.getElementById('menu-trophy');
        if (!trophy) return;
        const data = SaveManager.load();
        if (data.bossDefeated) {
            trophy.classList.add('unlocked');
            trophy.classList.remove('locked');
        } else {
            trophy.classList.add('locked');
            trophy.classList.remove('unlocked');
        }
    }

    saveBossDefeated() {
        const data = SaveManager.load();
        data.bossDefeated = true;
        SaveManager.save(data);
    }

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    showPopup(title, message, type, showButtons = false, popupMode = '') {
        const popup = document.getElementById('popup-overlay');
        const popupTitle = document.getElementById('popup-title');
        const popupMsg = document.getElementById('popup-message');
        const popupButtons = document.getElementById('popup-buttons');
        const popupIcon = document.getElementById('popup-icon');
        const btnContinue = document.getElementById('popup-btn-continue');
        const btnLater = document.getElementById('popup-btn-later');
        if (popup && popupTitle && popupMsg) {
            popupTitle.textContent = title;
            popupMsg.textContent = message;
            popupIcon.textContent = type === 'lose' ? '🔒' : '🏆';
            popup.className = 'popup-overlay ' + type;
            popup.style.display = 'flex';
            if (popupButtons) {
                popupButtons.style.display = showButtons ? 'flex' : 'none';
            }
            // Update button labels based on popup mode
            if (btnContinue && btnLater) {
                if (popupMode === 'boss-defeated') {
                    btnContinue.querySelector('.btn-text') ? btnContinue.querySelector('.btn-text').textContent = 'KALAHKAN LAGI?' : btnContinue.textContent = 'KALAHKAN LAGI?';
                    btnLater.querySelector('.btn-text') ? btnLater.querySelector('.btn-text').textContent = 'LAIN KALI' : btnLater.textContent = 'LAIN KALI';
                } else {
                    btnContinue.querySelector('.btn-text') ? btnContinue.querySelector('.btn-text').textContent = 'LANJUTKAN' : btnContinue.textContent = 'LANJUTKAN';
                    btnLater.querySelector('.btn-text') ? btnLater.querySelector('.btn-text').textContent = 'LAIN KALI' : btnLater.textContent = 'LAIN KALI';
                }
            }
            if (!showButtons) {
                setTimeout(() => { popup.style.display = 'none'; }, 2500);
            }
        }
    }

    startGame() {
        const nameInput = document.getElementById('player-name');
        const name = nameInput.value.trim();
        const error = document.getElementById('name-error');
        if (name.length < 3) { error.textContent = 'Nama minimal 3 karakter!'; this.audio.playError(); return; }
        if (name.length > 20) { error.textContent = 'Nama maksimal 20 karakter!'; this.audio.playError(); return; }
        error.textContent = '';
        this.playerName = name;
        this.audio.init();
        this.audio.playStartGame();
        this.showScreen('map-screen');
    }

    showModeSelect() {
        this.showScreen('mode-screen');
    }

    modeStart() {
        this.modeConfig = MODES[this.selectedMode];
        this.level = 1;
        this.totalKills = 0;
        this.totalBombs = 0;
        this.totalLevels = 0;
        this.playerScore = 0;
        this.startLevel();
    }

    restartGame() {
        this.level = 1;
        this.totalKills = 0;
        this.totalBombs = 0;
        this.totalLevels = 0;
        this.playerScore = 0;
        this.startLevel();
    }

    restartLevel() { this.startLevel(); }

    startLevel() {
        const cfg = MAPS[this.selectedMap];
        TILE_SIZE = cfg.tileSize;
        COLS = cfg.cols;
        ROWS = cfg.rows;
        CANVAS_WIDTH = COLS * TILE_SIZE;
        CANVAS_HEIGHT = ROWS * TILE_SIZE;
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;

        this.state = 'PLAYING';
        this.levelTime = 0;
        this.shakeX = 0; this.shakeY = 0;
        this.shakeIntensity = 0; this.shakeDuration = 0;
        this.comboKills = [];
        this.bombs = [];
        this.explosions = [];
        this.floatingTexts = [];
        this.notifications = [];

        const mapData = this.mapGen.generate(this.level, cfg, this.modeConfig);
        this.grid = mapData.grid;
        this.spawn = mapData.spawn;
        this.exitDoor = mapData.exitDoor;
        this.exitKey = mapData.exitKey;

        this.player = new Player(this.spawn.r, this.spawn.c, this.selectedChar, this.modeConfig);
        this.player.score = this.playerScore || 0;

        const levelScale = 1 + (this.level - 1) * 0.15;
        this.scaledEnemyDamage = Math.floor(this.modeConfig.enemyDamage * levelScale);
        this.enemies = mapData.enemies.map(e => {
            const enemy = new Enemy(e.r, e.c, e.type);
            enemy.moveSpeed *= this.modeConfig.enemySpeed * levelScale;
            // Scale enemy HP based on level
            enemy.hp = Math.floor(enemy.hp * levelScale);
            enemy.maxHp = enemy.hp;
            if (enemy.type.isBoss) {
                enemy.hp = Math.floor(this.modeConfig.bossHp * levelScale);
                enemy.maxHp = enemy.hp;
                enemy.moveSpeed = this.modeConfig.bossSpeed * levelScale;
            }
            return enemy;
        });
        this.items = mapData.items.map(i => ({...i, collected: false, color: this._getItemColor(i.type)}));

        this.showScreen('game-screen');
        this.updateHUD();
        this.audio.playSpawn();
        this.audio.stopMenuBGM();
        this.audio.startGameBGM();

        if (this.level === 5) {
            setTimeout(() => this.audio.playBossLaugh(), 500);
        }
    }

    _getItemColor(type) {
        switch(type) {
            case 'health': return COLORS.healthPack;
            case 'bombUp': return COLORS.bombUp;
            case 'radiusUp': return COLORS.radiusUp;
            case 'score': return COLORS.scoreBonus;
            case 'exitKey': return COLORS.exitKey;
            default: return '#fff';
        }
    }

    placeBomb() {
        if (!this.player || this.player.activeBombs >= this.player.bombCapacity) return;
        if (this.bombs.some(b => b.r === this.player.r && b.c === this.player.c)) return;
        this.player.activeBombs++;
        this.totalBombs++;
        const bomb = new Bomb(this.player.r, this.player.c, this.player.bombRadius, this.player);
        this.bombs.push(bomb);
        this.audio.playPlaceBomb();
        this.particles.spawnSparks(this.player.x + TILE_SIZE/2, this.player.y + TILE_SIZE/2, 5);
    }

    interact() {
        if (!this.player) return;
        const r = this.player.r, c = this.player.c;
        if (r === this.exitDoor.r && c === this.exitDoor.c) {
            if (this.player.hasKey) this.completeLevel();
            else { this.showNotification('Exit Key Required!'); this.audio.playWallImpact(); }
            return;
        }
        const dirs = [{r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}];
        for (const d of dirs) {
            const nr = r + d.r, nc = c + d.c;
            if (nr === this.exitDoor.r && nc === this.exitDoor.c) {
                if (this.player.hasKey) this.completeLevel();
                else { this.showNotification('Exit Key Required!'); this.audio.playWallImpact(); }
                return;
            }
        }
    }

    isWalkable(r, c) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
        if (this.grid[r][c] === TILE.SOLID || this.grid[r][c] === TILE.BRICK) return false;
        if (this.bombs.some(b => b.r === r && b.c === c)) return false;
        return true;
    }
    isWalkableForEnemy(r, c, excludeEnemy = null) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
        if (this.grid[r][c] === TILE.SOLID || this.grid[r][c] === TILE.BRICK) return false;
        if (this.bombs.some(b => b.r === r && b.c === c)) return false;
        if (this.enemies.some(e => e !== excludeEnemy && e.r === r && e.c === c && !e.moving)) return false;
        return true;
    }
    isInExplosion(r, c) { return this.explosions.some(ex => ex.cells.some(cell => cell.r === r && cell.c === c)); }
    addExplosion(explosion) { this.explosions.push(explosion); }
    removeBomb(bomb) { this.bombs = this.bombs.filter(b => b !== bomb); }
    removeEnemy(enemy) { this.enemies = this.enemies.filter(e => e !== enemy); }
    removeExplosion(explosion) { this.explosions = this.explosions.filter(e => e !== explosion); }

    addFloatingText(x, y, text, color, size) { this.floatingTexts.push(new FloatingText(x, y, text, color, size)); }

    showNotification(text, type = 'normal') {
        const area = document.getElementById('notification-area');
        const notif = document.createElement('div');
        notif.className = 'notification' + (type !== 'normal' ? ' ' + type : '');
        notif.textContent = text;
        area.appendChild(notif);
        setTimeout(() => notif.remove(), 2500);
    }

    showAchievement(title, desc) {
        const area = document.getElementById('notification-area');
        const ach = document.createElement('div');
        ach.className = 'notification achievement';
        ach.innerHTML = `<div style="font-size:14px">🏆 ${title}</div><div style="font-size:10px;margin-top:4px">${desc}</div>`;
        area.appendChild(ach);
        setTimeout(() => ach.remove(), 4000);
    }

    registerKill() {
        const now = Date.now();
        this.comboKills.push(now);
        this.comboKills = this.comboKills.filter(t => now - t < 3000);
        this.totalKills++;
        const combo = this.comboKills.length;
        if (combo >= 2) {
            let text = '', bonus = 0;
            if (combo === 2) { text = 'DOUBLE KILL!'; bonus = 50; }
            else if (combo === 3) { text = 'TRIPLE KILL!'; bonus = 100; }
            else { text = 'MULTI KILL!'; bonus = 150; }
            this.player.score += bonus;
            this.audio.playCombo();
            const comboDisplay = document.getElementById('combo-display');
            comboDisplay.innerHTML = `<div>${text}</div><div style="font-size:16px">+${bonus}</div>`;
            comboDisplay.classList.add('show');
            setTimeout(() => comboDisplay.classList.remove('show'), 800);
            this.addFloatingText(this.player.x + TILE_SIZE/2, this.player.y - 20, `+${bonus}`, COLORS.scoreBonus, 16);
        }
    }

    completeLevel() {
        this.state = 'LEVEL_COMPLETE';
        this.totalLevels++;
        this.player.score += 250;
        this.playerScore = this.player.score;
        this.addFloatingText(this.player.x + TILE_SIZE/2, this.player.y - 20, 'LEVEL COMPLETE! +250', COLORS.scoreBonus, 16);
        if (this.levelTime < this.fastestTime) this.fastestTime = this.levelTime;
        this.audio.stopGameBGM();
        this.audio.playEscapeJingle();
        this.audio.playWinFanfare();
        this.particles.spawnConfetti(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 60);
        this.particles.spawnStars(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 30);
        this.shakeScreen(5, 0.3);
        this.showNotification('ESCAPE SUCCESS!', 'escape');
        this.saveStats();
        this.saveHistory();

        const statsDiv = document.getElementById('level-stats');
        statsDiv.innerHTML = `
            <div class="stat-line"><span>Level</span><span>${this.level}</span></div>
            <div class="stat-line"><span>Score</span><span>${this.playerScore}</span></div>
            <div class="stat-line"><span>Time</span><span>${formatTime(this.levelTime)}</span></div>
            <div class="stat-line"><span>Enemies Killed</span><span>${this.totalKills}</span></div>
        `;

        if (this.level >= 5) {
            setTimeout(() => this.showVictory(), 1500);
        } else {
            setTimeout(() => this.showScreen('levelcomplete-screen'), 1500);
        }
    }

    showVictory() {
        this.audio.stopGameBGM();
        this.audio.playVictory();
        this.audio.playWinFanfare();
        this.shakeScreen(8, 0.5);
        this.particles.spawnConfetti(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 80);
        this.particles.spawnStars(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 40);
        this.showNotification('🏆 KAMU MENANG! KAMU TELAH BERHASIL MENGALAHKAN BOS!', 'win');
        const statsDiv = document.getElementById('victory-stats');
        statsDiv.innerHTML = `
            <div class="stat-line"><span>Nama</span><span>${this.playerName}</span></div>
            <div class="stat-line"><span>Score Akhir</span><span>${this.player ? this.player.score : 0}</span></div>
            <div class="stat-line"><span>Total Kill</span><span>${this.totalKills}</span></div>
            <div class="stat-line"><span>Total Bom</span><span>${this.totalBombs}</span></div>
            <div class="stat-line"><span>Waktu Bermain</span><span>${formatTime(this.levelTime)}</span></div>
        `;
        this.showScreen('victory-screen');
    }

    nextLevel() {
        if (this.level === 4) {
            this.showBossNotification();
        } else {
            this.level++;
            this.showScreen('game-screen');
            this.startLevel();
        }
    }

    showBossNotification() {
        this.showScreen('boss-screen');
        this.audio.playBossAlert();
        this.audio.playDramatic();
        this.shakeScreen(10, 2.0);
        setTimeout(() => {
            this.level = 5;
            this.showScreen('game-screen');
            this.startLevel();
        }, 3000);
    }

    gameOver() {
        this.state = 'GAMEOVER';
        this.audio.stopGameBGM();
        this.audio.playLoseTune();
        this.audio.playDefeat();
        this.saveStats();
        this.saveHistory();
        this.shakeScreen(8, 0.5);
        this.particles.spawnSmoke(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 20);
        this.showNotification('GAME OVER...', 'lose');
        const title = document.getElementById('go-title');
        title.textContent = 'GAME OVER';
        const statsDiv = document.getElementById('go-stats');
        statsDiv.innerHTML = `
            <div class="stat-line"><span>Nama</span><span>${this.playerName}</span></div>
            <div class="stat-line"><span>Level Tercapai</span><span>${this.level}</span></div>
            <div class="stat-line"><span>Score Akhir</span><span>${this.player ? this.player.score : 0}</span></div>
            <div class="stat-line"><span>Total Kill</span><span>${this.totalKills}</span></div>
            <div class="stat-line"><span>Total Bom</span><span>${this.totalBombs}</span></div>
            <div class="stat-line"><span>Waktu Bermain</span><span>${formatTime(this.levelTime)}</span></div>
        `;
        setTimeout(() => this.showScreen('gameover-screen'), 1000);
    }

    pause() {
        this.state = 'PAUSED';
        this.audio.playPause();
        this.audio.stopGameBGM();
        this.showScreen('pause-screen');
    }

    resume() {
        this.state = 'PLAYING';
        this.audio.playResume();
        this.audio.startGameBGM();
        this.showScreen('game-screen');
        this.lastTime = performance.now();
    }

    returnToMenu() {
        this.state = 'WELCOME';
        this.audio.stopGameBGM();
        this.audio.playMenuOpen();
        this.showScreen('welcome-screen');
        this.updateTrophy();
        this.audio.startMenuBGM();
        if (this.menuPixels) {
            this.menuPixels.start();
        }
    }

    goBackFromSettings() {
        if (this.state === 'PAUSED') this.showScreen('pause-screen');
        else this.showScreen('welcome-screen');
    }

    updateSettings() {
        const master = document.getElementById('vol-master');
        const music = document.getElementById('vol-music');
        const sfx = document.getElementById('vol-sfx');
        const shake = document.getElementById('setting-shake');
        const particles = document.getElementById('setting-particles');
        if (master) this.audio.volMaster = master.value / 100;
        if (music) this.audio.volMusic = music.value / 100;
        if (sfx) this.audio.volSFX = sfx.value / 100;
        if (shake) this.settings.shake = shake.value / 100;
        if (particles) this.settings.particles = particles.value / 100;
        this.audio.updateVolumes();
    }

    loadSettings() {
        const master = document.getElementById('vol-master');
        const music = document.getElementById('vol-music');
        const sfx = document.getElementById('vol-sfx');
        const shake = document.getElementById('setting-shake');
        const particles = document.getElementById('setting-particles');
        if (master) master.value = this.audio.volMaster * 100;
        if (music) music.value = this.audio.volMusic * 100;
        if (sfx) sfx.value = this.audio.volSFX * 100;
        if (shake) shake.value = this.settings.shake * 100;
        if (particles) particles.value = this.settings.particles * 100;
    }

    saveStats() {
        const data = SaveManager.load();
        data.playerName = this.playerName;
        data.highestScore = Math.max(data.highestScore || 0, this.player ? this.player.score : 0);
        data.highestLevel = Math.max(data.highestLevel || 0, this.level);
        data.totalKills = (data.totalKills || 0) + this.totalKills;
        data.totalBombs = (data.totalBombs || 0) + this.totalBombs;
        data.totalLevels = (data.totalLevels || 0) + this.totalLevels;
        if (this.fastestTime < Infinity) data.fastestTime = Math.min(data.fastestTime || Infinity, this.fastestTime);
        SaveManager.save(data);
    }

    saveHistory() {
        const data = SaveManager.load();
        if (!data.history) data.history = [];
        data.history.unshift({
            name: this.playerName,
            score: this.player ? this.player.score : 0,
            time: formatTime(this.levelTime),
            level: this.level,
            map: this.selectedMap,
            mode: this.selectedMode,
            date: new Date().toLocaleString('id-ID')
        });
        if (data.history.length > 20) data.history = data.history.slice(0, 20);
        SaveManager.save(data);
    }

    showHistory() {
        const data = SaveManager.load();
        const content = document.getElementById('history-content');
        const deleteBtn = document.getElementById('btn-history-delete');
        if (!data.history || data.history.length === 0) {
            content.innerHTML = '<p class="history-empty">Belum ada riwayat permainan.</p>';
            if (deleteBtn) deleteBtn.style.display = 'none';
        } else {
            if (deleteBtn) deleteBtn.style.display = 'block';
            let html = `<div class="history-header"><div>NAMA</div><div>SCORE</div><div>WAKTU</div><div>LEVEL</div></div>`;
            for (const entry of data.history) {
                html += `<div class="history-entry">
                    <div class="h-name">${entry.name}</div>
                    <div class="h-score">${entry.score}</div>
                    <div class="h-time">${entry.time}</div>
                    <div class="h-level">${entry.level}</div>
                </div>`;
            }
            content.innerHTML = html;
        }
        this.showScreen('history-screen');
    }

    updateHUD() {
        if (!this.player) return;
        document.getElementById('hud-name').textContent = this.playerName;
        document.getElementById('hud-level').textContent = this.level;
        document.getElementById('hud-score').textContent = this.player.score;
        document.getElementById('hud-timer').textContent = formatTime(this.levelTime);
        document.getElementById('hud-enemies').textContent = this.enemies.length;
        document.getElementById('health-text').textContent = `${Math.max(0, this.player.hp)}/${this.player.maxHp}`;
        document.getElementById('health-bar').style.width = `${(this.player.hp / this.player.maxHp) * 100}%`;
        document.getElementById('hud-lives').textContent = this.player.lives;
        document.getElementById('hud-bombs').textContent = `${this.player.activeBombs}/${this.player.bombCapacity}`;
        document.getElementById('hud-radius').textContent = this.player.bombRadius;
        const keyStatus = document.getElementById('key-status');
        if (this.player.hasKey) { keyStatus.textContent = '🔓 EXIT KEY FOUND'; keyStatus.classList.add('has-key'); }
        else { keyStatus.textContent = '🔒 EXIT KEY'; keyStatus.classList.remove('has-key'); }
        const avatarDiv = document.getElementById('hud-avatar');
        if (avatarDiv && this.selectedChar) {
            avatarDiv.innerHTML = `<div style="font-size:28px;text-align:center;line-height:40px;">${this.selectedChar.emoji}</div>`;
        }
    }

    _renderLoop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;
        this.time = timestamp / 1000;
        if (this.state === 'PLAYING') {
            this.levelTime += dt;
            this.update(dt);
            this.render(this.ctx, this.time);
            this.updateHUD();
        } else if (this.state === 'LEVEL_COMPLETE' || this.state === 'GAMEOVER') {
            this.render(this.ctx, this.time);
            this.updateHUD();
        }
        requestAnimationFrame(this._renderLoop);
    }

    update(dt) {
        if (this.player) this.player.update(dt, this);
        [...this.enemies].forEach(e => e.update(dt, this));
        [...this.bombs].forEach(b => b.update(dt, this));
        [...this.explosions].forEach(e => e.update(dt, this));
        this.particles.update(dt);
        this.floatingTexts.forEach(t => t.update(dt));
        this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);
        if (this.shakeDuration > 0) {
            this.shakeDuration -= dt;
            this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * this.settings.shake;
            this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * this.settings.shake;
            this.shakeIntensity *= 0.9;
        } else { this.shakeX = 0; this.shakeY = 0; }
        if (this.player && this.player.invincible <= 0) {
            for (const enemy of this.enemies) {
                if (enemy.r === this.player.r && enemy.c === this.player.c) this.player.takeDamage(this.scaledEnemyDamage || this.modeConfig.enemyDamage, this);
            }
        }
    }

    render(ctx, time) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.save();
        ctx.translate(this.shakeX, this.shakeY);
        this._drawGrid(ctx, time);
        for (const item of this.items) { if (!item.collected && !item.hidden) this._drawItem(ctx, item, time); }
        this._drawExitDoor(ctx, time);
        for (const bomb of this.bombs) bomb.draw(ctx, time);
        for (const ex of this.explosions) ex.draw(ctx, time);
        for (const enemy of this.enemies) enemy.draw(ctx, time);
        if (this.player) this.player.draw(ctx, time);
        if (this.settings.particles > 0) { ctx.globalAlpha = this.settings.particles; this.particles.draw(ctx); ctx.globalAlpha = 1; }
        for (const text of this.floatingTexts) text.draw(ctx);
        this._drawInteractionPrompt(ctx);
        ctx.restore();
    }

    _drawGrid(ctx, time) {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const x = c * TILE_SIZE, y = r * TILE_SIZE;
                const tile = this.grid[r][c];
                if (tile === TILE.SOLID) {
                    ctx.fillStyle = COLORS.solid;
                    ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
                    ctx.strokeStyle = COLORS.solidBorder; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
                    ctx.fillStyle = 'rgba(0,0,0,0.15)';
                    ctx.fillRect(x + 4, y + 4, TILE_SIZE/2 - 4, TILE_SIZE/4 - 2);
                    ctx.fillRect(x + TILE_SIZE/2, y + 4, TILE_SIZE/2 - 4, TILE_SIZE/4 - 2);
                    ctx.fillRect(x + 4, y + TILE_SIZE/4 + 2, TILE_SIZE/3 - 4, TILE_SIZE/4 - 2);
                    ctx.fillRect(x + TILE_SIZE/3 + 2, y + TILE_SIZE/4 + 2, TILE_SIZE/3 - 2, TILE_SIZE/4 - 2);
                    ctx.fillRect(x + TILE_SIZE*2/3 + 2, y + TILE_SIZE/4 + 2, TILE_SIZE/3 - 4, TILE_SIZE/4 - 2);
                    ctx.fillRect(x + 4, y + TILE_SIZE/2 + 2, TILE_SIZE/2 - 4, TILE_SIZE/4 - 2);
                    ctx.fillRect(x + TILE_SIZE/2, y + TILE_SIZE/2 + 2, TILE_SIZE/2 - 4, TILE_SIZE/4 - 2);
                } else if (tile === TILE.BRICK) {
                    ctx.fillStyle = COLORS.brick;
                    ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
                    ctx.strokeStyle = COLORS.brickBorder; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
                    ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    ctx.fillRect(x + 3, y + 3, TILE_SIZE/2 - 3, 6);
                    ctx.fillRect(x + TILE_SIZE/2, y + 3, TILE_SIZE/2 - 3, 6);
                    ctx.fillRect(x + 3, y + 12, TILE_SIZE/3 - 3, 6);
                    ctx.fillRect(x + TILE_SIZE/3 + 2, y + 12, TILE_SIZE/3 - 2, 6);
                    ctx.fillRect(x + TILE_SIZE*2/3 + 2, y + 12, TILE_SIZE/3 - 3, 6);
                    ctx.fillRect(x + 3, y + 21, TILE_SIZE/2 - 3, 6);
                    ctx.fillRect(x + TILE_SIZE/2, y + 21, TILE_SIZE/2 - 3, 6);
                    ctx.fillRect(x + 3, y + 30, TILE_SIZE/3 - 3, 6);
                    ctx.fillRect(x + TILE_SIZE/3 + 2, y + 30, TILE_SIZE/3 - 2, 6);
                    ctx.fillRect(x + TILE_SIZE*2/3 + 2, y + 30, TILE_SIZE/3 - 3, 6);
                    ctx.fillRect(x + 3, y + 39, TILE_SIZE/2 - 3, 6);
                    ctx.fillRect(x + TILE_SIZE/2, y + 39, TILE_SIZE/2 - 3, 6);
                } else {
                    ctx.fillStyle = ((r + c) % 2 === 0) ? COLORS.floor : COLORS.floorAlt;
                    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }

    _drawItem(ctx, item, time) {
        const x = item.c * TILE_SIZE + TILE_SIZE/2, y = item.r * TILE_SIZE + TILE_SIZE/2;
        const bob = Math.sin(time * 3 + item.c) * 3;
        ctx.fillStyle = item.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        if (item.type === 'health') {
            ctx.beginPath(); ctx.arc(x - 6, y - 4 + bob, 6, 0, Math.PI * 2); ctx.arc(x + 6, y - 4 + bob, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(x - 12, y + 2 + bob); ctx.lineTo(x, y + 14 + bob); ctx.lineTo(x + 12, y + 2 + bob); ctx.fill(); ctx.stroke();
        } else if (item.type === 'bombUp') {
            ctx.beginPath(); ctx.arc(x, y + bob, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillText('+', x, y + 3 + bob);
        } else if (item.type === 'radiusUp') {
            ctx.beginPath(); ctx.arc(x, y + bob, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillText('R', x, y + 3 + bob);
        } else if (item.type === 'score') {
            ctx.beginPath(); ctx.arc(x, y + bob, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#000'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('$', x, y + 3 + bob);
        } else if (item.type === 'exitKey') {
            ctx.fillStyle = `rgba(253, 203, 110, ${0.4 + Math.sin(time * 4) * 0.2})`; ctx.beginPath(); ctx.arc(x, y + bob, 18, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = COLORS.exitKey; ctx.beginPath(); ctx.arc(x, y + bob, 10, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#000'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillText('K', x, y + 3 + bob);
        }
    }

    _drawExitDoor(ctx, time) {
        if (!this.exitDoor) return;
        const x = this.exitDoor.c * TILE_SIZE, y = this.exitDoor.r * TILE_SIZE;
        const open = this.player && this.player.hasKey;
        ctx.fillStyle = '#2d3436'; ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.fillStyle = open ? COLORS.exitDoorOpen : COLORS.exitDoor;
        ctx.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px "Press Start 2P"'; ctx.textAlign = 'center'; ctx.fillText(open ? 'EXIT' : 'LOCK', x + TILE_SIZE/2, y + TILE_SIZE/2 + 5);
        if (open) { ctx.fillStyle = `rgba(0, 184, 148, ${0.3 + Math.sin(time * 3) * 0.2})`; ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4); }
    }

    _drawInteractionPrompt(ctx) {
        if (!this.player || !this.exitDoor) return;
        const dist = manhattan(this.player, this.exitDoor);
        if (dist <= 1) {
            const x = this.exitDoor.c * TILE_SIZE + TILE_SIZE/2, y = this.exitDoor.r * TILE_SIZE - 10;
            ctx.fillStyle = '#FFE66D'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
            ctx.font = 'bold 10px "Press Start 2P"'; ctx.textAlign = 'center';
            const text = this.player.hasKey ? '[F] OPEN EXIT' : 'KEY REQUIRED';
            const width = ctx.measureText(text).width + 16;
            ctx.fillRect(x - width/2, y - 14, width, 20); ctx.strokeRect(x - width/2, y - 14, width, 20);
            ctx.fillStyle = '#000'; ctx.fillText(text, x, y);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new GameManager();
});