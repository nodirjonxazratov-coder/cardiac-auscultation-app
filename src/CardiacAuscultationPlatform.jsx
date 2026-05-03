import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

import {
  Heart,
  Volume2,
  BookOpen,
  Brain,
  BarChart3,
  Bookmark,
  BookmarkCheck,
  Moon,
  Sun,
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Timer,
  Award,
  Activity,
  Stethoscope,
  ArrowRight,
  Star,
  GraduationCap,
  Shuffle,
  Layers,
  Home,
  User,
  Trophy,
  ListChecks,
  Sparkles,
  ScrollText,
  AlertCircle,
  TrendingUp
} from "lucide-react";

/* ============================================================================
 * CARDIAC AUSCULTATION TRAINING PLATFORM
 * Educational tool for medical students
 * Architecture: modular, scalable, backend-ready
 * ============================================================================ */

/* ============================================================================
 * 1. HEART SOUND SYNTHESIS ENGINE (Web Audio API)
 * Yurak tovushlarini real vaqtda sintez qiladi
 * ============================================================================ */

class HeartSoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.activeNodes = [];
    this.isPlaying = false;
    this.scheduledLoop = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  // S1 — Mitral + Tricuspid yopilishi (~30-45 Hz, low-pitch thump)
  scheduleS1(time, intensity = 1) {
    const ctx = this.ctx;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(35, time);
    osc1.frequency.exponentialRampToValueAtTime(28, time + 0.12);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(70, time);
    osc2.frequency.exponentialRampToValueAtTime(50, time + 0.1);

    filter.type = 'lowpass';
    filter.frequency.value = 180;
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.55 * intensity, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(filter);
    filter.connect(this.masterGain);

    osc1.start(time); osc2.start(time);
    osc1.stop(time + 0.18); osc2.stop(time + 0.18);
    this.activeNodes.push(osc1, osc2);
  }

  // S2 — Aortic + Pulmonic yopilishi (~50-100 Hz, sharper, higher than S1)
  scheduleS2(time, intensity = 1, split = false) {
    const ctx = this.ctx;
    const playComponent = (t, freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.08);

      filter.type = 'lowpass';
      filter.frequency.value = 220;
      filter.Q.value = 2.5;

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.45 * intensity, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);

      osc.connect(gain);
      gain.connect(filter);
      filter.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.13);
      this.activeNodes.push(osc);
    };
    playComponent(time, 65);
    if (split) playComponent(time + 0.04, 75);
  }

  // S3 — early diastolic, low pitch (ventricular gallop)
  scheduleS3(time) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.value = 25;
    filter.type = 'lowpass';
    filter.frequency.value = 80;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.25, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.13);
    osc.connect(gain); gain.connect(filter); filter.connect(this.masterGain);
    osc.start(time); osc.stop(time + 0.16);
    this.activeNodes.push(osc);
  }

  // S4 — late diastolic, atrial gallop
  scheduleS4(time) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.value = 22;
    filter.type = 'lowpass';
    filter.frequency.value = 75;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.22, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
    osc.connect(gain); gain.connect(filter); filter.connect(this.masterGain);
    osc.start(time); osc.stop(time + 0.13);
    this.activeNodes.push(osc);
  }

  // Murmur — filtered noise with shaped envelope
  scheduleMurmur(startTime, duration, config) {
    const ctx = this.ctx;
    const sampleRate = ctx.sampleRate;
    const bufferLen = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferLen, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferLen; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = config.filterType || 'bandpass';
    filter.frequency.value = config.centerFreq || 200;
    filter.Q.value = config.Q || 1.5;

    const gain = ctx.createGain();
    const peak = config.intensity || 0.18;

    // Envelope shapes
    if (config.envelope === 'crescendo-decrescendo') {
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peak, startTime + duration * 0.5);
      gain.gain.linearRampToValueAtTime(0.0001, startTime + duration);
    } else if (config.envelope === 'decrescendo') {
      gain.gain.setValueAtTime(peak, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    } else if (config.envelope === 'crescendo') {
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peak, startTime + duration);
    } else if (config.envelope === 'plateau' || config.envelope === 'holosystolic') {
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peak, startTime + 0.02);
      gain.gain.linearRampToValueAtTime(peak, startTime + duration - 0.02);
      gain.gain.linearRampToValueAtTime(0.0001, startTime + duration);
    } else {
      // rumble (low-frequency, sustained)
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peak, startTime + 0.04);
      gain.gain.linearRampToValueAtTime(peak * 0.7, startTime + duration - 0.05);
      gain.gain.linearRampToValueAtTime(0.0001, startTime + duration);
    }

    noiseSrc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noiseSrc.start(startTime);
    noiseSrc.stop(startTime + duration);
    this.activeNodes.push(noiseSrc);
  }

  // Opening snap (Mitral stenosis) — sharp click in early diastole
  scheduleOpeningSnap(time) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 110;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.3, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(time); osc.stop(time + 0.05);
    this.activeNodes.push(osc);
  }

  // Schedule one full cardiac cycle for a given pathology
  scheduleCycle(soundId, startTime, hr = 75) {
    const cycleDur = 60 / hr;
    const systoleDur = cycleDur * 0.35; // ~0.28s at HR 75
    const s2Time = startTime + systoleDur;
    const nextS1 = startTime + cycleDur;

    const config = SOUND_CONFIGS[soundId];
    if (!config) return;

    // Default S1 and S2 unless overridden
    if (config.s1 !== false) this.scheduleS1(startTime, config.s1Intensity || 1);
    if (config.s2 !== false) this.scheduleS2(s2Time, config.s2Intensity || 1, config.s2Split);

    if (config.s3) this.scheduleS3(s2Time + 0.16);
    if (config.s4) this.scheduleS4(nextS1 - 0.09);
    if (config.openingSnap) this.scheduleOpeningSnap(s2Time + 0.08);

    if (config.murmur) {
      const m = config.murmur;
      let mStart, mDur;
      if (m.timing === 'systolic') {
        mStart = startTime + 0.04;
        mDur = systoleDur - 0.06;
      } else if (m.timing === 'holosystolic') {
        mStart = startTime + 0.02;
        mDur = systoleDur - 0.03;
      } else if (m.timing === 'early-diastolic') {
        mStart = s2Time + 0.03;
        mDur = (cycleDur - systoleDur) * 0.55;
      } else if (m.timing === 'mid-late-diastolic') {
        mStart = s2Time + 0.18;
        mDur = (cycleDur - systoleDur) * 0.55;
      }
      if (mStart && mDur > 0) this.scheduleMurmur(mStart, mDur, m);
    }
  }

  play(soundId, hr = 75) {
    this.init();
    this.stop();
    this.isPlaying = true;
    const cycleDur = 60 / hr;
    const startNow = this.ctx.currentTime + 0.05;

    const scheduleAhead = () => {
      if (!this.isPlaying) return;
      const now = this.ctx.currentTime;
      // Schedule next 4 cycles ahead
      for (let i = 0; i < 4; i++) {
        const t = (this._nextCycleTime || startNow) + i * cycleDur;
        if (t < now + 2) {
          this.scheduleCycle(soundId, t, hr);
        }
      }
      this._nextCycleTime = (this._nextCycleTime || startNow) + 4 * cycleDur;
      this.scheduledLoop = setTimeout(scheduleAhead, cycleDur * 1000 * 2);
    };

    this._nextCycleTime = startNow;
    scheduleAhead();
  }

  stop() {
    this.isPlaying = false;
    if (this.scheduledLoop) {
      clearTimeout(this.scheduledLoop);
      this.scheduledLoop = null;
    }
    this._nextCycleTime = null;
    try {
      this.activeNodes.forEach(n => { try { n.stop(); } catch (e) {} });
    } catch (e) {}
    this.activeNodes = [];
  }

  setVolume(v) {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v));
  }
}

/* ============================================================================
 * 2. SOUND CONFIGURATIONS
 * Har bir tovush uchun sintez parametrlari
 * ============================================================================ */

const SOUND_CONFIGS = {
  s1: { /* default S1 + S2 */ },
  s2: { /* default S1 + S2 */ },
  's2-split': { s2Split: true },
  s3: { s3: true },
  s4: { s4: true },
  'aortic-stenosis': {
    murmur: { timing: 'systolic', envelope: 'crescendo-decrescendo',
              centerFreq: 280, Q: 1.2, intensity: 0.32, filterType: 'bandpass' },
    s2Intensity: 0.5, // softened A2
  },
  'aortic-regurgitation': {
    murmur: { timing: 'early-diastolic', envelope: 'decrescendo',
              centerFreq: 600, Q: 0.8, intensity: 0.18, filterType: 'bandpass' },
  },
  'mitral-regurgitation': {
    murmur: { timing: 'holosystolic', envelope: 'holosystolic',
              centerFreq: 380, Q: 1.0, intensity: 0.24, filterType: 'bandpass' },
    s1Intensity: 0.6,
  },
  'mitral-stenosis': {
    openingSnap: true,
    murmur: { timing: 'mid-late-diastolic', envelope: 'rumble',
              centerFreq: 60, Q: 1.5, intensity: 0.26, filterType: 'lowpass' },
    s1Intensity: 1.3, // loud S1 ("tapping apex")
  },
  'tricuspid-regurgitation': {
    murmur: { timing: 'holosystolic', envelope: 'holosystolic',
              centerFreq: 320, Q: 1.0, intensity: 0.20, filterType: 'bandpass' },
  },
  'pulmonary-stenosis': {
    murmur: { timing: 'systolic', envelope: 'crescendo-decrescendo',
              centerFreq: 260, Q: 1.2, intensity: 0.28, filterType: 'bandpass' },
    s2Split: true,
  },
};

/* ============================================================================
 * 3. CONTENT DATA
 * ============================================================================ */

const HEART_SOUNDS = [
  // NORMAL
  { id: 's1', category: 'normal', name: 'S1', fullName: 'Birinchi yurak toni',
    description: 'Mitral va trikuspidal klapanlarning yopilishi tomonidan hosil bo\'ladi. Sistolaning boshlanishini belgilaydi.',
    location: 'Apex (mitral nuqtasi)da eng baland',
    phase: 'Sistolaning boshlanishi',
    clinical: 'Mitral stenozda kuchayadi, MR/AR\'da susayadi',
    diagram: 'lub'
  },
  { id: 's2', category: 'normal', name: 'S2', fullName: 'Ikkinchi yurak toni',
    description: 'Aortal va o\'pka klapanlarining yopilishi. Sistolaning oxirini belgilaydi.',
    location: 'Asosi (aortal va pulmonal nuqtalar)da eng baland',
    phase: 'Sistolaning oxiri / diastolaning boshlanishi',
    clinical: 'Fiziologik split inspiratsiyada normal. Fixed split — ASD belgisi.',
    diagram: 'dub'
  },
  // ADDITIONAL
  { id: 's3', category: 'additional', name: 'S3', fullName: 'Uchinchi yurak toni (Ventrikulyar gallop)',
    description: 'Erta diastolada ventrikulning tez to\'lishi vaqtida. Yoshlarda normal bo\'lishi mumkin, kattalarda — qalb yetishmovchiligi belgisi.',
    location: 'Apexda, qo\'ng\'iroq (bell) bilan, chap yon yotgan holatda',
    phase: 'Erta diastola (S2 dan keyin)',
    clinical: 'Yurak yetishmovchiligi (HFrEF), volume overload, dilatatsion KMP',
    diagram: 'lub-dub-DEE'
  },
  { id: 's4', category: 'additional', name: 'S4', fullName: 'To\'rtinchi yurak toni (Atrial gallop)',
    description: 'Predserdiya yangi qisqargach, qattiq ventrikulga qon urilishidan paydo bo\'ladi. Har doim patologik.',
    location: 'Apexda, qo\'ng\'iroq bilan',
    phase: 'Kech diastola (S1 dan oldin)',
    clinical: 'LV gipertrofiyasi, gipertoniya, AS, HFpEF, ishemik kardiomiopatiya',
    diagram: 'DEE-lub-dub'
  },
  // MURMURS
  { id: 'aortic-stenosis', category: 'murmur', name: 'Aortal stenoz', shortName: 'AS',
    fullName: 'Aortic Stenosis',
    description: 'Qattiq, sistolik crescendo-decrescendo (diamond-shaped) shovqin. Karotidlarga tarqaladi.',
    location: '2-qovurg\'alararo bo\'shliq, o\'ng to\'sh chetida (Aortal nuqtasi)',
    phase: 'Mid-sistolik (ejection)',
    clinical: 'Triada: stenokardiya, sinkope, yurak yetishmovchiligi. SAVR/TAVR ko\'rsatkichi.',
    radiation: 'Karotid arteriyalarga',
    severity: 'Pulsus parvus et tardus, kech zo\'rayuvchi shovqin = og\'ir AS',
    diagram: 'crescendo-decrescendo'
  },
  { id: 'aortic-regurgitation', category: 'murmur', name: 'Aortal regurgitatsiya', shortName: 'AR',
    fullName: 'Aortic Regurgitation',
    description: 'Yuqori chastotali, "blowing", erta diastolik decrescendo shovqin. Eng yaxshi nafas chiqarish va oldinga egilganda eshitiladi.',
    location: 'Erb nuqtasi (3-ICS LSB) — eng yaxshi',
    phase: 'Erta diastolik',
    clinical: 'Keng pulse pressure, Corrigan, Quincke, de Musset belgilari. Surunkali AR — LV dilatatsiyasi.',
    radiation: 'Sternum bo\'ylab',
    severity: 'Shovqin uzunligi davomiyligini bildiradi (uzunroq = og\'irroq)',
    diagram: 'decrescendo-diastolic'
  },
  { id: 'mitral-regurgitation', category: 'murmur', name: 'Mitral regurgitatsiya', shortName: 'MR',
    fullName: 'Mitral Regurgitation',
    description: 'Yuqori chastotali, holosistolik, "blowing" shovqin. Shovqin S1 dan boshlab S2 ga qadar bir xil intensivlikda.',
    location: 'Apex (5-ICS MCL)',
    phase: 'Holosistolik',
    clinical: 'Sabablari: MVP, ishemiya (papilyar mushak), reumatik, endokardit',
    radiation: 'Chap qo\'ltiq ostiga',
    severity: 'S3 bo\'lishi — og\'ir MR alomati',
    diagram: 'holosystolic'
  },
  { id: 'mitral-stenosis', category: 'murmur', name: 'Mitral stenoz', shortName: 'MS',
    fullName: 'Mitral Stenosis',
    description: 'Past chastotali diastolik "rumble". Ovozli S1 va opening snap S2 dan keyin. Chap yon yotgan holatda qo\'ng\'iroq bilan eshitiladi.',
    location: 'Apex',
    phase: 'Mid-kech diastolik',
    clinical: 'Asosan reumatik. Atrial fibrilatsiya, LA dilatatsiyasi, pulmonal HTN.',
    radiation: 'Lokalizatsiyalangan',
    severity: 'A2-OS oralig\'i qisqaroq = og\'irroq stenoz',
    diagram: 'os-rumble'
  },
  { id: 'tricuspid-regurgitation', category: 'murmur', name: 'Trikuspidal regurgitatsiya', shortName: 'TR',
    fullName: 'Tricuspid Regurgitation',
    description: 'Holosistolik, "blowing" shovqin. Inspiratsiyada kuchayadi (Carvallo belgisi).',
    location: '4-ICS, chap to\'sh chetida (Trikuspidal nuqtasi)',
    phase: 'Holosistolik',
    clinical: 'Pulmonal HTN, infektiv endokardit (IV giyoh isteʼmolchilarda), Ebstein anomaliyasi',
    radiation: 'Sternum bo\'ylab',
    severity: 'Yugulyar venoz pulsda katta v-to\'lqin, pulsatsiyalangan jigar',
    diagram: 'holosystolic'
  },
  { id: 'pulmonary-stenosis', category: 'murmur', name: 'Pulmonal stenoz', shortName: 'PS',
    fullName: 'Pulmonary Stenosis',
    description: 'Sistolik crescendo-decrescendo shovqin, AS ga o\'xshaydi lekin chap to\'shda. Keng split S2.',
    location: '2-ICS, chap to\'sh chetida (Pulmonal nuqtasi)',
    phase: 'Mid-sistolik',
    clinical: 'Tug\'ma. Tetralogiya Fallo komponenti. Inspiratsiyada kuchayadi.',
    radiation: 'Chap o\'mrov ostiga',
    severity: 'Shovqinning kechroq pog\'onaga chiqishi — og\'irroq',
    diagram: 'crescendo-decrescendo'
  },
];

