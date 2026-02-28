'use client';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as psychrolib from 'psychrolib';

// --- 类型定义 ---
interface AHUState {
  id: string;
  visible: boolean;
  r: { t: number; rh: number };
  o: { t: number; rh: number };
  s: { t: number; rh: number };
  load: number;
  alarm: boolean;
  aiPredict: number;
}

const INITIAL_AHU_DATA: AHUState[] = [
  { id: 'AHU-01', visible: true, r: { t: 26.0, rh: 57 }, o: { t: 13.3, rh: 87 }, s: { t: 15.3, rh: 90 }, load: 5.9, alarm: false, aiPredict: 0 },
  { id: 'AHU-02', visible: true, r: { t: 25.7, rh: 53 }, o: { t: 11.6, rh: 77 }, s: { t: 16.2, rh: 94 }, load: 15.5, alarm: false, aiPredict: 0 },
  { id: 'AHU-03', visible: true, r: { t: 23.0, rh: 42 }, o: { t: 14.1, rh: 77 }, s: { t: 12.7, rh: 80 }, load: -0.1, alarm: false, aiPredict: 0 },
];

const COMFORT_POLYGON = [[20, 5], [26, 5], [28, 11], [22, 11]];

export default function IntegratedDashboard() {
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'energy'>('diagnostics');
  const [ahuData, setAhuData] = useState<AHUState[]>(INITIAL_AHU_DATA);
  const [mounted, setMounted] = useState(false);
  const [metrics, setMetrics] = useState({ chillerCOP: 5.2, totalLoad: 45.5, savingPotential: 12 });

  useEffect(() => {
    setMounted(true);
    try { psychrolib.SetUnitSystem(psychrolib.SI); } catch (e) { console.error(e); }
  }, []);

  // 模拟数据引擎
  useEffect(() => {
    if (!mounted) return;
    const timer = setInterval(() => {
      // 更新 AHU 数据
      setAhuData(prev => prev.map(ahu => {
        const drift = () => (Math.random() - 0.5) * 0.4;
        const nextR = { t: ahu.r.t + drift(), rh: Math.max(20, Math.min(95, ahu.r.rh + drift() * 5)) };
        return { ...ahu, r: nextR, aiPredict: Math.floor(Math.random() * 100) };
      }));
      // 更新系统指标
      setMetrics({
        chillerCOP: +(5.0 + Math.random() * 0.5).toFixed(2),
        totalLoad: +(40 + Math.random() * 10).toFixed(1),
        savingPotential: Math.floor(10 + Math.random() * 5)
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [mounted]);

  const getPointW = (t: number, rh: number) => {
    try {
      const p_ws = psychrolib.GetSatVapPres(t);
      return psychrolib.GetHumRatioFromVapPres((rh / 100) * p_ws, 101325) * 1000;
    } catch { return 0; }
  };

  // --- 页面 A: 实时诊断渲染 ---
  const renderDiagnostics = () => (
    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', height: '100%' }}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto' }}>
        {ahuData.map(ahu => (
          <div key={ahu.id} style={{ background: '#161B22', padding: '15px', borderRadius: '10px', border: '1px solid #30363D' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#7B61FF' }}>{ahu.id}</span>
              <span style={{ fontSize: '10px', color: '#36D399' }}>LIVE</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, margin: '10px 0' }}>{ahu.r.t.toFixed(1)}°C</div>
            <div style={{ height: '2px', background: '#30363D', width: '100%', marginBottom: '10px' }}>
              <div style={{ height: '100%', background: '#7B61FF', width: `${ahu.aiPredict}%`, transition: 'width 1s ease' }} />
            </div>
            <div style={{ fontSize: '10px', color: '#8B949E' }}>AI PREDICTION: {ahu.aiPredict}% RISK</div>
          </div>
        ))}
      </aside>
      <main style={{ background: '#0D1117', borderRadius: '15px', padding: '20px', border: '1px solid #30363D', position: 'relative' }}>
        <div style={{ color: '#8B949E', fontSize: '12px', marginBottom: '15px' }}>▶ PSYCHROMETRIC PROJECTION ENGINE</div>
        <ReactECharts 
          option={{
            backgroundColor: 'transparent',
            xAxis: { type: 'value', min: 10, max: 40, splitLine: { lineStyle: { color: '#21262D' } } },
            yAxis: { type: 'value', min: 0, max: 20, position: 'right', splitLine: { lineStyle: { color: '#21262D' } } },
            series: ahuData.map(ahu => ({
              name: ahu.id, type: 'scatter', 
              data: [[ahu.r.t, getPointW(ahu.r.t, ahu.r.rh)]],
              symbolSize: 12, itemStyle: { color: '#7B61FF', shadowBlur: 10, shadowColor: '#7B61FF' }
            }))
          }} 
          style={{ height: '90%' }} 
        />
      </main>
    </div>
  );

  // --- 页面 B: 全系统能流平衡渲染 ---
  const renderEnergyFlow = () => (
    <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <div style={{ background: '#161B22', padding: '20px', borderRadius: '15px', border: '1px solid #30363D' }}>
          <div style={{ fontSize: '10px', color: '#8B949E', marginBottom: '5px' }}>SYSTEM COP</div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#36D399' }}>{metrics.chillerCOP}</div>
        </div>
        <div style={{ background: '#161B22', padding: '20px', borderRadius: '15px', border: '1px solid #30363D' }}>
          <div style={{ fontSize: '10px', color: '#8B949E', marginBottom: '5px' }}>TOTAL LOAD</div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#7B61FF' }}>{metrics.totalLoad} kW</div>
        </div>
        <div style={{ background: '#161B22', padding: '20px', borderRadius: '15px', border: '1px solid #7B61FF' }}>
          <div style={{ fontSize: '10px', color: '#7B61FF', fontWeight: 'bold', marginBottom: '5px' }}>SAV
