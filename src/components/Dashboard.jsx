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

  // OCR analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [aiDetected, setAiDetected] = useState(false);
  const [ocrRawText, setOcrRawText] = useState('');
  const [showDebugText, setShowDebugText] = useState(false);

  const loadTesseract = () => {
    return new Promise((resolve, reject) => {
      if (window.Tesseract) {
        resolve(window.Tesseract);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/tesseract.js@5.0.5/dist/tesseract.min.js';
      script.onload = () => resolve(window.Tesseract);
      script.onerror = (err) => reject(new Error('Tesseract OCR 엔진 로드 실패'));
      document.head.appendChild(script);
    });
  };

  const preprocessImageForOcr = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scaleSize = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
          canvas.width = img.width * scaleSize;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          let darkPixels = 0;
          const totalPixels = data.length / 4;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            const luma = 0.299 * r + 0.587 * g + 0.114 * b;
            if (luma < 128) darkPixels++;
          }
          
          const isDarkMode = (darkPixels / totalPixels) > 0.5;
          
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            
            let v = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Contrast stretching
            if (v > 200) v = 255;
            else if (v < 50) v = 0;
            else {
              v = ((v - 50) / 150) * 255;
            }
            
            if (isDarkMode) {
              v = 255 - v;
            }
            
            data[i] = v;
            data[i+1] = v;
            data[i+2] = v;
          }
          
          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
      };
    });
  };

  const analyzeImageWithTesseract = async (file) => {
    setIsAnalyzing(true);
    setAnalysisError('');
    setAiDetected(false);
    setOcrRawText('');

    try {
      console.log("Preprocessing image for OCR...");
      let processedImgUrl = file;
      try {
        processedImgUrl = await preprocessImageForOcr(file);
      } catch (prepErr) {
        console.warn("Image preprocessing failed, using original file:", prepErr);
      }

      const Tesseract = await loadTesseract();
      let rawText = '';
      
      try {
        console.log("Attempting OCR with eng+kor...");
        // Use eng+kor to recognize both Korean characters and numbers/English
        const result = await Tesseract.recognize(processedImgUrl, 'eng+kor');
        rawText = result.data.text;
      } catch (ocrErr) {
        console.warn("OCR with eng+kor failed, retrying with eng only...", ocrErr);
        const result = await Tesseract.recognize(processedImgUrl, 'eng');
        rawText = result.data.text;
      }

      console.log("OCR Raw Text:", rawText);
      setOcrRawText(rawText);

      if (!rawText || rawText.trim().length === 0) {
        throw new Error("이미지에서 텍스트를 판독하지 못했습니다.");
      }

      // 1. 날짜 파싱 및 시계 시간 제외 목록 구축
      // 날짜 포맷 예: 2026/6/10 또는 2026-6-10 또는 2026.6.10
      const dateClockRegex = /(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})\s*(?:\([^)]+\))?\s*(\d{1,2})[:;.,\s_-](\d{2})/g;
      let dateClockMatch;
      let ignoredTimes = [];
      let detectedDate = null;

      while ((dateClockMatch = dateClockRegex.exec(rawText)) !== null) {
        const yyyy = dateClockMatch[1];
        const mm = String(parseInt(dateClockMatch[2])).padStart(2, '0');
        const dd = String(parseInt(dateClockMatch[3])).padStart(2, '0');
        detectedDate = `${yyyy}-${mm}-${dd}`;
        
        // 날짜 바로 뒤에 붙은 시계 시간(예: 09:19)을 무시 목록에 추가
        const clockHour = parseInt(dateClockMatch[4]);
        const clockMin = parseInt(dateClockMatch[5]);
        ignoredTimes.push(`${clockHour}:${clockMin}`);
        ignoredTimes.push(`${String(clockHour).padStart(2, '0')}:${String(clockMin).padStart(2, '0')}`);
      }

      // 날짜 단독 포맷 매칭 (시계 시간이 없는 경우)
      if (!detectedDate) {
        const dateRegex = /(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/g;
        const dateMatch = dateRegex.exec(rawText);
        if (dateMatch) {
          const yyyy = dateMatch[1];
          const mm = String(parseInt(dateMatch[2])).padStart(2, '0');
          const dd = String(parseInt(dateMatch[3])).padStart(2, '0');
          detectedDate = `${yyyy}-${mm}-${dd}`;
        }
      }

      // 2. 거리 파싱 (단위 km, KM, mi, MI 계열 필수 매칭)
      // 보폭(m)이나 고도(m) 등 엉뚱한 값 차단을 위해 m 단독 매칭 제거
      const distRegex = /(\d+(?:[\s\.,_]\d+)?)\s*(km|KM|Km|lkm|krn|kin|mi|MI|Mi)\b/gi;
      let distCandidates = [];
      let match;
      
      while ((match = distRegex.exec(rawText)) !== null) {
        const valStr = match[1].replace(/[\s_,]/g, '.');
        const val = parseFloat(valStr);
        if (!isNaN(val) && val > 0 && val < 100) {
          distCandidates.push(val);
        }
      }

      let distance = null;
      if (distCandidates.length > 0) {
        distance = distCandidates[0];
      }

      // 3. 시간 파싱 (hh:mm:ss 또는 mm:ss 형태)
      const mmssRegex = /\b(\d{1,2})\s*([:;.,\s_-])\s*(\d{2})\b/g;
      let durCandidates = [];

      while ((match = mmssRegex.exec(rawText)) !== null) {
        const val1 = parseInt(match[1]);
        const val2 = parseInt(match[3]); // match[2] is the separator, match[3] is the seconds/minutes
        const fullMatch = match[0];
        const index = match.index;
        
        // 날짜와 결합된 시계 시간(오전/오후 촬영 시각)은 제외
        const timeStr = `${val1}:${val2}`;
        const paddedTimeStr = `${String(val1).padStart(2, '0')}:${String(val2).padStart(2, '0')}`;
        if (ignoredTimes.includes(timeStr) || ignoredTimes.includes(paddedTimeStr)) {
          continue;
        }

        // 페이스 정보(/km, min/km, ', ") 제외 (인접한 경우 오인 방지를 위해 첫글자 검사 포함)
        const afterMatch = rawText.substring(index + fullMatch.length);
        const trimmedAfter = afterMatch.trim();
        const firstCharAfter = trimmedAfter.length > 0 ? trimmedAfter[0] : '';
        if (
          firstCharAfter === '/' || 
          firstCharAfter === '"' || 
          firstCharAfter === "'" || 
          trimmedAfter.toLowerCase().startsWith('min') || 
          trimmedAfter.toLowerCase().startsWith('pace')
        ) {
          continue;
        }

        // 특정 단위 제외 (기온, 심박수 등)
        const contextAfter = rawText.substring(index + fullMatch.length, index + fullMatch.length + 15).toLowerCase();
        const isExcludedUnit = /[%°c|deg|spm|bpm|kcal|watts|ml|ms|cm]/i.test(contextAfter);
        if (isExcludedUnit) {
          continue;
        }

        const totalMin = val1 + val2 / 60;
        if (totalMin > 5 && totalMin < 300) {
          durCandidates.push(totalMin);
        }
      }

      // 4. XX분/XXmin 형태 추가 매칭
      const textMinRegex = /(\d+)\s*(?:min|minute|minutes|분)\b/gi;
      while ((match = textMinRegex.exec(rawText)) !== null) {
        const val = parseInt(match[1]);
        if (val > 5 && val < 300) {
          durCandidates.push(val);
        }
      }

      // 시간 정보 추출
      let duration = null;
      if (durCandidates.length > 0) {
        // 만약 거리가 있다면, 페이스가 합리적(3.0 ~ 15.0 min/km)인 시간대 후보군을 최우선 선택
        if (distance) {
          let bestDur = null;
          for (let dur of durCandidates) {
            const pace = dur / distance;
            if (pace >= 3.0 && pace <= 15.0) {
              bestDur = dur;
              break;
            }
          }
          duration = bestDur ? Math.round(bestDur) : Math.round(durCandidates[0]);
        } else {
          duration = Math.round(durCandidates[0]);
        }
      }

      // 5. 활동 시간대 판별 (오전 05:00 ~ 09:00 사이인지 체크)
      let timeOfDayVal = 'afternoon';
      const isMorningText = /am|오전|morning/i.test(rawText);
      
      // 날짜 옆에서 검출된 시작 시각(시계 시간)을 바탕으로 오전 5~9시 사이 여부 판별
      if (ignoredTimes.length > 0) {
        const firstClock = ignoredTimes[0]; // e.g. "09:19"
        const hour = parseInt(firstClock.split(':')[0]);
        if (hour >= 5 && hour <= 9) {
          timeOfDayVal = 'morning';
        }
      } else if (isMorningText) {
        timeOfDayVal = 'morning';
      }

      let detected = false;
      if (distance) {
        setRunDistance(String(distance.toFixed(2)));
        detected = true;
      }
      if (duration) {
        setRunDuration(String(duration));
        detected = true;
      }
      if (detectedDate) {
        setRunDate(detectedDate);
      }
      setTimeOfDay(timeOfDayVal);

      if (detected) {
        setAiDetected(true);
      } else {
        throw new Error("이미지에서 달리기 거리(km) 또는 시간(분)을 추출하지 못했습니다. 아래 폼에서 수동 기입 후 등록해 주세요.");
      }
    } catch (err) {
      console.error("OCR analysis error:", err);
      setOcrRawText(err.message || "이미지 분석 도중 오류가 발생했습니다.");
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
        analyzeImageWithTesseract(uploadFile);
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
              <Activity className="text-brand-cyan" /> 🔍 러닝 인증샷 AI 자동 분석
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="border border-slate-750 bg-slate-800/50 rounded-xl p-3.5 text-center">
                <p className="text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">업로드된 파일</p>
                <p className="font-mono text-xs font-semibold text-brand-cyan truncate">{uploadFile?.name}</p>
              </div>

              {/* Tesseract OCR AI Status Box */}
              {isAnalyzing ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
                  <div>
                    <p className="text-xs text-slate-200 font-bold">인공지능 이미지 분석 엔진 동작 중...</p>
                    <p className="text-[10px] text-slate-500 mt-1">스크린샷 속 달리기 거리, 시간 정보를 판독하고 있습니다.</p>
                  </div>
                </div>
              ) : aiDetected ? (
                <div className="bg-brand-neon/5 border border-brand-neon/20 rounded-xl p-3 text-xs flex justify-between items-center animate-pulse">
                  <span className="text-brand-neon font-medium flex items-center gap-1.5">
                    ✅ AI 이미지 분석 성공! 판독 데이터가 자동 입력되었습니다.
                  </span>
                </div>
              ) : analysisError ? (
                <div className="bg-brand-red/5 border border-brand-red/20 rounded-xl p-3 text-xs space-y-1.5">
                  <p className="text-brand-red font-medium">⚠️ AI 분석 실패 (수동 입력 가능)</p>
                  <p className="text-[10px] text-slate-400 leading-normal">{analysisError}</p>
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => analyzeImageWithTesseract(uploadFile)}
                      className="text-[10px] text-brand-cyan hover:underline font-bold"
                    >
                      재시도
                    </button>
                  </div>
                </div>
              )}

              {/* OCR raw text debug panel */}
              {ocrRawText && (
                <div className="border border-slate-800 bg-slate-950/40 rounded-xl p-2.5 text-left">
                  <button
                    type="button"
                    onClick={() => setShowDebugText(!showDebugText)}
                    className="text-[10px] text-slate-500 hover:text-slate-400 font-bold flex justify-between w-full focus:outline-none"
                  >
                    <span className="flex items-center gap-1">⚙️ OCR 판독 디버그 텍스트</span>
                    <span>{showDebugText ? '닫기 ▲' : '열기 ▼'}</span>
                  </button>
                  {showDebugText && (
                    <div className="mt-2">
                      <p className="text-[9px] text-slate-500 mb-1 leading-normal">
                        * Tesseract OCR이 이미지에서 읽어 들인 원시 문자열입니다. 분석이 매끄럽지 않은 경우 오독된 문자를 확인할 수 있습니다.
                      </p>
                      <pre className="text-[9px] text-slate-400 font-mono max-h-36 overflow-y-auto whitespace-pre-wrap break-all p-2 bg-slate-900/60 border border-slate-800 rounded-lg">
                        {ocrRawText}
                      </pre>
                    </div>
                  )}
                </div>
              )}

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