/* ============================================================================
 * 4. AUSCULTATION POINTS
 * Anatomik joylashuv — ko'krak diagrammasidagi koordinatalar
 * ============================================================================ */

const AUSCULTATION_POINTS = [
  { id: 'aortic', name: 'Aortal', fullName: 'Aortal nuqtasi',
    location: '2-qovurg\'alararo bo\'shliq, o\'ng to\'sh cheti',
    locationEn: '2nd ICS, Right Sternal Border',
    cx: 230, cy: 178,
    primarySound: 's2',
    associated: ['Aortal stenoz', 'Aortal regurgitatsiya (Erb yaxshiroq)'],
    description: 'A2 komponenti va aortal klapan patologiyalari uchun asosiy nuqta.',
  },
  { id: 'pulmonic', name: 'Pulmonal', fullName: 'Pulmonal nuqtasi',
    location: '2-qovurg\'alararo bo\'shliq, chap to\'sh cheti',
    locationEn: '2nd ICS, Left Sternal Border',
    cx: 170, cy: 178,
    primarySound: 's2',
    associated: ['Pulmonal stenoz', 'Pulmonal regurgitatsiya', 'S2 split'],
    description: 'P2 komponenti va o\'pka klapani patologiyalari uchun.',
  },
  { id: 'erb', name: 'Erb', fullName: 'Erb-Botkin nuqtasi',
    location: '3-qovurg\'alararo bo\'shliq, chap to\'sh cheti',
    locationEn: '3rd ICS, Left Sternal Border',
    cx: 175, cy: 215,
    primarySound: 'aortic-regurgitation',
    associated: ['Aortal regurgitatsiya (eng yaxshi)', 'S1 va S2 ikkalasini yaxshi eshitish'],
    description: 'AR uchun eng sezgir nuqta. Bemorni oldinga egib, nafasni chiqarganda tinglang.',
  },
  { id: 'tricuspid', name: 'Trikuspidal', fullName: 'Trikuspidal nuqtasi',
    location: '4-qovurg\'alararo bo\'shliq, chap to\'sh cheti',
    locationEn: '4th ICS, Left Sternal Border',
    cx: 178, cy: 252,
    primarySound: 'tricuspid-regurgitation',
    associated: ['Trikuspidal regurgitatsiya', 'Trikuspidal stenoz', 'VSD'],
    description: 'Inspiratsiyada o\'ng tomon shovqinlari kuchayadi (Carvallo).',
  },
  { id: 'mitral', name: 'Mitral / Apex', fullName: 'Mitral nuqtasi (Apex)',
    location: '5-qovurg\'alararo bo\'shliq, midklavikulyar liniya',
    locationEn: '5th ICS, Midclavicular Line',
    cx: 155, cy: 295,
    primarySound: 's1',
    associated: ['Mitral regurgitatsiya', 'Mitral stenoz', 'S3, S4 gallop'],
    description: 'S1 eng baland. MS — qo\'ng\'iroq bilan chap yon yotgan holatda.',
  },
];

/* ============================================================================
 * 5. QUESTION BANK (UWorld-style)
 * Case-based + classic identification questions
 * ============================================================================ */

const QUESTION_BANK = [
  // ===== EASY =====
  {
    id: 'q1', difficulty: 'easy', type: 'identification', soundId: 's1',
    case: null,
    question: 'Quyidagi yurak tovushini eshiting. Bu qaysi ton?',
    options: [
      { text: 'S1 — birinchi yurak toni', correct: true,
        explanation: 'To\'g\'ri. S1 mitral va trikuspidal klapanlarning yopilishidan paydo bo\'ladi va sistolaning boshlanishini belgilaydi.' },
      { text: 'S2 — ikkinchi yurak toni', correct: false,
        explanation: 'S2 yuqori chastotali va sistolaning oxirida (aortal va pulmonal yopilish) eshitiladi.' },
      { text: 'S3 — gallop', correct: false,
        explanation: 'S3 erta diastolada paydo bo\'lib, "lub-dub-DEE" ritmini hosil qiladi.' },
      { text: 'S4 — atrial gallop', correct: false,
        explanation: 'S4 kech diastolada, S1 dan oldin paydo bo\'ladi.' },
    ],
    keyTeaching: 'S1 — sistola boshlanishi, "lub" tovushi, apex va trikuspidal nuqtada eng baland.',
  },
  {
    id: 'q2', difficulty: 'easy', type: 'identification', soundId: 's2',
    case: null,
    question: 'Bu yurak tovushi normal sistola oxirini belgilaydi. Qaysi tovush?',
    options: [
      { text: 'S1', correct: false, explanation: 'S1 sistolaning boshida.' },
      { text: 'S2', correct: true,
        explanation: 'To\'g\'ri. S2 — aortal (A2) va pulmonal (P2) klapanlarning yopilishidan paydo bo\'lib, sistolaning oxirini belgilaydi.' },
      { text: 'S3', correct: false, explanation: 'S3 diastolik gallop tovushi.' },
      { text: 'Ejection click', correct: false, explanation: 'Bu erta sistolik yuqori chastotali tovush.' },
    ],
    keyTeaching: 'S2 — A2 + P2; aortal va pulmonal nuqtada eng baland; fiziologik split inspiratsiyada normal.',
  },
  {
    id: 'q3', difficulty: 'easy', type: 'identification', soundId: 'aortic-stenosis',
    case: null,
    question: 'Quyidagi shovqin qaysi patologiyani ifodalaydi?',
    options: [
      { text: 'Aortal stenoz', correct: true,
        explanation: 'To\'g\'ri. Qattiq, sistolik crescendo-decrescendo shovqin, 2-ICS RSB da eng baland — klassik AS.' },
      { text: 'Mitral regurgitatsiya', correct: false,
        explanation: 'MR holosistolik (bir xil intensivlikda), qo\'ltiq ostiga tarqaladi va apexda baland.' },
      { text: 'Aortal regurgitatsiya', correct: false,
        explanation: 'AR diastolik decrescendo, sistolik emas.' },
      { text: 'Mitral stenoz', correct: false,
        explanation: 'MS — diastolik past chastotali "rumble", opening snap bilan.' },
    ],
    keyTeaching: 'AS = sistolik ejection murmur, karotidlarga tarqaladi, pulsus parvus et tardus.',
  },
  // ===== MEDIUM =====
  {
    id: 'q4', difficulty: 'medium', type: 'case-based', soundId: 'mitral-regurgitation',
    case: '67 yoshli ayol, anamnezida MI (3 yil oldin), so\'nggi 6 oyda zo\'rayuvchi nafas qisilishi va oyoq shishi. Auskultatsiyada apex\'da quyidagi shovqin eshitiladi va chap qo\'ltiq ostiga tarqaladi.',
    question: 'Eng ehtimoliy diagnoz qaysi?',
    options: [
      { text: 'O\'tkir mitral regurgitatsiya', correct: false,
        explanation: 'O\'tkir MR odatda dramatik o\'pka shishi bilan kechadi va shovqin past intensivlikda bo\'lishi mumkin.' },
      { text: 'Surunkali ishemik mitral regurgitatsiya', correct: true,
        explanation: 'To\'g\'ri. Anamnezida MI (papilyar mushak disfunksiyasi yoki LV remodeling), zo\'rayuvchi simptomlar, klassik holosistolik shovqin qo\'ltiq ostiga tarqalishi — surunkali ishemik MR ga mos.' },
      { text: 'Aortal stenoz', correct: false,
        explanation: 'AS ning radiatsiyasi karotidlarga, qo\'ltiq ostiga emas. Va u apex emas, asos ustidagi joyda baland.' },
      { text: 'Trikuspidal regurgitatsiya', correct: false,
        explanation: 'TR holosistolik bo\'lsa-da, chap to\'shda emas, balki 4-ICS LSB da baland va inspiratsiyada kuchayadi.' },
    ],
    keyTeaching: 'Surunkali ishemik MR — MI ning kech asorati. Echo bilan tasdiqlanadi. Davo: GDMT + zarur bo\'lsa intervensiya.',
  },
  {
    id: 'q5', difficulty: 'medium', type: 'case-based', soundId: 'aortic-stenosis',
    case: '78 yoshli erkak, fizik kuchanishda ko\'krak og\'rig\'i, sinkope va nafas qisilishi bilan murojaat. Auskultatsiyada quyidagi shovqin va karotid pulslar zaif va kechikkan.',
    question: 'Eng to\'g\'ri keyingi qadam qaysi?',
    options: [
      { text: 'Stress-test bilan klinik kuzatuv', correct: false,
        explanation: 'Stress-test og\'ir AS da QARSHI KO\'RSATILGAN — sinkope va o\'lim xavfi yuqori.' },
      { text: 'Transthoracic echocardiography', correct: true,
        explanation: 'To\'g\'ri. Aortal stenoz triadasi (angina, sinkope, dispnoye) + pulsus parvus et tardus = og\'ir AS gumoni. TTE klapan maydonini, gradient va LV funksiyasini baholash uchun zarur.' },
      { text: 'Beta-blokator boshlash', correct: false,
        explanation: 'AS da chap qorincha to\'lishi prelaodga bog\'liq — beta-blokator yurak chiqishini kamaytirib, sinkopeni kuchaytirishi mumkin.' },
      { text: 'Karotid endarterektomiya', correct: false,
        explanation: 'Pulsus parvus et tardus karotid stenoz emas, balki AS belgisi.' },
    ],
    keyTeaching: 'AS triada (angina-sinkope-HF) + zaif/kechikkan karotid pulslar → echo. Og\'ir AS — SAVR yoki TAVR ko\'rsatkichi.',
  },
  {
    id: 'q6', difficulty: 'medium', type: 'identification', soundId: 's3',
    case: '54 yoshli erkak, anamnezida HFrEF (EF 25%). Auskultatsiyada apex\'da chap yon yotgan holatda qo\'ng\'iroq bilan past chastotali qo\'shimcha tovush eshitiladi.',
    question: 'Bu qo\'shimcha tovush qaysi?',
    options: [
      { text: 'S3 — ventrikulyar gallop', correct: true,
        explanation: 'To\'g\'ri. Erta diastolik, past chastotali, apexda chap yon yotgan holatda eshitiladigan tovush — S3. Yetishmovchilik kontekstida volume overload va ventrikul disfunksiyasini ko\'rsatadi.' },
      { text: 'S4 — atrial gallop', correct: false,
        explanation: 'S4 ham past chastotali, lekin S1 dan oldin (kech diastola), HFpEF/LVH/AS da uchraydi.' },
      { text: 'Opening snap', correct: false,
        explanation: 'OS yuqori chastotali (110 Hz atrofida) "click", S2 dan keyin yaqin, MS belgisi.' },
      { text: 'Ejection click', correct: false,
        explanation: 'Erta sistolik yuqori chastotali tovush, AS yoki BAV da.' },
    ],
    keyTeaching: 'S3 + HFrEF konteksti = "Kentucky" ritmi (Ken-tuck-y). Volume overload markeri.',
  },
  // ===== HARD =====
  {
    id: 'q7', difficulty: 'hard', type: 'case-based', soundId: 'mitral-stenosis',
    case: '38 yoshli ayol, bolaligida reumatik isitma o\'tkazgan. So\'nggi yilda dispnoye va atrial fibrilatsiya. Apex\'da chap yon yotgan holatda qo\'ng\'iroq bilan kuchli S1, S2 dan keyin tezda yuqori chastotali "click", so\'ng past chastotali "rumble" eshitiladi.',
    question: 'A2-OS oralig\'i qisqarganda, bu nimani anglatadi?',
    options: [
      { text: 'Stenoz og\'irligi yengillashgan', correct: false,
        explanation: 'Aksincha — qisqa A2-OS oralig\'i og\'ir stenozni ko\'rsatadi.' },
      { text: 'Stenoz og\'irligi oshgan', correct: true,
        explanation: 'To\'g\'ri. LA bosimi yuqori bo\'lsa, klapan tezroq ochiladi. Demak A2-OS oralig\'i qisqaroq = LA bosimi yuqori = og\'irroq stenoz. Bu klinik gradatsiya markeri.' },
      { text: 'Mitral klapan kalsifikatsiyasi yo\'q', correct: false,
        explanation: 'OS borligi — klapan hali "harakatchan" ekanini ko\'rsatadi, lekin qattiq kalsifikatsiyada OS yo\'qolishi mumkin.' },
      { text: 'Klapan almashtirish endi kerak emas', correct: false,
        explanation: 'Aksincha — og\'ir MS bo\'lsa balloon valvuloplastika yoki almashtirish ko\'rsatkichi.' },
    ],
    keyTeaching: 'MS og\'irligi: A2-OS oralig\'i qisqa = og\'ir. Diastolik rumble uzunligi ham og\'irlik markeri.',
  },
  {
    id: 'q8', difficulty: 'hard', type: 'case-based', soundId: 'aortic-regurgitation',
    case: '42 yoshli erkak, Marfan sindromi anamnezi bilan. Erb nuqtasida o\'tirib, oldinga egilib, nafas chiqarganda yuqori chastotali decrescendo diastolik shovqin. Pulse pressure 80 mmHg, Quincke pulse musbat, "head bobbing" bor.',
    question: 'Bemorda eng ehtimoliy strukturaviy patologiya qaysi?',
    options: [
      { text: 'Bicuspid aortal klapan', correct: false,
        explanation: 'BAV mumkin, lekin Marfan kontekstida aortal ildiz dilatatsiyasi ehtimoli yuqoriroq.' },
      { text: 'Aortal ildizning dilatatsiyasi (aortic root dilation)', correct: true,
        explanation: 'To\'g\'ri. Marfan sindromida aortal ildiz dilatatsiyasi keng tarqalgan va klapan yetishmovchiligiga olib keladi. Bu bemorlarda aortal dissektsiya xavfi yuqori — yillik echo va MRI kerak.' },
      { text: 'Mitral klapan prolapsi', correct: false,
        explanation: 'MVP Marfan bilan bog\'liq, lekin mid-systolik click va sistolik shovqin beradi, AR emas.' },
      { text: 'Reumatik aortal kasallik', correct: false,
        explanation: 'Reumatik AR yoshroq odamlarda, lekin Marfan + bu fizikal belgilar — aortal ildiz dilatatsiyasiga ko\'proq mos.' },
    ],
    keyTeaching: 'Marfan + AR = aortal ildizni o\'rganing. Surunkali AR = "dancing pulses" (Corrigan, Quincke, de Musset, Müller, Duroziez).',
  },
  {
    id: 'q9', difficulty: 'hard', type: 'case-based', soundId: 'tricuspid-regurgitation',
    case: '45 yoshli IV giyoh isteʼmolchisi, isitma, oyoq shishi. Auskultatsiyada chap to\'shning pastki qismida holosistolik shovqin, inspiratsiyada kuchayadi. Yugulyar venoz bosimda katta v-to\'lqin, jigar pulsatsiyalanadi.',
    question: 'Eng ehtimoliy diagnoz qaysi?',
    options: [
      { text: 'Mitral regurgitatsiya', correct: false,
        explanation: 'MR inspiratsiyada kuchaymaydi, qo\'ltiq ostiga tarqaladi.' },
      { text: 'Trikuspidal regurgitatsiya, infektiv endokardit asosida', correct: true,
        explanation: 'To\'g\'ri. IV giyoh + isitma → trikuspidal endokardit (S. aureus). Carvallo belgisi (inspiratsiyada kuchayish), katta v-to\'lqin, pulsatsiyalanuvchi jigar — TR ning klassik belgilari.' },
      { text: 'Konstrektiv perikardit', correct: false,
        explanation: 'Konstrektiv perikarditda Kussmaul belgisi (inspiratsiyada JVP ko\'tariladi) bo\'ladi, lekin holosistolik shovqin bermaydi.' },
      { text: 'Ventrikulyar septal defekt', correct: false,
        explanation: 'VSD ham holosistolik bo\'ladi, lekin chap-o\'ng shunt va aniq lokalizatsiya boshqacha bo\'ladi; IV giyoh + isitma kontekstida endokarditdan TR ehtimoli yuqori.' },
    ],
    keyTeaching: 'Carvallo belgisi (inspiratsiyada kuchayish) = o\'ng tomon shovqini. IV giyoh + isitma → TR bilan endokardit, qon ekma + echo.',
  },
];


