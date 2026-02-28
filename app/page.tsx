'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as psychrolib from 'psychrolib';

// --- 初始静态数据 ---
const INITIAL_AHU_DATA = [
  { id: 'AHU-01', visible: true, r: { t: 26.0, rh: 57 }, o: { t: 13.3, rh: 87 }, s: { t: 15.3, rh: 90 }, load: 5.9, loadType: 'HEATING', gain: 16.5 },
  { id: 'AHU-02', visible: true, r: { t: 25.7, rh: 53 }, o: { t: 11.6, rh: 77 }, s: { t: 16.2, rh: 94 }, load: 15.5, loadType: 'HEATING', gain: 10.0 },
  { id: 'AHU-03', visible: true, r: { t: 23.0, rh: 42 }, o: { t: 14.1, rh: 77 }, s: { t: 12.7, rh: 80 }, load: -0.1, loadType: 'COOLING', gain: 8.2 },
];

export default function AHUDashboard() {
  const [ahuData, setAhuData] = useState(INITIAL_AHU_DATA);
  const [overlay, setOverlay] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // 模拟器开关
  const [isSimulating, setIsSimulating] = useState(true);

  useEffect(() => {
    setMounted(true);
    psychrolib.SetUnitSystem(psychrolib.SI);
  }, []);

  // --- 核心模拟逻辑引擎 ---
  useEffect(() => {
    if (!mounted || !isSimulating) return;

    const interval = setInterval(() => {
      setAhuData(currentData => currentData.map(ahu => {
        // 为每个传感器添加随机微调 (-0.1 ~ 0.1)
        const drift = () => (Math.random() - 0.5) * 0.2;
        
        const nextR = { t: ahu.r.t + drift(), rh: Math.max(30, Math.min(95, ahu.r.rh + drift() * 5)) };
        const nextO = { t: ahu.o.t + drift(), rh: Math.max(30, Math.min(95, ahu.o.rh + drift() * 5)) };
        const nextS = { t: ahu.s.t + drift(), rh: Math.max(30, Math.min(95, ahu.s.rh + drift() * 5)) };

        // 重新计算负载逻辑 (简化版焓差模拟)
        const newLoad = (nextS.t - nextO.t) * 1.2; // 模拟加热/冷却负载
        const newGain = (nextR.t - nextS.t) * 1.5; // 模拟房间吸收热量

        return {
          ...ahu,
          r: nextR, o: nextO, s: nextS,
          load: parseFloat(newLoad.toFixed(1)),
          loadType: newLoad >= 0 ? 'HEATING' : 'COOLING',
          gain: parseFloat(newGain.toFixed(1))
        };
      }));
    }, 1500);

    return () => clearInterval(interval);
  }, [mounted, isSimulating]);

  // 计算坐标点函数
  const getPoint = (t: number, rh: number) => {
    try {
      const p = 101325;
      const p_ws = psychrolib.GetSatVapPres(t);
      const w = psychrolib.GetHumRatioFromVapPres((rh / 100) * p_ws, p) * 1000;
      return { x: t, y: w };
    } catch { return { x: t, y: 0 }; }
  };

  const option = useMemo(() => {
    if (!mounted) return {};

    // 饱和曲线
    const satData = [];
    for (let i = 0; i <= 45; i++) {
      const p_ws = psychrolib.GetSatVapPres(i);
      const w = psychrolib.GetHumRatioFromVapPres(p_ws, 101325) * 1000;
      satData.push([i, w]);
    }

    // Givoni Comfort Zone (典型办公舒适区)
    const comfortZone = [[20, 5], [26, 5], [28, 11], [22, 11], [20, 5]];

    return {
      backgroundColor: 'transparent',
      animationDuration: 1000,
      tooltip: { 
        trigger: 'item', 
        backgroundColor: '#1E2228', 
        borderColor: '#333', 
        textStyle: { color: '#eee', fontSize: 11 },
        formatter: (params: any) => `${params.seriesName}<br/>Temp: ${params.data[0].toFixed(1)}°C<br/>Ratio: ${params.data[1].toFixed(2)} g/kg`
      },
      grid: { top: 40, right: 60, bottom: 60, left: 50 },
      xAxis: { 
        type: 'value', min: 0, max: 45, name: 'Temp (°C)', 
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: '#666' }
      },
      yAxis: { 
        type: 'value', min: 0, max: 20, position: 'right', name: 'g/kg',
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: '#666' }
      },
      series: [
        { type: 'line', data: satData, showSymbol: false, lineStyle: { color: '#444', width: 1 }, z: 1 },
        ...(overlay ? [{
          type: 'custom',
          renderItem: (params: any, api: any) => ({
            type: 'polygon',
            shape: { points: comfortZone.map(p => api.coord(p)) },
            style: { fill: 'rgba(54, 211, 153, 0.1)', stroke: 'rgba(54, 211, 153, 0.3)', lineWidth: 1 }
          }),
          data: [0], silent: true
        }] : []),
        ...ahuData.filter(d => d.visible).flatMap(ahu => {
          const r = getPoint(ahu.r.t, ahu.r.rh);
          const o = getPoint(ahu.o.t, ahu.o.rh);
          const s = getPoint(ahu.s.t, ahu.s.rh);
          const color = ahu.id === 'AHU-01' ? '#7B61FF' : (ahu.id === 'AHU-02' ? '#3B82F6' : '#10B981');
          
          return [
            {
              name: ahu.id, type: 'line', data: [[o.x, o.y], [s.x, s.y], [r.x, r.y]],
              lineStyle: { color, width: 2, opacity: 0.8 },
              symbol: 'circle', symbolSize: 6,
              label: { show: true, position: 'top', color: '#fff', fontSize: 10, formatter: (p:any) => ['O','S','R'][p.dataIndex] }
            }
          ];
        })
      ]
    };
  }, [ahuData, overlay, mounted]);

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen bg-[#121418] text-[#E0E6ED] overflow-hidden font-sans">
      
      {/* Header */}
      <header className="h-[60px] border-b border-white/5 flex items-center justify-between px-6 bg-[#121418]">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tighter uppercase text-white/90">Multi-AHU Process Chart</span>
            <span className="text-[10px] text-white/30 font-mono tracking-widest">REAL-TIME DIAGNOSTICS v4.2</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex gap-2 items-center bg-white/5 px-3 py-1 rounded-full border border-white/10">
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Zones:</span>
            {['Comfort', 'Vent', 'Evap'].map(z => (
              <span key={z} className="text-[9px] px-1.5 py-0.5 rounded bg-[#36D399]/10 text-[#36D399] border border-[#36D399]/20 font-bold uppercase">{z}</span>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setOverlay(!overlay)}
              className={`px-4 py-1.5 rounded-md text-[10px] font-black transition-all border ${overlay ? 'bg-[#7B61FF] border-[#7B61FF] text-white' : 'bg-transparent border-white/20 text-white/40'}`}
            >
              GIVONI: {overlay ? 'ON' : 'OFF'}
            </button>
            <button 
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-black border ${isSimulating ? 'bg-[#36D399]/20 border-[#36D399]/40 text-[#36D399]' : 'bg-red-500/20 border-red-500/40 text-red-500'}`}
            >
              {isSimulating ? 'LIVE DATA' : 'PAUSED'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-[320px] border-r border-white/5 bg-[#121418] flex flex-col p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[11px] font-black tracking-[0.2em] text-white/40 uppercase">AHU LIVE STATE</h2>
            <div className="w-2 h-2 rounded-full bg-[#36D399] animate-pulse"></div>
          </div>

          <div className="space-y-3">
            {ahuData.map((ahu, idx) => (
              <div key={ahu.id} className={`bg-[#1E2228] border rounded-xl p-4 transition-all duration-500 ${ahu.visible ? 'border-white/10' : 'border-transparent opacity-40 grayscale'}`}>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-black tracking-wider">{ahu.id}</span>
                  <button 
                    onClick={() => {
                      const newData = [...ahuData];
                      newData[idx].visible = !newData[idx].visible;
                      setAhuData(newData);
                    }}
                    className="text-[9px] font-bold text-[#7B61FF] uppercase bg-[#7B61FF]/10 px-2 py-0.5 rounded border border-[#7B61FF]/20"
                  >
                    {ahu.visible ? 'Hide' : 'Show'}
                  </button>
                </div>

                {/* Sensor Progress Bars */}
                <div className="space-y-3">
                  {[
                    { label: 'R0'+(idx+1), color: '#F43F5E', val: ahu.r },
                    { label: 'O0'+(idx+1), color: '#3B82F6', val: ahu.o },
                    { label: 'S0'+(idx+1), color: '#10B981', val: ahu.s }
                  ].map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between text-[10px] mb-1 font-mono">
                        <span className="text-white/40">{s.label}</span>
                        <span className="font-bold">{s.val.t.toFixed(1)}°C / {Math.round(s.val.rh)}%</span>
                      </div>
                      <div className="h-[3px] bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full transition-all duration-1000" style={{ backgroundColor: s.color, width: `${(s.val.t / 40) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Energy Data */}
                <div className="grid grid-cols-2 gap-4 mt-5 pt-3 border-t border-white/5">
                  <div>
                    <div className="text-[8px] text-white/30 font-bold uppercase tracking-tighter">HVAC Load</div>
                    <div className={`text-[12px] font-black ${ahu.loadType === 'HEATING' ? 'text-orange-500' : 'text-cyan-500'}`}>
                      {ahu.load > 0 ? '+' : ''}{ahu.load} <small className="text-[8px] opacity-50">kJ</small>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] text-white/30 font-bold uppercase tracking-tighter">Room Gain</div>
                    <div className="text-[12px] font-black text-[#36D399]">
                      {ahu.gain} <small className="text-[8px] opacity-50">kJ</small>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Visualization */}
        <main className="flex-1 bg-[#0D0F12] p-6 relative">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          
          <div className="flex justify-between items-center mb-4 relative z-10">
             <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-[#7B61FF]"></div>
                <h2 className="text-sm font-black uppercase tracking-widest text-white/80">Psychrometric Analysis</h2>
             </div>
             <span className="text-[10px] font-mono text-white/20">GRID_SCALE: 1:1 // UNIT_SI</span>
          </div>
          
          <div className="w-full h-[calc(100%-40px)] bg-[#121418]/60 rounded-2xl border border-white/5 p-4 backdrop-blur-md relative z-10">
             <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} />
          </div>

          {/* Technical Branding */}
          <div className="absolute bottom-10 left-10 text-white/5 font-black text-[100px] pointer-events-none select-none italic tracking-tighter">
            INDUSTRIAL AI
          </div>
        </main>
      </div>
    </div>
  );
}
