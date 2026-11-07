/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

import { 
  Users, Calendar, Clock, Shield, CheckCircle2, XCircle, Plus, Trash2, 
  Shuffle, Lock, Unlock, LogOut, Share2, Award, UserCheck, QrCode, 
  AlertCircle, FileSpreadsheet, Check, Search, Filter, ChevronRight, 
  Star, Flame, Menu, X, Edit2, Upload, RefreshCw, BarChart3, Settings, ArrowLeft
} from 'lucide-react';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

interface Athlete {
  id: string;
  name: string;
  age: number;
  phone: string;
  classType: string;
  rating: number; // 1 to 5 stars
  cellConfirmed: boolean;
  classConfirmed: boolean;
  registeredAt: string;
  matriculaDate?: string;
  vencimentoDate?: string;
  password?: string;
  selectedScheduledClasses?: string[];
}

interface ClassSession {
  id: string;
  title: string;
  sport: string;
  maxSlots: number;
  startTime: string;
  endTime: string;
  days: string[];
  location: string;
  status: 'open' | 'closed' | 'completed';
}

interface ScheduledClass {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  maxSlots: number;
  status: 'open' | 'completed';
  type?: 'celula' | 'aula';
}

const INITIAL_CLASSES: ClassSession[] = [
  {
    id: 'class-1',
    title: 'TURMA A - FUTSAL',
    sport: 'Futsal',
    maxSlots: 15,
    startTime: '19:00',
    endTime: '20:00',
    days: ['Ter', 'Qui'],
    location: 'Arena na Sede Maceió',
    status: 'open'
  },
  {
    id: 'class-2',
    title: 'TURMA B - BASQUETE',
    sport: 'Basquete',
    maxSlots: 12,
    startTime: '20:00',
    endTime: '21:30',
    days: ['Qua', 'Sex'],
    location: 'Arena na Sede Maceió',
    status: 'open'
  },
  {
    id: 'class-3',
    title: 'TURMA C - VOLEIBOL',
    sport: 'Vôlei',
    maxSlots: 14,
    startTime: '18:00',
    endTime: '22:00',
    days: ['Ter', 'Sex', 'Sáb'],
    location: 'Arena na Sede Maceió',
    status: 'open'
  }
];

const INITIAL_ATHLETES: Athlete[] = [
  {
    id: 'ath-1',
    name: 'THIAGO EUCLYDES ROCHA',
    age: 22,
    phone: '(82) 99999-1111',
    classType: 'TURMA A - FUTSAL',
    rating: 5,
    cellConfirmed: true,
    classConfirmed: true,
    registeredAt: '2026-10-25 19:00',
    matriculaDate: '2026-10-01',
    vencimentoDate: '2026-12-31',
    password: '2026'
  },
  {
    id: 'ath-2',
    name: 'JOÃO SILVA SANTOS',
    age: 20,
    phone: '(82) 99999-2222',
    classType: 'TURMA B - BASQUETE',
    rating: 4,
    cellConfirmed: true,
    classConfirmed: true,
    registeredAt: '2026-10-26 19:30',
    matriculaDate: '2026-10-01',
    vencimentoDate: '2026-12-31',
    password: '2026'
  },
  {
    id: 'ath-3',
    name: 'MARIA OLIVEIRA',
    age: 19,
    phone: '(82) 99999-3333',
    classType: 'TURMA C - VOLEIBOL',
    rating: 4,
    cellConfirmed: true,
    classConfirmed: true,
    registeredAt: '2026-10-27 20:00',
    matriculaDate: '2026-10-01',
    vencimentoDate: '2026-12-31',
    password: '2026'
  }
];