/* ============================================================================
 * 6. THEME & STYLES
 * Clinical/editorial dizayn — refined medical aesthetic
 * ============================================================================ */

const useTheme = () => {
  const [dark, setDark] = useState(false);
  return { dark, toggle: () => setDark(d => !d) };
};

const ThemeStyles = ({ dark }) => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    .ca-app * { box-sizing: border-box; }
    .ca-app {
      font-family: 'DM Sans', system-ui, sans-serif;
      --bg: ${dark ? '#0E1117' : '#FAF7F2'};
      --bg-elev: ${dark ? '#161B22' : '#FFFFFF'};
      --bg-soft: ${dark ? '#1C2128' : '#F4F0E8'};
      --ink: ${dark ? '#E6EDF3' : '#0A1628'};
      --ink-soft: ${dark ? '#9BA8B6' : '#4A5568'};
      --ink-muted: ${dark ? '#6E7B8A' : '#7B8696'};
      --accent: #B31B1B;
      --accent-soft: ${dark ? '#3A1414' : '#FBE9E7'};
      --green: #2D5F3F;
      --green-soft: ${dark ? '#162A1E' : '#E3EFE7'};
      --gold: #B8860B;
      --gold-soft: ${dark ? '#2A2010' : '#FAF1DC'};
      --border: ${dark ? '#252B33' : '#E8E2D5'};
      --border-strong: ${dark ? '#363D47' : '#D4CCB8'};
      --surface-2: ${dark ? '#1C2128' : '#EFE9DC'};
      --ink-faint: ${dark ? '#4A5260' : '#B0A99A'};
      --shadow-sm: 0 1px 2px ${dark ? 'rgba(0,0,0,.4)' : 'rgba(10,22,40,.04)'};
      --shadow: 0 4px 12px ${dark ? 'rgba(0,0,0,.5)' : 'rgba(10,22,40,.06)'};
      --shadow-lg: 0 12px 40px ${dark ? 'rgba(0,0,0,.6)' : 'rgba(10,22,40,.08)'};
      background: var(--bg);
      color: var(--ink);
      min-height: 100vh;
      transition: background .3s ease, color .3s ease;
    }
    .ca-display { font-family: 'Fraunces', Georgia, serif; font-feature-settings: "ss01" on, "ss02" on; letter-spacing: -0.02em; }
    .ca-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
    .ca-card {
      background: var(--bg-elev);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: var(--shadow-sm);
      transition: all .25s ease;
    }
    .ca-card:hover { box-shadow: var(--shadow); }
    .ca-card-strong { background: var(--bg-elev); border: 1px solid var(--border-strong); border-radius: 12px; box-shadow: var(--shadow); }
    .ca-btn {
      font-family: 'DM Sans', sans-serif;
      font-weight: 500;
      padding: 10px 18px;
      border-radius: 8px;
      cursor: pointer;
      transition: all .2s ease;
      border: 1px solid transparent;
      font-size: 14px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .ca-btn-primary { background: var(--ink); color: var(--bg); }
    .ca-btn-primary:hover { transform: translateY(-1px); box-shadow: var(--shadow); }
    .ca-btn-accent { background: var(--accent); color: white; }
    .ca-btn-accent:hover { background: #8E1717; }
    .ca-btn-ghost { background: transparent; color: var(--ink); border-color: var(--border-strong); }
    .ca-btn-ghost:hover { background: var(--bg-soft); }
    .ca-input {
      font-family: 'DM Sans', sans-serif;
      width: 100%;
      padding: 12px 14px;
      border: 1px solid var(--border-strong);
      border-radius: 8px;
      background: var(--bg-elev);
      color: var(--ink);
      font-size: 15px;
      transition: border-color .2s, box-shadow .2s;
    }
    .ca-input:focus { outline: none; border-color: var(--ink); box-shadow: 0 0 0 3px ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(10,22,40,0.06)'}; }
    .ca-divider { height: 1px; background: var(--border); margin: 16px 0; }
    .ca-pill {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 100px;
      font-size: 11px; font-weight: 500;
      letter-spacing: 0.04em; text-transform: uppercase;
    }
    .ca-pill-normal { background: var(--green-soft); color: var(--green); }
    .ca-pill-additional { background: var(--gold-soft); color: var(--gold); }
    .ca-pill-murmur { background: var(--accent-soft); color: var(--accent); }
    .ca-link { color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--border-strong); }
    .ca-link:hover { border-color: var(--ink); }
    @keyframes ca-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .6; transform: scale(1.4); } }
    @keyframes ca-fade-up { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
    @keyframes ca-ecg { 0% { stroke-dashoffset: 1200; } 100% { stroke-dashoffset: 0; } }
    .ca-fade { animation: ca-fade-up .4s ease-out both; }
    .ca-stagger > * { animation: ca-fade-up .5s ease-out both; }
    .ca-stagger > *:nth-child(1) { animation-delay: .04s; }
    .ca-stagger > *:nth-child(2) { animation-delay: .08s; }
    .ca-stagger > *:nth-child(3) { animation-delay: .12s; }
    .ca-stagger > *:nth-child(4) { animation-delay: .16s; }
    .ca-stagger > *:nth-child(5) { animation-delay: .20s; }
    .ca-stagger > *:nth-child(6) { animation-delay: .24s; }
    .ca-bg-grid {
      background-image:
        linear-gradient(${dark ? 'rgba(255,255,255,.025)' : 'rgba(10,22,40,.03)'} 1px, transparent 1px),
        linear-gradient(90deg, ${dark ? 'rgba(255,255,255,.025)' : 'rgba(10,22,40,.03)'} 1px, transparent 1px);
      background-size: 32px 32px;
    }
    .ca-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
    .ca-scrollbar::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
    .ca-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .ca-compare-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .ca-compare-grid > .ca-card { padding: 24px; }
    @media (max-width: 768px) {
      .ca-compare-grid { grid-template-columns: 1fr; }
    }
    .ca-compare-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
    }
    .ca-compare-table th, .ca-compare-table td {
      padding: 10px 14px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    .ca-compare-table th {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--ink-muted);
      font-weight: 600;
      border-bottom: 1px solid var(--border-strong);
    }
    .ca-compare-table tr:last-child td { border-bottom: none; }
    .ca-stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }
    .ca-icon-btn {
      width: 32px; height: 32px;
      display: inline-flex; align-items: center; justify-content: center;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      color: var(--ink-soft);
      transition: all .2s ease;
    }
    .ca-icon-btn:hover { background: var(--bg-soft); color: var(--ink); border-color: var(--border-strong); }
    .ca-nav-link {
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      background: transparent;
      border: none;
      color: var(--ink-soft);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all .15s ease;
    }
    .ca-nav-link:hover { color: var(--ink); background: var(--bg-soft); }
    .ca-nav-link-active { color: var(--accent); background: var(--accent-soft); }
    .ca-nav-link-active:hover { color: var(--accent); }
    main { padding-bottom: 60px; }
    @media (max-width: 768px) {
      .ca-stat-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `}</style>
);

/* ============================================================================
 * 7. SHARED COMPONENTS
 * ============================================================================ */

const SoundDiagramSVG = ({ type, size = 'sm' }) => {
  const w = size === 'lg' ? 280 : 160;
  const h = size === 'lg' ? 80 : 50;
  const stroke = 'var(--ink)';
  const accent = 'var(--accent)';

  const renderShape = () => {
    switch (type) {
      case 'lub':
        return <g>
          <path d={`M 10 ${h/2} L 30 ${h/2}`} stroke={stroke} strokeWidth="1" />
          <ellipse cx={50} cy={h/2} rx="14" ry={h*0.32} fill={accent} opacity="0.85" />
          <text x={50} y={h*0.32} fontSize="10" textAnchor="middle" fill="var(--ink-soft)">S1</text>
          <path d={`M 70 ${h/2} L ${w-10} ${h/2}`} stroke={stroke} strokeWidth="1" />
        </g>;
      case 'dub':
        return <g>
          <path d={`M 10 ${h/2} L ${w*0.55} ${h/2}`} stroke={stroke} strokeWidth="1" />
          <ellipse cx={w*0.7} cy={h/2} rx="11" ry={h*0.26} fill={accent} opacity="0.85" />
          <text x={w*0.7} y={h*0.32} fontSize="10" textAnchor="middle" fill="var(--ink-soft)">S2</text>
          <path d={`M ${w*0.78} ${h/2} L ${w-10} ${h/2}`} stroke={stroke} strokeWidth="1" />
        </g>;
      case 'lub-dub-DEE':
        return <g>
          <ellipse cx={30} cy={h/2} rx="9" ry={h*0.26} fill={accent} opacity="0.8" />
          <text x={30} y={h*0.3} fontSize="9" textAnchor="middle" fill="var(--ink-soft)">S1</text>
          <path d={`M 39 ${h/2} L 75 ${h/2}`} stroke={stroke} strokeWidth="1" />
          <ellipse cx={85} cy={h/2} rx="8" ry={h*0.22} fill={accent} opacity="0.8" />
          <text x={85} y={h*0.3} fontSize="9" textAnchor="middle" fill="var(--ink-soft)">S2</text>
          <path d={`M 93 ${h/2} L 110 ${h/2}`} stroke={stroke} strokeWidth="1" strokeDasharray="2 2" />
          <ellipse cx={120} cy={h/2} rx="7" ry={h*0.18} fill="var(--gold)" opacity="0.85" />
          <text x={120} y={h*0.3} fontSize="9" textAnchor="middle" fill="var(--gold)">S3</text>
          <path d={`M 127 ${h/2} L ${w-10} ${h/2}`} stroke={stroke} strokeWidth="1" />
        </g>;
      case 'DEE-lub-dub':
        return <g>
          <ellipse cx={20} cy={h/2} rx="6" ry={h*0.16} fill="var(--gold)" opacity="0.85" />
          <text x={20} y={h*0.3} fontSize="9" textAnchor="middle" fill="var(--gold)">S4</text>
          <path d={`M 26 ${h/2} L 35 ${h/2}`} stroke={stroke} strokeWidth="1" strokeDasharray="2 2" />
          <ellipse cx={48} cy={h/2} rx="9" ry={h*0.26} fill={accent} opacity="0.8" />
          <text x={48} y={h*0.3} fontSize="9" textAnchor="middle" fill="var(--ink-soft)">S1</text>
          <path d={`M 57 ${h/2} L 95 ${h/2}`} stroke={stroke} strokeWidth="1" />
          <ellipse cx={105} cy={h/2} rx="8" ry={h*0.22} fill={accent} opacity="0.8" />
          <text x={105} y={h*0.3} fontSize="9" textAnchor="middle" fill="var(--ink-soft)">S2</text>
          <path d={`M 113 ${h/2} L ${w-10} ${h/2}`} stroke={stroke} strokeWidth="1" />
        </g>;
      case 'crescendo-decrescendo': {
        const pts = [];
        for (let i = 0; i <= 30; i++) {
          const x = 35 + i * 2.5;
          const amp = Math.sin((i / 30) * Math.PI) * h * 0.32;
          pts.push(`${x},${h/2 - amp} ${x},${h/2 + amp}`);
        }
        return <g>
          <ellipse cx={20} cy={h/2} rx="7" ry={h*0.22} fill={accent} opacity="0.7" />
          <text x={20} y={h*0.32} fontSize="9" textAnchor="middle" fill="var(--ink-soft)">S1</text>
          {Array.from({length: 30}).map((_, i) => {
            const x = 35 + i * 2.5;
            const amp = Math.sin((i / 30) * Math.PI) * h * 0.32;
            return <line key={i} x1={x} y1={h/2 - amp} x2={x} y2={h/2 + amp} stroke={accent} strokeWidth="1.2" opacity="0.75" />;
          })}
          <ellipse cx={120} cy={h/2} rx="6" ry={h*0.18} fill={accent} opacity="0.7" />
          <text x={120} y={h*0.32} fontSize="9" textAnchor="middle" fill="var(--ink-soft)">S2</text>
          <path d={`M 128 ${h/2} L ${w-10} ${h/2}`} stroke={stroke} strokeWidth="1" />
        </g>;
      }
      case 'holosystolic':
        return <g>
          <ellipse cx={20} cy={h/2} rx="7" ry={h*0.22} fill={accent} opacity="0.7" />
          <text x={20} y={h*0.32} fontSize="9" textAnchor="middle" fill="var(--ink-soft)">S1</text>
          <rect x={28} y={h/2 - h*0.28} width="92" height={h*0.56} fill={accent} opacity="0.55" />
          <ellipse cx={125} cy={h/2} rx="6" ry={h*0.18} fill={accent} opacity="0.7" />
          <text x={125} y={h*0.32} fontSize="9" textAnchor="middle" fill="var(--ink-soft)">S2</text>
          <path d={`M 132 ${h/2} L ${w-10} ${h/2}`} stroke={stroke} strokeWidth="1" />
        </g>;
      case 'decrescendo-diastolic':
        return <g>
          <ellipse cx={20} cy={h/2} rx="7" ry={h*0.22} fill={accent} opacity="0.6" />
          <text x={20} y={h*0.32} fontSize="9" textAnchor="middle" fill="var(--ink-soft)">S1</text>
          <path d={`M 28 ${h/2} L 65 ${h/2}`} stroke={stroke} strokeWidth="1" />
          <ellipse cx={75} cy={h/2} rx="6" ry={h*0.2} fill={accent} opacity="0.85" />
          <text x={75} y={h*0.32} fontSize="9" textAnchor="middle" fill="var(--ink-soft)">S2</text>
          {Array.from({length: 24}).map((_, i) => {
            const x = 84 + i * 2.2;
            const amp = (1 - i / 24) * h * 0.3;
            return <line key={i} x1={x} y1={h/2 - amp} x2={x} y2={h/2 + amp} stroke={accent} strokeWidth="1" opacity="0.7" />;
          })}
        </g>;
      case 'os-rumble':
        return <g>
          <ellipse cx={18} cy={h/2} rx="9" ry={h*0.32} fill={accent} opacity="0.95" />
          <text x={18} y={h*0.28} fontSize="9" textAnchor="middle" fill="var(--ink-soft)">S1↑</text>
          <path d={`M 27 ${h/2} L 62 ${h/2}`} stroke={stroke} strokeWidth="1" />
          <ellipse cx={70} cy={h/2} rx="5" ry={h*0.18} fill={accent} opacity="0.7" />
          <text x={70} y={h*0.28} fontSize="9" textAnchor="middle" fill="var(--ink-soft)">S2</text>
          <line x1={80} y1={h*0.25} x2={80} y2={h*0.75} stroke="var(--gold)" strokeWidth="2" />
          <text x={80} y={h*0.95} fontSize="8" textAnchor="middle" fill="var(--gold)">OS</text>
          {Array.from({length: 18}).map((_, i) => {
            const x = 88 + i * 2.5;
            const amp = h * 0.2 * (0.7 + 0.3 * Math.sin(i));
            return <line key={i} x1={x} y1={h/2 - amp} x2={x} y2={h/2 + amp} stroke={accent} strokeWidth="0.8" opacity="0.55" />;
          })}
        </g>;
      default:
        return null;
    }
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={size === 'lg' ? '100%' : w} height={h} style={{ maxWidth: w + 'px' }}>
      {renderShape()}
    </svg>
  );
};

const CategoryPill = ({ category }) => {
  const map = {
    normal: { class: 'ca-pill-normal', label: 'Normal' },
    additional: { class: 'ca-pill-additional', label: 'Qo\'shimcha' },
    murmur: { class: 'ca-pill-murmur', label: 'Shovqin' },
  };
  const cfg = map[category];
  return <span className={`ca-pill ${cfg.class}`}>{cfg.label}</span>;
};


/* ============================================================================
 * 8. AUDIO PLAYER COMPONENT
 * ============================================================================ */

const AudioPlayer = ({ engine, soundId, label, hr = 75, compact = false }) => {
  const [playing, setPlaying] = useState(false);
  const [animTick, setAnimTick] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => setAnimTick(t => t + 1), 60000 / hr);
    return () => clearInterval(interval);
  }, [playing, hr]);

  const toggle = () => {
    if (playing) {
      engine.stop();
      setPlaying(false);
    } else {
      engine.play(soundId, hr);
      setPlaying(true);
    }
  };

  useEffect(() => () => engine.stop(), []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <button
        onClick={toggle}
        className="ca-btn ca-btn-primary"
        style={{
          width: compact ? '40px' : '48px',
          height: compact ? '40px' : '48px',
          borderRadius: '50%',
          padding: 0, justifyContent: 'center',
        }}
      >
        {playing ? <Pause size={compact ? 16 : 20} /> : <Play size={compact ? 16 : 20} style={{ marginLeft: '2px' }} />}
      </button>
      {!compact && (
        <div style={{ flex: 1, minWidth: '100px' }}>
          <div style={{ fontSize: '12px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {playing ? 'Eshitilmoqda' : 'Tinglash'}
          </div>
          {label && <div style={{ fontSize: '14px', fontWeight: 500 }}>{label}</div>}
        </div>
      )}
      {playing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Heart size={14} style={{
            color: 'var(--accent)',
            animation: `ca-pulse ${60 / hr}s infinite`,
          }} />
          <span className="ca-mono" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{hr} bpm</span>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 9. CHEST DIAGRAM (SVG)
 * Anatomik joylashuvli ko'krak diagrammasi
 * ============================================================================ */

const ChestDiagram = ({ engine, onPointSelect, activePoint, dark }) => {
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{ position: 'relative', maxWidth: '380px', margin: '0 auto' }}>
      <svg viewBox="0 0 380 460" width="100%" height="auto" style={{ display: 'block' }}>
        <defs>
          <radialGradient id="chestGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={dark ? '#252B33' : '#FFFFFF'} />
            <stop offset="100%" stopColor={dark ? '#1C2128' : '#F4F0E8'} />
          </radialGradient>
          <linearGradient id="heartShade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#B31B1B" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#B31B1B" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Torso outline — anatomically stylized anterior chest view */}
        <path
          d="M 110 70
             Q 120 55, 145 50
             Q 165 45, 190 45
             Q 215 45, 235 50
             Q 260 55, 270 70
             L 285 105
             Q 300 130, 305 175
             L 310 230
             Q 312 290, 305 350
             Q 295 410, 270 430
             L 255 440
             L 235 442
             L 145 442
             L 125 440
             L 110 430
             Q 85 410, 75 350
             Q 68 290, 70 230
             L 75 175
             Q 80 130, 95 105 Z"
          fill="url(#chestGrad)"
          stroke="var(--border-strong)"
          strokeWidth="1.2"
        />

        {/* Clavicles */}
        <path d="M 110 100 Q 145 88, 188 95" stroke="var(--ink-muted)" strokeWidth="1.5" fill="none" opacity="0.5" />
        <path d="M 192 95 Q 235 88, 270 100" stroke="var(--ink-muted)" strokeWidth="1.5" fill="none" opacity="0.5" />

        {/* Sternum */}
        <line x1="190" y1="100" x2="190" y2="320" stroke="var(--ink-muted)" strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />

        {/* Ribs (subtle) */}
        {[140, 175, 210, 245, 280].map((y, i) => (
          <g key={i} opacity="0.18">
            <path d={`M 95 ${y} Q 145 ${y - 8}, 190 ${y - 4}`} stroke="var(--ink-soft)" strokeWidth="0.8" fill="none" />
            <path d={`M 190 ${y - 4} Q 235 ${y - 8}, 285 ${y}`} stroke="var(--ink-soft)" strokeWidth="0.8" fill="none" />
          </g>
        ))}

        {/* Heart silhouette (very subtle hint behind points) */}
        <path
          d="M 145 200
             Q 130 180, 145 165
             Q 165 155, 185 175
             Q 200 160, 220 165
             Q 240 175, 235 200
             Q 230 240, 195 290
             Q 175 310, 165 295
             Q 145 260, 145 200 Z"
          fill="url(#heartShade)"
          stroke="var(--accent)"
          strokeWidth="0.6"
          strokeDasharray="3 4"
          opacity="0.5"
        />

        {/* ICS labels (left side) */}
        {[
          { y: 178, label: '2nd ICS' },
          { y: 215, label: '3rd ICS' },
          { y: 252, label: '4th ICS' },
          { y: 295, label: '5th ICS' },
        ].map(r => (
          <text key={r.y} x={92} y={r.y + 3} fontSize="9" fill="var(--ink-muted)"
                fontFamily="JetBrains Mono, monospace" textAnchor="end">
            {r.label}
          </text>
        ))}

        {/* Auscultation points */}
        {AUSCULTATION_POINTS.map(p => {
          const isActive = activePoint === p.id;
          const isHovered = hovered === p.id;
          return (
            <g key={p.id}
               style={{ cursor: 'pointer' }}
               onMouseEnter={() => setHovered(p.id)}
               onMouseLeave={() => setHovered(null)}
               onClick={() => onPointSelect(p.id)}>
              {/* Outer ring (hover/active) */}
              <circle cx={p.cx} cy={p.cy}
                      r={isActive ? 22 : isHovered ? 18 : 14}
                      fill="var(--accent)"
                      opacity={isActive ? 0.18 : isHovered ? 0.12 : 0}
                      style={{ transition: 'all .25s ease' }} />
              {/* Pulsing ring when active */}
              {isActive && (
                <circle cx={p.cx} cy={p.cy} r="14" fill="none"
                        stroke="var(--accent)" strokeWidth="1.5"
                        style={{ animation: 'ca-pulse 1.2s infinite', transformOrigin: `${p.cx}px ${p.cy}px` }} />
              )}
              {/* Main dot */}
              <circle cx={p.cx} cy={p.cy} r="7"
                      fill={isActive ? 'var(--accent)' : 'var(--bg-elev)'}
                      stroke={isActive ? 'var(--accent)' : 'var(--ink)'}
                      strokeWidth="2"
                      style={{ transition: 'all .25s ease' }} />
              {/* Inner dot */}
              <circle cx={p.cx} cy={p.cy} r="2.5"
                      fill={isActive ? 'var(--bg)' : 'var(--ink)'} />
              {/* Label */}
              <text x={p.cx + 14} y={p.cy + 4}
                    fontSize="11" fontWeight="500"
                    fill={isActive || isHovered ? 'var(--accent)' : 'var(--ink-soft)'}
                    style={{ transition: 'all .25s ease', userSelect: 'none' }}>
                {p.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ============================================================================
 * 10. WELCOME / IDENTIFICATION SCREEN
 * ============================================================================ */

const WelcomeScreen = ({ onStart, dark }) => {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e?.preventDefault();
    if (!first.trim() || !last.trim()) {
      setError('Iltimos, ism va familiyangizni kiriting');
      return;
    }
    onStart({ first: first.trim(), last: last.trim() });
  };

  return (
    <div className="ca-bg-grid" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="ca-fade" style={{ maxWidth: '520px', width: '100%' }}>
        {/* ECG line decoration */}
        <div style={{ marginBottom: '32px', height: '60px', position: 'relative', overflow: 'hidden' }}>
          <svg viewBox="0 0 600 60" width="100%" height="60">
            <path
              d="M 0 30 L 80 30 L 90 30 L 95 20 L 100 40 L 105 30 L 200 30 L 215 30 L 220 8 L 230 52 L 240 22 L 250 30 L 380 30 L 395 30 L 400 18 L 410 42 L 415 30 L 600 30"
              stroke="var(--accent)" strokeWidth="1.5" fill="none"
              strokeDasharray="1200" strokeDashoffset="1200"
              style={{ animation: 'ca-ecg 3s ease-out forwards' }}
            />
          </svg>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '6px 14px',
                       background: 'var(--accent-soft)', color: 'var(--accent)',
                       borderRadius: '100px', fontSize: '12px', fontWeight: 500,
                       letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '24px' }}>
            <Stethoscope size={14} /> Tibbiyot ta'limi platformasi
          </div>
          <h1 className="ca-display" style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 500,
                                              lineHeight: 1.05, margin: '0 0 16px',
                                              color: 'var(--ink)' }}>
            Yurak <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>auskultatsiyasi</em>
          </h1>
          <p style={{ fontSize: '17px', color: 'var(--ink-soft)', maxWidth: '420px', margin: '0 auto', lineHeight: 1.5 }}>
            Yurak tovushlari va shovqinlarini interaktiv tarzda o'rganing. UWorld uslubidagi savollar bilan klinik ko'nikmalarni mustahkamlang.
          </p>
        </div>

        <div className="ca-card-strong" style={{ padding: '32px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 className="ca-display" style={{ fontSize: '22px', fontWeight: 500, margin: '0 0 6px' }}>Boshlash</h2>
            <p style={{ fontSize: '14px', color: 'var(--ink-soft)', margin: 0 }}>
              Ism va familiyangizni kiriting — natijalaringiz session davomida saqlanadi.
            </p>
          </div>

          <form onSubmit={submit} style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink-soft)',
                             textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                Ism
              </label>
              <input className="ca-input" value={first} onChange={e => { setFirst(e.target.value); setError(''); }}
                     placeholder="Davlatbek" autoFocus />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink-soft)',
                             textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                Familiya
              </label>
              <input className="ca-input" value={last} onChange={e => { setLast(e.target.value); setError(''); }}
                     placeholder="Shodiyev" />
            </div>
            {error && <div style={{ fontSize: '13px', color: 'var(--accent)' }}>{error}</div>}
            <button type="submit" className="ca-btn ca-btn-accent"
                    style={{ marginTop: '8px', justifyContent: 'center', padding: '14px' }}>
              Platformaga kirish <ArrowRight size={16} />
            </button>
          </form>
        </div>

        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '12px', color: 'var(--ink-muted)',
                     letterSpacing: '0.06em' }}>
          Tibbiyot talabalari uchun ishlab chiqilgan · Ma'lumotlar mahalliy saqlanadi
        </div>
      </div>
    </div>
  );
};


/* ============================================================================
 * 11. NAVIGATION
 * ============================================================================ */

const NAV_ITEMS = [
  { id: 'home', label: 'Bosh sahifa', icon: Home },
  { id: 'anatomy', label: 'Anatomiya', icon: Stethoscope },
  { id: 'library', label: 'Tovushlar', icon: Volume2 },
  { id: 'learn', label: 'O\'rganish', icon: BookOpen },
  { id: 'practice', label: 'Mashq', icon: Shuffle },
  { id: 'qbank', label: 'QBank', icon: GraduationCap },
  { id: 'compare', label: 'Solishtirish', icon: Layers },
  { id: 'bookmarks', label: 'Saqlanganlar', icon: Bookmark },
  { id: 'dashboard', label: 'Statistika', icon: BarChart3 },
];

const TopBar = ({ student, currentPage, setPage, theme }) => {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50,
                    background: 'var(--bg)', borderBottom: '1px solid var(--border)',
                    backdropFilter: 'blur(8px)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '14px 24px',
                   display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div onClick={() => setPage('home')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--accent)',
                       display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={18} color="white" fill="white" />
          </div>
          <div>
            <div className="ca-display" style={{ fontSize: '17px', fontWeight: 600, lineHeight: 1 }}>Cardiac Sounds</div>
            <div style={{ fontSize: '10px', color: 'var(--ink-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Auskultatsiya o'qituvchisi
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px',
                       padding: '6px 12px', background: 'var(--bg-soft)', borderRadius: '100px',
                       fontSize: '13px', color: 'var(--ink-soft)' }}>
            <User size={13} />
            <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{student.first} {student.last}</span>
          </div>
          <button onClick={theme.toggle} className="ca-btn ca-btn-ghost"
                  style={{ width: '36px', height: '36px', padding: 0, justifyContent: 'center' }}>
            {theme.dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      <nav style={{ borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px',
                     display: 'flex', gap: '4px', overflowX: 'auto' }} className="ca-scrollbar">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button key={item.id} onClick={() => setPage(item.id)}
                      className="ca-btn"
                      style={{
                        background: 'transparent',
                        color: active ? 'var(--accent)' : 'var(--ink-soft)',
                        borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                        borderRadius: 0,
                        padding: '12px 14px',
                        fontWeight: active ? 600 : 500,
                        whiteSpace: 'nowrap',
                      }}>
                <Icon size={14} /> {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};

/* ============================================================================
 * 12. HOME PAGE — Dashboard cards
 * ============================================================================ */

const PageContainer = ({ children, title, subtitle }) => (
  <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>
    {(title || subtitle) && (
      <div style={{ marginBottom: '32px' }} className="ca-fade">
        {title && <h1 className="ca-display" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 500, margin: '0 0 8px', lineHeight: 1.1 }}>{title}</h1>}
        {subtitle && <p style={{ fontSize: '16px', color: 'var(--ink-soft)', margin: 0, maxWidth: '640px' }}>{subtitle}</p>}
      </div>
    )}
    {children}
  </div>
);

const HomePage = ({ student, setPage, stats }) => {
  const cards = [
    { id: 'anatomy', title: 'Anatomiya', desc: 'Auskultatsiya nuqtalarini interaktiv ko\'krak diagrammasida o\'rganing.',
      icon: Stethoscope, accent: 'accent' },
    { id: 'library', title: 'Tovushlar kutubxonasi', desc: 'Barcha 10 ta yurak tovushini tavsif va diagrammalar bilan ko\'rib chiqing.',
      icon: Volume2, accent: 'gold' },
    { id: 'learn', title: 'O\'rganish rejimi', desc: 'Audio + vizual + matn integratsiyasi bilan har bir tovushni chuqur o\'rganing.',
      icon: BookOpen, accent: 'green' },
    { id: 'practice', title: 'Tasodifiy mashq', desc: 'Tasodifiy tovush — siz taxmin qiling, javob bering, izoh oling.',
      icon: Shuffle, accent: 'accent' },
    { id: 'qbank', title: 'QBank', desc: 'UWorld uslubidagi savollar, batafsil izohlar, scoring.',
      icon: GraduationCap, accent: 'gold' },
    { id: 'compare', title: 'Solishtirish rejimi', desc: 'Ikki shovqinni yonma-yon eshiting va farqlarini ko\'ring.',
      icon: Layers, accent: 'green' },
  ];

  return (
    <PageContainer
      title={<>Xush kelibsiz, <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>{student.first}</em></>}
      subtitle="Bugun yurak shovqinlarini chuqurroq o'rganing. Quyidagi modullardan birini tanlang yoki to'g'ridan-to'g'ri QBankga kiring.">

      {/* Quick stats strip */}
      <div className="ca-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        <StatTile label="Yechilgan savollar" value={stats.attempted} icon={ListChecks} />
        <StatTile label="Aniqlik" value={stats.attempted > 0 ? `${Math.round((stats.correct / stats.attempted) * 100)}%` : '—'} icon={TrendingUp} />
        <StatTile label="To'g'ri javoblar" value={stats.correct} icon={Check} />
        <StatTile label="Saqlanganlar" value={stats.bookmarks} icon={Bookmark} />
      </div>

      {/* Module cards */}
      <div className="ca-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {cards.map(card => {
          const Icon = card.icon;
          const accentColor = card.accent === 'accent' ? 'var(--accent)' :
                             card.accent === 'gold' ? 'var(--gold)' : 'var(--green)';
          const accentSoft = card.accent === 'accent' ? 'var(--accent-soft)' :
                            card.accent === 'gold' ? 'var(--gold-soft)' : 'var(--green-soft)';
          return (
            <div key={card.id} onClick={() => setPage(card.id)} className="ca-card"
                 style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px',
                           background: accentSoft, color: accentColor,
                           display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} />
              </div>
              <div>
                <h3 className="ca-display" style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 6px' }}>{card.title}</h3>
                <p style={{ fontSize: '14px', color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>{card.desc}</p>
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px',
                           color: accentColor, fontSize: '13px', fontWeight: 500 }}>
                Boshlash <ChevronRight size={14} />
              </div>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
};

const StatTile = ({ label, value, icon: Icon }) => (
  <div className="ca-card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--bg-soft)',
                 display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)' }}>
      <Icon size={16} />
    </div>
    <div>
      <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div className="ca-display" style={{ fontSize: '22px', fontWeight: 500, lineHeight: 1, marginTop: '2px' }}>{value}</div>
    </div>
  </div>
);


/* ============================================================================
 * 13. ANATOMY PAGE
 * ============================================================================ */

const AnatomyPage = ({ engine, dark }) => {
  const [selected, setSelected] = useState(null);
  const point = AUSCULTATION_POINTS.find(p => p.id === selected);

  return (
    <PageContainer
      title="Auskultatsiya nuqtalari"
      subtitle="Nuqtalardan birini bosing — o'sha joyda eng yaxshi eshitiladigan tovushni real vaqtda eshitasiz.">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '32px',
                   alignItems: 'start' }} className="anatomy-grid">
        <div className="ca-card" style={{ padding: '32px 16px' }}>
          <ChestDiagram engine={engine} onPointSelect={setSelected} activePoint={selected} dark={dark} />
        </div>

        <div className="ca-fade">
          {point ? (
            <div className="ca-card-strong" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '8px' }}>
                <div>
                  <div className="ca-pill ca-pill-murmur" style={{ marginBottom: '8px' }}>
                    Auskultatsiya nuqtasi
                  </div>
                  <h2 className="ca-display" style={{ fontSize: '28px', fontWeight: 500, margin: '0 0 4px' }}>{point.fullName}</h2>
                  <div className="ca-mono" style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>{point.locationEn}</div>
                </div>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--ink-soft)', margin: '12px 0 20px', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--ink)' }}>Joylashuv:</strong> {point.location}
              </p>
              <div className="ca-divider" />
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Tovush — bu nuqtada eng baland
                </div>
                <AudioPlayer engine={engine} soundId={point.primarySound}
                            label={HEART_SOUNDS.find(s => s.id === point.primarySound)?.fullName} />
              </div>
              <div className="ca-divider" />
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Bog'liq patologiyalar
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {point.associated.map((a, i) => (
                    <li key={i} style={{ fontSize: '14px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>·</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ padding: '14px', background: 'var(--bg-soft)', borderRadius: '8px',
                           fontSize: '13px', color: 'var(--ink-soft)', lineHeight: 1.6,
                           borderLeft: '3px solid var(--accent)' }}>
                <strong style={{ color: 'var(--ink)' }}>Klinik maslahat:</strong> {point.description}
              </div>
            </div>
          ) : (
            <div className="ca-card" style={{ padding: '40px 28px', textAlign: 'center' }}>
              <Stethoscope size={36} style={{ color: 'var(--ink-muted)', marginBottom: '16px' }} />
              <h3 className="ca-display" style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 8px' }}>Nuqtani tanlang</h3>
              <p style={{ fontSize: '14px', color: 'var(--ink-soft)', margin: 0 }}>
                Diagrammadagi 5 ta nuqtadan birini bosing.
              </p>
              <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                {AUSCULTATION_POINTS.map(p => (
                  <button key={p.id} onClick={() => setSelected(p.id)} className="ca-btn ca-btn-ghost"
                          style={{ justifyContent: 'center', fontSize: '12px' }}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @media (max-width: 860px) {
          .anatomy-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </PageContainer>
  );
};

/* ============================================================================
 * 14. SOUND LIBRARY PAGE
 * ============================================================================ */

const LibraryPage = ({ engine }) => {
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = filter === 'all' ? HEART_SOUNDS : HEART_SOUNDS.filter(s => s.category === filter);

  return (
    <PageContainer
      title="Yurak tovushlari kutubxonasi"
      subtitle="Har bir tovush — sintezlangan audio, vizual diagramma, lokalizatsiya va klinik kontekst bilan.">
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {[
          { id: 'all', label: 'Hammasi' },
          { id: 'normal', label: 'Normal tonlar' },
          { id: 'additional', label: 'Qo\'shimcha tonlar' },
          { id: 'murmur', label: 'Shovqinlar' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className="ca-btn"
                  style={{
                    background: filter === f.id ? 'var(--ink)' : 'transparent',
                    color: filter === f.id ? 'var(--bg)' : 'var(--ink-soft)',
                    border: `1px solid ${filter === f.id ? 'var(--ink)' : 'var(--border-strong)'}`,
                  }}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="ca-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
        {filtered.map(sound => {
          const expanded = expandedId === sound.id;
          return (
            <div key={sound.id} className="ca-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <CategoryPill category={sound.category} />
                  <h3 className="ca-display" style={{ fontSize: '20px', fontWeight: 500, margin: '8px 0 2px' }}>
                    {sound.name}
                    {sound.shortName && <span style={{ fontSize: '13px', color: 'var(--ink-muted)', fontFamily: 'JetBrains Mono', marginLeft: '8px' }}>({sound.shortName})</span>}
                  </h3>
                  <div style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>{sound.fullName}</div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-soft)', padding: '12px', borderRadius: '8px' }}>
                <SoundDiagramSVG type={sound.diagram} />
              </div>

              <p style={{ fontSize: '13px', color: 'var(--ink-soft)', lineHeight: 1.55, margin: 0 }}>
                {sound.description}
              </p>

              <AudioPlayer engine={engine} soundId={sound.id} label={null} />

              {expanded && (
                <div className="ca-fade" style={{ display: 'grid', gap: '10px', fontSize: '13px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                  <DetailRow label="Joylashuv" value={sound.location} />
                  <DetailRow label="Faza" value={sound.phase} />
                  {sound.radiation && <DetailRow label="Tarqalish" value={sound.radiation} />}
                  {sound.severity && <DetailRow label="Og'irlik markeri" value={sound.severity} />}
                  <DetailRow label="Klinik" value={sound.clinical} />
                </div>
              )}
              <button onClick={() => setExpandedId(expanded ? null : sound.id)}
                      className="ca-btn ca-btn-ghost"
                      style={{ justifyContent: 'center', fontSize: '12px' }}>
                {expanded ? 'Yopish' : 'Batafsil'}  {expanded ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
              </button>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
};

const DetailRow = ({ label, value }) => (
  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
    <div style={{ flex: '0 0 110px', fontSize: '11px', color: 'var(--ink-muted)',
                 textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: '2px' }}>{label}</div>
    <div style={{ flex: 1, color: 'var(--ink)' }}>{value}</div>
  </div>
);


/* ============================================================================
 * 15. LEARN PAGE — guided sound-by-sound learning
 * ============================================================================ */

const LearnPage = ({ engine }) => {
  const [idx, setIdx] = useState(0);
  const sound = HEART_SOUNDS[idx];

  return (
    <PageContainer title="O'rganish rejimi" subtitle="Audio + vizual + matn integratsiyasi. Har bir tovushni navigatsiya qilib chiqing.">
      <div className="ca-card-strong" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div className="ca-mono" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
            {idx + 1} / {HEART_SOUNDS.length}
          </div>
          <div style={{ flex: 1, height: '4px', background: 'var(--bg-soft)', margin: '0 16px', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--accent)',
                         width: `${((idx + 1) / HEART_SOUNDS.length) * 100}%`,
                         transition: 'width .3s' }} />
          </div>
          <CategoryPill category={sound.category} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h2 className="ca-display" style={{ fontSize: '36px', fontWeight: 500, margin: '0 0 6px', lineHeight: 1.1 }}>
            {sound.fullName}
          </h2>
          <div style={{ fontSize: '14px', color: 'var(--ink-soft)' }}>{sound.name}{sound.shortName && ` · ${sound.shortName}`}</div>
        </div>

        <div style={{ background: 'var(--bg-soft)', padding: '24px', borderRadius: '10px', marginBottom: '24px' }}>
          <SoundDiagramSVG type={sound.diagram} size="lg" />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <AudioPlayer engine={engine} soundId={sound.id} label={`${sound.name} — eshitish`} />
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          <p style={{ fontSize: '16px', color: 'var(--ink)', lineHeight: 1.65, margin: 0 }}>{sound.description}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <InfoBlock label="Joylashuv" value={sound.location} />
            <InfoBlock label="Sikl fazasi" value={sound.phase} />
            {sound.radiation && <InfoBlock label="Tarqalish" value={sound.radiation} />}
            {sound.severity && <InfoBlock label="Og'irlik markeri" value={sound.severity} />}
          </div>
          <div style={{ padding: '16px 20px', background: 'var(--accent-soft)', borderRadius: '10px',
                       borderLeft: '3px solid var(--accent)' }}>
            <div style={{ fontSize: '11px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '6px' }}>
              Klinik kontekst
            </div>
            <p style={{ fontSize: '14px', color: 'var(--ink)', margin: 0, lineHeight: 1.6 }}>{sound.clinical}</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', gap: '12px' }}>
          <button onClick={() => { engine.stop(); setIdx(i => Math.max(0, i - 1)); }}
                  disabled={idx === 0}
                  className="ca-btn ca-btn-ghost"
                  style={{ opacity: idx === 0 ? 0.4 : 1 }}>
            <ChevronLeft size={14} /> Oldingi
          </button>
          <button onClick={() => { engine.stop(); setIdx(i => Math.min(HEART_SOUNDS.length - 1, i + 1)); }}
                  disabled={idx === HEART_SOUNDS.length - 1}
                  className="ca-btn ca-btn-primary"
                  style={{ opacity: idx === HEART_SOUNDS.length - 1 ? 0.4 : 1 }}>
            Keyingi <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </PageContainer>
  );
};

const InfoBlock = ({ label, value }) => (
  <div style={{ padding: '14px 16px', background: 'var(--bg-soft)', borderRadius: '8px' }}>
    <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.5 }}>{value}</div>
  </div>
);

/* ============================================================================
 * 16. PRACTICE PAGE — random sound identification
 * ============================================================================ */

const PracticePage = ({ engine, onLog }) => {
  const [current, setCurrent] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correct, setCorrect] = useState(0);

  const startNew = useCallback(() => {
    engine.stop();
    setRevealed(false);
    setAnswer(null);
    const sound = HEART_SOUNDS[Math.floor(Math.random() * HEART_SOUNDS.length)];
    setCurrent(sound);
    setTimeout(() => engine.play(sound.id), 200);
  }, [engine]);

  useEffect(() => {
    if (!current) startNew();
    return () => engine.stop();
  }, []);

  const submit = (sId) => {
    if (revealed) return;
    setAnswer(sId);
    setRevealed(true);
    const isCorrect = sId === current.id;
    setAttempts(a => a + 1);
    if (isCorrect) {
      setCorrect(c => c + 1);
      setStreak(s => s + 1);
    } else {
      setStreak(0);
    }
    onLog?.({ correct: isCorrect, soundId: current.id });
  };

  if (!current) return null;

  return (
    <PageContainer title="Tasodifiy mashq" subtitle="Tovushni tinglang, qaysi shovqinligini taxmin qiling. Darhol javob va izoh oling.">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '24px' }} className="practice-grid">
        <div className="ca-card-strong" style={{ padding: '32px' }}>
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
              Tovush #{attempts + (revealed ? 0 : 1)}
            </div>
            <h2 className="ca-display" style={{ fontSize: '24px', fontWeight: 500, margin: '0 0 16px' }}>
              Bu tovush qaysi?
            </h2>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <AudioPlayer engine={engine} soundId={current.id} label={null} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
            {HEART_SOUNDS.map(s => {
              const isCorrect = s.id === current.id;
              const isPicked = s.id === answer;
              let bg = 'var(--bg-elev)';
              let border = 'var(--border-strong)';
              let color = 'var(--ink)';
              if (revealed) {
                if (isCorrect) { bg = 'var(--green-soft)'; border = 'var(--green)'; color = 'var(--green)'; }
                else if (isPicked) { bg = 'var(--accent-soft)'; border = 'var(--accent)'; color = 'var(--accent)'; }
                else { color = 'var(--ink-muted)'; }
              }
              return (
                <button key={s.id} onClick={() => submit(s.id)} disabled={revealed}
                        style={{
                          padding: '12px 14px', borderRadius: '8px',
                          background: bg, border: `1px solid ${border}`, color,
                          fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 500,
                          textAlign: 'left', cursor: revealed ? 'default' : 'pointer',
                          transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'
                        }}>
                  <span>{s.name}</span>
                  {revealed && isCorrect && <Check size={14} />}
                  {revealed && isPicked && !isCorrect && <X size={14} />}
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className="ca-fade" style={{ marginTop: '24px', padding: '20px', background: answer === current.id ? 'var(--green-soft)' : 'var(--accent-soft)',
                                              borderRadius: '10px', borderLeft: `3px solid ${answer === current.id ? 'var(--green)' : 'var(--accent)'}` }}>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
                           color: answer === current.id ? 'var(--green)' : 'var(--accent)', marginBottom: '8px' }}>
                {answer === current.id ? '✓ To\'g\'ri' : '✗ Noto\'g\'ri'} · {current.fullName}
              </div>
              <p style={{ fontSize: '14px', margin: '0 0 12px', lineHeight: 1.6 }}>{current.description}</p>
              <div style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
                <strong>Joylashuv:</strong> {current.location}<br/>
                <strong>Klinik:</strong> {current.clinical}
              </div>
              <button onClick={startNew} className="ca-btn ca-btn-primary" style={{ marginTop: '16px' }}>
                Keyingi tovush <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="ca-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              Joriy seriya
            </div>
            <div className="ca-display" style={{ fontSize: '40px', fontWeight: 500, lineHeight: 1, color: streak > 0 ? 'var(--accent)' : 'var(--ink)' }}>
              {streak}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '4px' }}>ketma-ket to'g'ri</div>
          </div>
          <div className="ca-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              Aniqlik
            </div>
            <div className="ca-display" style={{ fontSize: '40px', fontWeight: 500, lineHeight: 1 }}>
              {attempts > 0 ? `${Math.round((correct / attempts) * 100)}%` : '—'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '4px' }}>
              {correct} / {attempts} javob
            </div>
          </div>
          <button onClick={startNew} className="ca-btn ca-btn-ghost" style={{ justifyContent: 'center' }}>
            <Shuffle size={14} /> Yangi tovush
          </button>
        </div>
      </div>
      <style>{`
        @media (max-width: 860px) {
          .practice-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </PageContainer>
  );
};


