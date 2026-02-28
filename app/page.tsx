'use client';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as psychrolib from 'psychrolib';

// --- 初始静态数据 ---
const INITIAL_AHU_DATA = [
  { id: 'AHU-01', visible: true, r: { t: 26.0, rh: 57 }, o: { t: 13.3, rh: 87 }, s: { t: 15.3, rh: 90 }, load: 5.9, loadType: 'HEATING', gain: 16.5 },
  { id: 'AHU-02', visible: true, r: { t: 25.7, rh: 53 }, o: { t: 11.6, rh: 77 }, s: { t: 16.2, rh: 94 }, load: 15.5, loadType: 'HEATING', gain: 10.0 },
  { id: 'AHU-03', visible: true, r: { t: 23.0, rh: 42 }, o: { t: 14.1, rh: 77 }, s: { t: 12.7, rh: 80 }, load: -0.1, loadType: 'COOLING', gain: 8.2 },
];

// --- Givoni 舒适区定义 (温度, 含湿量) ---
const COMFORT_POLYGON = [[20, 5], [26, 5], [28, 11], [22, 11]];

export default function AHUDashboard() {
  const [ahuData, setAhuData] = useState(INITIAL_AHU_DATA);
  const [overlay, setOverlay] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isSimulating, setIsSimulating] = useState(true);

  useEffect(() => {
    setMounted(true);
    psychrolib.SetUnitSystem(psychrolib.SI);
  }, []);

  // --- 射线法判断点是否在多边形内 ---
  const isInside = (point: number[], vs: number[][]) => {
    let x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      let xi = vs[i][0], yi = vs[i][1];
      let xj = vs[j][0], yj = vs[j][1];
      let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  useEffect(() => {
    if (!mounted || !isSimulating) return;
    const interval = setInterval(() => {
      setAhuData(currentData => currentData.map(ahu => {
        const drift = () => (Math.random() - 0.5) * 0.4;
        const nextR = { t: ahu.r.t + drift(), rh: Math.max(20, Math.min(95, ahu.r.rh + drift() * 8)) };
        const nextO = { t: ahu.o.t + drift(), rh: Math.max(20, Math.min(95, ahu.o.rh + drift() * 8)) };
        const nextS = { t: ahu.s.t + drift(), rh: Math.max(20, Math.min(95, ahu.s.rh + drift() * 8)) };
        
        // 计算物理点坐标用于判断
        const p_ws = psychrolib.GetSatVapPres(nextR.t);
        const wR = psychrolib.GetHumRatioFromVapPres((nextR.rh/100)*p_ws, 101325)*1000;
        const isAlarm = !isInside([nextR.t, wR], COMFORT_POLYGON);

        const newLoad = (nextS.t - nextO.t) * 1.2;
        const newGain = (nextR.t - nextS.t) * 1.5;
        
        return { 
          ...ahu, 
          r: nextR, o: nextO, s: nextS, 
          load: parseFloat(newLoad.toFixed(1)), 
          loadType: newLoad >= 0 ? 'HEATING' : 'COOLING', 
          gain: parseFloat(newGain.toFixed(1)),
          alarm: isAlarm 
        };
      }));
    }, 1200);
    return () => clearInterval(interval);
  }, [mounted, isSimulating]);

  const getPoint = (t: number, rh: number) => {
    const p_ws = psychrolib.GetSatVapPres(t);
    const w = psychrolib.GetHumRatioFromVapPres((rh / 100) * p_ws, 101325) * 1000;
    return { x: t, y: w };
  };

  const option = useMemo(() => {
    if (!mounted) return {};
    const satData = [];
    for (let i = 0; i <= 45; i++) {
      const w = psychrolib.GetHumRatioFromVapPres(psychrolib.GetSatVapPres(i), 101325) * 1000;
      satData.push([i, w]);
    }

    return {
      backgroundColor: 'transparent',
      animationDuration: 800,
      grid: { top: 40, right: 60, bottom: 60, left: 50 },
      xAxis: { type: 'value', min: 0, max: 45, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, axisLabel: { color: '#666' } },
      yAxis: { type: 'value', min: 0, max: 20, position: 'right', splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }, axisLabel: { color: '#666' } },
      series: [
        { type: 'line', data: satData, showSymbol: false, lineStyle: { color: '#444', width: 1 }, z: 1 },
        ...(overlay ? [{
          type: 'custom',
          renderItem: (params: any, api: any) => ({
            type: 'polygon',
            shape: { points: COMFORT_POLYGON.map(p => api.coord(p)) },
            style: { fill: 'rgba(54, 211, 153, 0.1)', stroke: 'rgba(54, 211, 153, 0.3)', lineWidth: 1 }
          }),
          data: [0]
        }] : []),
        ...ahuData.filter(d => d.visible).flatMap(ahu => {
          const r = getPoint(ahu.r.t, ahu.r.rh);
          const o = getPoint(ahu.o.t, ahu.o.rh);
          const s = getPoint(ahu.s.t, ahu.s.rh);
          const color = ahu.id === 'AHU-01' ? '#7B61FF' : (ahu.id === 'AHU-02' ? '#3B82F6' : '#10B981');
          return [{
            name: ahu.id, type: 'line', data: [[o.x, o.y], [s.x, s.y], [r.x, r.y]],
            lineStyle: { color, width: 2 }, symbol: 'circle', symbolSize: 6,
            label: { show: true, position: 'top', color: '#fff', fontSize: 10, formatter: (p:any) => ['O','S','R'][p.dataIndex] }
          }];
        })
      ]
    };
  }, [ahuData, overlay, mounted]);

  if (!mounted) return null;

  return (
    <div style={{ height: '100vh', backgroundColor: '#121418', color: '#E0E6ED', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      
      <header style={{ height: '60px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.5px' }}>MULTI-AHU MONITORING</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px' }}>GIVONI COMFORT COMPLIANCE</div>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ fontSize: '10px', color: isSimulating ? '#36D399' : '#F43F5E', fontWeight: 'bold' }}>{isSimulating ? '● REAL-TIME STREAMING' : '● SYSTEM PAUSED'}</div>
          <button onClick={() => setOverlay(!overlay)} style={{ backgroundColor: overlay ? '#7B61FF' : 'transparent', border: '1px solid #7B61FF', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>ZONES: {overlay ? 'ON' : 'OFF'}</button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside style={{ width: '320px', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '20px', overflowY: 'auto' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginBottom: '20px', letterSpacing: '1px' }}>UNIT STATUS LIST</div>
          
          {ahuData.map((ahu, idx) => (
            <div key={ahu.id} style={{ 
              backgroundColor: ahu.alarm ? 'rgba(244, 63, 94, 0.15)' : '#1E2228', 
              borderRadius: '12px', padding: '16px', marginBottom: '16px', 
              border: `1px solid ${ahu.alarm ? '