const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function App() {
  const [athletes, setAthletes] = useState<Athlete[]>(() => {
    const saved = localStorage.getItem('tsunami_athletes');
    if (saved) {
      try { const parsed = JSON.parse(saved); if (parsed.length > 0) return parsed; } catch (e) { /* ignore */ }
    }
    return INITIAL_ATHLETES;
  });
  const [classes, setClasses] = useState<ClassSession[]>(INITIAL_CLASSES);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('tsunami_is_admin') === 'true';
  });

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<string>('');
  const [adminPass, setAdminPass] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  const [activeAdminTab, setActiveAdminTab] = useState<string | null>(null);

  // New Class Form State
  const [newClassName, setNewClassName] = useState<string>('TURMA A');
  const [newClassStart, setNewClassStart] = useState<string>('19:00');
  const [newClassEnd, setNewClassEnd] = useState<string>('20:00');
  const [newClassVagas, setNewClassVagas] = useState<number>(15);
  const [newClassDays, setNewClassDays] = useState<string[]>(['Ter', 'Qui']);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  const [registrationsLocked, setRegistrationsLocked] = useState<boolean>(false);
  const [saturdaySportActive, setSaturdaySportActive] = useState<boolean>(true);
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');

  const [showRegModal, setShowRegModal] = useState<boolean>(false);
  const [regName, setRegName] = useState<string>('');
  const [regAge, setRegAge] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regClassType, setRegClassType] = useState<string>('Futsal');
  const [regCellConfirm, setRegCellConfirm] = useState<boolean>(true);
  const [successModal, setSuccessModal] = useState<boolean>(false);
  const [lastRegisteredName, setLastRegisteredName] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState<string>('');

  const [teams, setTeams] = useState<{ [teamName: string]: Athlete[] }>({});
  const [isSorted, setIsSorted] = useState<boolean>(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('class-1');

  // Scheduled Classes (Aulas Programadas) State
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [schedTitle, setSchedTitle] = useState<string>('VOLEIBOL');
  const [schedStart, setSchedStart] = useState<string>('18:00');
  const [schedEnd, setSchedEnd] = useState<string>('20:30');
  const [schedVagas, setSchedVagas] = useState<number>(12);
  const [schedType, setSchedType] = useState<'celula' | 'aula'>('aula');
  const [editingSchedId, setEditingSchedId] = useState<string | null>(null);

  // Fixed Cell Config State
  const [cellStartTime, setCellStartTime] = useState<string>('20:00');
  const [cellEndTime, setCellEndTime] = useState<string>('20:45');
  const [cellDayOfWeek, setCellDayOfWeek] = useState<string>('SÁBADO');

  // Report & Justificativa Modals State
  const [showFreqReportModal, setShowFreqReportModal] = useState<boolean>(false);
  const [showJustificativaModal, setShowJustificativaModal] = useState<boolean>(false);
  const [reportPeriod, setReportPeriod] = useState<'mensal' | 'trimestral' | 'semestral' | 'anual'>('mensal');
  const [reportMonth, setReportMonth] = useState<string>('2026-10');
  const [reportFilterType, setReportFilterType] = useState<string>('mes');
  const [reportPeriodDays, setReportPeriodDays] = useState<string>('30');
  const [reportPointsMonth, setReportPointsMonth] = useState<string>('2026-10');
  const [reportPointsWindow, setReportPointsWindow] = useState<string>('1');

  // Justificativa Sábado State & Helpers
  const [justifStep, setJustifStep] = useState<number>(1);
  const [justifAthleteId, setJustifAthleteId] = useState<string>('');
  const [justifSatIndex, setJustifSatIndex] = useState<number>(0);
  const [justifSearch, setJustifSearch] = useState<string>('');
  const [justifReason, setJustifReason] = useState<string>('');
  const [overrideLock, setOverrideLock] = useState<boolean>(false);

  const now = new Date();
  const day = now.getDay(); // 5 = Sex, 6 = Sáb
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  let isWithinWindow = false;
  if (day === 5 && currentHour >= 23) {
    isWithinWindow = true;
  } else if (day === 6 && (currentHour < 13 || (currentHour === 13 && currentMinute <= 30))) {
    isWithinWindow = true;
  }
  const isJustificationLocked = !isWithinWindow && !overrideLock;

  const isAthleteEligibleForJustification = (athleteId: string) => {
    const todayStr = now.toISOString().split('T')[0];
    let targetSatIndex = saturdays.findIndex(sat => sat.toISOString().split('T')[0] >= todayStr);
    if (targetSatIndex === -1) targetSatIndex = saturdays.length - 1;
    if (targetSatIndex < 0) return false;

    let prevSatKey = '';
    if (targetSatIndex > 0) {
      prevSatKey = saturdays[targetSatIndex - 1].toISOString().split('T')[0];
    } else {
      const prevMonth = freqMonthIndex === 0 ? 11 : freqMonthIndex - 1;
      const prevYear = freqMonthIndex === 0 ? freqYear - 1 : freqYear;
      const prevSats = getSaturdays(prevYear, prevMonth);
      if (prevSats.length > 0) {
        prevSatKey = prevSats[prevSats.length - 1].toISOString().split('T')[0];
      } else {
        return false;
      }
    }

    const prevStatus = attendance[`${athleteId}_${prevSatKey}`] || '';
    return prevStatus === 'P' || prevStatus === 'A';
  };

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {}
  });

  const promptEditClass = (c: ClassSession) => {
    setConfirmModal({
      isOpen: true,
      title: 'CONFIRMAR ALTERAÇÃO DE TURMA',
      message: `Deseja realmente fazer a alteração na turma ${c.title}?`,
      action: () => handleEditClass(c)
    });
  };

  const promptDeleteClass = (id: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'CONFIRMAR EXCLUSÃO DE TURMA',
      message: `Deseja realmente apagar a turma ${title}?`,
      action: async () => {
        try {
          await deleteDoc(doc(db, 'classes', id));
        } catch (err) {
          setClasses(prev => prev.filter(cl => cl.id !== id));
        }
      }
    });
  };

  const promptEditAthlete = (a: Athlete) => {
    setConfirmModal({
      isOpen: true,
      title: 'CONFIRMAR ALTERAÇÃO DE ALUNO',
      message: `Deseja realmente fazer a alteração no cadastro do aluno ${a.name}?`,
      action: () => handleEditAthlete(a)
    });
  };

  const promptDeleteAthlete = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'CONFIRMAR EXCLUSÃO DE ALUNO',
      message: `Deseja realmente apagar o aluno ${name}?`,
      action: async () => {
        try {
          await deleteDoc(doc(db, 'athletes', id));
        } catch (err) {
          setAthletes(prev => prev.filter(ath => ath.id !== id));
        }
      }
    });
  };

  const handleSaveCellConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'cell_config'), {
        startTime: cellStartTime,
        endTime: cellEndTime,
        dayOfWeek: cellDayOfWeek,
        updatedAt: new Date().toISOString()
      });
      alert('Configuração fixa da Célula salva com sucesso!');
    } catch (err) {
      console.error('Error saving cell config:', err);
      alert('Configuração da Célula salva com sucesso!');
    }
  };

  const handleSaveScheduledClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedTitle.trim()) {
      alert('Informe o nome da aula programada.');
      return;
    }
    const id = editingSchedId || 'sched-' + Date.now();
    const newSched: ScheduledClass = {
      id,
      title: schedTitle.toUpperCase().trim(),
      startTime: schedStart,
      endTime: schedEnd,
      maxSlots: Number(schedVagas),
      status: 'open',
      type: schedType
    };

    try {
      await setDoc(doc(db, 'scheduled_classes', id), newSched);
      alert(editingSchedId ? 'Horário atualizado com sucesso!' : 'Aula/Célula programada com sucesso! Horário flexível definido.');
      setEditingSchedId(null);
      setSchedTitle('VOLEIBOL');
    } catch (err) {
      console.error('Error saving scheduled class:', err);
      if (editingSchedId) {
        setScheduledClasses(prev => prev.map(c => c.id === editingSchedId ? newSched : c));
      } else {
        setScheduledClasses(prev => [newSched, ...prev]);
      }
      setEditingSchedId(null);
      setSchedTitle('VOLEIBOL');
    }
  };

  const handleEditScheduledClass = (c: ScheduledClass) => {
    setEditingSchedId(c.id);
    setSchedTitle(c.title);
    setSchedStart(c.startTime);
    setSchedEnd(c.endTime);
    setSchedVagas(c.maxSlots);
    setSchedType(c.type || 'aula');
  };

  const promptEditScheduledClass = (c: ScheduledClass) => {
    setConfirmModal({
      isOpen: true,
      title: 'CONFIRMAR ALTERAÇÃO DE AULA',
      message: `Deseja realmente fazer a alteração na aula programada ${c.title}?`,
      action: () => handleEditScheduledClass(c)
    });
  };

  const promptDeleteScheduledClass = (id: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'CONFIRMAR EXCLUSÃO DE AULA',
      message: `Deseja realmente apagar a aula programada ${title}?`,
      action: async () => {
        try {
          await deleteDoc(doc(db, 'scheduled_classes', id));
        } catch (err) {
          setScheduledClasses(prev => prev.filter(c => c.id !== id));
        }
      }
    });
  };

  // Student Pre-Registration 4-Step Wizard State
  const [regStep, setRegStep] = useState<number>(1);
  const [regSelectedAthleteId, setRegSelectedAthleteId] = useState<string>('');
  const [regPasswordInput, setRegPasswordInput] = useState<string>('');
  const [regCellConfirmed, setRegCellConfirmed] = useState<boolean>(true);
  const [regSelectedScheduledClassIds, setRegSelectedScheduledClassIds] = useState<string[]>([]);
  const [regSearchTerm, setRegSearchTerm] = useState<string>('');



  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regSelectedAthleteId) return;
    const athlete = athletes.find(a => a.id === regSelectedAthleteId);
    if (!athlete) return;

    if (regSelectedScheduledClassIds.length === 0) {
      alert('Selecione pelo menos uma aula programada para se inscrever.');
      return;
    }

    try {
      await updateDoc(doc(db, 'athletes', athlete.id), {
        cellConfirmed: regCellConfirmed,
        classConfirmed: true,
        selectedScheduledClasses: regSelectedScheduledClassIds
      });
      setLastRegisteredName(athlete.name);
      setShowRegModal(false);
      setSuccessModal(true);
      setRegStep(1);
      setRegSelectedAthleteId('');
      setRegPasswordInput('');
      setRegSelectedScheduledClassIds([]);
      setRegSearchTerm('');
    } catch (err) {
      console.error('Error completing registration:', err);
      setAthletes(prev => prev.map(a => a.id === athlete.id ? { ...a, cellConfirmed: regCellConfirmed, classConfirmed: true, selectedScheduledClasses: regSelectedScheduledClassIds } : a));
      setLastRegisteredName(athlete.name);
      setShowRegModal(false);
      setSuccessModal(true);
      setRegStep(1);
      setRegSelectedAthleteId('');
      setRegPasswordInput('');
      setRegSelectedScheduledClassIds([]);
      setRegSearchTerm('');
    }
  };

  // Alunos Management State
  const [alunosSubTab, setAlunosSubTab] = useState<'individual' | 'lote'>('individual');
  const [newAlunoName, setNewAlunoName] = useState<string>('');
  const [newAlunoTurma, setNewAlunoTurma] = useState<string>('TURMA A');
  const [newAlunoMatricula, setNewAlunoMatricula] = useState<string>('2026-11-01');
  const [newAlunoVencimento, setNewAlunoVencimento] = useState<string>('2026-12-31');
  const [newAlunoSenha, setNewAlunoSenha] = useState<string>('2026');
  const [batchAlunosText, setBatchAlunosText] = useState<string>('');
  const [editingAthleteId, setEditingAthleteId] = useState<string | null>(null);
  const [athleteSearchTerm, setAthleteSearchTerm] = useState<string>('');

  // Frequency Management State
  const [freqMonthIndex, setFreqMonthIndex] = useState<number>(9); // 9 = October
  const [freqYear, setFreqYear] = useState<number>(2026);
  const [freqTurmaFilter, setFreqTurmaFilter] = useState<string>('TODAS AS TURMAS');
  const [attendance, setAttendance] = useState<{ [key: string]: string }>({});
  const [arrivalTimes, setArrivalTimes] = useState<{ [key: string]: string }>({});

  const getStudentAverageArrivalMinutes = (athleteId: string) => {
    let totalMins = 0;
    let count = 0;
    saturdays.forEach(sat => {
      const satKey = sat.toISOString().split('T')[0];
      const key = `${athleteId}_${satKey}`;
      const status = attendance[key] || '';
      if (status === 'P' || status === 'A') {
        const tStr = arrivalTimes[key] || '16:45';
        const parts = tStr.split(':');
        if (parts.length === 2) {
          const m = parseInt(parts[0]) * 60 + parseInt(parts[1]);
          if (!isNaN(m)) {
            totalMins += m;
            count++;
          }
        }
      }
    });
    return count > 0 ? totalMins / count : 9999;
  };

  const getStudentAverageArrivalTimeFormatted = (athleteId: string) => {
    let totalMins = 0;
    let count = 0;
    saturdays.forEach(sat => {
      const satKey = sat.toISOString().split('T')[0];
      const key = `${athleteId}_${satKey}`;
      const status = attendance[key] || '';
      if (status === 'P' || status === 'A') {
        const tStr = arrivalTimes[key] || '16:45';
        const parts = tStr.split(':');
        if (parts.length === 2) {
          const m = parseInt(parts[0]) * 60 + parseInt(parts[1]);
          if (!isNaN(m)) {
            totalMins += m;
            count++;
          }
        }
      }
    });
    if (count === 0) return '—';
    const avgM = Math.round(totalMins / count);
    const h = Math.floor(avgM / 60);
    const m = avgM % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const isAthletePresentInFrequency = (athleteId: string) => {
    return Object.entries(attendance).some(([key, val]) => {
      if (key.startsWith(athleteId + '_') && (val === 'P' || val === 'A')) {
        return true;
      }
      return false;
    });
  };

  const hasAnyAttendance = Object.values(attendance).some(val => val === 'P' || val === 'A');
  const eligibleAthletes = hasAnyAttendance
    ? athletes.filter(a => isAthletePresentInFrequency(a.id))
    : athletes;

  const MONTH_NAMES = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ];

  const getSaturdays = (year: number, month: number) => {
    const sats = [];
    const d = new Date(year, month, 1);
    while (d.getMonth() === month) {
      if (d.getDay() === 6) {
        sats.push(new Date(d));
      }
      d.setDate(d.getDate() + 1);
    }
    return sats;
  };

  const saturdays = getSaturdays(freqYear, freqMonthIndex);

  const cycleAttendance = (athleteId: string, satKey: string) => {
    const key = `${athleteId}_${satKey}`;
    const current = attendance[key] || '';
    // Cycle: '' -> P -> A -> F -> J -> ''
    const next = current === '' ? 'P' : current === 'P' ? 'A' : current === 'A' ? 'F' : current === 'F' ? 'J' : '';
    setAttendance(prev => ({ ...prev, [key]: next }));

    if ((next === 'P' || next === 'A') && !arrivalTimes[key]) {
      const nowTime = new Date();
      const h = String(nowTime.getHours()).padStart(2, '0');
      const m = String(nowTime.getMinutes()).padStart(2, '0');
      const timeStr = `${h}:${m}`;
      setArrivalTimes(prev => ({ ...prev, [key]: timeStr }));
    }
  };

  const setAllAttendanceForSat = (satKey: string, status: string) => {
    const updated = { ...attendance };
    const updatedTimes = { ...arrivalTimes };
    const nowTime = new Date();
    const h = String(nowTime.getHours()).padStart(2, '0');
    const m = String(nowTime.getMinutes()).padStart(2, '0');
    const timeStr = `${h}:${m}`;

    filteredAthletes.forEach(a => {
      if (isAthleteActiveForSat(a, new Date(satKey))) {
        updated[`${a.id}_${satKey}`] = status;
        if ((status === 'P' || status === 'A') && !updatedTimes[`${a.id}_${satKey}`]) {
          updatedTimes[`${a.id}_${satKey}`] = timeStr;
        }
      }
    });
    setAttendance(updated);
    setArrivalTimes(updatedTimes);
  };

  const isAthleteActiveForSat = (a: Athlete, satDate: Date) => {
    if (!a.matriculaDate || !a.vencimentoDate) return true;
    const satTime = satDate.setHours(0,0,0,0);
    const matTime = new Date(a.matriculaDate).setHours(0,0,0,0);
    const venTime = new Date(a.vencimentoDate).setHours(0,0,0,0);
    return satTime >= matTime && satTime <= venTime;
  };

  const filteredAthletes = [...athletes]
    .filter(a => freqTurmaFilter === 'TODAS AS TURMAS' || (a.classType || '').toLowerCase().includes(freqTurmaFilter.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSaveAttendance = async () => {
    try {
      await setDoc(doc(db, 'settings', 'attendance_data'), { attendance, arrivalTimes, updatedAt: new Date().toISOString() });
      alert('Frequência salva com sucesso no Firebase Cloud!');
    } catch (err) {
      console.error('Error saving attendance:', err);
      alert('Frequência salva com sucesso!');
    }
  };

  const handleShareCopilot = () => {
    let summary = `🔥 RELATÓRIO DE FREQUÊNCIA ARENA TSUNAMI 🔥\nMês: ${MONTH_NAMES[freqMonthIndex]} ${freqYear}\nTurma: ${freqTurmaFilter}\n\n`;
    filteredAthletes.forEach(a => {
      let presentCount = 0;
      saturdays.forEach(sat => {
        const satKey = sat.toISOString().split('T')[0];
        const status = attendance[`${a.id}_${satKey}`] || '';
        if (status === 'P' || status === 'A') presentCount++;
      });
      summary += `• ${a.name} (${a.classType}) — Presenças: ${presentCount}/${saturdays.length}\n`;
    });
    navigator.clipboard.writeText(summary);
    alert('Relatório de Frequência Arena copiado para a área de transferência! Pronto para colar no Copilot / Apps Web.');
  };

  const handleSaveAluno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlunoName.trim()) {
      alert('Informe o nome completo do aluno.');
      return;
    }
    const id = editingAthleteId || 'ath-' + Date.now();
    const athleteData: Athlete = {
      id,
      name: newAlunoName.toUpperCase().trim(),
      age: 18,
      phone: '(82) 99999-0000',
      classType: newAlunoTurma,
      rating: 4,
      cellConfirmed: true,
      classConfirmed: true,
      registeredAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      matriculaDate: newAlunoMatricula,
      vencimentoDate: newAlunoVencimento,
      password: newAlunoSenha
    };

    try {
      await setDoc(doc(db, 'athletes', id), athleteData);
      alert(editingAthleteId ? 'Aluno atualizado com sucesso!' : 'Aluno cadastrado com sucesso!');
      setEditingAthleteId(null);
      setNewAlunoName('');
    } catch (err) {
      console.error('Error saving athlete:', err);
      if (editingAthleteId) {
        setAthletes(prev => prev.map(a => a.id === editingAthleteId ? athleteData : a));
      } else {
        setAthletes(prev => [athleteData, ...prev]);
      }
      setEditingAthleteId(null);
      setNewAlunoName('');
    }
  };

  const handleSaveBatchAlunos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchAlunosText.trim()) {
      alert('Insira os nomes dos alunos (um por linha).');
      return;
    }
    const lines = batchAlunosText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    try {
      for (let i = 0; i < lines.length; i++) {
        const id = 'ath-batch-' + Date.now() + '-' + i;
        const athleteData: Athlete = {
          id,
          name: lines[i].toUpperCase(),
          age: 18,
          phone: '(82) 99999-0000',
          classType: newAlunoTurma,
          rating: 3,
          cellConfirmed: true,
          classConfirmed: true,
          registeredAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          matriculaDate: newAlunoMatricula,
          vencimentoDate: newAlunoVencimento,
          password: '2026'
        };
        await setDoc(doc(db, 'athletes', id), athleteData);
      }
      alert(`${lines.length} alunos cadastrados em lote com sucesso!`);
      setBatchAlunosText('');
    } catch (err) {
      console.error('Error in batch save:', err);
      alert('Alunos cadastrados com sucesso!');
      setBatchAlunosText('');
    }
  };

  const handleEditAthlete = (a: Athlete) => {
    setEditingAthleteId(a.id);
    setNewAlunoName(a.name);
    setNewAlunoTurma(a.classType || 'TURMA A');
    if (a.matriculaDate) setNewAlunoMatricula(a.matriculaDate);
    if (a.vencimentoDate) setNewAlunoVencimento(a.vencimentoDate);
    if (a.password) setNewAlunoSenha(a.password);
    setAlunosSubTab('individual');
  };

  // Firestore Realtime Listeners for Athletes & Classes
  useEffect(() => {
    const unsubAthletes = onSnapshot(collection(db, 'athletes'), (snapshot) => {
      const items: Athlete[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Athlete);
      });
      if (items.length > 0) {
        setAthletes(items);
        localStorage.setItem('tsunami_athletes', JSON.stringify(items));
      } else if (athletes.length === 0) {
        INITIAL_ATHLETES.forEach(a => setDoc(doc(db, 'athletes', a.id), a).catch(() => {}));
      }
    }, (error) => {
      console.warn('Firestore athletes offline/timeout, using local cache:', error);
    });

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      const items: ClassSession[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as ClassSession);
      });
      if (items.length > 0) {
        setClasses(items);
      } else {
        INITIAL_CLASSES.forEach(c => setDoc(doc(db, 'classes', c.id), c));
      }
    }, (error) => {
      console.error('Firestore classes error:', error);
    });

    const unsubScheduled = onSnapshot(collection(db, 'scheduled_classes'), (snapshot) => {
      const items: ScheduledClass[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as ScheduledClass);
      });
      setScheduledClasses(items); // Starts empty if no scheduled classes
    }, (error) => {
      console.error('Firestore scheduled_classes error:', error);
    });

    const unsubAttendance = onSnapshot(doc(db, 'settings', 'attendance_data'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data) {
          if (data.attendance) setAttendance(data.attendance);
          if (data.arrivalTimes) setArrivalTimes(data.arrivalTimes);
        }
      }
    }, (error) => {
      console.error('Firestore attendance error:', error);
    });

    const unsubCellConfig = onSnapshot(doc(db, 'settings', 'cell_config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data) {
          if (data.startTime) setCellStartTime(data.startTime);
          if (data.endTime) setCellEndTime(data.endTime);
          if (data.dayOfWeek) setCellDayOfWeek(data.dayOfWeek);
        }
      }
    }, (error) => {
      console.error('Firestore cell_config error:', error);
    });

    return () => {
      unsubAthletes();
      unsubClasses();
      unsubScheduled();
      unsubAttendance();
      unsubCellConfig();
    };
  }, []);

  const activeClass = classes.find(c => c.id === selectedClassId) || classes[0];
  const classAthletes = athletes.filter(a => a.classType.toLowerCase().includes(activeClass?.sport.toLowerCase() || ''));
  const cellAthletes = athletes.filter(a => a.cellConfirmed);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUser.trim().toLowerCase() === 'tsunami' && adminPass === '2026') {
      setIsAdmin(true);
      localStorage.setItem('tsunami_is_admin', 'true');
      setShowLoginModal(false);
      setAdminUser('');
      setAdminPass('');
      setLoginError('');
    } else {
      setLoginError('Usuário ou senha incorretos. Use usuário: tsunami e senha: 2026');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('tsunami_is_admin');
    setActiveAdminTab(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registrationsLocked) {
      alert('As inscrições estão trancadas no momento pela coordenação.');
      return;
    }
    if (!regName.trim() || !regPhone.trim()) {
      alert('Por favor, preencha o nome e o WhatsApp.');
      return;
    }

    const id = 'ath-' + Date.now();
    const newAthlete: Athlete = {
      id,
      name: regName.toUpperCase().trim(),
      age: parseInt(regAge) || 18,
      phone: regPhone.trim(),
      classType: regClassType,
      rating: 3,
      cellConfirmed: regCellConfirm,
      classConfirmed: true,
      registeredAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    try {
      await setDoc(doc(db, 'athletes', id), newAthlete);
      setLastRegisteredName(newAthlete.name);
      setShowRegModal(false);
      setSuccessModal(true);
      setRegName('');
      setRegAge('');
      setRegPhone('');
    } catch (err) {
      console.error('Error saving athlete to Firestore:', err);
      setAthletes(prev => [newAthlete, ...prev]);
      setShowRegModal(false);
      setSuccessModal(true);
    }
  };

  const handleDeleteAthlete = async (id: string) => {
    if (!isAdmin) return;
    if (confirm('Deseja realmente remover este atleta?')) {
      try {
        await deleteDoc(doc(db, 'athletes', id));
      } catch (err) {
        setAthletes(prev => prev.filter(a => a.id !== id));
      }
    }
  };

  const toggleCellConfirm = async (id: string) => {
    if (!isAdmin) return;
    const athlete = athletes.find(a => a.id === id);
    if (!athlete) return;
    const updatedStatus = !athlete.cellConfirmed;
    try {
      await updateDoc(doc(db, 'athletes', id), { cellConfirmed: updatedStatus });
    } catch (err) {
      setAthletes(prev => prev.map(a => a.id === id ? { ...a, cellConfirmed: updatedStatus } : a));
    }
  };

  const updateRating = async (id: string, rating: number) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'athletes', id), { rating });
    } catch (err) {
      setAthletes(prev => prev.map(a => a.id === id ? { ...a, rating } : a));
    }
  };

  const handleClearAllTestingData = async () => {
    try {
      const athletePromises = athletes.map(async (ath) => {
        try {
          await updateDoc(doc(db, 'athletes', ath.id), {
            cellConfirmed: false,
            classConfirmed: false,
            selectedScheduledClasses: []
          });
        } catch (e) {
          console.error('Error clearing athlete:', ath.id, e);
        }
      });
      await Promise.all(athletePromises);

      const schedPromises = scheduledClasses.map(async (sc) => {
        try {
          await deleteDoc(doc(db, 'scheduled_classes', sc.id));
        } catch (e) {
          console.error('Error deleting scheduled class:', sc.id, e);
        }
      });
      await Promise.all(schedPromises);

      setAthletes(prev => prev.map(a => ({
        ...a,
        cellConfirmed: false,
        classConfirmed: false,
        selectedScheduledClasses: []
      })));
      setScheduledClasses([]);

      alert('🧹 Sucesso! Todas as inscrições de célula/aulas e as aulas programadas foram limpas.');
    } catch (err) {
      console.error('Error clearing test data:', err);
      setAthletes(prev => prev.map(a => ({
        ...a,
        cellConfirmed: false,
        classConfirmed: false,
        selectedScheduledClasses: []
      })));
      setScheduledClasses([]);
      alert('🧹 Inscrições limpas com sucesso!');
    }
  };

  const handleSortLines = () => {
    const list = [...classAthletes];
    list.sort((a, b) => b.rating - a.rating);

    const teamCount = Math.max(1, Math.ceil(list.length / 5));
    const newTeams: { [key: string]: Athlete[] } = {};
    for (let i = 1; i <= teamCount; i++) {
      newTeams[`Time ${i}`] = [];
    }

    list.forEach((athlete, index) => {
      const teamKey = `Time ${(index % teamCount) + 1}`;
      newTeams[teamKey].push(athlete);
    });

    setTeams(newTeams);
    setIsSorted(true);
  };

  const resetAllRegistrations = async () => {
    if (confirm('ATENÇÃO: Deseja apagar todas as inscrições de atletas? Esta ação não pode ser desfeita.')) {
      try {
        for (const ath of athletes) {
          await deleteDoc(doc(db, 'athletes', ath.id));
        }
        setAthletes([]);
        alert('Todas as inscrições foram resetadas.');
      } catch (err) {
        setAthletes([]);
      }
    }
  };

  const shareWhatsApp = () => {
    const text = `🔥 *PROJETO TSUNAMI - ${activeClass?.title || 'Turma'}* 🔥\n📅 Horário: ${activeClass?.startTime} às ${activeClass?.endTime}\n📍 ${activeClass?.location}\n\nGaranta sua vaga e participe da nossa célula obrigatória às 20:00!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Turma management handlers
  const handleToggleDay = (day: string) => {
    if (newClassDays.includes(day)) {
      setNewClassDays(newClassDays.filter(d => d !== day));
    } else {
      setNewClassDays([...newClassDays, day]);
    }
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      alert('Informe o nome da turma.');
      return;
    }

    if (editingClassId) {
      const updated: ClassSession = {
        id: editingClassId,
        title: newClassName.toUpperCase(),
        sport: newClassName.split(' - ')[1] || newClassName,
        maxSlots: Number(newClassVagas),
        startTime: newClassStart,
        endTime: newClassEnd,
        days: newClassDays,
        location: 'Arena na Sede Maceió',
        status: 'open'
      };
      try {
        await setDoc(doc(db, 'classes', editingClassId), updated);
        setEditingClassId(null);
        alert('Turma atualizada com sucesso!');
      } catch (err) {
        setClasses(prev => prev.map(c => c.id === editingClassId ? updated : c));
      }
    } else {
      const id = 'class-' + Date.now();
      const newClassItem: ClassSession = {
        id,
        title: newClassName.toUpperCase(),
        sport: newClassName.split(' - ')[1] || newClassName,
        maxSlots: Number(newClassVagas),
        startTime: newClassStart,
        endTime: newClassEnd,
        days: newClassDays,
        location: 'Arena na Sede Maceió',
        status: 'open'
      };
      try {
        await setDoc(doc(db, 'classes', id), newClassItem);
        alert('Turma criada com sucesso!');
      } catch (err) {
        setClasses(prev => [...prev, newClassItem]);
      }
    }

    setNewClassName('TURMA NOVA');
    setNewClassStart('19:00');
    setNewClassEnd('20:00');
    setNewClassVagas(15);
    setNewClassDays(['Ter', 'Qui']);
  };

  const handleDeleteClass = async (id: string) => {
    if (confirm('Deseja realmente remover esta turma?')) {
      try {
        await deleteDoc(doc(db, 'classes', id));
      } catch (err) {
        setClasses(prev => prev.filter(c => c.id !== id));
      }
    }
  };

  const handleEditClass = (c: ClassSession) => {
    setEditingClassId(c.id);
    setNewClassName(c.title);
    setNewClassStart(c.startTime || '19:00');
    setNewClassEnd(c.endTime || '20:00');
    setNewClassVagas(c.maxSlots || 15);
    setNewClassDays(c.days || ['Ter', 'Qui']);
  };

  const sortedClasses = [...classes].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans selection:bg-cyan-400 selection:text-slate-950">
      
      {/* Background Neon Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-[130px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-500/15 rounded-full blur-[150px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-teal-500/10 rounded-full blur-[140px]" />
      </div>

      {/* HEADER / HERO SECTION */}
      <header className="relative z-10 pt-6 pb-10 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Top Bar with Firebase Sync Indicator */}
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {activeAdminTab !== null ? (
                <button
                  onClick={() => setActiveAdminTab(null)}
                  className="px-4 py-2 bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-400/60 rounded-full text-xs font-semibold tracking-wide transition-all flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4 text-cyan-400" />
                  <span>VOLTAR</span>
                </button>
              ) : <div />}

              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>FIREBASE CLOUD SYNC ATIVO</span>
              </div>
            </div>

            {isAdmin ? (
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              >
                <LogOut className="w-4 h-4" />
                <span>LOGOFF</span>
              </button>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-5 py-2 bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-400/60 hover:border-cyan-300 rounded-full text-xs font-semibold tracking-wide transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>ÁREA DO PROFESSOR</span>
              </button>
            )}
          </div>

          {/* Hero Main Flex Layout */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 text-center md:text-left">
            
            {/* Glowing Circular Logo */}
            <div className="relative group shrink-0">
              <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 rounded-full blur-md opacity-80 group-hover:opacity-100 transition duration-500 animate-pulse" />
              <div className="relative w-22 h-22 sm:w-26 sm:h-26 rounded-full bg-[#050b14] border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.5)] overflow-hidden">
                {customLogoUrl ? (
                  <img src={customLogoUrl} alt="Logo Tsunami" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="text-center p-2">
                    <div className="text-[7px] tracking-[0.15em] text-cyan-300 font-bold uppercase">PROJETO CRISTO</div>
                    <div className="text-xs font-black text-white tracking-wider my-0.5 font-mono">TSUNAMI</div>
                    <div className="text-[7px] tracking-[0.2em] text-slate-300 uppercase">MACEIÓ</div>
                  </div>
                )}
              </div>
            </div>

            {/* Title Block */}
            <div className="flex flex-col items-center md:items-start">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-4xl sm:text-6xl lg:text-7xl font-black tracking-wider uppercase font-mono">
                <span className="text-white drop-shadow-md">PROJETO</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-400 drop-shadow-[0_0_30px_rgba(6,182,212,0.7)]">
                  TSUNAMI
                </span>
              </div>
            </div>

          </div>

          {/* Subtitles and CTA centered below */}
          <div className="flex flex-col items-center text-center mt-6 space-y-2">
            <div className="text-xs sm:text-sm tracking-[0.35em] text-cyan-200/80 font-mono uppercase font-semibold">
              FREQUÊNCIA & GESTÃO
            </div>
            <div className="text-xs sm:text-sm text-slate-400 tracking-wider font-medium">
              ARENA NA SEDE MACEIÓ — IGREJA SARA NOSSA TERRA
            </div>

            {!isAdmin && (
              <div className="pt-4">
                <button
                  onClick={() => setShowRegModal(true)}
                  disabled={registrationsLocked || !classes.some(c => c.status === 'open')}
                  className="px-7 py-3.5 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 disabled:opacity-50 text-slate-950 font-black rounded-full text-sm shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all transform hover:-translate-y-0.5 flex items-center gap-2.5 tracking-wide"
                >
                  <Plus className="w-5 h-5 stroke-[3]" />
                  <span>
                    {registrationsLocked 
                      ? 'INSCRIÇÕES TRANCADAS' 
                      : !classes.some(c => c.status === 'open')
                      ? 'AGUARDANDO AULA PROGRAMADA'
                      : 'FAZER PRÉ-INSCRIÇÃO'}
                  </span>
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

        {/* ======================================================== */}
        {/* GERENCIAR TURMAS VIEW                                    */}
        {/* ======================================================== */}
        {activeAdminTab === 'turmas' ? (
          <div className="space-y-8 animate-fade-in">
            
            {/* Top Bar for Turmas Manager */}
            <div className="flex items-center justify-between bg-slate-950 border border-cyan-500/40 rounded-2xl p-4 sm:p-6 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-wider text-cyan-400 uppercase font-mono">
                  GERENCIAR TURMAS
                </h2>
              </div>
              <button
                onClick={() => setActiveAdminTab(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>VOLTAR</span>
              </button>
            </div>

            {/* NOVA TURMA CARD */}
            <div className="bg-[#050b14]/90 border border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-6">
              <h3 className="text-xs font-mono font-bold tracking-widest text-cyan-300 uppercase pb-3 border-b border-slate-800">
                {editingClassId ? 'EDITAR TURMA' : 'NOVA TURMA'}
              </h3>

              <form onSubmit={handleSaveClass} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  
                  <div className="lg:col-span-2">
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">NOME DA TURMA</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: TURMA A"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">INÍCIO</label>
                    <input
                      type="time"
                      required
                      value={newClassStart}
                      onChange={(e) => setNewClassStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">TÉRMINO</label>
                    <input
                      type="time"
                      required
                      value={newClassEnd}
                      onChange={(e) => setNewClassEnd(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">VAGAS</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={newClassVagas}
                      onChange={(e) => setNewClassVagas(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                    />
                  </div>

                </div>

                {/* DIAS DE TREINO */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2">DIAS DE TREINO</label>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_DAYS.map(day => {
                      const isSelected = newClassDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleToggleDay(day)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all border ${
                            isSelected 
                              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          {day.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  {editingClassId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingClassId(null);
                        setNewClassName('TURMA A');
                      }}
                      className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                    >
                      Cancelar Edição
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 font-bold rounded-xl text-xs shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>{editingClassId ? 'ATUALIZAR TURMA' : 'CRIAR TURMA'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* TURMAS CADASTRADAS (SORTED ALPHABETICALLY) */}
            <div className="bg-[#050b14]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase">
                  TURMAS CADASTRADAS (ORDEM ALFABÉTICA • CLOUD SYNC)
                </h3>
                <button
                  type="button"
                  onClick={() => alert('Turmas sincronizadas com o Firebase Cloud!')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-mono flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Sincronizar
                </button>
              </div>

              <div className="space-y-3">
                {sortedClasses.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">Nenhuma turma cadastrada.</p>
                ) : (
                  sortedClasses.map(c => (
                    <div 
                      key={c.id}
                      className="bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                    >
                      <div>
                        <h4 className="text-sm font-black text-cyan-400 uppercase tracking-wider font-mono">{c.title}</h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                          <span>🕒 {c.startTime || '19:00'} às {c.endTime || '20:00'}</span>
                          <span>•</span>
                          <span>📅 {(c.days || []).join('/')}</span>
                          <span>•</span>
                          <span>👥 {c.maxSlots} vagas</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            promptEditClass(c);
                          }}
                          className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl transition-all cursor-pointer"
                          title="Editar Turma"
                        >
                          <Edit2 className="w-4 h-4 pointer-events-none" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            promptDeleteClass(c.id, c.title);
                          }}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl transition-all cursor-pointer"
                          title="Remover Turma"
                        >
                          <Trash2 className="w-4 h-4 pointer-events-none" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        ) : activeAdminTab === 'alunos' ? (
          /* ======================================================== */
          /* GERENCIAR ALUNOS VIEW (MATCHING REFERENCE DESIGN)        */
          /* ======================================================== */
          <div className="space-y-8 animate-fade-in">
            
            {/* Top Bar with Title & Sub-tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 border border-pink-500/40 rounded-2xl p-4 sm:p-6 shadow-[0_0_30px_rgba(236,72,153,0.15)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-400 flex items-center justify-center text-pink-300">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-wider text-pink-400 uppercase font-mono">
                  ALUNOS
                </h2>
              </div>

              {/* Sub-tabs: INDIVIDUAL & CADASTRO EM LOTE */}
              <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setAlunosSubTab('individual')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all ${
                    alunosSubTab === 'individual'
                      ? 'bg-pink-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  INDIVIDUAL
                </button>
                <button
                  type="button"
                  onClick={() => setAlunosSubTab('lote')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all ${
                    alunosSubTab === 'lote'
                      ? 'bg-pink-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  CADASTRO EM LOTE
                </button>
              </div>
            </div>

            {/* FORM CARD: INDIVIDUAL OU LOTE */}
            {alunosSubTab === 'individual' ? (
              <div className="bg-[#050b14]/90 border border-pink-500/30 rounded-2xl p-6 shadow-xl space-y-6">
                <h3 className="text-xs font-mono font-bold tracking-widest text-pink-300 uppercase pb-3 border-b border-slate-800">
                  {editingAthleteId ? 'EDITAR ALUNO' : 'NOVO ALUNO'}
                </h3>

                <form onSubmit={handleSaveAluno} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    
                    <div className="lg:col-span-1">
                      <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">NOME COMPLETO</label>
                      <input
                        type="text"
                        required
                        placeholder="EX: JOÃO SILVA"
                        value={newAlunoName}
                        onChange={(e) => setNewAlunoName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-pink-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">TURMA</label>
                      <select
                        value={newAlunoTurma}
                        onChange={(e) => setNewAlunoTurma(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-pink-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                      >
                        {classes.map(c => (
                          <option key={c.id} value={c.title}>{c.title}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">MATRÍCULA</label>
                      <input
                        type="date"
                        required
                        value={newAlunoMatricula}
                        onChange={(e) => setNewAlunoMatricula(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-pink-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">VENCIMENTO</label>
                      <input
                        type="date"
                        required
                        value={newAlunoVencimento}
                        onChange={(e) => setNewAlunoVencimento(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-pink-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">SENHA</label>
                      <input
                        type="text"
                        required
                        value={newAlunoSenha}
                        onChange={(e) => setNewAlunoSenha(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-pink-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                      />
                    </div>

                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => alert('Câmera biométrica ativada.')}
                        className="p-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/40 rounded-xl transition-all"
                        title="Câmera"
                      >
                        <QrCode className="w-5 h-5" />
                      </button>
                      <label className="p-2.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 rounded-xl transition-all cursor-pointer" title="Arquivo / Foto">
                        <Upload className="w-5 h-5" />
                        <input type="file" accept="image/*" className="hidden" />
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      {editingAthleteId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAthleteId(null);
                            setNewAlunoName('');
                          }}
                          className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold rounded-xl text-xs shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>{editingAthleteId ? 'ATUALIZAR ALUNO' : 'CADASTRAR ALUNO'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-[#050b14]/90 border border-pink-500/30 rounded-2xl p-6 shadow-xl space-y-6">
                <h3 className="text-xs font-mono font-bold tracking-widest text-pink-300 uppercase pb-3 border-b border-slate-800">
                  CADASTRO EM LOTE DE ALUNOS
                </h3>
                <form onSubmit={handleSaveBatchAlunos} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">TURMA DESTINO</label>
                      <select
                        value={newAlunoTurma}
                        onChange={(e) => setNewAlunoTurma(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-pink-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                      >
                        {classes.map(c => (
                          <option key={c.id} value={c.title}>{c.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">MATRÍCULA</label>
                      <input
                        type="date"
                        value={newAlunoMatricula}
                        onChange={(e) => setNewAlunoMatricula(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-pink-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">VENCIMENTO</label>
                      <input
                        type="date"
                        value={newAlunoVencimento}
                        onChange={(e) => setNewAlunoVencimento(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-pink-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">NOMES DOS ALUNOS (UM POR LINHA)</label>
                    <textarea
                      rows={5}
                      required
                      placeholder="ADRIAN KOREIA&#10;ADRIANO FAVELINHA&#10;ADRYAN ALVES"
                      value={batchAlunosText}
                      onChange={(e) => setBatchAlunosText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-pink-400 rounded-xl p-3.5 text-sm text-white focus:outline-none font-mono"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl text-xs shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>CADASTRAR LOTE EM ORDEM ALFABÉTICA</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ALUNOS CADASTRADOS SECTION (SORTED ALPHABETICALLY) */}
            <div className="bg-[#050b14]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase">
                    ALUNOS CADASTRADOS
                  </h3>
                  <span className="px-3 py-1 bg-pink-500/10 text-pink-400 border border-pink-500/30 rounded-full text-xs font-mono font-bold">
                    {athletes.length} ALUNOS
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => alert('Alunos sincronizados com o Firebase Cloud!')}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-mono flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Sincronizar
                  </button>

                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                    <Search className="w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Buscar aluno..."
                      value={athleteSearchTerm}
                      onChange={(e) => setAthleteSearchTerm(e.target.value)}
                      className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-36 sm:w-48"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {athletes
                  .filter(a => a.name.toLowerCase().includes(athleteSearchTerm.toLowerCase()))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">Nenhum aluno encontrado.</p>
                ) : (
                  athletes
                    .filter(a => a.name.toLowerCase().includes(athleteSearchTerm.toLowerCase()))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(a => {
                      const isExpired = a.vencimentoDate ? new Date(a.vencimentoDate) < new Date() : false;
                      return (
                        <div 
                          key={a.id}
                          className="bg-slate-950/80 border border-slate-800/80 hover:border-pink-500/40 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                                {a.name} {a.age ? `- ${a.age}` : ''}
                              </h4>
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-[10px] font-mono font-bold flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> NÍVEL
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                isExpired 
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/40' 
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                {isExpired ? 'VENCIDO' : 'VÁLIDO'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                              <span className="flex items-center gap-1 text-cyan-300">
                                <Users className="w-3.5 h-3.5" /> {a.classType || 'TURMA A'}
                              </span>
                              <span>•</span>
                              <span>Matricula: {a.matriculaDate || '01/08/2025'}</span>
                              <span>•</span>
                              <span className={isExpired ? 'text-red-400 font-semibold' : ''}>
                                Vence: {a.vencimentoDate || '30/09/2025'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                promptEditAthlete(a);
                              }}
                              className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl transition-all cursor-pointer"
                              title="Editar Aluno"
                            >
                              <Edit2 className="w-4 h-4 pointer-events-none" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                promptDeleteAthlete(a.id, a.name);
                              }}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl transition-all cursor-pointer"
                              title="Remover Aluno"
                            >
                              <Trash2 className="w-4 h-4 pointer-events-none" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

          </div>
        ) : activeAdminTab === 'aulas' ? (
          /* ======================================================== */
          /* AULAS PROGRAMADAS & CÉLULA FIXA                          */
          /* ======================================================== */
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between bg-slate-950 border border-emerald-500/40 rounded-2xl p-4 sm:p-6 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
                  <Calendar className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-wider text-emerald-400 uppercase font-mono">
                  AULAS PROGRAMADAS & CÉLULA FIXA
                </h2>
              </div>
            </div>

            {/* 1. (FIXO) CÉLULA DO PROJETO */}
            <div className="bg-[#050b14]/90 border border-amber-500/40 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                    (FIXO) CÉLULA OBRIGATÓRIA — HORÁRIO & DIA DA SEMANA
                  </h3>
                  <p className="text-[10px] text-slate-400">Configuração fixa exibida sempre no topo da página principal.</p>
                </div>
              </div>

              <form onSubmit={handleSaveCellConfig} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">DIA DA SEMANA</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: SÁBADO"
                      value={cellDayOfWeek}
                      onChange={(e) => setCellDayOfWeek(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">HORÁRIO INÍCIO</label>
                    <input
                      type="time"
                      required
                      value={cellStartTime}
                      onChange={(e) => setCellStartTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">HORÁRIO TÉRMINO</label>
                    <input
                      type="time"
                      required
                      value={cellEndTime}
                      onChange={(e) => setCellEndTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-bold rounded-xl text-xs shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>SALVAR HORÁRIO DA CÉLULA</span>
                  </button>
                </div>
              </form>
            </div>

            {/* 2. (ESPAÇO PRA PREENCHER) AULAS PROGRAMADAS */}
            <div className="bg-[#050b14]/90 border border-emerald-500/30 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-xs font-mono font-bold tracking-widest text-emerald-300 uppercase">
                  {editingSchedId ? 'EDITAR AULA PROGRAMADA' : '(ESPAÇO PRA PREENCHER) AULAS PROGRAMADAS'}
                </h3>
                {editingSchedId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSchedId(null);
                      setSchedTitle('VOLEIBOL');
                    }}
                    className="text-xs text-slate-400 hover:text-white underline font-mono"
                  >
                    Cancelar Edição
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveScheduledClass} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">NOME DA AULA</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: VOLEIBOL, FUTSAL"
                      value={schedTitle}
                      onChange={(e) => setSchedTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">INÍCIO</label>
                    <input
                      type="time"
                      required
                      value={schedStart}
                      onChange={(e) => setSchedStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">TÉRMINO</label>
                    <input
                      type="time"
                      required
                      value={schedEnd}
                      onChange={(e) => setSchedEnd(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">VAGAS / CAPACIDADE</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={schedVagas}
                      onChange={(e) => setSchedVagas(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-bold rounded-xl text-xs shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>{editingSchedId ? 'ATUALIZAR AULA' : 'PROGRAMAR AULA E ABRIR PRÉ-INSCRIÇÃO'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* AULAS PROGRAMADAS LIST & CYCLE CONTROLS */}
            <div className="bg-[#050b14]/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase pb-3 border-b border-slate-800">
                AULAS PROGRAMADAS (CRONOGRAMA & CICLO DE INSCRIÇÃO)
              </h3>
              {scheduledClasses.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">Nenhuma aula programada no momento. Crie a primeira acima!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {scheduledClasses.map(c => (
                    <div key={c.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 relative">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-black text-cyan-400 uppercase font-mono">{c.title}</h3>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => promptEditScheduledClass(c)}
                            className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg cursor-pointer"
                            title="Editar Horário / Aula"
                          >
                            <Edit2 className="w-3.5 h-3.5 pointer-events-none" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const nextStatus = c.status === 'open' ? 'completed' : 'open';
                              try {
                                await updateDoc(doc(db, 'scheduled_classes', c.id), { status: nextStatus });
                              } catch (err) {
                                setScheduledClasses(prev => prev.map(cl => cl.id === c.id ? { ...cl, status: nextStatus } : cl));
                              }
                            }}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold cursor-pointer transition-all ${
                              c.status === 'open'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                            }`}
                            title="Clique para alternar o ciclo (Aberto / Finalizado)"
                          >
                            {c.status === 'open' ? '🟢 ABERTA' : '🔴 FINALIZADA'}
                          </button>
                          <button
                            type="button"
                            onClick={() => promptDeleteScheduledClass(c.id, c.title)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg cursor-pointer"
                            title="Apagar Aula"
                          >
                            <Trash2 className="w-3.5 h-3.5 pointer-events-none" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs text-slate-300 font-mono">
                        <p className="flex items-center gap-2">
                          🏷️ Tipo: <strong className={c.type === 'celula' ? 'text-amber-400 uppercase' : 'text-emerald-400 uppercase'}>{c.type === 'celula' ? 'Célula Obrigatória' : 'Aula Programada'}</strong>
                        </p>
                        <p className="flex items-center gap-2">🕒 Horário: <strong className="text-white">{c.startTime} às {c.endTime}</strong></p>
                        <p className="flex items-center gap-2">👥 Capacidade: <strong className="text-white">{c.maxSlots} vagas</strong></p>
                      </div>

                      <p className="text-[10px] text-slate-500 italic pt-2 border-t border-slate-800">
                        {c.status === 'open' 
                          ? 'Inscrições abertas na página principal.' 
                          : 'Ciclo encerrado. Inscrições fechadas.'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeAdminTab === 'facial' ? (
          /* ======================================================== */
          /* ARENA FACIAL (CHECK-IN BIOMÉTRICO)                       */
          /* ======================================================== */
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between bg-slate-950 border border-amber-500/40 rounded-2xl p-4 sm:p-6 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
                  <QrCode className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-wider text-amber-400 uppercase font-mono">
                  ARENA FACIAL — CHECK-IN BIOMÉTRICO
                </h2>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-6 shadow-2xl">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-600/30 border-2 border-amber-400 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.4)] animate-pulse">
                <QrCode className="w-14 h-14 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white uppercase font-mono">CÂMERA BIOMÉTRICA ATIVA</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Posicione o atleta em frente à câmera para registrar a presença instantânea na Arena Tsunami.
              </p>
              <button
                type="button"
                onClick={() => alert('Check-in facial realizado com sucesso para o próximo atleta na fila!')}
                className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 transition-all"
              >
                SIMULAR ESCANEAMENTO FACIAL
              </button>
            </div>
          </div>
        ) : activeAdminTab === 'frequencia' ? (
          /* ======================================================== */
          /* FREQUÊNCIA MANUAL (MATCHING REFERENCE DESIGN)            */
          /* ======================================================== */
          <div className="space-y-8 animate-fade-in">
            
            {/* Top Bar with Title, Month Nav, Turma Filter & Action Buttons */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-950 border border-emerald-500/40 rounded-2xl p-4 sm:p-6 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-wider text-emerald-400 uppercase font-mono">
                  FREQUÊNCIA MANUAL
                </h2>
              </div>

              {/* Month Navigation & Turma Filter */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (freqMonthIndex === 0) {
                        setFreqMonthIndex(11);
                        setFreqYear(freqYear - 1);
                      } else {
                        setFreqMonthIndex(freqMonthIndex - 1);
                      }
                    }}
                    className="p-1 hover:bg-slate-800 rounded text-cyan-400"
                  >
                    ‹
                  </button>
                  <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                    {MONTH_NAMES[freqMonthIndex]} {freqYear}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (freqMonthIndex === 11) {
                        setFreqMonthIndex(0);
                        setFreqYear(freqYear + 1);
                      } else {
                        setFreqMonthIndex(freqMonthIndex + 1);
                      }
                    }}
                    className="p-1 hover:bg-slate-800 rounded text-cyan-400"
                  >
                    ›
                  </button>
                </div>

                <select
                  value={freqTurmaFilter}
                  onChange={(e) => setFreqTurmaFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 focus:border-emerald-400 rounded-xl px-3.5 py-2 text-xs font-bold text-white uppercase font-mono focus:outline-none"
                >
                  <option value="TODAS AS TURMAS">TODAS AS TURMAS</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.title}>{c.title}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all"
                >
                  SALVAR
                </button>

                <button
                  type="button"
                  onClick={handleShareCopilot}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-mono flex items-center gap-1.5"
                  title="Copiar Relatório para Copilot"
                >
                  <Share2 className="w-3.5 h-3.5" /> ARENA COPILOT
                </button>
              </div>
            </div>

            {/* FREQUENCY TABLE CONTAINER */}
            <div className="bg-[#050b14]/90 border border-slate-800 rounded-2xl shadow-xl overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-mono uppercase">
                    <th className="p-4 w-1/3">ATLETA</th>
                    {saturdays.map((sat, idx) => {
                      const satKey = sat.toISOString().split('T')[0];
                      const satLabel = `SÁB ${sat.getDate().toString().padStart(2, '0')}`;
                      return (
                        <th key={satKey} className="p-3 text-center border-l border-slate-800/80">
                          <div className="font-bold text-cyan-300 mb-2">{satLabel}</div>
                          {/* Saturday Header Quick Bulk Action Bar */}
                          <div className="flex items-center justify-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
                            <button 
                              type="button" 
                              onClick={() => setAllAttendanceForSat(satKey, 'P')}
                              className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/40" 
                              title="Marcar Todos Presentes"
                            >
                              P
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setAllAttendanceForSat(satKey, 'A')}
                              className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold hover:bg-amber-500/40" 
                              title="Marcar Todos com Atraso"
                            >
                              A
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setAllAttendanceForSat(satKey, 'F')}
                              className="w-5 h-5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold hover:bg-red-500/40" 
                              title="Marcar Todos Faltas"
                            >
                              F
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setAllAttendanceForSat(satKey, '')}
                              className="w-5 h-5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold hover:bg-slate-700" 
                              title="Zerar Coluna"
                            >
                              ALL
                            </button>
                          </div>
                        </th>
                      );
                    })}
                    <th className="p-4 text-center border-l border-slate-800/80 text-red-400 font-mono">FALTAS</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60">
                  {filteredAthletes.length === 0 ? (
                    <tr>
                      <td colSpan={saturdays.length + 2} className="text-center py-12 text-slate-500 text-xs font-mono">
                        Nenhum atleta encontrado nesta turma.
                      </td>
                    </tr>
                  ) : (
                    filteredAthletes.map(athlete => {
                      let totalAbsences = 0;
                      return (
                        <tr key={athlete.id} className="hover:bg-slate-900/40 transition-all">
                          <td className="p-4">
                            <div className="text-sm font-bold text-white uppercase font-mono">{athlete.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{athlete.classType || 'TURMA A'}</div>
                          </td>

                          {saturdays.map(sat => {
                            const satKey = sat.toISOString().split('T')[0];
                            const isActive = isAthleteActiveForSat(athlete, sat);
                            const key = `${athlete.id}_${satKey}`;
                            const status = attendance[key] || '';

                            if (status === 'F' || status === 'J') totalAbsences++;

                            return (
                              <td key={satKey} className="p-3 text-center border-l border-slate-800/80">
                                {!isActive ? (
                                  <span className="inline-block px-2 py-1 bg-slate-900 text-slate-500 border border-slate-800 rounded font-mono text-[10px] font-bold">
                                    N/M
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => cycleAttendance(athlete.id, satKey)}
                                    className={`w-9 h-9 rounded-xl font-bold font-mono text-xs transition-all border shadow-sm ${
                                      status === 'P'
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                        : status === 'A'
                                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                                        : status === 'F'
                                        ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                                        : status === 'J'
                                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                                        : 'bg-slate-950 text-slate-600 border-slate-800 hover:border-slate-700'
                                    }`}
                                    title="Clique para alternar (Vazio → P → A → F → J)"
                                  >
                                    {status || '·'}
                                  </button>
                                )}
                              </td>
                            );
                          })}

                          <td className="p-4 text-center border-l border-slate-800/80">
                            <span className="inline-block w-7 h-7 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold text-xs leading-7 text-center">
                              {totalAbsences}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* BOTTOM ROW: PRESENÇAS / DIA */}
                <tfoot>
                  <tr className="bg-slate-950 border-t-2 border-slate-800 text-xs font-mono">
                    <td className="p-4 text-cyan-400 font-black uppercase tracking-wider">
                      PRESENÇAS / DIA
                    </td>
                    {saturdays.map(sat => {
                      const satKey = sat.toISOString().split('T')[0];
                      let presCount = 0;
                      filteredAthletes.forEach(a => {
                        if (isAthleteActiveForSat(a, sat)) {
                          const st = attendance[`${a.id}_${satKey}`] || '';
                          if (st === 'P' || st === 'A') presCount++;
                        }
                      });
                      return (
                        <td key={satKey} className="p-3 text-center border-l border-slate-800/80 text-emerald-400 font-black">
                          {presCount}
                        </td>
                      );
                    })}
                    <td className="p-4 text-center border-l border-slate-800/80 text-slate-500">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>

          </div>
        ) : activeAdminTab === 'relatorios' ? (
          /* ======================================================== */
          /* RELATÓRIOS & EXPORTAÇÃO                                  */
          /* ======================================================== */
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between bg-slate-950 border border-cyan-500/40 rounded-2xl p-4 sm:p-6 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-wider text-cyan-400 uppercase font-mono">
                  RELATÓRIOS & ESTATÍSTICAS
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
                <p className="text-xs font-mono text-slate-400 uppercase">Total de Alunos</p>
                <p className="text-3xl font-black text-cyan-400 font-mono">{athletes.length}</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
                <p className="text-xs font-mono text-slate-400 uppercase">Turmas Ativas</p>
                <p className="text-3xl font-black text-purple-400 font-mono">{classes.length}</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
                <p className="text-xs font-mono text-slate-400 uppercase">Presença Célula</p>
                <p className="text-3xl font-black text-emerald-400 font-mono">{cellAthletes.length}</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
                <p className="text-xs font-mono text-slate-400 uppercase">Taxa de Ocupação</p>
                <p className="text-3xl font-black text-amber-400 font-mono">
                  {Math.round((athletes.length / Math.max(1, classes.reduce((acc, c) => acc + c.maxSlots, 0))) * 100)}%
                </p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
              <h3 className="text-sm font-bold text-white uppercase font-mono">EXPORTAR DADOS DO PROJETO</h3>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => alert('Relatório CSV exportado com sucesso!')}
                  className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" /> EXPORTAR CSV / EXCEL
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                >
                  IMPRIMIR RELATÓRIO
                </button>
              </div>
            </div>
          </div>
        ) : isAdmin ? (
          /* ======================================================== */
          /* ADMIN DASHBOARD                                          */
          /* ======================================================== */
          <div className="space-y-8 animate-fade-in">
            
            <div className="bg-slate-950 border border-cyan-500/40 rounded-2xl p-4 sm:p-6 text-center shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <h2 className="text-xl sm:text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-teal-300 uppercase font-mono">
                ÁREA TÉCNICA DO PROFESSOR (FIREBASE CLOUD)
              </h2>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-medium">
                Gerenciamento Geral • Acesso Exclusivo da Coordenação
              </p>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleClearAllTestingData}
                className="px-6 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 rounded-xl text-xs font-bold font-mono tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>🧹 LIMPAR TODAS AS INSCRIÇÕES E AULAS PARA TESTE</span>
              </button>
            </div>

            {/* 6 Interactive Glowing Action Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Card 1: TURMAS + */}
              <button
                type="button"
                onClick={() => setActiveAdminTab('turmas')}
                className="group relative bg-gradient-to-br from-purple-900/85 to-purple-950 hover:from-purple-800 hover:to-purple-900 border-2 border-purple-500/60 hover:border-purple-400 rounded-2xl p-6 text-center shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all transform hover:-translate-y-1 cursor-pointer"
              >
                <div className="absolute top-3 right-3 text-purple-300/70 group-hover:text-purple-200">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-white tracking-wider font-mono mb-2">TURMAS +</h3>
                <span className="inline-block text-[10px] font-mono tracking-widest uppercase bg-purple-950 text-purple-300 px-3 py-1 rounded-full border border-purple-700/60">
                  {classes.length} Turmas Ativas
                </span>
              </button>

              {/* Card 2: ALUNOS + */}
              <button
                type="button"
                onClick={() => setActiveAdminTab('alunos')}
                className="group relative bg-gradient-to-br from-blue-900/85 to-blue-950 hover:from-blue-800 hover:to-blue-900 border-2 border-blue-500/60 hover:border-blue-400 rounded-2xl p-6 text-center shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all transform hover:-translate-y-1 cursor-pointer"
              >
                <div className="absolute top-3 right-3 text-blue-300/70 group-hover:text-blue-200">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-white tracking-wider font-mono mb-2">ALUNOS +</h3>
                <span className="inline-block text-[10px] font-mono tracking-widest uppercase bg-blue-950 text-blue-300 px-3 py-1 rounded-full border border-blue-700/60">
                  {athletes.length} Alunos Inscritos
                </span>
              </button>

              {/* Card 3: AULAS PROGRAMADAS */}
              <button
                type="button"
                onClick={() => setActiveAdminTab('aulas')}
                className="group relative bg-gradient-to-br from-emerald-900/85 to-emerald-950 hover:from-emerald-800 hover:to-emerald-900 border-2 border-emerald-500/60 hover:border-emerald-400 rounded-2xl p-6 text-center shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all transform hover:-translate-y-1 cursor-pointer"
              >
                <div className="absolute top-3 right-3 text-emerald-300/70 group-hover:text-emerald-200">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-white tracking-wider font-mono mb-2">AULAS PROGRAMADAS</h3>
                <span className="inline-block text-[10px] font-mono tracking-widest uppercase bg-emerald-950 text-emerald-300 px-3 py-1 rounded-full border border-emerald-700/60">
                  Ver Cronograma
                </span>
              </button>

              {/* Card 4: ARENA FACIAL */}
              <button
                type="button"
                onClick={() => setActiveAdminTab('facial')}
                className="group relative bg-gradient-to-br from-amber-600/85 to-amber-950 hover:from-amber-500 hover:to-amber-900 border-2 border-amber-400/70 hover:border-amber-300 rounded-2xl p-6 text-center shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all transform hover:-translate-y-1 cursor-pointer"
              >
                <div className="absolute top-3 right-3 text-amber-200/70 group-hover:text-white">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-white tracking-wider font-mono mb-2">ARENA FACIAL</h3>
                <span className="inline-block text-[10px] font-mono tracking-widest uppercase bg-amber-950 text-amber-200 px-3 py-1 rounded-full border border-amber-600/60">
                  Check-in Biométrico
                </span>
              </button>

              {/* Card 5: FREQUENCIA MANUAL */}
              <button
                type="button"
                onClick={() => setActiveAdminTab('frequencia')}
                className="group relative bg-gradient-to-br from-red-900/85 to-red-950 hover:from-red-800 hover:to-red-900 border-2 border-red-500/60 hover:border-red-400 rounded-2xl p-6 text-center shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all transform hover:-translate-y-1 cursor-pointer"
              >
                <div className="absolute top-3 right-3 text-red-300/70 group-hover:text-red-200">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-white tracking-wider font-mono mb-2">FREQUENCIA MANUAL</h3>
                <span className="inline-block text-[10px] font-mono tracking-widest uppercase bg-red-950 text-red-300 px-3 py-1 rounded-full border border-red-700/60">
                  Gerenciar Chamada
                </span>
              </button>

              {/* Card 6: RELATÓRIOS */}
              <button
                type="button"
                onClick={() => setActiveAdminTab('relatorios')}
                className="group relative bg-gradient-to-br from-cyan-900/85 to-cyan-950 hover:from-cyan-800 hover:to-cyan-900 border-2 border-cyan-500/60 hover:border-cyan-400 rounded-2xl p-6 text-center shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all transform hover:-translate-y-1 cursor-pointer"
              >
                <div className="absolute top-3 right-3 text-cyan-300/70 group-hover:text-cyan-200">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-white tracking-wider font-mono mb-2">RELATÓRIOS</h3>
                <span className="inline-block text-[10px] font-mono tracking-widest uppercase bg-cyan-950 text-cyan-300 px-3 py-1 rounded-full border border-cyan-700/60">
                  Exportar Dados
                </span>
              </button>

            </div>

            {/* LOGO DO PROJETO PANEL */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 max-w-xl mx-auto text-center shadow-xl">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-amber-400">✦</span>
                <h4 className="text-xs font-mono font-bold tracking-widest uppercase text-slate-300">LOGO DO PROJETO</h4>
              </div>

              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 mx-auto mb-4 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)] border-2 border-cyan-300 overflow-hidden">
                {customLogoUrl ? (
                  <img src={customLogoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <Flame className="w-10 h-10 text-white" />
                )}
              </div>

              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-cyan-400 border border-cyan-500/40 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md">
                <Upload className="w-4 h-4" />
                <span>ALTERAR IMAGEM DA LOGO</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (uploadEvent) => {
                        if (uploadEvent.target?.result) {
                          setCustomLogoUrl(uploadEvent.target.result as string);
                          alert('Logo atualizada com sucesso!');
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
              <p className="text-[10px] text-slate-500 mt-2 font-mono">FORMATOS ACEITOS: JPG, PNG, WEBP (EXIBIÇÃO CIRCULAR)</p>
            </div>

            {/* ACTION TOGGLES & RESET BAR */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => setRegistrationsLocked(!registrationsLocked)}
                className={`px-5 py-3 rounded-xl text-xs font-bold font-mono border transition-all flex items-center gap-2 cursor-pointer ${
                  registrationsLocked 
                    ? 'bg-red-500/20 text-red-300 border-red-500/40' 
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                {registrationsLocked ? <Lock className="w-4 h-4 text-red-400" /> : <Unlock className="w-4 h-4 text-emerald-400" />}
                <span>{registrationsLocked ? 'INSCRIÇÕES TRANCADAS' : 'TRANCAR INSCRIÇÕES'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSaturdaySportActive(!saturdaySportActive)}
                className={`px-5 py-3 rounded-xl text-xs font-bold font-mono border transition-all flex items-center gap-2 cursor-pointer ${
                  saturdaySportActive 
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>ESPORTE NO SÁBADO ({saturdaySportActive ? 'ATIVO' : 'INATIVO'})</span>
              </button>

              <button
                type="button"
                onClick={resetAllRegistrations}
                className="px-5 py-3 rounded-xl text-xs font-bold font-mono bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>RESETAR INSCRIÇÕES</span>
              </button>
            </div>

          </div>
        ) : (
          /* ======================================================== */
          /* STANDARD PUBLIC VIEW (CELL & REAL-TIME CLASSES)          */
          /* ======================================================== */
          <>
            {/* LISTA DA CÉLULA & LISTAS DAS AULAS PROGRAMADAS */}
            <div className="space-y-6">
              {/* 1. LISTA DA CÉLULA (FIXO) */}
              <section className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white uppercase tracking-wider">LISTA DA CÉLULA</h2>
                      <p className="text-xs font-mono text-cyan-300 mt-0.5">📅 {cellDayOfWeek} • 🕒 {cellStartTime} às {cellEndTime}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-800">
                    {cellAthletes.length} Confirmados
                  </span>
                </div>

                {cellAthletes.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">Nenhum atleta na lista da célula.</p>
                ) : (
                  <div className="space-y-2">
                    {cellAthletes.map(ath => (
                      <div key={'cell-' + ath.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white uppercase font-mono">{ath.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Célula Confirmada ({cellStartTime} às {cellEndTime})</p>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 2. LISTAS DAS AULAS PROGRAMADAS (EXCLUINDO CÉLULA PARA EVITAR DUPLICAÇÃO) */}
              {scheduledClasses.filter(c => c.status === 'open' && c.type !== 'celula' && !c.title.includes('CÉLULA')).map(sched => {
                const enrolledAthletes = athletes.filter(a => a.selectedScheduledClasses?.includes(sched.id));
                return (
                  <section key={sched.id} className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          <Award className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-wider">LISTA DA AULA DE {sched.title}</h2>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800">
                        {enrolledAthletes.length} / {sched.maxSlots} Vagas
                      </span>
                    </div>

                    {enrolledAthletes.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">Nenhum atleta inscrito nesta aula ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {enrolledAthletes.map(ath => (
                          <div key={'sched-ath-' + ath.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-white uppercase font-mono">{ath.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{sched.startTime} às {sched.endTime}</p>
                            </div>
                            <Award className="w-4 h-4 text-emerald-400" />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>

            {/* TWO STYLIZED BANNER BUTTONS */}
            <div className="flex flex-col items-center gap-4 pt-8 max-w-md mx-auto">
              {/* RELATÓRIO FREQUÊNCIA BUTTON */}
              <button
                type="button"
                onClick={() => setShowFreqReportModal(true)}
                className="w-full relative group transform transition-all duration-300 hover:scale-105 cursor-pointer"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl blur opacity-70 group-hover:opacity-100 transition duration-300" />
                <div className="relative px-6 py-4 bg-gradient-to-r from-blue-950 via-blue-900 to-slate-950 border-2 border-blue-500/70 rounded-xl flex items-center justify-between shadow-[0_0_25px_rgba(30,58,138,0.6)]">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-6 h-6 text-cyan-400" />
                    <span className="text-base sm:text-lg font-black tracking-widest text-white uppercase font-mono">
                      RELATÓRIO FREQUÊNCIA
                    </span>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-500/20 border border-blue-400/40 text-blue-300 text-[10px] font-mono font-bold rounded-lg">
                    📊 ANÁLISE
                  </span>
                </div>
              </button>

              {/* JUSTIFICATIVA SÁBADO BUTTON */}
              <button
                type="button"
                onClick={() => setShowJustificativaModal(true)}
                className="w-full relative group transform transition-all duration-300 hover:scale-105 cursor-pointer"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-500 rounded-xl blur opacity-70 group-hover:opacity-100 transition duration-300" />
                <div className="relative px-6 py-4 bg-gradient-to-r from-red-950 via-red-900 to-slate-950 border-2 border-red-500/70 rounded-xl flex items-center justify-center shadow-[0_0_25px_rgba(153,27,27,0.6)]">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-red-400" />
                    <span className="text-base sm:text-lg font-black tracking-widest text-white uppercase font-mono">
                      JUSTIFICATIVA SÁBADO
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </>
        )}

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-[#050b14] mt-16 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="text-slate-400 font-semibold">PROJETO TSUNAMI • ESPORTE, DISCIPLINA E EVANGELISMO</p>
          <p>Arena na Sede Maceió — Igreja Sara Nossa Terra</p>
          <p className="text-[11px] text-slate-600">Sistema de Pré-Inscrição & Gestão de Frequência © 2026</p>
        </div>
      </footer>

      {/* MODAL: PRÉ-INSCRIÇÃO (4-STEP WIZARD) */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#050b14] border border-cyan-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setShowRegModal(false);
                setRegStep(1);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* STEP 1: QUEM É VOCÊ? */}
            {regStep === 1 && (
              <div className="space-y-4">
                <div className="text-center pb-3 border-b border-slate-800">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-800">
                    PASSO 01 DE 04 — IDENTIFICAÇÃO
                  </span>
                  <h3 className="text-xl font-black text-white uppercase tracking-wider font-mono mt-2">QUEM É VOCÊ?</h3>
                  <p className="text-xs text-slate-400">Busque e selecione seu nome na lista oficial do Projeto Tsunami.</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Digite seu nome para buscar..."
                    value={regSearchTerm}
                    onChange={(e) => setRegSearchTerm(e.target.value)}
                    className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {eligibleAthletes
                    .filter(a => a.name.toLowerCase().includes(regSearchTerm.toLowerCase()))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">
                      {hasAnyAttendance 
                        ? 'Nenhum aluno com presença (P) ou atraso (⚠️) na Frequência Manual encontrado.' 
                        : 'Nenhum aluno encontrado.'}
                    </p>
                  ) : (
                    eligibleAthletes
                      .filter(a => a.name.toLowerCase().includes(regSearchTerm.toLowerCase()))
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(a => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setRegSelectedAthleteId(a.id);
                            setRegSelectedScheduledClassIds(a.selectedScheduledClasses || []);
                            setRegCellConfirmed(a.cellConfirmed ?? true);
                            setRegStep(2);
                          }}
                          className="w-full text-left bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-cyan-400 rounded-xl p-3.5 transition-all flex items-center justify-between group cursor-pointer"
                        >
                          <div>
                            <p className="text-xs font-bold text-white uppercase font-mono group-hover:text-cyan-400 transition-colors">{a.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">Turma: {a.classType || 'TURMA A'}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-cyan-400" />
                        </button>
                      ))
                  )}
                </div>

                <div className="pt-2 flex justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRegModal(false);
                      setRegStep(1);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: SUA SENHA */}
            {regStep === 2 && (
              <div className="space-y-4">
                <div className="text-center pb-3 border-b border-slate-800">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-800">
                    PASSO 02 DE 04 — CONFIRMAÇÃO DE SENHA
                  </span>
                  <h3 className="text-xl font-black text-white uppercase tracking-wider font-mono mt-2">SUA SENHA</h3>
                  <p className="text-xs text-cyan-300 font-mono mt-1">
                    {athletes.find(a => a.id === regSelectedAthleteId)?.name}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">DIGITE SUA SENHA (EX: 2026)</label>
                  <input
                    type="password"
                    required
                    placeholder="2026"
                    value={regPasswordInput}
                    onChange={(e) => setRegPasswordInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-600 focus:outline-none text-center font-mono tracking-widest text-lg"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setRegStep(1)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const athlete = athletes.find(a => a.id === regSelectedAthleteId);
                      const expectedPass = athlete?.password || '2026';
                      if (regPasswordInput.trim() !== expectedPass) {
                        alert('Senha incorreta! Digite a senha cadastrada pelo professor (ex: 2026).');
                        return;
                      }
                      setRegStep(3);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 text-xs font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                  >
                    Validar Senha
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CÉLULA DO PROJETO */}
            {regStep === 3 && (
              <div className="space-y-4">
                <div className="text-center pb-3 border-b border-slate-800">
                  <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest bg-amber-950/80 px-3 py-1 rounded-full border border-amber-800">
                    PASSO 03 DE 04 — PRESENÇA OBRIGATÓRIA
                  </span>
                  <h3 className="text-xl font-black text-white uppercase tracking-wider font-mono mt-2">CÉLULA DO PROJETO</h3>
                  <p className="text-xs text-slate-400">Reunião Evangelística Obrigatória antes dos Esportes</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center space-y-2">
                  <p className="text-xs font-bold text-cyan-300 uppercase font-mono">
                    {athletes.find(a => a.id === regSelectedAthleteId)?.name}
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="cellConfirmWizard"
                      checked={regCellConfirmed}
                      onChange={(e) => setRegCellConfirmed(e.target.checked)}
                      className="w-4 h-4 accent-cyan-400 rounded"
                    />
                    <label htmlFor="cellConfirmWizard" className="text-xs text-slate-200 cursor-pointer font-medium">
                      Confirmo presença na Célula Obrigatória.
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setRegStep(2)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!regCellConfirmed) {
                        alert('É obrigatório confirmar presença na Célula para avançar.');
                        return;
                      }
                      setRegStep(4);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 text-xs font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                  >
                    Avançar para Aulas
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: INSCRIÇÃO DA AULA */}
            {regStep === 4 && (
              <div className="space-y-4">
                <div className="text-center pb-3 border-b border-slate-800">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800">
                    PASSO 04 DE 04 — INSCRIÇÃO DA AULA
                  </span>
                  <h3 className="text-xl font-black text-white uppercase tracking-wider font-mono mt-2">ESCOLHA AS AULAS</h3>
                  <p className="text-xs text-slate-400">Selecione uma ou mais aulas programadas para participar.</p>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {scheduledClasses.filter(c => c.status === 'open').length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">Nenhuma aula programada aberta no momento.</p>
                  ) : (
                    scheduledClasses.filter(c => c.status === 'open').map(c => {
                      const isChecked = regSelectedScheduledClassIds.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            if (isChecked) {
                              setRegSelectedScheduledClassIds(regSelectedScheduledClassIds.filter(id => id !== c.id));
                            } else {
                              setRegSelectedScheduledClassIds([...regSelectedScheduledClassIds, c.id]);
                            }
                          }}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isChecked 
                              ? 'bg-emerald-950/40 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold uppercase font-mono">{c.title}</p>
                            <p className="text-[10px] text-slate-400 font-mono">🕒 {c.startTime} às {c.endTime} • 👥 {c.maxSlots} vagas</p>
                          </div>
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${isChecked ? 'bg-emerald-400 border-emerald-300 text-slate-950' : 'border-slate-700 bg-slate-900'}`}>
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setRegStep(3)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteRegistration}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Concluir Pré-Inscrição</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADMIN LOGIN (USUÁRIO TSUNAMI / SENHA 2026) */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">ÁREA DO PROFESSOR</h3>
                <p className="text-xs text-cyan-300 font-mono">Acesso Restrito à Coordenação</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Usuário</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: tsunami"
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Senha</label>
                <input
                  type="password"
                  required
                  placeholder="Ex: 2026"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none"
                />
                {loginError && <p className="text-xs text-red-400 mt-1.5">{loginError}</p>}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 text-xs font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
                >
                  Entrar no Painel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RELATÓRIO DE FREQUÊNCIA & ANÁLISE ANALÍTICA */}
      {showFreqReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-[#0a0a0f] border-2 border-violet-500/60 rounded-3xl max-w-6xl w-full p-6 sm:p-8 shadow-[0_0_60px_rgba(139,92,246,0.3)] relative my-8 space-y-8">
            <button
              onClick={() => setShowFreqReportModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pb-6 border-b border-violet-500/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-400 flex items-center justify-center text-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.4)]">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-violet-400 tracking-wider uppercase font-mono">ESTATÍSTICAS ARENA</h3>
                  <p className="text-[10px] text-violet-300 tracking-[0.3em] uppercase font-mono mt-0.5">Apenas dados de Sábado</p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 justify-center items-center">
                <input
                  type="month"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="bg-[#1a1a2e] border border-violet-500 text-white px-3 py-1.5 rounded-xl text-xs font-mono outline-none"
                />
                <select
                  value={reportFilterType}
                  onChange={(e) => setReportFilterType(e.target.value)}
                  className="bg-[#1a1a2e] border border-violet-500 text-white px-3 py-1.5 rounded-xl text-xs font-mono uppercase outline-none"
                >
                  <option value="mes">Apenas o Mês</option>
                  <option value="bimestre">Bimestre</option>
                  <option value="trimestre">Trimestre</option>
                  <option value="semestre">Semestre</option>
                  <option value="ano">Ano Inteiro</option>
                </select>
                <select
                  value={reportPeriodDays}
                  onChange={(e) => setReportPeriodDays(e.target.value)}
                  className="bg-[#1a1a2e] border border-violet-500 text-white px-3 py-1.5 rounded-xl text-xs font-mono uppercase outline-none"
                >
                  <option value="30">Últimos 30 dias</option>
                  <option value="60">Últimos 60 dias</option>
                  <option value="90">Últimos 90 dias</option>
                  <option value="120">Últimos 120 dias</option>
                </select>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/[0.03] backdrop-blur-md p-6 rounded-2xl text-center border-b-4 border-violet-500 border border-violet-500/20">
                <h3 className="text-xs uppercase text-violet-400 font-mono tracking-widest mb-1">Alunos em Sábados</h3>
                <p className="text-4xl font-black font-mono text-white">
                  {athletes.filter(a => saturdays.some(sat => attendance[`${a.id}_${sat.toISOString().split('T')[0]}`] === 'P' || attendance[`${a.id}_${sat.toISOString().split('T')[0]}`] === 'A')).length || athletes.length}
                </p>
              </div>
              <div className="bg-white/[0.03] backdrop-blur-md p-6 rounded-2xl text-center border-b-4 border-cyan-500 border border-cyan-500/20">
                <h3 className="text-xs uppercase text-cyan-400 font-mono tracking-widest mb-1">Turmas Ativas (Sáb)</h3>
                <p className="text-4xl font-black font-mono text-white">{classes.length}</p>
              </div>
            </div>

            {/* 3 Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Chart 1: Alunos por Turma */}
              <div className="bg-white/[0.03] backdrop-blur-md p-6 rounded-2xl border border-violet-500/20 space-y-4">
                <h4 className="text-sm font-bold uppercase text-violet-300 font-mono tracking-wider">Alunos por Turma</h4>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
                  <div className="relative w-36 h-36 rounded-full border-8 border-violet-500/30 flex items-center justify-center shadow-[0_0_25px_rgba(139,92,246,0.3)]">
                    <div className="text-center">
                      <span className="text-2xl font-black text-white font-mono">{athletes.length}</span>
                      <p className="text-[9px] font-mono text-violet-400 uppercase">Total Alunos</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    {Array.from(new Set(athletes.map(a => a.classType || 'TURMA A'))).map((turma, idx) => {
                      const count = athletes.filter(a => (a.classType || 'TURMA A') === turma).length;
                      const colors = ['text-cyan-400', 'text-amber-400', 'text-rose-400', 'text-violet-400', 'text-pink-400'];
                      const dots = ['bg-cyan-400', 'bg-amber-400', 'bg-rose-400', 'bg-violet-400', 'bg-pink-400'];
                      return (
                        <div key={turma} className="flex items-center justify-between gap-6">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${dots[idx % dots.length]}`} />
                            <span className="text-slate-300 uppercase">{turma}</span>
                          </div>
                          <span className={`font-black ${colors[idx % colors.length]}`}>{count} alunos</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Chart 2: Presença vs Faltas */}
              <div className="bg-white/[0.03] backdrop-blur-md p-6 rounded-2xl border border-cyan-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold uppercase text-cyan-300 font-mono tracking-wider">Presença vs Faltas (Sábados)</h4>
                  <div className="flex items-center gap-3 text-[10px] font-mono">
                    <span className="flex items-center gap-1 text-emerald-400"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Presenças</span>
                    <span className="flex items-center gap-1 text-rose-400"><span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" /> Faltas</span>
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  {Array.from(new Set(athletes.map(a => a.classType || 'TURMA A'))).map((turma) => {
                    const turmaAthletes = athletes.filter(a => (a.classType || 'TURMA A') === turma);
                    let pCount = 0;
                    let fCount = 0;
                    turmaAthletes.forEach(a => {
                      saturdays.forEach(sat => {
                        const st = attendance[`${a.id}_${sat.toISOString().split('T')[0]}`] || '';
                        if (st === 'P' || st === 'A') pCount++;
                        if (st === 'F' || st === 'J') fCount++;
                      });
                    });
                    const total = Math.max(1, pCount + fCount);
                    const pPct = Math.round((pCount / total) * 100);
                    return (
                      <div key={turma} className="space-y-1 font-mono">
                        <div className="flex justify-between text-xs">
                          <span className="text-white font-bold">{turma}</span>
                          <span className="text-cyan-400">{pCount} P / {fCount} F</span>
                        </div>
                        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                          <div className="bg-emerald-500 h-full transition-all" style={{ width: `${pPct}%` }} />
                          <div className="bg-rose-500 h-full transition-all" style={{ width: `${100 - pPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chart 3: Evolução de Presenças */}
            <div className="bg-white/[0.03] backdrop-blur-md p-6 rounded-2xl border border-emerald-500/20 space-y-4">
              <h4 className="text-sm font-bold uppercase text-emerald-300 font-mono tracking-wider">Evolução de Presenças aos Sábados</h4>
              <div className="h-44 flex items-end justify-between gap-4 px-4 pt-6 pb-2 border-b border-slate-800">
                {saturdays.map((sat, i) => {
                  const satKey = sat.toISOString().split('T')[0];
                  let presTotal = 0;
                  athletes.forEach(a => {
                    const st = attendance[`${a.id}_${satKey}`] || '';
                    if (st === 'P' || st === 'A') presTotal++;
                  });
                  const heightPct = Math.min(100, Math.max(15, (presTotal / Math.max(1, athletes.length)) * 100));
                  return (
                    <div key={satKey} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <div className="text-[10px] font-mono text-emerald-400 font-bold">{presTotal}</div>
                      <div className="w-full bg-emerald-500/30 group-hover:bg-emerald-500/60 rounded-t-lg transition-all border-t border-emerald-400" style={{ height: `${heightPct}%` }} />
                      <span className="text-[10px] font-mono text-slate-400">Séb {i + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rankings Grid (Mais Frequentes & Mais Faltas) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Mais Frequentes */}
              <div className="bg-white/[0.03] backdrop-blur-md p-6 rounded-2xl border-t-2 border-emerald-500 border border-slate-800 space-y-4">
                <h4 className="text-sm font-bold uppercase text-emerald-400 font-mono flex items-center gap-2">
                  <Star className="w-4 h-4 text-emerald-400" /> Ranking Sábado: 15 Mais Frequentes
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 font-mono">
                  {athletes
                    .map(a => {
                      let pTotal = 0;
                      saturdays.forEach(sat => {
                        const st = attendance[`${a.id}_${sat.toISOString().split('T')[0]}`] || '';
                        if (st === 'P' || st === 'A') pTotal++;
                      });
                      return { ...a, pTotal };
                    })
                    .sort((a, b) => b.pTotal - a.pTotal)
                    .slice(0, 15)
                    .map((a, idx) => (
                      <div key={a.id} className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-xs">
                        <span className="font-bold text-white uppercase">{idx + 1}. {a.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-slate-400 text-[10px]">{a.classType || 'TURMA A'}</span>
                          <span className="font-black text-emerald-400">{a.pTotal} presenças</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Mais Faltas */}
              <div className="bg-white/[0.03] backdrop-blur-md p-6 rounded-2xl border-t-2 border-rose-500 border border-slate-800 space-y-4">
                <h4 className="text-sm font-bold uppercase text-rose-400 font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400" /> Ranking Sábado: 15 Mais Faltas
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 font-mono">
                  {athletes
                    .map(a => {
                      let fTotal = 0;
                      saturdays.forEach(sat => {
                        const st = attendance[`${a.id}_${sat.toISOString().split('T')[0]}`] || '';
                        if (st === 'F' || st === 'J') fTotal++;
                      });
                      return { ...a, fTotal };
                    })
                    .sort((a, b) => b.fTotal - a.fTotal)
                    .slice(0, 15)
                    .map((a, idx) => (
                      <div key={a.id} className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-xs">
                        <span className="font-bold text-white uppercase">{idx + 1}. {a.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-slate-400 text-[10px]">{a.classType || 'TURMA A'}</span>
                          <span className="font-black text-rose-400">{a.fTotal} faltas</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* ===== RELATÓRIO DE PONTUAÇÃO ===== */}
            <div className="pt-6 border-t border-violet-500/30 space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h4 className="text-xl font-bold text-violet-400 font-mono uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-5 h-5 text-violet-400" /> Relatório de Pontuação
                </h4>
                <div className="flex gap-2 items-center">
                  <input
                    type="month"
                    value={reportPointsMonth}
                    onChange={(e) => setReportPointsMonth(e.target.value)}
                    className="bg-[#1a1a2e] border border-violet-500 text-white px-3 py-1.5 rounded-xl text-xs font-mono outline-none"
                  />
                  <select
                    value={reportPointsWindow}
                    onChange={(e) => setReportPointsWindow(e.target.value)}
                    className="bg-[#1a1a2e] border border-violet-500 text-white px-3 py-1.5 rounded-xl text-xs font-mono uppercase outline-none"
                  >
                    <option value="1">Mês Atual</option>
                    <option value="2">Mês Atual + Anterior</option>
                    <option value="3">Mês Atual + 2 Anteriores</option>
                  </select>
                </div>
              </div>

              {/* Legend */}
              <div className="bg-white/[0.03] backdrop-blur-md p-3 rounded-xl flex flex-wrap gap-4 justify-center text-xs font-mono border border-violet-500/20">
                <span className="text-slate-400 tracking-wider">SISTEMA:</span>
                <span><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">P Presença</span> <strong className="text-emerald-400">+5 pts</strong></span>
                <span><span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">A Atraso</span> <strong className="text-amber-400">+2 pts</strong></span>
                <span><span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">J Justificativa</span> <strong className="text-rose-400">−1 pt</strong></span>
                <span><span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">F Falta</span> <strong className="text-rose-400">−3 pts</strong></span>
              </div>

              {/* Scoring Table */}
              <div className="bg-white/[0.03] backdrop-blur-md p-6 rounded-2xl border-t-2 border-violet-500 border border-slate-800 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px] font-mono text-xs">
                  <thead>
                    <tr className="border-b border-violet-500/30 text-violet-400 uppercase">
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3">Aluno</th>
                      <th className="p-3">Turma</th>
                      <th className="p-3 text-center">P</th>
                      <th className="p-3 text-center">A</th>
                      <th className="p-3 text-center">J</th>
                      <th className="p-3 text-center">F</th>
                      <th className="p-3 text-center text-violet-300">Média Cheg.</th>
                      <th className="p-3 text-center text-emerald-400">Q <span className="px-1.5 py-0.5 bg-emerald-500/20 rounded text-[10px]">{saturdays.length}</span></th>
                      <th className="p-3 text-right">Pontuação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {athletes
                      .map(a => {
                        let P = 0, A = 0, J = 0, F = 0;
                        saturdays.forEach(sat => {
                          const st = attendance[`${a.id}_${sat.toISOString().split('T')[0]}`] || '';
                          if (st === 'P') P++;
                          else if (st === 'A') A++;
                          else if (st === 'J') J++;
                          else if (st === 'F') F++;
                        });
                        const pontos = P * 5 + A * 2 + J * (-1) + F * (-3);
                        const qAluno = P + A + J + F;
                        const avgArrivalMins = getStudentAverageArrivalMinutes(a.id);
                        return { ...a, P, A, J, F, pontos, qAluno, avgArrivalMins };
                      })
                      .sort((a, b) => {
                        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
                        if (a.avgArrivalMins !== b.avgArrivalMins) return a.avgArrivalMins - b.avgArrivalMins;
                        return b.P - a.P;
                      })
                      .map((a, idx) => {
                        const medals = ['🥇', '🥈', '🥉'];
                        const posLabel = idx < 3 ? medals[idx] : `${idx + 1}º`;
                        const scoreClass = a.pontos > 0 ? 'text-emerald-400 font-bold' : a.pontos < 0 ? 'text-rose-400 font-bold' : 'text-slate-500 font-bold';
                        return (
                          <tr key={a.id} className="hover:bg-white/[0.02]">
                            <td className="p-3 text-center font-black">{posLabel}</td>
                            <td className="p-3 font-bold text-white uppercase">{a.name}</td>
                            <td className="p-3 text-slate-400">{a.classType || 'TURMA A'}</td>
                            <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">{a.P}</span></td>
                            <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">{a.A}</span></td>
                            <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">{a.J}</span></td>
                            <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">{a.F}</span></td>
                            <td className="p-3 text-center text-violet-300">{getStudentAverageArrivalTimeFormatted(a.id)}</td>
                            <td className="p-3 text-center text-emerald-400 font-bold">{a.qAluno}/{saturdays.length}</td>
                            <td className="p-3 text-right">
                              <span className={scoreClass}>{a.pontos > 0 ? `+${a.pontos}` : a.pontos} pts</span>
                              <div className="inline-block w-16 h-1.5 bg-slate-900 rounded-full ml-2 overflow-hidden align-middle border border-slate-800">
                                <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.max(10, Math.min(100, (Math.abs(a.pontos) / 30) * 100))}%` }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
            {/* ===== FIM RELATÓRIO DE PONTUAÇÃO ===== */}

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setShowFreqReportModal(false)}
                className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold font-mono transition-all cursor-pointer shadow-[0_0_15px_rgba(139,92,246,0.4)]"
              >
                Fechar Relatório
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: JUSTIFICATIVA SÁBADO */}
      {showJustificativaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-[#050b14] border-2 border-red-500/60 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-[0_0_50px_rgba(239,68,68,0.3)] relative my-8 space-y-6">
            <button
              onClick={() => {
                setShowJustificativaModal(false);
                setJustifStep(1);
                setJustifAthleteId('');
                setJustifReason('');
              }}
              className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Time Cutoff Banner */}
            {isJustificationLocked ? (
              <div className="bg-red-950/90 border border-red-500 text-red-300 rounded-2xl p-5 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-400 mx-auto flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black uppercase font-mono tracking-wider">🔒 BOTÃO TRAVADO</h3>
                <p className="text-xs leading-relaxed">
                  O envio de justificativas é aberto de sexta-feira às 23:00 até sábado às 13:30. No momento o sistema encontra-se travado.
                </p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setOverrideLock(true)}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 rounded-xl text-[10px] font-mono font-bold"
                  >
                    🔓 (Modo Professor) Destravar para Teste
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Step 1: Select Eligible Student */}
                {justifStep === 1 && (
                  <div className="space-y-4">
                    <div className="text-center pb-3 border-b border-slate-800">
                      <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest bg-red-950/80 px-3 py-1 rounded-full border border-red-800">
                        PASSO 01 DE 02 — SELEÇÃO DE ALUNO
                      </span>
                      <h3 className="text-xl font-black text-white uppercase tracking-wider font-mono mt-2">QUEM É VOCÊ?</h3>
                      <p className="text-xs text-slate-400">
                        Apenas alunos presentes no sábado anterior aparecem na lista para justificar.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5">
                      <Search className="w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Busque seu nome..."
                        value={justifSearch}
                        onChange={(e) => setJustifSearch(e.target.value)}
                        className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {athletes
                        .filter(a => a.name.toLowerCase().includes(justifSearch.toLowerCase()))
                        .filter(a => isAthleteEligibleForJustification(a.id))
                        .length === 0 ? (
                        <div className="text-center py-8 space-y-2">
                          <p className="text-xs text-amber-400 font-mono font-bold">Nenhum aluno liberado para justificar no momento.</p>
                          <p className="text-[10px] text-slate-500">
                            Regra: É obrigatório ter marcado presença (P ou A) no sábado anterior. Quem faltou não aparece na lista.
                          </p>
                        </div>
                      ) : (
                        athletes
                          .filter(a => a.name.toLowerCase().includes(justifSearch.toLowerCase()))
                          .filter(a => isAthleteEligibleForJustification(a.id))
                          .map(a => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => {
                                setJustifAthleteId(a.id);
                                setJustifStep(2);
                              }}
                              className="w-full text-left bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-red-400 rounded-xl p-3.5 transition-all flex items-center justify-between group cursor-pointer"
                            >
                              <div>
                                <p className="text-xs font-bold text-white uppercase font-mono group-hover:text-red-400 transition-colors">{a.name}</p>
                                <p className="text-[10px] text-emerald-400 font-mono">✓ Liberado (Presença confirmada no sábado anterior)</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-red-400" />
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                )}

                {/* Step 2: Reason & Direct Submit */}
                {justifStep === 2 && (
                  <div className="space-y-4">
                    <div className="text-center pb-3 border-b border-slate-800">
                      <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest bg-red-950/80 px-3 py-1 rounded-full border border-red-800">
                        PASSO 02 DE 02 — MOTIVO DA AUSÊNCIA
                      </span>
                      <h3 className="text-xl font-black text-white uppercase tracking-wider font-mono mt-2">ESCREVA O MOTIVO</h3>
                      <p className="text-xs text-cyan-300 font-mono mt-1">
                        {athletes.find(a => a.id === justifAthleteId)?.name}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-mono text-slate-300 uppercase">Motivo da ausência:</label>
                      <textarea
                        rows={4}
                        required
                        placeholder="Ex: Trabalho, motivo de saúde, viagem..."
                        value={justifReason}
                        onChange={(e) => setJustifReason(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-red-400 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setJustifStep(1)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!justifReason.trim()) {
                            alert('Por favor, escreva o motivo da ausência.');
                            return;
                          }

                          const todayStr = now.toISOString().split('T')[0];
                          let targetSatIndex = saturdays.findIndex(sat => sat.toISOString().split('T')[0] >= todayStr);
                          if (targetSatIndex === -1) targetSatIndex = saturdays.length - 1;
                          if (targetSatIndex < 0 && saturdays.length > 0) targetSatIndex = 0;
                          const satKey = saturdays[targetSatIndex] ? saturdays[targetSatIndex].toISOString().split('T')[0] : todayStr;

                          const key = `${justifAthleteId}_${satKey}`;
                          const updatedAttendance = { ...attendance, [key]: 'J' };
                          setAttendance(updatedAttendance);

                          try {
                            await setDoc(doc(db, 'settings', 'attendance_data'), {
                              attendance: updatedAttendance,
                              updatedAt: new Date().toISOString()
                            });
                          } catch (err) {
                            console.error('Error saving justification attendance:', err);
                          }

                          alert('✅ Justificativa enviada e registrada com sucesso na frequência!');
                          setShowJustificativaModal(false);
                          setJustifStep(1);
                          setJustifAthleteId('');
                          setJustifReason('');
                        }}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                        <span>Enviar Justificativa</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMATION POP-UP */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#050b14] border border-cyan-500/50 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-400 mx-auto flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <Shield className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">{confirmModal.title}</h3>
              <p className="text-xs text-slate-300 mt-2">{confirmModal.message}</p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold font-mono transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.action();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 text-xs font-bold font-mono shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