/* ============================================================================
 * 17. QBANK PAGE — UWorld-style multiple choice questions
 * ============================================================================ */

const QbankPage = ({ engine, bookmarks, toggleBookmark, qbankState, setQbankState }) => {
  const [stage, setStage] = useState('config'); // config | quiz | review
  const [config, setConfig] = useState({ difficulty: 'all', count: 5, timer: false, timePerQ: 60 });
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { qId: optionIdx }
  const [submitted, setSubmitted] = useState({}); // { qId: true }
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef(null);

  const startQuiz = () => {
    let pool = QUESTION_BANK;
    if (config.difficulty !== 'all') pool = pool.filter(q => q.difficulty === config.difficulty);
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(config.count, pool.length));
    setQuestions(shuffled);
    setIdx(0);
    setAnswers({});
    setSubmitted({});
    setStage('quiz');
    if (config.timer) setTimeLeft(config.timePerQ);
  };

  const current = questions[idx];

  // Timer logic
  useEffect(() => {
    if (stage !== 'quiz' || !config.timer || !current || submitted[current.id]) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          submit(current.id, answers[current.id] ?? -1);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [stage, idx, config.timer, current?.id]);

  // Auto-play sound when question loads
  useEffect(() => {
    if (stage === 'quiz' && current?.soundId) {
      engine.stop();
      const t = setTimeout(() => engine.play(current.soundId), 400);
      return () => { clearTimeout(t); engine.stop(); };
    }
  }, [stage, idx, current?.id]);

  const select = (qId, optIdx) => {
    if (submitted[qId]) return;
    setAnswers(a => ({ ...a, [qId]: optIdx }));
  };

  const submit = (qId, optIdx) => {
    const finalIdx = optIdx !== undefined ? optIdx : answers[qId];
    if (finalIdx === undefined) return;
    setAnswers(a => ({ ...a, [qId]: finalIdx }));
    setSubmitted(s => ({ ...s, [qId]: true }));
    const q = questions.find(qq => qq.id === qId);
    const isCorrect = q.options[finalIdx]?.correct;
    setQbankState(prev => ({
      ...prev,
      attempted: prev.attempted + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
      perTopic: {
        ...prev.perTopic,
        [q.soundId]: {
          attempted: (prev.perTopic[q.soundId]?.attempted || 0) + 1,
          correct: (prev.perTopic[q.soundId]?.correct || 0) + (isCorrect ? 1 : 0),
        }
      }
    }));
    if (config.timer) clearInterval(timerRef.current);
  };

  const nextQ = () => {
    if (idx < questions.length - 1) {
      setIdx(i => i + 1);
      if (config.timer) setTimeLeft(config.timePerQ);
    } else {
      setStage('review');
      engine.stop();
    }
  };

  const prevQ = () => {
    if (idx > 0) {
      setIdx(i => i - 1);
      if (config.timer && !submitted[questions[idx - 1].id]) setTimeLeft(config.timePerQ);
    }
  };

  const restart = () => { setStage('config'); engine.stop(); };

  // ============ CONFIG STAGE ============
  if (stage === 'config') {
    return (
      <PageContainer title="QBank — savollar to'plami" subtitle="UWorld uslubidagi MCQ savollar. Vaqt rejimi, qiyinlik darajasi va savollar sonini tanlang.">
        <div className="ca-card-strong" style={{ padding: '32px', maxWidth: '640px' }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>
              Qiyinlik darajasi
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
              {[
                { id: 'all', label: 'Barchasi', count: QUESTION_BANK.length },
                { id: 'easy', label: 'Oson', count: QUESTION_BANK.filter(q => q.difficulty === 'easy').length },
                { id: 'medium', label: 'O\'rta', count: QUESTION_BANK.filter(q => q.difficulty === 'medium').length },
                { id: 'hard', label: 'Qiyin', count: QUESTION_BANK.filter(q => q.difficulty === 'hard').length },
              ].map(d => (
                <button key={d.id} onClick={() => setConfig(c => ({ ...c, difficulty: d.id }))}
                        style={{
                          padding: '14px', borderRadius: '8px', cursor: 'pointer',
                          background: config.difficulty === d.id ? 'var(--ink)' : 'var(--bg-elev)',
                          color: config.difficulty === d.id ? 'var(--bg)' : 'var(--ink)',
                          border: `1px solid ${config.difficulty === d.id ? 'var(--ink)' : 'var(--border-strong)'}`,
                          fontFamily: 'DM Sans', textAlign: 'center'
                        }}>
                  <div style={{ fontWeight: 600 }}>{d.label}</div>
                  <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>{d.count} savol</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>
              Savollar soni: <span className="ca-mono" style={{ color: 'var(--ink)' }}>{config.count}</span>
            </label>
            <input type="range" min="1" max={QUESTION_BANK.length} value={config.count}
                   onChange={e => setConfig(c => ({ ...c, count: parseInt(e.target.value) }))}
                   style={{ width: '100%' }} />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={config.timer}
                     onChange={e => setConfig(c => ({ ...c, timer: e.target.checked }))} />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                <Timer size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Vaqt rejimi (har savolga {config.timePerQ}s)
              </span>
            </label>
            {config.timer && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                {[30, 60, 90, 120].map(t => (
                  <button key={t} onClick={() => setConfig(c => ({ ...c, timePerQ: t }))}
                          className="ca-btn"
                          style={{
                            background: config.timePerQ === t ? 'var(--ink)' : 'transparent',
                            color: config.timePerQ === t ? 'var(--bg)' : 'var(--ink-soft)',
                            border: `1px solid ${config.timePerQ === t ? 'var(--ink)' : 'var(--border-strong)'}`,
                            padding: '6px 12px', fontSize: '12px'
                          }}>
                    {t}s
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={startQuiz} className="ca-btn ca-btn-accent"
                  style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px' }}>
            <GraduationCap size={16} /> Savollarni boshlash
          </button>
        </div>
      </PageContainer>
    );
  }

  // ============ REVIEW STAGE ============
  if (stage === 'review') {
    const total = questions.length;
    const correct = questions.filter(q => q.options[answers[q.id]]?.correct).length;
    const pct = Math.round((correct / total) * 100);

    return (
      <PageContainer title="Natijalar" subtitle="Natijangizni ko'rib chiqing va xato qilgan savollarni qayta o'rganing.">
        <div className="ca-card-strong" style={{ padding: '32px', textAlign: 'center', marginBottom: '20px' }}>
          <Trophy size={36} style={{ color: pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--gold)' : 'var(--accent)', marginBottom: '12px' }} />
          <div className="ca-display" style={{ fontSize: '64px', fontWeight: 500, lineHeight: 1, color: pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--gold)' : 'var(--accent)' }}>
            {pct}%
          </div>
          <div style={{ fontSize: '16px', color: 'var(--ink-soft)', marginTop: '8px' }}>
            {correct} / {total} to'g'ri javob
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '24px' }}>
            <button onClick={restart} className="ca-btn ca-btn-primary"><RotateCcw size={14} /> Yangi quiz</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {questions.map((q, i) => {
            const ai = answers[q.id];
            const isCorrect = q.options[ai]?.correct;
            return (
              <div key={q.id} className="ca-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Savol {i + 1} · {q.difficulty}</div>
                  <div style={{ fontSize: '12px', fontWeight: 600,
                               color: isCorrect ? 'var(--green)' : 'var(--accent)' }}>
                    {isCorrect ? '✓ To\'g\'ri' : '✗ Noto\'g\'ri'}
                  </div>
                </div>
                {q.case && <p style={{ fontSize: '13px', color: 'var(--ink-soft)', fontStyle: 'italic', margin: '0 0 8px' }}>{q.case}</p>}
                <p style={{ fontSize: '14px', margin: '0 0 8px', fontWeight: 500 }}>{q.question}</p>
                <div style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>
                  <strong>Sizning javobingiz:</strong> {ai !== undefined ? q.options[ai]?.text : '— (javob yo\'q)'}<br/>
                  {!isCorrect && <><strong style={{ color: 'var(--green)' }}>To'g'ri javob:</strong> {q.options.find(o => o.correct).text}</>}
                </div>
              </div>
            );
          })}
        </div>
      </PageContainer>
    );
  }

  // ============ QUIZ STAGE ============
  const isSubmitted = submitted[current.id];
  const selectedIdx = answers[current.id];
  const isBookmarked = bookmarks.includes(current.id);

  return (
    <PageContainer>
      {/* Progress + timer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <div className="ca-mono" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
          Savol {idx + 1} / {questions.length}
        </div>
        <div style={{ flex: 1, height: '4px', background: 'var(--bg-soft)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--accent)',
                       width: `${((idx + 1) / questions.length) * 100}%`, transition: 'width .3s' }} />
        </div>
        {config.timer && !isSubmitted && (
          <div className="ca-mono" style={{ fontSize: '13px', fontWeight: 600,
                                            color: timeLeft < 10 ? 'var(--accent)' : 'var(--ink)' }}>
            <Timer size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            {timeLeft}s
          </div>
        )}
        <button onClick={() => toggleBookmark(current.id)}
                className="ca-btn ca-btn-ghost"
                style={{ padding: '6px 10px' }}>
          {isBookmarked ? <BookmarkCheck size={14} style={{ color: 'var(--accent)' }} /> : <Bookmark size={14} />}
        </button>
        <span className="ca-pill ca-pill-additional">{current.difficulty}</span>
      </div>

      <div className="ca-card-strong" style={{ padding: '32px' }}>
        {current.case && (
          <div style={{ padding: '16px 20px', background: 'var(--bg-soft)', borderRadius: '8px', marginBottom: '20px',
                       borderLeft: '3px solid var(--gold)' }}>
            <div style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '6px' }}>
              Klinik scenariy
            </div>
            <p style={{ fontSize: '14px', margin: 0, lineHeight: 1.6 }}>{current.case}</p>
          </div>
        )}

        <h3 className="ca-display" style={{ fontSize: '22px', fontWeight: 500, margin: '0 0 16px', lineHeight: 1.3 }}>
          {current.question}
        </h3>

        <div style={{ marginBottom: '20px' }}>
          <AudioPlayer engine={engine} soundId={current.soundId} label={null} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {current.options.map((opt, i) => {
            const isPicked = selectedIdx === i;
            const showResult = isSubmitted;
            let bg = 'var(--bg-elev)';
            let border = 'var(--border-strong)';
            let color = 'var(--ink)';
            if (showResult) {
              if (opt.correct) { bg = 'var(--green-soft)'; border = 'var(--green)'; }
              else if (isPicked) { bg = 'var(--accent-soft)'; border = 'var(--accent)'; }
            } else if (isPicked) {
              bg = 'var(--bg-soft)'; border = 'var(--ink)';
            }
            return (
              <div key={i}>
                <button onClick={() => select(current.id, i)} disabled={isSubmitted}
                        style={{
                          width: '100%', padding: '14px 18px', textAlign: 'left',
                          background: bg, border: `1.5px solid ${border}`, color,
                          borderRadius: '8px', cursor: isSubmitted ? 'default' : 'pointer',
                          fontFamily: 'DM Sans', fontSize: '14px', fontWeight: 500,
                          display: 'flex', alignItems: 'flex-start', gap: '12px',
                          transition: 'all .2s'
                        }}>
                  <div style={{
                    flex: '0 0 24px', height: '24px', borderRadius: '50%',
                    background: showResult && opt.correct ? 'var(--green)' :
                               showResult && isPicked ? 'var(--accent)' :
                               isPicked ? 'var(--ink)' : 'transparent',
                    border: `1.5px solid ${showResult && opt.correct ? 'var(--green)' :
                                          showResult && isPicked ? 'var(--accent)' :
                                          isPicked ? 'var(--ink)' : 'var(--border-strong)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: showResult && (opt.correct || isPicked) ? 'white' : isPicked ? 'var(--bg)' : 'var(--ink-soft)',
                    fontSize: '12px', fontWeight: 600
                  }}>
                    {showResult && opt.correct ? <Check size={12} /> :
                     showResult && isPicked ? <X size={12} /> :
                     String.fromCharCode(65 + i)}
                  </div>
                  <span style={{ flex: 1 }}>{opt.text}</span>
                </button>
                {isSubmitted && (
                  <div className="ca-fade" style={{ padding: '10px 14px 4px 54px',
                                                    fontSize: '13px',
                                                    color: opt.correct ? 'var(--green)' : isPicked ? 'var(--accent)' : 'var(--ink-muted)',
                                                    lineHeight: 1.55 }}>
                    {opt.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {isSubmitted && current.keyTeaching && (
          <div className="ca-fade" style={{ marginTop: '20px', padding: '16px 20px', background: 'var(--accent-soft)',
                                            borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
            <div style={{ fontSize: '11px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '6px' }}>
              <Sparkles size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Kalit nuqta
            </div>
            <p style={{ fontSize: '14px', margin: 0, lineHeight: 1.6, fontWeight: 500 }}>{current.keyTeaching}</p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', gap: '8px' }}>
          <button onClick={prevQ} disabled={idx === 0} className="ca-btn ca-btn-ghost"
                  style={{ opacity: idx === 0 ? 0.4 : 1 }}>
            <ChevronLeft size={14} /> Oldingi
          </button>
          {!isSubmitted ? (
            <button onClick={() => submit(current.id)}
                    disabled={selectedIdx === undefined}
                    className="ca-btn ca-btn-accent"
                    style={{ opacity: selectedIdx === undefined ? 0.4 : 1 }}>
              Javob yuborish <ArrowRight size={14} />
            </button>
          ) : (
            <button onClick={nextQ} className="ca-btn ca-btn-primary">
              {idx === questions.length - 1 ? 'Natijalarni ko\'rish' : 'Keyingi'} <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

/* ============================================================================
 * COMPARE PAGE - Side-by-side murmur comparison
 * ============================================================================ */

const COMPARE_PAIRS = [
  {
    id: 'as-vs-ar',
    title: 'Aortic Stenosis vs Aortic Regurgitation',
    leftId: 'aortic-stenosis',
    rightId: 'aortic-regurgitation',
    differences: [
      { feature: 'Faza', left: 'Sistolik', right: 'Diastolik' },
      { feature: 'Shakl', left: 'Crescendo–decrescendo', right: 'Decrescendo (early diastolic)' },
      { feature: 'Eshitish nuqtasi', left: '2nd ICS, RSB', right: 'Erb (3rd ICS, LSB)' },
      { feature: 'Pozitsiya', left: 'O\'tirgan, oldinga egilgan', right: 'O\'tirgan, oldinga egilgan, nafas chiqarib ushlash' },
      { feature: 'Radiatsiya', left: 'Karotid arteriyalarga', right: 'Chap sternal chegara bo\'ylab' },
      { feature: 'Pulse', left: 'Pulsus parvus et tardus', right: 'Bounding (water-hammer) pulse' },
      { feature: 'Tipik sabab', left: 'Yoshlikda — bicuspid valve; keksaylikda — kaltsifikatsiya', right: 'Aortic root dilatation, endokardit, revmatizm' }
    ]
  },
  {
    id: 'ms-vs-mr',
    title: 'Mitral Stenosis vs Mitral Regurgitation',
    leftId: 'mitral-stenosis',
    rightId: 'mitral-regurgitation',
    differences: [
      { feature: 'Faza', left: 'Diastolik', right: 'Sistolik (holosystolic)' },
      { feature: 'Shakl', left: 'Opening snap + low-pitched rumble', right: 'Holosystolic plateau' },
      { feature: 'Eshitish nuqtasi', left: 'Apex (5th ICS, MCL)', right: 'Apex (5th ICS, MCL)' },
      { feature: 'Pozitsiya', left: 'Chap yon (left lateral decubitus), bell', right: 'Chap yon, diaphragm' },
      { feature: 'Radiatsiya', left: 'Lokal (kam tarqaladi)', right: 'Chap qo\'ltiq ostiga (axilla)' },
      { feature: 'S1 kuchi', left: 'Kuchaygan (loud S1)', right: 'Susaygan (soft S1)' },
      { feature: 'Tipik sabab', left: 'Revmatik isitma (asosiy sabab)', right: 'MVP, papillyar mushak disfunktsiyasi, endokardit' }
    ]
  },
  {
    id: 's3-vs-s4',
    title: 'S3 vs S4 Gallop',
    leftId: 's3',
    rightId: 's4',
    differences: [
      { feature: 'Vaqti', left: 'S2 dan keyin (early diastolic)', right: 'S1 dan oldin (late diastolic / pre-systolic)' },
      { feature: 'Ritmi', left: '"Ken-tuc-KY"', right: '"TEN-nes-see"' },
      { feature: 'Mexanizm', left: 'Tez qorincha to\'lishi (rapid filling)', right: 'Atrial kontraktsiya qattiq qorinchaga' },
      { feature: 'Klinik ahamiyati', left: 'Yoshlarda normal; kattalarda — yurak yetishmovchiligi, volume overload', right: 'LVH, ishemiya, gipertenziya, AS' },
      { feature: 'Eshitish', left: 'Apex, bell, chap yon pozitsiya', right: 'Apex, bell, chap yon pozitsiya' }
    ]
  }
];

const ComparePage = ({ engine }) => {
  const [pairId, setPairId] = useState(COMPARE_PAIRS[0].id);
  const pair = COMPARE_PAIRS.find(p => p.id === pairId);
  const left = HEART_SOUNDS.find(s => s.id === pair.leftId);
  const right = HEART_SOUNDS.find(s => s.id === pair.rightId);

  return (
    <PageContainer title="Yonma-yon taqqoslash"
                   subtitle="Ikki o'xshash shovqinning farqlarini bir vaqtda eshitib, farqlarini tahlil qiling.">
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {COMPARE_PAIRS.map(p => (
          <button key={p.id} onClick={() => setPairId(p.id)}
                  className={`ca-btn ${pairId === p.id ? 'ca-btn-primary' : 'ca-btn-ghost'}`}>
            {p.title}
          </button>
        ))}
      </div>

      <div className="ca-compare-grid">
        <div className="ca-card">
          <div style={{ fontSize: '11px', color: 'var(--accent)', textTransform: 'uppercase',
                        letterSpacing: '0.1em', fontWeight: 600, marginBottom: '8px' }}>A tomon</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', margin: '0 0 4px 0' }}>{left.name}</h3>
          <CategoryPill category={left.category} />
          <div style={{ marginTop: '16px' }}>
            <AudioPlayer engine={engine} soundId={left.id} label="Eshitish" hr={left.bpm || 75} />
          </div>
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
            <SoundDiagramSVG type={left.diagram} size="md" />
          </div>
          <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--ink-soft)', lineHeight: 1.65 }}>
            {left.description}
          </div>
        </div>

        <div className="ca-card">
          <div style={{ fontSize: '11px', color: 'var(--green)', textTransform: 'uppercase',
                        letterSpacing: '0.1em', fontWeight: 600, marginBottom: '8px' }}>B tomon</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', margin: '0 0 4px 0' }}>{right.name}</h3>
          <CategoryPill category={right.category} />
          <div style={{ marginTop: '16px' }}>
            <AudioPlayer engine={engine} soundId={right.id} label="Eshitish" hr={right.bpm || 75} />
          </div>
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
            <SoundDiagramSVG type={right.diagram} size="md" />
          </div>
          <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--ink-soft)', lineHeight: 1.65 }}>
            {right.description}
          </div>
        </div>
      </div>

      <div className="ca-card" style={{ marginTop: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', margin: '0 0 16px 0' }}>
          Differentsial diagnostika jadvali
        </h3>
        <div style={{ overflow: 'auto' }}>
          <table className="ca-compare-table">
            <thead>
              <tr>
                <th>Belgi</th>
                <th style={{ color: 'var(--accent)' }}>{left.name}</th>
                <th style={{ color: 'var(--green)' }}>{right.name}</th>
              </tr>
            </thead>
            <tbody>
              {pair.differences.map((d, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{d.feature}</td>
                  <td>{d.left}</td>
                  <td>{d.right}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
};

/* ============================================================================
 * BOOKMARKS PAGE - Saved questions for review
 * ============================================================================ */

const BookmarksPage = ({ engine, bookmarks, toggleBookmark }) => {
  const items = QUESTION_BANK.filter(q => bookmarks.includes(q.id));

  if (items.length === 0) {
    return (
      <PageContainer title="Saqlangan savollar" subtitle="Qaytarib o'rganish uchun belgilab qo'ygan savollaringiz.">
        <div className="ca-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Bookmark size={42} style={{ color: 'var(--ink-faint)', marginBottom: '16px' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', margin: '0 0 8px 0' }}>
            Hali saqlangan savol yo'q
          </h3>
          <p style={{ color: 'var(--ink-soft)', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>
            Qbankda har bir savolning ustki o'ng burchagidagi xatcho'p (bookmark) belgisini bosib, savolni shu yerga
            saqlab qo'yishingiz mumkin. Keyinchalik faqat qiyin savollarni qaytarib mashq qilasiz.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Saqlangan savollar"
                   subtitle={`${items.length} ta savol qayta ko'rib chiqish uchun saqlangan.`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map((q, i) => {
          const sound = HEART_SOUNDS.find(s => s.id === q.soundId);
          const correctOpt = q.options.find(o => o.correct);
          return (
            <div key={q.id} className="ca-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase',
                                letterSpacing: '0.08em', marginBottom: '4px' }}>
                    Savol #{i + 1} · {q.difficulty}
                  </div>
                  <p style={{ fontSize: '15px', margin: '0 0 12px 0', lineHeight: 1.6 }}>{q.stem}</p>
                </div>
                <button onClick={() => toggleBookmark(q.id)} className="ca-icon-btn" title="Saqlangandan olib tashlash">
                  <BookmarkCheck size={16} style={{ color: 'var(--gold)' }} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
                <AudioPlayer engine={engine} soundId={q.soundId} label="Tovush" compact />
                {sound && <CategoryPill category={sound.category} />}
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--green-soft)', borderRadius: '6px',
                            borderLeft: '3px solid var(--green)' }}>
                <div style={{ fontSize: '11px', color: 'var(--green)', textTransform: 'uppercase',
                              letterSpacing: '0.08em', fontWeight: 600, marginBottom: '4px' }}>To'g'ri javob</div>
                <p style={{ fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                  <strong>{correctOpt.text}.</strong> {correctOpt.explanation}
                </p>
              </div>
              {q.keyTeaching && (
                <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '12px',
                            fontStyle: 'italic', lineHeight: 1.55 }}>
                  💡 {q.keyTeaching}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
};

/* ============================================================================
 * DASHBOARD PAGE - Performance analytics
 * ============================================================================ */

const DashboardPage = ({ qbankState, practiceLog, student }) => {
  const totalAttempted = qbankState.attempted || 0;
  const totalCorrect = qbankState.correct || 0;
  const accuracy = totalAttempted ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  const practiceTotal = practiceLog.length;
  const practiceCorrect = practiceLog.filter(l => l.correct).length;
  const practiceAcc = practiceTotal ? Math.round((practiceCorrect / practiceTotal) * 100) : 0;

  // Per-sound analytics: combine qbank perTopic + practice log
  const perSound = {};
  HEART_SOUNDS.forEach(s => {
    perSound[s.id] = { name: s.name, total: 0, correct: 0, category: s.category };
  });
  Object.entries(qbankState.perTopic || {}).forEach(([sid, stat]) => {
    if (perSound[sid]) {
      perSound[sid].total += stat.total;
      perSound[sid].correct += stat.correct;
    }
  });
  practiceLog.forEach(l => {
    if (perSound[l.soundId]) {
      perSound[l.soundId].total += 1;
      if (l.correct) perSound[l.soundId].correct += 1;
    }
  });

  const ranked = Object.entries(perSound)
    .map(([id, s]) => ({ id, ...s, acc: s.total ? (s.correct / s.total) * 100 : null }))
    .filter(s => s.total > 0)
    .sort((a, b) => a.acc - b.acc);

  const hardest = ranked.slice(0, 3);
  const strongest = [...ranked].reverse().slice(0, 3);

  return (
    <PageContainer title="Statistika va tahlil"
                   subtitle={`${student.first}, sizning umumiy o'qish dinamikangiz.`}>
      <div className="ca-stat-grid" style={{ marginBottom: '24px' }}>
        <StatTile label="Qbank to'g'rilik" value={`${accuracy}%`} icon={Trophy} />
        <StatTile label="Qbank javoblar" value={totalAttempted} icon={ListChecks} />
        <StatTile label="Practice to'g'rilik" value={`${practiceAcc}%`} icon={Activity} />
        <StatTile label="Practice mashqlar" value={practiceTotal} icon={Brain} />
      </div>

      {ranked.length === 0 ? (
        <div className="ca-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <BarChart3 size={36} style={{ color: 'var(--ink-faint)', marginBottom: '12px' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', margin: '0 0 6px 0' }}>
            Hozircha ma'lumot yo'q
          </h3>
          <p style={{ color: 'var(--ink-soft)', fontSize: '14px', margin: 0 }}>
            Practice yoki Qbank rejimida bir nechta savolga javob bering — statistika shu yerda paydo bo'ladi.
          </p>
        </div>
      ) : (
        <>
          <div className="ca-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', margin: '0 0 16px 0',
                         display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} style={{ color: 'var(--accent)' }} /> Eng qiyin mavzularingiz
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {hardest.map(s => (
                <BarRow key={s.id} label={s.name} acc={s.acc} total={s.total}
                        correct={s.correct} color="var(--accent)" />
              ))}
            </div>
          </div>

          <div className="ca-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', margin: '0 0 16px 0',
                         display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: 'var(--green)' }} /> Yaxshi o'zlashtirgan mavzularingiz
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {strongest.map(s => (
                <BarRow key={s.id} label={s.name} acc={s.acc} total={s.total}
                        correct={s.correct} color="var(--green)" />
              ))}
            </div>
          </div>

          <div className="ca-card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', margin: '0 0 16px 0' }}>
              Barcha tovushlar bo'yicha ko'rsatkichlar
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ranked.map(s => (
                <BarRow key={s.id} label={s.name} acc={s.acc} total={s.total}
                        correct={s.correct}
                        color={s.acc >= 75 ? 'var(--green)' : s.acc >= 50 ? 'var(--gold)' : 'var(--accent)'} />
              ))}
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
};

const BarRow = ({ label, acc, total, correct, color }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
      <span style={{ fontWeight: 500 }}>{label}</span>
      <span style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
        {correct}/{total} · {Math.round(acc)}%
      </span>
    </div>
    <div style={{ height: '6px', background: 'var(--surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{ width: `${acc}%`, height: '100%', background: color,
                    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }} />
    </div>
  </div>
);

/* ============================================================================
 * MAIN APP - State management and routing
 * ============================================================================ */

export default function CardiacAuscultationPlatform() {
  const { dark, toggle: toggleDark } = useTheme();
  const [student, setStudent] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [bookmarks, setBookmarks] = useState([]);
  const [practiceLog, setPracticeLog] = useState([]);
  const [qbankState, setQbankState] = useState({
    attempted: 0,
    correct: 0,
    perTopic: {} // { soundId: { total, correct } }
  });

  // Heart sound engine — single instance for the whole app
  const engineRef = useRef(null);
  if (!engineRef.current) {
    engineRef.current = new HeartSoundEngine();
  }
  const engine = engineRef.current;

  // Stop engine when navigating between pages
  useEffect(() => {
    return () => engine.stop();
  }, [currentPage, engine]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { engine.stop(); } catch (e) {}
    };
  }, [engine]);

  const toggleBookmark = useCallback((qid) => {
    setBookmarks(prev => prev.includes(qid) ? prev.filter(x => x !== qid) : [...prev, qid]);
  }, []);

  const logPractice = useCallback((entry) => {
    setPracticeLog(prev => [...prev, entry]);
  }, []);

  // Aggregate stats for HomePage
  const stats = useMemo(() => {
    const totalQ = qbankState.attempted;
    const correctQ = qbankState.correct;
    const accuracy = totalQ ? Math.round((correctQ / totalQ) * 100) : 0;
    return {
      totalAttempted: totalQ + practiceLog.length,
      accuracy,
      bookmarks: bookmarks.length,
      sounds: HEART_SOUNDS.length
    };
  }, [qbankState, practiceLog, bookmarks]);

  // Welcome screen if no student yet
  if (!student) {
    return (
      <div className="ca-app">
        <ThemeStyles dark={dark} />
        <WelcomeScreen onStart={(s) => setStudent(s)} dark={dark} />
      </div>
    );
  }

  // Render current page
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage student={student} setPage={setCurrentPage} stats={stats} />;
      case 'anatomy':
        return <AnatomyPage engine={engine} dark={dark} />;
      case 'library':
        return <LibraryPage engine={engine} />;
      case 'learn':
        return <LearnPage engine={engine} />;
      case 'practice':
        return <PracticePage engine={engine} onLog={logPractice} />;
      case 'qbank':
        return <QbankPage engine={engine} bookmarks={bookmarks} toggleBookmark={toggleBookmark}
                          qbankState={qbankState} setQbankState={setQbankState} />;
      case 'compare':
        return <ComparePage engine={engine} />;
      case 'bookmarks':
        return <BookmarksPage engine={engine} bookmarks={bookmarks} toggleBookmark={toggleBookmark} />;
      case 'dashboard':
        return <DashboardPage qbankState={qbankState} practiceLog={practiceLog} student={student} />;
      default:
        return <HomePage student={student} setPage={setCurrentPage} stats={stats} />;
    }
  };

  return (
    <div className="ca-app">
      <ThemeStyles dark={dark} />
      <TopBar student={student}
              currentPage={currentPage}
              setPage={setCurrentPage}
              theme={{ dark, toggle: toggleDark }} />
      <main>{renderPage()}</main>
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px',
                       textAlign: 'center', fontSize: '12px', color: 'var(--ink-muted)',
                       marginTop: '40px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--ink-soft)',
                      marginBottom: '4px', letterSpacing: '-0.01em' }}>
          Cardiac Auscultation Trainer
        </div>
        <div>Tibbiyot talabalari uchun ta'limiy platforma · Audio sintez Web Audio API orqali</div>
      </footer>
    </div>
  );
}

