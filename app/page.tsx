/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, Suspense, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment, Preload, SpotLight } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { useFrame } from '@react-three/fiber';

// --- TYPES สำหรับ TypeScript ---
interface GachaItem {
  rank: string;
  money: number;
  color: string;
  name: string;
}

const FPS = 30;
const f2s = (frame: number) => frame / FPS; // 🔥 แก้ Error: frame: number
const BASE_PATH = '/gacha-new';

function TestCharacter({ position, rotation, isRevealed, rank }: { position: any, rotation: any, isRevealed: boolean, rank: string }) {
  const { scene } = useGLTF(`${BASE_PATH}/models/El.glb`);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const lightRef = useRef<THREE.SpotLight>(null);

  const silhouetteMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#222222', roughness: 0.2, metalness: 0.8,
  }), []);

  useLayoutEffect(() => {
    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (!child.userData.originalMaterial) child.userData.originalMaterial = child.material;
        child.material = isRevealed ? child.userData.originalMaterial : silhouetteMaterial;
      }
    });
  }, [clone, isRevealed, silhouetteMaterial]);

  useFrame((state) => {
    if (!lightRef.current) return;
    const time = state.clock.elapsedTime;
    
    if (rank === 'SSR') {
      const hue = (time * 0.5) % 1;
      lightRef.current.color.setHSL(hue, 1, 0.5);
    } else if (rank === 'SR') {
      lightRef.current.color.set('#ffd700');
    } else {
      lightRef.current.color.set('#00bfff');
    }

    if (!isRevealed) {
      const speed = rank === 'SSR' ? 8 : (rank === 'SR' ? 5 : 3);
      lightRef.current.intensity = 150 + Math.sin(time * speed) * 50;
    } else {
      lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, 100, 0.05);
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <SpotLight
        ref={lightRef}
        position={[0, 6, 0]}
        target={clone}
        distance={10}
        angle={0.6}
        attenuation={5}
        castShadow
        color={rank === 'SSR' ? "#ffd700" : rank === 'SR' ? "#ff00ff" : "#00bfff"}
      />
      <primitive object={clone} />
    </group>
  );
}

function GachaScene3D({ stepIndex, results }: { stepIndex: number, results: GachaItem[] }) {
  const { scene, animations, nodes } = useGLTF(`${BASE_PATH}/models/stage.glb`) as any;
  const { actions, names } = useAnimations(animations, scene);
  const { set, size } = useThree();

  const TIMELINES = useMemo(() => [
    { start: f2s(0), end: f2s(260) },
    { start: f2s(261), end: f2s(300) },
    { start: f2s(301), end: f2s(330) },
    { start: f2s(331), end: f2s(360) },
    { start: f2s(361), end: f2s(390) },
    { start: f2s(391), end: f2s(420) },
  ], []);

  const spawnPoints = useMemo(() => [
    nodes.Char1, nodes.Char2, nodes.Char3, nodes.Char4, nodes.Char5
  ], [nodes]);

  useEffect(() => {
    const cameraNode = Object.values(nodes).find((n: any) => n.isCamera) as THREE.PerspectiveCamera;
    if (cameraNode) {
      cameraNode.aspect = size.width / size.height;
      cameraNode.updateProjectionMatrix();
      set({ camera: cameraNode });
    }
  }, [nodes, size, set]);

  useEffect(() => {
    if (!TIMELINES[stepIndex]) return;
    const currentStart = TIMELINES[stepIndex].start;
    names.forEach((name) => {
      const action = actions[name];
      if (action) {
        action.reset().setLoop(THREE.LoopOnce, 1).play();
        action.clampWhenFinished = true;
        action.time = currentStart;
        action.paused = false;
      }
    });
  }, [stepIndex, actions, names, TIMELINES]);

  useFrame(() => {
    const currentEnd = TIMELINES[stepIndex]?.end;
    if (!currentEnd) return;
    names.forEach((name) => {
      const action = actions[name];
      if (action && !action.paused && action.time >= currentEnd) {
        action.paused = true;
        action.time = currentEnd;
      }
    });
  });

  return (
    <>
      <Environment preset="sunset" />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <primitive object={scene} />
      {results.map((item, index) => {
        const point = spawnPoints[index];
        if (!point) return null;
        return (
          <TestCharacter
            key={index}
            rank={item.rank}
            position={point.position}
            rotation={point.rotation}
            isRevealed={stepIndex >= (index + 1)}
          />
        );
      })}
    </>
  );
}

const rollGachaItem = (): GachaItem => {
  const rand = Math.random() * 100;
  let rank = 'R';
  if (rand < 2) rank = 'SSR';
  else if (rand < 15) rank = 'SR';
  else rank = 'R';

  return {
    rank,
    money: rank === 'SSR' ? 100 : rank === 'SR' ? 30 : 5,
    color: rank === 'SSR' ? 'from-yellow-300 to-amber-500' : rank === 'SR' ? 'from-gray-300 to-slate-500' : 'from-blue-400 to-cyan-300',
    name: `Bonus ${rank}`
  };
};

