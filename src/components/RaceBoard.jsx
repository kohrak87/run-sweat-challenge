import React from 'react';
import { ShieldAlert, Trophy, Bomb, DollarSign, Award } from 'lucide-react';

export default function RaceBoard({ members, currentUserId }) {
  // Sort members by performance (descending order) to compute ranks
  const sortedMembers = [...members].sort((a, b) => {
    // 100% completion (immunity) gets prioritized
    const aImmunity = a.morningRuns >= 3 || a.totalRuns >= 4;
    const bImmunity = b.morningRuns >= 3 || b.totalRuns >= 4;
    
    if (aImmunity && !bImmunity) return -1;
    if (!aImmunity && bImmunity) return 1;

    // Otherwise compare total runs, then morning runs
    if (a.totalRuns !== b.totalRuns) {
      return b.totalRuns - a.totalRuns;
    }
    return b.morningRuns - a.morningRuns;
  });

  return (
    <div className="glass-panel rounded-2xl p-6 border-slate-800 space-y-8">
      <div>
        <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
          🏃‍♂️ FNR 뒷풀이 쏘기 독박 레이스
        </h3>
        <p className="text-sm text-slate-400">
          달성률이 높을수록 피니시 라인으로 질주합니다. 꼴찌는 금요일 뒷풀이 독박 확정! 💸
        </p>
      </div>

      {/* 육상 트랙 비주얼 레이스 보드 */}
      <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-900 relative overflow-hidden">
        {/* Finish Line Indicator */}
        <div className="absolute right-12 top-0 bottom-0 w-1 border-r-2 border-dashed border-brand-neon/40 flex items-center justify-center">
          <div className="bg-brand-neon/20 text-brand-neon text-[9px] font-bold px-1.5 py-0.5 rounded rotate-90 origin-center whitespace-nowrap tracking-wider">
            FINISH (면제)
          </div>
        </div>

        {/* Tracks */}
        <div className="space-y-6 my-2">
          {members.map((member, index) => {
            // Calculate progress percent
            // Criteria: morning >= 3 OR total >= 4
            const morningProgress = member.morningRuns / 3;
            const totalProgress = member.totalRuns / 4;
            const overallProgress = Math.max(morningProgress, totalProgress);
            const isImmune = member.morningRuns >= 3 || member.totalRuns >= 4;
            
            // Limit to max 100%
            const progressPercent = Math.min(overallProgress * 100, 100);
            
            // Adjust position slightly to keep avatar inside track bounds (leaving space for finish line)
            const positionLeft = `calc(${progressPercent}% * 0.8)`;

            return (
              <div key={member.id} className="relative h-12 border-b border-slate-900/60 last:border-b-0 flex items-center">
                {/* Lane number */}
                <span className="text-[10px] font-mono text-slate-600 font-bold w-6">LANE {index + 1}</span>
                
                {/* Track Line background */}
                <div className="absolute left-8 right-12 h-1 bg-slate-900 rounded-full top-1/2 transform -translate-y-1/2" />
                
                {/* Running Avatar Container */}
                <div 
                  className="absolute flex items-center gap-2 transition-all duration-700 ease-out z-10"
                  style={{ left: `calc(2rem + ${positionLeft})` }}
                >
                  {/* Runner character icon based on status */}
                  <div className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    isImmune 
                      ? 'bg-brand-neon/15 border-brand-neon text-brand-neon shadow-neon-glow' 
                      : progressPercent < 50 
                        ? 'bg-brand-red/10 border-brand-red/60 text-brand-red animate-danger-pulse' 
                        : 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan'
                  }`}>
                    <span className="text-base select-none">{member.avatar}</span>
                    
                    {/* Penalty status overlay */}
                    {!isImmune && progressPercent < 50 && (
                      <span className="absolute -top-2 -right-2 bg-brand-red text-white p-0.5 rounded-full text-[8px] animate-bounce">
                        <Bomb size={10} />
                      </span>
                    )}
                    
                    {isImmune && (
                      <span className="absolute -top-2 -right-2 bg-brand-neon text-brand-black p-0.5 rounded-full text-[8px]">
                        <Award size={10} />
                      </span>
                    )}
                  </div>
                  
                  {/* Name banner */}
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold ${member.id === currentUserId ? 'text-brand-neon font-black' : 'text-slate-200'}`}>
                      {member.name} {member.id === currentUserId && '(나)'}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      AM {member.morningRuns}/3 | TOT {member.totalRuns}/4
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 실시간 생존 랭킹 */}
      <div>
        <h4 className="text-sm font-semibold text-slate-300 mb-3">⚠️ 실시간 생존 서열 현황</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedMembers.map((member, idx) => {
            const isImmune = member.morningRuns >= 3 || member.totalRuns >= 4;
            return (
              <div 
                key={member.id} 
                className={`flex items-center justify-between p-3.5 rounded-xl border ${
                  isImmune 
                    ? 'bg-brand-neon/5 border-brand-neon/20' 
                    : 'bg-brand-charcoal/40 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-outfit font-bold text-slate-500 w-4 text-center">#{idx + 1}</span>
                  <span className="text-xl">{member.avatar}</span>
                  <div>
                    <span className="text-sm font-semibold block">
                      {member.name} {member.id === currentUserId && <span className="text-[10px] text-brand-neon bg-brand-neon/15 px-1.5 py-0.2 rounded ml-1">Me</span>}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      아침인증 {member.morningRuns}회 / 총 {member.totalRuns}회
                    </span>
                  </div>
                </div>

                <div>
                  {isImmune ? (
                    <span className="text-xs font-bold text-brand-neon flex items-center gap-1 bg-brand-neon/10 px-2.5 py-1 rounded-full">
                      <Trophy size={12} /> 생존 완료
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-brand-red flex items-center gap-1 bg-brand-red/10 px-2.5 py-1 rounded-full animate-pulse">
                      <DollarSign size={12} /> 뒷풀이 독박위험
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
