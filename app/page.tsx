"use client";
import React, { useState, Suspense, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment, Preload, SpotLight } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib'; // 👈 🔥 เพิ่มบรรทัดนี้ครับ! ไม่งั้นโคลนตัวละครไม่ได้
import { useFrame } from '@react-three/fiber';

const FPS = 30;
const f2s = (frame) => frame / FPS;

function TestCharacter({ position, rotation, isRevealed, rank }) {
  const { scene } = useGLTF('/models/El.glb');
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const lightRef = useRef();

  // 🔥 แก้จุดที่ 1: เปลี่ยนจากดำสนิท (#000000) เป็น "เทาเข้ม" (#222222) 
  // มันจะได้สะท้อนแสงสีต่างๆ ได้ครับ
  const silhouetteMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#222222', roughness: 0.2, metalness: 0.8,
  }), []);

  useLayoutEffect(() => {
    clone.traverse((child) => {
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
    lightRef.current.color.set('#00bfff');

    // บังคับสีตาม Rank เสมอ
    if (rank === 'SSR') {
      const hue = (time * 0.5) % 1;
      lightRef.current.color.setHSL(hue, 1, 0.5);
    } else if (rank === 'SR') {
      lightRef.current.color.set('#ffd700');
    } else {
      lightRef.current.color.set('#00bfff');
    }

    // Effect กระพริบ / นิ่ง
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
        // 🔥 แก้จุดที่ 2: ลบ color="black" ทิ้ง! หรือใส่สีขาวไว้ก่อนครับ
        color={
          rank === 'SSR' ? "#ffd700" : // SSR เอาสีม่วง/ชมพู (หรือสีอะไรก็ได้ที่เด่นๆ)
            rank === 'SR' ? "#ff00ff" : // SR สีทอง
              "#00bfff"   // นอกนั้น (R) สีฟ้า
        }
      />
      <primitive object={clone} />
    </group>
  );
}
// --- 1. ฉาก 3D ---


function GachaScene3D({ stepIndex, results }) {
  const { scene, animations, nodes } = useGLTF('/models/stage.glb');
  const { actions, names } = useAnimations(animations, scene);

  // 1. เรียกใช้ useThree เพื่อเข้าถึงระบบกล้องของ Canvas
  const { set, size } = useThree();

  // 📝 TIMELINE (แก้เลขเฟรมให้ตรงกับ Blender ของคุณ)
  const TIMELINES = useMemo(() => [
    { start: f2s(0), end: f2s(260) }, // [0] Intro
    { start: f2s(261), end: f2s(300) }, // [1] Char 1
    { start: f2s(301), end: f2s(330) }, // [2] Char 2
    { start: f2s(331), end: f2s(360) }, // [3] Char 3
    { start: f2s(361), end: f2s(390) }, // [4] Char 4
    { start: f2s(391), end: f2s(420) }, // [5] Char 5
  ], []);

  const spawnPoints = useMemo(() => [
    nodes.Char1, nodes.Char2, nodes.Char3, nodes.Char4, nodes.Char5
  ], [nodes]);

  // 🔥🔥🔥 2. FIX: สั่งสิงร่างกล้องจากไฟล์ GLB 🔥🔥🔥
  useEffect(() => {
    // หา object ที่เป็นกล้องใน nodes ทั้งหมด
    const cameraNode = Object.values(nodes).find((n) => n.isCamera);

    if (cameraNode) {
      console.log("🎥 Found GLB Camera:", cameraNode.name);

      // ปรับสัดส่วนภาพให้ตรงกับหน้าจอ
      cameraNode.aspect = size.width / size.height;
      cameraNode.updateProjectionMatrix();

      // สั่ง Canvas ให้ใช้กล้องตัวนี้เป็นตาหลัก!
      set({ camera: cameraNode });
    } else {
      console.warn("⚠️ ไม่เจอกล้องในไฟล์ GLB! (เช็คชื่อใน Blender หรือตอน Export)");
    }
  }, [nodes, size, set]);

  // 🔥 3. Logic สั่งเล่นอนิเมชั่น (Universal Control)
  useEffect(() => {
    if (!TIMELINES[stepIndex]) return;
    const currentStart = TIMELINES[stepIndex].start;

    names.forEach((name) => {
      const action = actions[name];
      if (action) {
        action.reset();
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.time = currentStart;
        action.paused = false;
        action.play();
      }
    });
  }, [stepIndex, actions, names, TIMELINES]);

  // 🔥 4. Logic คอยเบรค
  useFrame(() => {
    const currentEnd = TIMELINES[stepIndex]?.end;
    if (!currentEnd) return;

    names.forEach((name) => {
      const action = actions[name];
      if (action && !action.paused) {
        if (action.time >= currentEnd) {
          action.paused = true;
          action.time = currentEnd;
        }
      }
    });
  });

  return (
    <>
      <Environment preset="sunset" blur={0.5} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />

      <primitive object={scene} />

      {results && results.map((item, index) => {
        const point = spawnPoints[index];
        if (!point) return null;

        return (
          <TestCharacter
            key={index}
            index={index}
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

// --- 2. Main App ---

const rollGachaItem = () => {
  const rand = Math.random() * 100;

  let rank = 'R';
  let money = 0;
  let color = '';

  // --- 1. กำหนด Rank และ เงิน ---
  if (rand < 2) {
    // ✨ SSR (5%)
    rank = 'SSR';
    money = Math.floor(Math.random() * 51) + 100; // 100 - 150 บาท
    color = 'from-yellow-300 to-amber-500';       // สีทอง
  }
  else if (rand < 15) {
    // ⭐ SR (15%)
    rank = 'SR';
    money = Math.floor(Math.random() * 21) + 10;  // 30 - 50 บาท
    color = 'from-gray-300 to-slate-500';         // สีเงิน/เทา
  }
  else {
    // 🔹 R (80%)
    rank = 'R';
    money = Math.floor(Math.random() * 6) + 1;    // 5 - 10 บาท
    color = 'from-blue-400 to-cyan-300';          // สีฟ้า
  }

  // ส่งกลับแค่นี้พอครับ (ชื่อ Item ใส่เป็น Rank ไปเลยก็ได้)
  return {
    rank,
    money,
    color,
    name: `Bonus ${rank}` // ใส่ชื่อแก้ขัดไปก่อน
  };
};
// ==========================================
// 📱 Main Component
// ==========================================
export default function UmaGachaBase() {
  const [phase, setPhase] = useState('MAIN');
  const [results, setResults] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [reward, setReward] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const homeMusic = useRef(null);
  const actionMusic = useRef(null);

  useEffect(() => {
    // สร้างตัวเล่นเพลง
    homeMusic.current = new Audio('/Game OST Uma Musume - Gacha Menu.mp3');
    homeMusic.current.loop = true;
    homeMusic.current.volume = 0.3;
    actionMusic.current = new Audio('/Game OST Uma Musume Pretty Derby - Character Gacha.mp3');
    actionMusic.current.loop = true;
    actionMusic.current.volume = 0.5;

    return () => {
      // หยุดเพลงเมื่อปิดหน้าเว็บ
      homeMusic.current.pause();
      actionMusic.current.pause();
    };
  }, []);

  useEffect(() => {
    if (!homeMusic.current || !actionMusic.current) return;

    if (phase === 'SHOW') {
      // ⚔️ เข้าหน้า SHOW: หยุดเพลง Home -> เล่นเพลง Action
      homeMusic.current.pause();
      actionMusic.current.play().catch(e => console.log("Action music blocked"));
    }
    else {
      // 🏠 เฟสอื่นๆ ทั้งหมด (MAIN, PRELOAD, RESULT): หยุดเพลง Action -> เล่นเพลง Home
      actionMusic.current.pause();
      actionMusic.current.currentTime = 0; // รีเซ็ตเพลง Action ให้เริ่มใหม่รอบหน้า

      homeMusic.current.play().catch(() => {
        // ดักกรณี Browser บล็อก (จะดังทันทีที่ User คลิกจอครั้งแรก)
        const playOnInternalClick = () => {
          homeMusic.current.play();
          window.removeEventListener('click', playOnInternalClick);
        };
        window.addEventListener('click', playOnInternalClick);
      });
    }
  }, [phase]);

  // --- เพิ่ม State สำหรับการแลกรางวัล ---
  const [showRedeem, setShowRedeem] = useState(false);
  const [walletPhone, setWalletPhone] = useState('');

  // --- คำนวณเงินรวม ---
  const totalMoney = useMemo(() => {
    return results.reduce((sum, item) => sum + (item.money || 0), 0);
  }, [results]);

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
    if (stepIndex === 0) {
      setStepIndex(1);
      return;
    }
    if (stepIndex <= 5) {
      setIsProcessing(true);
      const currentItem = results[stepIndex - 1];
      setReward({ amount: currentItem.money });
      setTimeout(() => {
        setReward(null);
        setStepIndex(prev => prev + 1);
        setIsProcessing(false);
      }, 1500);
    } else {
      setPhase('RESULT');
    }
  };

  // --- ฟังก์ชันส่งข้อมูลเข้าเครื่องเรา ---
  const handleRedeemSubmit = async () => {
    if (walletPhone.length < 10) return alert("กรุณากรอกเบอร์ให้ถูกต้อง");
    try {
      await fetch('https://api-gacha.telemedicproject.dpdns.org/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletPhone, totalMoney }),
      });
      alert("ส่งข้อมูลสำเร็จ!");
      setShowRedeem(false);
      setPhase('MAIN');
    } catch (e) {
      alert("เชื่อมต่อ Server ไม่ได้");
    }
  };

  return (
    <main className="relative mx-auto h-screen max-w-md overflow-hidden bg-black font-sans shadow-2xl">
      <AnimatePresence mode="wait">

        {/* --- MAIN MENU (เหมือนเดิม) --- */}
        {phase === 'MAIN' && (
          <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="relative z-10 flex h-full flex-col p-6 text-center bg-[#f0f4f8]"
          >
            <div className="mt-4">
              <div className="inline-block rounded-full bg-white/80 px-6 py-2 font-black text-blue-600 shadow-sm border-2 border-blue-200 text-lg italic">
                HAPPY NEW YEAR 2026
              </div>
            </div>
            <div className="mt-8 flex-grow rounded-3xl bg-white shadow-2xl border-4 border-white overflow-hidden relative">
              <img src="/Banner.jpg" className="h-full w-full object-cover" alt="Banner" />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 via-transparent to-transparent" />
            </div>
            <div className="mt-8 mb-8">
              <button onClick={startGacha} className="w-full h-20 rounded-2xl bg-gradient-to-r from-[#ff4757] to-[#ff7f50] border-b-8 border-[#c44141] font-black text-2xl text-white active:translate-y-1 active:border-b-4 transition-all">
                Gacha Draw!
              </button>
            </div>
          </motion.div>
        )}

        {/* --- 3D SHOWCASE (เหมือนเดิม) --- */}
        {(phase === 'PRELOAD' || phase === 'SHOW') && (
          <motion.div key="anim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-50 w-full h-full bg-black">
            {phase === 'PRELOAD' && (
              <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black text-white">
                <Loader2 className="animate-spin mb-4" size={48} color="#ff4757" />
                <p className="font-bold tracking-widest text-xl">LOADING...</p>
              </div>
            )}
            <Suspense fallback={null}>
              <Canvas shadows>
                <GachaScene3D stepIndex={stepIndex} results={results} />
                <Preload all />
              </Canvas>
            </Suspense>
            <AnimatePresence>
              {reward && (
                <div className="absolute inset-0 z-[80] flex items-center justify-center pointer-events-none">
                  <motion.div initial={{ scale: 0.5, y: 50, opacity: 0 }} animate={{ scale: 1.2, y: -50, opacity: 1 }} exit={{ scale: 1.5, y: -100, opacity: 0 }} className="flex flex-col items-center">
                    <div className="text-6xl mb-2">💎</div>
                    <div className="text-5xl font-black text-yellow-300 italic tracking-tighter" style={{ textShadow: '2px 2px 0 #000' }}>+ {reward.amount}</div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
            {phase === 'SHOW' && !reward && (
              <div className="absolute inset-0 z-[60] cursor-pointer" onClick={handleNextStep}>
                <div className="absolute bottom-10 w-full text-center">
                  <p className="text-white text-lg font-bold animate-bounce uppercase tracking-widest">
                    {stepIndex === 0 ? "TAP TO START!" : "TAP FOR NEXT ▶"}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* --- 🔥 RESULT PHASE (ปรับปรุงใหม่ตามสั่ง) --- */}
        {phase === 'RESULT' && (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="relative z-10 flex h-full flex-col items-center p-8 bg-[#0f172a] text-white"
          >
            <div className="mt-10 flex flex-col items-center">
              <h2 className="text-xl font-bold text-blue-400 tracking-[0.3em] uppercase opacity-80">Total Score</h2>

              {/* วงแหวนแสงรอบตัวเลข */}
              <div className="relative mt-4 flex items-center justify-center">
                <div className="absolute w-40 h-40 bg-yellow-500/20 blur-[50px] rounded-full animate-pulse" />
                <span className="relative text-8xl font-black text-yellow-400 drop-shadow-2xl italic">
                  {totalMoney}
                </span>
              </div>
              <p className="mt-2 text-white/40 font-medium">Baht (THB)</p>
            </div>

            {/* รายการ Rank แบบเม็ดแคปซูล (สะอาดตาขึ้น) */}
            <div className="mt-12 flex gap-2 justify-center w-full">
              {results.map((item, i) => (
                <div key={i} className={`h-1.5 w-8 rounded-full bg-gradient-to-r ${item.color} shadow-sm`} />
              ))}
            </div>

            {/* --- ส่วนของกลุ่มปุ่ม (Button Group) --- */}
            <div className="mt-auto mb-12 w-full flex flex-col gap-4">

              {/* ปุ่มแลกรางวัล (เด่นที่สุด) */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowRedeem(true)}
                className="relative group w-full py-6 rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-500 font-black text-2xl text-slate-900 shadow-[0_20px_40px_-15px_rgba(251,191,36,0.5)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
                <span className="relative flex items-center justify-center gap-3">
                  🎁 REDEEM NOW
                </span>
              </motion.button>

              {/* ปุ่มสุ่มใหม่ (รองลงมา) */}
              <button
                onClick={startGacha}
                className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-bold text-lg hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                🔄 PLAY AGAIN
              </button>

              <button
                onClick={() => setPhase('MAIN')}
                className="w-full py-2 text-white/30 text-sm font-medium hover:text-white/50 transition-colors"
              >
                BACK TO MENU
              </button>
            </div>

            {/* --- Modal กรอกเบอร์ (UI ใหม่) --- */}
            <AnimatePresence>
              {showRedeem && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[100] bg-[#020617]/95 flex items-center justify-center p-6 backdrop-blur-sm"
                >
                  <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                    className="bg-slate-900 w-full rounded-[2.5rem] p-8 border border-white/5 shadow-3xl text-center"
                  >
                    <div className="w-20 h-20 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-4xl">💰</span>
                    </div>

                    <h3 className="text-3xl font-black text-white mb-2 italic">WALLET REDEEM</h3>
                    <p className="text-white/50 text-sm mb-8 px-4">
                      ระบบจะโอนเงิน <span className="text-yellow-400 font-bold">{totalMoney} บาท</span> เข้าเบอร์ที่ระบุไว้ด้านล่าง
                      <br />
                      <span className="text-red-400 text-xs mt-1 block font-medium">* สามารถรับรางวัลได้เพียงครั้งเดียวเท่านั้น</span>
                    </p>

                    <input
                      type="tel"
                      placeholder="0XX-XXX-XXXX"
                      className="w-full bg-black border-2 border-slate-800 rounded-2xl px-4 py-5 text-3xl font-black text-center text-yellow-400 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 outline-none transition-all placeholder:text-slate-800"
                      value={walletPhone}
                      onChange={(e) => setWalletPhone(e.target.value.replace(/\D/g, ''))}
                      maxLength={10}
                    />

                    <div className="grid grid-cols-2 gap-4 mt-10">
                      <button
                        onClick={() => setShowRedeem(false)}
                        className="py-4 rounded-2xl bg-slate-800 text-slate-400 font-bold hover:bg-slate-700 transition-colors"
                      >
                        CLOSE
                      </button>
                      <button
                        onClick={handleRedeemSubmit}
                        className="py-4 rounded-2xl bg-slate-800 text-slate-400 font-bold hover:bg-slate-700 transition-colors"
                      >
                        CONFIRM
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

      </AnimatePresence>
    </main>
  );
}

// ... GiftItem เหมือนเดิมครับ ...
function GiftItem({ index, prize }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <motion.div
      initial={{ scale: 0, y: 100 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: "spring", delay: index * 0.1 }}
    >
      <div onClick={() => setIsOpen(true)} className="w-32 h-32 flex items-center justify-center cursor-pointer relative">
        <AnimatePresence mode="wait">
          {!isOpen ? (
            <motion.div key="closed" exit={{ scale: 1.5, opacity: 0 }}>
              <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full animate-pulse" />
              <span className="text-6xl">🎁</span>
            </motion.div>
          ) : (
            <motion.div key="opened" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center">
              <div className={`w-24 h-24 bg-gradient-to-br ${prize.color} rounded-2xl shadow-lg flex items-center justify-center text-4xl mb-2 border-2 border-white/50`}>
                {prize.rank === 'UR' ? '👑' : '✨'}
              </div>
              <p className="text-white text-[10px] font-bold text-center">{prize.name}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}