export default function UmaGachaBase() {
  const [phase, setPhase] = useState('MAIN');
  const [results, setResults] = useState<GachaItem[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [reward, setReward] = useState<{amount: number} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const homeMusic = useRef<HTMLAudioElement | null>(null);
  const actionMusic = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    homeMusic.current = new Audio(`${BASE_PATH}/Game OST Uma Musume - Gacha Menu.mp3`);
    homeMusic.current.loop = true;
    homeMusic.current.volume = 0.3;
    actionMusic.current = new Audio(`${BASE_PATH}/Game OST Uma Musume Pretty Derby - Character Gacha.mp3`);
    actionMusic.current.loop = true;
    actionMusic.current.volume = 0.5;
    return () => {
      homeMusic.current?.pause();
      actionMusic.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!homeMusic.current || !actionMusic.current) return;
    if (phase === 'SHOW') {
      homeMusic.current.pause();
      actionMusic.current.play().catch(() => {});
    } else {
      actionMusic.current.pause();
      actionMusic.current.currentTime = 0;
      homeMusic.current.play().catch(() => {});
    }
  }, [phase]);

  const totalMoney = useMemo(() => results.reduce((sum, item) => sum + item.money, 0), [results]);

  const startGacha = () => {
    const newResults = Array(5).fill(null).map(() => rollGachaItem());
    setResults(newResults);
    setPhase('PRELOAD');
    setTimeout(() => {
      setStepIndex(0);
      setPhase('SHOW');
    }, 2000);
  };

  const handleNextStep = () => {
    if (isProcessing) return;
    if (stepIndex === 0) setStepIndex(1);
    else if (stepIndex <= 5) {
      setIsProcessing(true);
      setReward({ amount: results[stepIndex - 1].money });
      setTimeout(() => {
        setReward(null);
        setStepIndex(prev => prev + 1);
        setIsProcessing(false);
      }, 1500);
    } else setPhase('RESULT');
  };

  return (
    <main className="relative mx-auto h-screen max-w-md overflow-hidden bg-black font-sans shadow-2xl">
      <AnimatePresence mode="wait">
        {phase === 'MAIN' && (
          <motion.div key="main" className="relative z-10 flex h-full flex-col p-6 text-center bg-[#f0f4f8]">
            <div className="mt-4"><div className="inline-block rounded-full bg-white/80 px-6 py-2 font-black text-blue-600 border-2 border-blue-200 text-lg italic">HAPPY NEW YEAR 2026</div></div>
            <div className="mt-8 flex-grow rounded-3xl bg-white shadow-2xl border-4 border-white overflow-hidden relative">
              <img src={`${BASE_PATH}/Banner.jpg`} className="h-full w-full object-cover" alt="Banner" />
            </div>
            <div className="mt-8 mb-8"><button onClick={startGacha} className="w-full h-20 rounded-2xl bg-gradient-to-r from-[#ff4757] to-[#ff7f50] border-b-8 border-[#c44141] font-black text-2xl text-white active:translate-y-1 active:border-b-4 transition-all">Gacha Draw!</button></div>
          </motion.div>
        )}

        {(phase === 'PRELOAD' || phase === 'SHOW') && (
          <motion.div key="anim" className="relative z-50 w-full h-full bg-black">
            {phase === 'PRELOAD' && <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black text-white"><Loader2 className="animate-spin mb-4" size={48} color="#ff4757" /><p className="font-bold tracking-widest text-xl">LOADING...</p></div>}
            <Suspense fallback={null}><Canvas shadows><GachaScene3D stepIndex={stepIndex} results={results} /><Preload all /></Canvas></Suspense>
            <AnimatePresence>{reward && <div className="absolute inset-0 z-[80] flex items-center justify-center pointer-events-none"><motion.div initial={{ scale: 0.5, y: 50, opacity: 0 }} animate={{ scale: 1.2, y: -50, opacity: 1 }} exit={{ scale: 1.5, y: -100, opacity: 0 }} className="flex flex-col items-center"><div className="text-6xl mb-2">💎</div><div className="text-5xl font-black text-yellow-300 italic tracking-tighter" style={{ textShadow: '2px 2px 0 #000' }}>+ {reward.amount}</div></motion.div></div>}</AnimatePresence>
            {phase === 'SHOW' && !reward && <div className="absolute inset-0 z-[60] cursor-pointer" onClick={handleNextStep}><div className="absolute bottom-10 w-full text-center"><p className="text-white text-lg font-bold animate-bounce uppercase tracking-widest">{stepIndex === 0 ? "TAP TO START!" : "TAP FOR NEXT ▶"}</p></div></div>}
          </motion.div>
        )}

        {phase === 'RESULT' && (
          <motion.div key="result" className="relative z-10 flex h-full flex-col items-center p-8 bg-[#0f172a] text-white">
            <div className="mt-10 flex flex-col items-center">
              <h2 className="text-xl font-bold text-blue-400 tracking-[0.3em] uppercase opacity-80">Total Score</h2>
              <div className="relative mt-4 flex items-center justify-center"><div className="absolute w-40 h-40 bg-yellow-500/20 blur-[50px] rounded-full animate-pulse" /><span className="relative text-8xl font-black text-yellow-400 italic">{totalMoney}</span></div>
              <p className="mt-2 text-white/40 font-medium">Points</p>
            </div>
            <div className="mt-12 flex gap-2 justify-center w-full">{results.map((item, i) => <div key={i} className={`h-1.5 w-8 rounded-full bg-gradient-to-r ${item.color} shadow-sm`} />)}</div>
            <div className="mt-auto mb-12 w-full flex flex-col gap-4">
              <button disabled className="w-full py-6 rounded-2xl bg-gray-700 font-black text-xl text-gray-500 cursor-not-allowed">🎁 REDEEM (Disabled)</button>
              <p className="text-white/30 text-center text-[10px]">* ระบบแลกรางวัลไม่รองรับบน GitHub Pages *</p>
              <button onClick={startGacha} className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-bold text-lg hover:bg-white/10">🔄 PLAY AGAIN</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}