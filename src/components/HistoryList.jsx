import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Eye, Award } from 'lucide-react';

export default function HistoryList({ histories }) {
  const [selectedHistory, setSelectedHistory] = useState(null);

  return (
    <div className="glass-panel rounded-2xl p-6 border-slate-800 space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
          📸 주간 인증 히스토리 피드
        </h3>
        <p className="text-sm text-slate-400">
          지인들이 인증한 생생한 가민 & 스트라바 캡처 숙제 보관함입니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {histories.map((history) => (
          <div 
            key={history.id} 
            className="bg-brand-charcoal border border-slate-800 rounded-xl overflow-hidden hover:border-brand-neon/40 transition group flex flex-col justify-between"
          >
            {/* Garmin Watch Face Simulated in CSS/SVG */}
            <div className="bg-slate-950 p-6 flex justify-center items-center border-b border-slate-900 relative">
              <div className="w-32 h-32 rounded-full border-4 border-slate-700 bg-slate-900 shadow-lg flex flex-col justify-center items-center relative overflow-hidden">
                {/* Garmin Bezel Markings */}
                <div className="absolute inset-1 rounded-full border border-slate-800" />
                <div className="absolute top-1 text-[7px] text-slate-500 font-bold font-mono tracking-widest">GARMIN</div>
                
                {/* Watch face stats */}
                <span className="text-[9px] text-brand-neon font-bold font-outfit uppercase mt-2">RUNNING</span>
                <span className="text-2xl font-extrabold font-outfit text-white leading-none my-1">{history.distance.toFixed(1)}</span>
                <span className="text-[8px] text-slate-400 font-medium uppercase font-outfit">KILOMETERS</span>
                
                <div className="flex gap-2.5 mt-2 border-t border-slate-800 pt-1.5 w-4/5 justify-center">
                  <div className="text-center">
                    <span className="text-[8px] text-slate-500 block font-mono">TIME</span>
                    <span className="text-[9px] font-bold text-slate-300 font-mono">{history.duration}m</span>
                  </div>
                  <div className="border-r border-slate-800" />
                  <div className="text-center">
                    <span className="text-[8px] text-slate-500 block font-mono">PACE</span>
                    <span className="text-[9px] font-bold text-slate-300 font-mono">5'30"</span>
                  </div>
                </div>
              </div>

              {/* Verified Badge */}
              <span className="absolute top-3 right-3 bg-brand-neon/15 border border-brand-neon/30 text-brand-neon text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-neon-glow">
                <Award size={10} /> VERIFIED
              </span>
            </div>

            {/* Run details */}
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{history.avatar}</span>
                <div>
                  <span className="text-sm font-bold text-white block">{history.name}</span>
                  <span className="text-[10px] text-slate-400">
                    {history.isMorning ? (
                      <span className="text-brand-cyan font-semibold">⚡️ 아침 러닝 성공</span>
                    ) : (
                      <span className="text-slate-400">🏃‍♂️ 일반 달리기</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800/60 pt-3">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Calendar size={13} className="text-slate-500" />
                  <span>{history.date}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 justify-end">
                  <Clock size={13} className="text-slate-500" />
                  <span>{history.time}</span>
                </div>
              </div>
            </div>

            {/* View Details button */}
            <div className="px-4 pb-4">
              <button 
                onClick={() => setSelectedHistory(history)}
                className="w-full bg-slate-800 hover:bg-brand-cyan hover:text-brand-black text-slate-300 text-xs font-semibold py-2 rounded-lg transition flex items-center justify-center gap-1.5 group-hover:shadow-cyan-glow"
              >
                <Eye size={13} /> 인증 원본 자세히 보기
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 인증 상세 보기 모달 */}
      {selectedHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="glass-panel max-w-lg w-full rounded-2xl p-6 border-slate-700 shadow-2xl relative">
            <button 
              onClick={() => setSelectedHistory(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold p-1"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">{selectedHistory.avatar}</span>
              <div>
                <h3 className="font-extrabold text-lg text-white">{selectedHistory.name}의 인증 숙제</h3>
                <p className="text-xs text-slate-400">{selectedHistory.date} | {selectedHistory.time} 제출</p>
              </div>
            </div>

            {/* Garmin Simulated Large Watch face */}
            <div className="bg-slate-950/80 rounded-xl p-8 border border-slate-800 flex flex-col items-center justify-center mb-6">
              <div className="w-48 h-48 rounded-full border-8 border-slate-700 bg-slate-900 shadow-2xl flex flex-col justify-center items-center relative">
                <div className="absolute top-2 text-[10px] text-slate-500 font-bold font-mono tracking-widest">GARMIN</div>
                
                <span className="text-xs text-brand-neon font-bold font-outfit uppercase mt-3">RUNNING</span>
                <span className="text-4xl font-extrabold font-outfit text-white leading-none my-1">{selectedHistory.distance.toFixed(2)}</span>
                <span className="text-[9px] text-slate-400 font-medium uppercase font-outfit">KILOMETERS</span>
                
                <div className="flex gap-4 mt-3 border-t border-slate-800 pt-3 w-4/5 justify-center">
                  <div className="text-center">
                    <span className="text-[9px] text-slate-500 block font-mono">DURATION</span>
                    <span className="text-xs font-bold text-slate-300 font-mono">{selectedHistory.duration}m 12s</span>
                  </div>
                  <div className="border-r border-slate-800" />
                  <div className="text-center">
                    <span className="text-[9px] text-slate-500 block font-mono">PACE</span>
                    <span className="text-xs font-bold text-slate-300 font-mono">5'18" /km</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-4">GARMIN CONNECT™ AUTHSYNC VERIFIED</p>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 space-y-2 border border-slate-800 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">운동 인정 상태</span>
                <span className="font-semibold text-brand-neon">성공 (30분 이상 / 5km 만족)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">아침 러닝 여부</span>
                <span>
                  {selectedHistory.isMorning ? (
                    <span className="font-semibold text-brand-cyan">예 (오전 07시 30분 활동 시작)</span>
                  ) : (
                    <span className="text-slate-400">아니오</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">집계 기간 반영</span>
                <span>매주 토~금 오전 정오 12:00 기준 충족</span>
              </div>
            </div>

            <button 
              onClick={() => setSelectedHistory(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-sm mt-6 transition"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
