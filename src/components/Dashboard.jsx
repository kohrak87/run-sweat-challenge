import React, { useState, useEffect } from 'react';
import { Upload, Timer, CheckCircle, AlertTriangle, HelpCircle, Activity } from 'lucide-react';

const formatKoDate = (dateInput) => {
  let d;
  if (!dateInput) {
    d = new Date();
  } else {
    if (typeof dateInput === 'string' && dateInput.includes('-')) {
      const parts = dateInput.split('-');
      d = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      d = new Date(dateInput);
    }
  }
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[d.getDay()];
  return `${month}월 ${date}일 (${dayName})`;
};

export default function Dashboard({ currentUser, onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [timeOfDay, setTimeOfDay] = useState("morning"); // "morning" or "afternoon"
  const [runDistance, setRunDistance] = useState(""); // Empty default for direct typing
  const [runDuration, setRunDuration] = useState(""); // Empty default for direct typing
  const [runDate, setRunDate] = useState(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    return localToday.toISOString().split('T')[0];
  });
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isUrgent, setIsUrgent] = useState(false);

  // Gemini API states
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('run_sweat_gemini_api_key') || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [aiDetected, setAiDetected] = useState(false);

  const analyzeImageWithGemini = async (file) => {
    const apiKey = localStorage.getItem('run_sweat_gemini_api_key');
    if (!apiKey) return;

    setIsAnalyzing(true);
    setAnalysisError('');
    setAiDetected(false);

    try {
      const dataUrl = await compressImage(file);
      const mimeType = dataUrl.split(',')[0].split(';')[0].split(':')[1];
      const base64Data = dataUrl.split(',')[1];

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "This is a workout/running stats screenshot from Garmin, Strava, Apple Fitness, Nike Run Club or similar app. Please extract the running statistics. Look for distance (in kilometers, e.g. 5.12), duration (in minutes, e.g. 32.5 or 30:00), activity start time (e.g. 06:15 or 18:30) and date of the activity (if visible, in YYYY-MM-DD format). If date is not visible, return null for date. If start time is classified as between 05:00 and 09:00, classify time_of_day as 'morning', otherwise 'afternoon'. Convert hh:mm:ss duration format into decimal minutes (e.g. '01:05:30' -> 65.5). Return ONLY a raw JSON object with the following keys: 'distance' (number), 'duration' (number), 'date' (string, YYYY-MM-DD or null), 'time_of_day' (string, 'morning' or 'afternoon'). No markdown block code, no backticks, no other text."
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status} ${response.statusText}`);
      }

      const resData = await response.json();
      const resultText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!resultText) {
        throw new Error("분석 결과를 받지 못했습니다. 올바른 스크린샷 이미지인지 확인해 주세요.");
      }

      const parsed = JSON.parse(resultText.trim());

      if (parsed.distance) {
        setRunDistance(String(parsed.distance));
      }
      if (parsed.duration) {
        setRunDuration(String(Math.round(parsed.duration)));
      }
      if (parsed.date) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
          setRunDate(parsed.date);
        }
      }
      if (parsed.time_of_day) {
        setTimeOfDay(parsed.time_of_day);
      }
      setAiDetected(true);
    } catch (err) {
      console.error("Gemini image analysis error:", err);
      setAnalysisError(err.message || "이미지 분석 도중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // When modal is opened, dynamically reset default upload date and activity time based on the actual current time
  useEffect(() => {
    if (showModal) {
      const today = new Date();
      const offset = today.getTimezoneOffset();
      const localToday = new Date(today.getTime() - (offset * 60 * 1000));
      setRunDate(localToday.toISOString().split('T')[0]);
      setRunDistance("");
      setRunDuration("");
      
      const currentHour = today.getHours();
      if (currentHour >= 5 && currentHour < 9) {
        setTimeOfDay('morning');
      } else {
        setTimeOfDay('afternoon');
      }

      setAiDetected(false);
      setAnalysisError('');

      if (uploadFile) {
        analyzeImageWithGemini(uploadFile);
      }
    }
  }, [showModal]);

  // Countdown timer calculation to next Friday 12:00 PM (Noon)
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const currentDay = now.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
      
      // Target is this week's Friday at 12:00:00 (Noon)
      let target = new Date();
      target.setHours(12, 0, 0, 0);

      // Adjust to next Friday if today is Friday afternoon or Saturday
      let daysUntilFriday = 5 - currentDay;
      if (daysUntilFriday < 0 || (daysUntilFriday === 0 && now.getHours() >= 12)) {
        daysUntilFriday += 7;
      }
      
      target.setDate(now.getDate() + daysUntilFriday);
      
      const difference = target.getTime() - now.getTime();
      
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      // Check if remaining time is less than 24 hours
      if (difference < 24 * 60 * 60 * 1000) {
        setIsUrgent(true);
      } else {
        setIsUrgent(false);
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadFile(e.dataTransfer.files[0]);
      setShowModal(true);
    }
  };

  const handleFileChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
      setShowModal(true);
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          resolve(dataUrl);
        };
      };
    });
  };

  const submitRunAuth = async () => {
    // Run Validation Rules
    const distance = parseFloat(runDistance);
    const duration = parseFloat(runDuration);
    
    // Rule 1: 30 mins or 5km
    const isValidDistanceOrTime = distance >= 5.0 || duration >= 30;
    
    // Rule 2: Morning definition (05:00 - 09:00)
    const isMorning = timeOfDay === 'morning';
    const runTime = isMorning ? "오전" : "오후";

    if (!isValidDistanceOrTime) {
      alert("❌ 운동 불인정! 5km 이상 또는 30분 이상 달리기 기준을 만족해야 합니다.");
      return;
    }

    let imageUrl = null;
    if (uploadFile) {
      imageUrl = await compressImage(uploadFile);
    }

    onUploadSuccess({
      distance,
      duration,
      time: runTime,
      isMorning,
      date: formatKoDate(runDate),
      imageUrl
    });

    setShowModal(false);
    setUploadFile(null);
  };

  // Target values
  const morningRuns = currentUser.morningRuns;
  const totalRuns = currentUser.totalRuns;
  const isMorningTargetMet = morningRuns >= 3;
  const isTotalTargetMet = totalRuns >= 4;

  return (
    <div className="space-y-8">
      {/* 마감 카운트다운 타이머 */}
      <div className={`glass-panel rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between transition-all duration-300 ${isUrgent ? 'border-brand-red/50 shadow-red-glow' : 'border-slate-800'}`}>
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className={`p-3 rounded-full ${isUrgent ? 'bg-brand-red/20 text-brand-red animate-pulse' : 'bg-brand-neon/10 text-brand-neon'}`}>
            <Timer size={28} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-300">주간 숙제 집계 마감까지</h2>
            <p className="text-xs text-slate-400">매주 토요일 00:00 ~ 금요일 12:00 AM (저녁 러닝 제외)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 font-outfit">
          <div className="flex flex-col items-center">
            <span className={`text-3xl md:text-4xl font-extrabold ${isUrgent ? 'text-brand-red' : 'text-brand-neon'}`}>{String(timeLeft.days).padStart(2, '0')}</span>
            <span className="text-[10px] text-slate-400 mt-1 uppercase">Days</span>
          </div>
          <span className="text-xl text-slate-500 font-bold">:</span>
          <div className="flex flex-col items-center">
            <span className={`text-3xl md:text-4xl font-extrabold ${isUrgent ? 'text-brand-red' : 'text-brand-neon'}`}>{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className="text-[10px] text-slate-400 mt-1 uppercase">Hours</span>
          </div>
          <span className="text-xl text-slate-500 font-bold">:</span>
          <div className="flex flex-col items-center">
            <span className={`text-3xl md:text-4xl font-extrabold ${isUrgent ? 'text-brand-red' : 'text-brand-neon'}`}>{String(timeLeft.minutes).padStart(2, '0')}</span>
            <span className="text-[10px] text-slate-400 mt-1 uppercase">Min</span>
          </div>
          <span className="text-xl text-slate-500 font-bold">:</span>
          <div className="flex flex-col items-center">
            <span className={`text-3xl md:text-4xl font-extrabold ${isUrgent ? 'text-brand-red animate-pulse' : 'text-brand-cyan'}`}>{String(timeLeft.seconds).padStart(2, '0')}</span>
            <span className="text-[10px] text-slate-400 mt-1 uppercase">Sec</span>
          </div>
        </div>
      </div>

      {/* 2단 구성: 인증 및 달성도 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 오늘 인증 업로드 카드 */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="glass-panel rounded-2xl p-6 flex-1 flex flex-col justify-between border-slate-800">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">오늘의 러닝 숙제 인증</h3>
                <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-medium">1일 최대 1회</span>
              </div>
              <p className="text-sm text-slate-400 mb-6">
                가민, 스트라바 등 러닝 기록 캡처 이미지를 올려주세요. <br />
                자동 판정을 통해 숙제 달성 여부를 결정합니다.
              </p>
            </div>

            {currentUser.todayCompleted ? (
              <div className="border border-brand-neon/40 bg-brand-neon/5 rounded-xl p-8 flex flex-col items-center justify-center text-center animate-neon-pulse">
                <CheckCircle size={56} className="text-brand-neon mb-3" />
                <h4 className="text-lg font-bold text-white mb-1">오늘 숙제 제출 완료!</h4>
                <p className="text-xs text-brand-neon font-medium font-outfit mb-3">{currentUser.lastRunType === 'morning' ? '⚡️ 아침 러닝 인정 (5AM-9AM)' : '🏃‍♂️ 일반 러닝 인정'}</p>
                <div className="bg-brand-charcoal text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-700">
                  {currentUser.lastDistance}km / {currentUser.lastDuration}분 / {currentUser.lastTime}인증
                </div>
              </div>
            ) : (
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer ${
                  dragActive 
                    ? 'border-brand-cyan bg-brand-cyan/5 shadow-cyan-glow scale-[1.01]' 
                    : 'border-slate-700 bg-brand-charcoal hover:border-slate-500'
                }`}
                onClick={() => document.getElementById("file-upload").click()}
              >
                <input 
                  id="file-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <div className="p-4 rounded-full bg-slate-800 text-slate-400 mb-4 group-hover:scale-110 transition-transform">
                  <Upload size={32} />
                </div>
                <p className="font-semibold text-sm mb-1 text-slate-200">러닝 기록 스크린샷 드롭 또는 클릭</p>
                <p className="text-xs text-slate-500">Strava, Garmin, Nike Run Club 등</p>
              </div>
            )}

            <div className="mt-6 bg-slate-900/50 rounded-xl p-4 border border-slate-800 text-xs space-y-2">
              <div className="flex gap-2 text-slate-300">
                <Activity size={14} className="text-brand-cyan shrink-0 mt-0.5" />
                <span>**운동 인정 기준**: 5km 이상 달리기 또는 30분 이상 달리기 완료 시 1회 인정</span>
              </div>
              <div className="flex gap-2 text-slate-300">
                <AlertTriangle size={14} className="text-brand-orange shrink-0 mt-0.5" />
                <span>**아침 러닝 인정**: [오전 5시 ~ 오전 9시] 사이 활동 시작 기록 기준</span>
              </div>
            </div>
          </div>
        </div>

        {/* 주간 목표 달성도 카드 */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="glass-panel rounded-2xl p-6 flex-1 flex flex-col justify-between border-slate-800">
            <div>
              <h3 className="font-semibold text-lg mb-6">나의 주간 미션 현황판</h3>
              
              <div className="space-y-8">
                {/* 아침 러닝 미션 */}
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-brand-cyan">아침 러닝 (05:00 ~ 09:00)</span>
                      <span className="text-[10px] bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/20 px-2 py-0.5 rounded">최소 3회</span>
                    </div>
                    <span className="font-outfit font-extrabold text-xl text-brand-cyan">{morningRuns} <span className="text-slate-500 text-xs font-normal">/ 3 회</span></span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isMorningTargetMet ? 'bg-gradient-to-r from-brand-cyan to-[#00A3FF] shadow-cyan-glow' : 'bg-brand-cyan'}`}
                      style={{ width: `${Math.min((morningRuns / 3) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[11px] text-slate-500">
                    <span>주말 포함 일찍 달리기 🏃‍♂️</span>
                    <span>{isMorningTargetMet ? '🎯 달성 완료!' : `${3 - morningRuns}회 남음`}</span>
                  </div>
                </div>

                {/* 총 러닝 미션 */}
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-brand-neon">총 러닝 횟수 (아침 + 저녁)</span>
                      <span className="text-[10px] bg-brand-neon/15 text-brand-neon border border-brand-neon/20 px-2 py-0.5 rounded">최소 4회</span>
                    </div>
                    <span className="font-outfit font-extrabold text-xl text-brand-neon">{totalRuns} <span className="text-slate-500 text-xs font-normal">/ 4 회</span></span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isTotalTargetMet ? 'bg-gradient-to-r from-brand-neon to-[#2ECC71] shadow-neon-glow' : 'bg-brand-neon'}`}
                      style={{ width: `${Math.min((totalRuns / 4) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[11px] text-slate-500">
                    <span>금요일 낮 12시 전 기록까지 인정</span>
                    <span>{isTotalTargetMet ? '🎯 달성 완료!' : `${4 - totalRuns}회 남음`}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 최종 상태 서머리 */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">나의 생존 여부</p>
                <h4 className="text-lg font-bold">
                  {isMorningTargetMet || isTotalTargetMet ? (
                    <span className="text-brand-neon flex items-center gap-1.5 mt-1">🎉 벌금 면제 완료!</span>
                  ) : (
                    <span className="text-brand-orange flex items-center gap-1.5 mt-1">⚠️ 벌금 독박 위험군 (FNR 쏘기 위기)</span>
                  )}
                </h4>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">이번 주 벌금액</span>
                <span className="font-outfit text-lg font-extrabold text-brand-red">₩ 50,000 상당 페널티</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 인증 분석 수동 확인 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 border-slate-700 shadow-2xl animate-neon-pulse">
            <h3 className="font-extrabold text-xl text-white mb-4 flex items-center gap-2">
              <Activity className="text-brand-cyan" /> 🔍 가민/스트라바 AI 분석 결과
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="border border-slate-750 bg-slate-800/50 rounded-xl p-3.5 text-center">
                <p className="text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">업로드된 파일</p>
                <p className="font-mono text-xs font-semibold text-brand-cyan truncate">{uploadFile?.name}</p>
              </div>

              {/* Gemini AI Status Box */}
              {!localStorage.getItem('run_sweat_gemini_api_key') ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs">
                  <p className="text-slate-200 font-bold flex items-center gap-1 font-inter">
                    💡 <span className="text-brand-neon">AI 자동 채우기 사용</span>
                  </p>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Gemini API 키를 등록하면 스크린샷 속의 거리, 시간, 날짜를 AI가 자동으로 인식해 채워줍니다. 키는 본인 브라우저(`localStorage`)에만 저장되어 안전합니다.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="API Key 입력 (AI-zaSy...)"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-cyan font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (geminiApiKey.trim()) {
                          localStorage.setItem('run_sweat_gemini_api_key', geminiApiKey.trim());
                          analyzeImageWithGemini(uploadFile);
                        } else {
                          alert("API 키를 입력해 주세요.");
                        }
                      }}
                      className="bg-brand-cyan/20 border border-brand-cyan/40 hover:bg-brand-cyan/35 text-brand-cyan text-xs font-bold px-3 py-1.5 rounded-lg transition"
                    >
                      등록 & 분석
                    </button>
                  </div>
                </div>
              ) : isAnalyzing ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
                  <div>
                    <p className="text-xs text-slate-200 font-bold">Gemini AI가 스크린샷 분석 중...</p>
                    <p className="text-[10px] text-slate-500 mt-1">거리, 시간, 날짜 데이터를 파싱하고 있습니다.</p>
                  </div>
                </div>
              ) : aiDetected ? (
                <div className="bg-brand-neon/5 border border-brand-neon/20 rounded-xl p-3 text-xs flex justify-between items-center animate-pulse">
                  <span className="text-brand-neon font-medium flex items-center gap-1.5">
                    ✅ AI 분석 성공! 데이터가 자동 입력되었습니다.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const clear = window.confirm("등록된 API 키를 삭제하시겠습니까?");
                      if (clear) {
                        localStorage.removeItem('run_sweat_gemini_api_key');
                        setGeminiApiKey('');
                        setAiDetected(false);
                      }
                    }}
                    className="text-[10px] text-slate-500 hover:text-slate-400 underline font-semibold"
                  >
                    API 키 삭제
                  </button>
                </div>
              ) : analysisError ? (
                <div className="bg-brand-red/5 border border-brand-red/20 rounded-xl p-3 text-xs space-y-1.5">
                  <p className="text-brand-red font-medium">⚠️ AI 분석 실패 (수동 입력 가능)</p>
                  <p className="text-[10px] text-slate-400 leading-normal">{analysisError}</p>
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const clear = window.confirm("등록된 API 키를 삭제하시겠습니까?");
                        if (clear) {
                          localStorage.removeItem('run_sweat_gemini_api_key');
                          setGeminiApiKey('');
                          setAnalysisError('');
                        }
                      }}
                      className="text-[10px] text-slate-500 hover:text-slate-400 underline font-semibold"
                    >
                      API 키 변경
                    </button>
                    <button
                      type="button"
                      onClick={() => analyzeImageWithGemini(uploadFile)}
                      className="text-[10px] text-brand-cyan hover:underline font-bold"
                    >
                      재시도
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">활동 시간대</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTimeOfDay('morning')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                        timeOfDay === 'morning'
                          ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan shadow-cyan-glow'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      오전 🌅
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeOfDay('afternoon')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                        timeOfDay === 'afternoon'
                          ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      오후 🌃
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">오전 선택 시 아침 러닝으로 인정</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">러닝 거리 (km)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1" 
                      value={runDistance} 
                      onChange={(e) => setRunDistance(e.target.value)}
                      placeholder="예: 5.0"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm focus:border-brand-cyan focus:outline-none pr-8 font-semibold text-white font-mono"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">km</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">활동 날짜</label>
                  <input 
                    type="date" 
                    value={runDate} 
                    onChange={(e) => setRunDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm focus:border-brand-cyan focus:outline-none text-white font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">달린 시간 (분)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={runDuration} 
                      onChange={(e) => setRunDuration(e.target.value)}
                      placeholder="예: 30"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm focus:border-brand-cyan focus:outline-none pr-8 font-semibold text-white font-mono"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">분</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="block font-semibold text-slate-300">💡 시뮬레이션 규칙 힌트:</span>
                <span>• 거리 5km 이상 혹은 30분 이상일 때 숙제로 인정됩니다.</span>
                <span>• 아침 러닝 조건으로 업로드 시 아침 카운트와 총 카운트가 함께 1씩 증가합니다.</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl text-sm font-semibold transition"
              >
                취소
              </button>
              <button 
                onClick={submitRunAuth}
                className="flex-1 bg-gradient-to-r from-brand-neon to-[#2ECC71] text-brand-black hover:brightness-110 py-2.5 rounded-xl text-sm font-bold transition shadow-neon-glow"
              >
                인증 성공 등록!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
