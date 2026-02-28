'use client';
import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import * as psychrolib from 'psychrolib';

// --- 常量定义 ---
const AHU_IDS = ['AHU-01', 'AHU-02', 'AHU-03'];

const COMFORT_ZONE = [
  { t: 22, w: 8 }, { t: 26, w: 8 }, { t: 28, w: 12 }, { t: 24, w: 12 }
];

// --- 工具函数 ---
const calculateW = (t: number, rh: number) => {
  try {
    const p_ws = psychrolib.GetSatVapPres(t);
    return psychrolib.GetHumRatioFromVapPres((rh / 100) * p_ws, 101325) * 1000;
  } catch { return 10; }
};

export default function AHUApp() {
  const [activeTab, setActiveTab] = useState('diagnostics');
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);

  // 模拟实时数据状态
  const [ahuData, setAhuData] = useState(AHU_IDS.map(id => ({
    id, t: 24, rh: 50, risk: 10, msg: 'System optimal'
  })));

  useEffect(() => {
    setMounted(true);
    try { psychrolib.SetUnitSystem(psychrolib.SI); } catch (e) {}
    
    const timer = setInterval(() => {
      setTick(t => t + 1);
      setAhuData(prev => prev.map(ahu => {
        const newT = +(ahu.t + (Math.random() - 0.5) * 0.4).toFixed(1);
        const newRisk = Math.floor(Math.random() * 100);
        let message = 'Normal operation';
        if (newRisk > 80) message = 'High dew point risk: Check chilled water valve';
        else if (newRisk > 60) message = 'Efficiency drift: Re-calibrating dampers';
        
        return { ...ahu, t: newT, risk: newRisk, msg: message };
      }));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) return null;

  // --- 视图 A: 单元诊断 ---
  const renderDiagnostics = () => {
    const option = {
      backgroundColor: 'transparent',
      xAxis: { type: 'value', min: 10, max: 40, splitLine: { lineStyle: { color: '#21262D' } } },
      yAxis: { type: 'value', min: 0, max: 20, position: 'right', splitLine: { lineStyle: { color: '#21262D' } } },
      series: [
        {
          type: 'scatter',
          data: ahuData.map(a => [a.t, calculateW(a.t, a.rh)]),
          symbolSize: 20,
          itemStyle: { color: '#7B61FF', shadowBlur: 10, shadowColor: '#7B61FF' }
        }
      ]
    };

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', padding: '20px', height: 'calc(100vh - 100px)' }}>
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {ahuData.map(ahu => (
            <div key={ahu.id} style={{ background: '#161B22', padding: '15px', borderRadius: '12px', border: ahu.risk > 80 ? '1px solid #F43F5E' : '1px solid #30363D' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
                <span style={{ color: '#8B949E' }}>{ahu.id}</span>
                <span style={{ color: ahu.risk > 80 ? '#F43F5E' : '#36D399' }}>{ahu.risk}% RISK</span>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, margin: '10px 0' }}>{ahu.t}°C</div>
              <div style={{ fontSize: '10px', color: '#7B61FF', backgroundColor: 'rgba(123, 97, 255, 0.1)', padding: '8px', borderRadius: '4px' }}>
                AI: {ahu.msg}
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: '#0D1117', borderRadius: '16px', border: '1px solid #30363D', padding: '20px' }}>
          <ReactECharts option={option} style={{ height: '100%' }} />
        </div>
      </div>
    );
  };

  // --- 视图 B: 能流分析 ---
  const renderEnergy = () => (
    <div style={{ padding: '20px', height: 'calc(100vh - 100px)' }}>
      <div style={{ background: '#0D1117', height: '100%', borderRadius: '16px', border: '1px solid #30363D', padding: '25px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '14px', color: '#7B61FF' }}>SYSTEM ENERGY TOPOLOGY</h3>
        <ReactECharts option={{
          series: [{
            type: 'sankey',
            data: [{ name: 'Input' }, { name: 'Chiller' }, { name: 'AHUs' }, { name: 'Loss' }],
            links: [
              { source: 'Input', target: 'Chiller', value: 100 },
              { source: 'Chiller', target: 'AHUs', value: 85 },
              { source: 'Chiller', target: 'Loss', value: 15 }
            ],
            lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.2 },
            label: { color: '#8B949E' }
          }]
        }} style={{ height: '90%' }} />
      </div>
    </div>
  );

  return (
    <div style={{ height: '100vh', backgroundColor: '#0A0C10', color: '#E0E6ED', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <nav style={{ height: '60px', borderBottom: '1px solid #30363D', display: 'flex', alignItems: 'center', padding: '0 25px', gap: '30px', backgroundColor: '#161B22' }}>
        <div style={{ fontWeight: 900, color: '#7B61FF', fontSize: '18px', letterSpacing: '1px' }}>TWIN-FLOW AI</div>
        <div style={{ display: 'flex', gap: '20px' }}>
          {['diagnostics', 'energy'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ 
              background: 'none', border: 'none', color: activeTab === tab ? '#fff' : '#8B949E',
              cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase',
              borderBottom: activeTab === tab ? '2px solid #7B61FF' : 'none', padding: '10px 0'
            }}>
              {tab}
            </button>
          ))}
        </div>
      </nav>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'diagnostics' ? renderDiagnostics() : renderEnergy()}
      </div>

      <footer style={{ height: '30px', borderTop: '1px solid #1E2228', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#484F58' }}>
        SECURE DATA LINK // NODE_0{tick % 9} // ENCRYPTED
      </footer>
    </div>
  );
}
