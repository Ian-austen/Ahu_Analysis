'use client';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as psychrolib from 'psychrolib';

// --- 初始状态 ---
const AHUS = ['AHU-01', 'AHU-02', 'AHU-03'];

export default function IntegratedDashboard() {
  const [activeTab, setActiveTab] = useState('diagnostics'); // 'diagnostics' | 'energy'
  const [mounted, setMounted] = useState(false);
  const [metrics, setMetrics] = useState({ chillerCOP: 5.2, totalLoad: 45.5, savingPotential: 12 });

  useEffect(() => {
    setMounted(true);
    psychrolib.SetUnitSystem(psychrolib.SI);
  }, []);

  // 模拟全局能效波动
  useEffect(() => {
    if (!mounted) return;
    const timer = setInterval(() => {
      setMetrics({
        chillerCOP: +(5.0 + Math.random() * 0.5).toFixed(2),
        totalLoad: +(40 + Math.random() * 10).toFixed(1),
        savingPotential: Math.floor(10 + Math.random() * 5)
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [mounted]);

  // --- 页面 A: 实时诊断 (保持之前的逻辑) ---
  const renderDiagnostics = () => (
    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', height: '100%' }}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {AHUS.map(id => (
          <div key={id} style={{ background: '#161B22', padding: '15px', borderRadius: '10px', border: '1px solid #30363D' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#7B61FF' }}>{id} ACTIVE</div>
            <div style={{ fontSize: '24px', fontWeight: 900, margin: '10px 0' }}>24.5°C</div>
            <div style={{ fontSize: '10px', color: '#8B949E' }}>STATUS: NORMAL OPERATION</div>
          </div>
        ))}
      </aside>
      <main style={{ background: '#0D1117', borderRadius: '15px', padding: '20px', border: '1px solid #30363D' }}>
        <div style={{ color: '#8B949E', fontSize: '12px', marginBottom: '10px' }}>PROJECTION: GIVONI BIOCLIMATIC CHART</div>
        {/* 这里放置之前的 ReactECharts 逻辑 */}
        <div style={{ height: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#30363D' }}>
          [ Psychrometric Chart Engine Active ]
        </div>
      </main>
    </div>
  );

  // --- 页面 B: 全系统能流平衡 (核心竞争力扩展) ---
  const renderEnergyFlow = () => {
    const energyOption = {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', triggerOn: 'mousemove' },
      series: [{
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' },
        data: [
          { name: 'Chiller Plant' }, { name: 'Pumps' }, { name: 'AHU-01' }, 
          { name: 'AHU-02' }, { name: 'AHU-03' }, { name: 'Losses' }
        ],
        links: [
          { source: 'Chiller Plant', target: 'AHU-01', value: 15 },
          { source: 'Chiller Plant', target: 'AHU-02', value: 12 },
          { source: 'Chiller Plant', target: 'AHU-03', value: 18 },
          { source: 'Chiller Plant', target: 'Losses', value: 5 },
          { source: 'Pumps', target: 'AHU-01', value: 2 },
          { source: 'Pumps', target: 'AHU-02', value: 2 },
          { source: 'Pumps', target: 'AHU-03', value: 2 },
        ],
        lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.3 },
        label: { color: '#E0E6ED', fontSize: 10, fontWeight: 'bold' }
      }]
    };

    return (
      <div style={{ padding: '20px', height: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
          <div style={{ background: 'linear-gradient(135deg, #161B22 0%, #0D1117 100%)', padding: '20px', borderRadius: '15px', border: '1px solid #30363D' }}>
            <div style={{ fontSize: '10px', color: '#8B949E' }}>SYSTEM COP</div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#36D399' }}>{metrics.chillerCOP}</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #161B22 0%, #0D1117 100%)', padding: '20px', borderRadius: '15px', border: '1px solid #30363D' }}>
            <div style={{ fontSize: '10px', color: '#8B949E' }}>TOTAL COOLING LOAD</div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#7B61FF' }}>{metrics.totalLoad} <small style={{fontSize:'14px'}}>kW</small></div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #161B22 0%, #0D1117 100%)', padding: '20px', borderRadius: '15px', border: '1px solid #7B61FF' }}>
            <div style={{ fontSize: '10px', color: '#7B61FF', fontWeight: 'bold' }}>AI SAVING POTENTIAL</div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#fff' }}>{metrics.savingPotential}%</div>
          </div>
        </div>
        
        <div style={{ background: '#0D1117', height: 'calc(100% - 150px)', borderRadius: '15px', padding: '30px', border: '1px solid #30363D' }}>
          <div style={{ marginBottom: '20px', fontSize: '14px', fontWeight: 'bold', borderLeft: '4px solid #7B61FF', paddingLeft: '10px' }}>
            REAL-TIME ENERGY DISTRIBUTION (kW)
          </div>
          <ReactECharts option={energyOption} style={{ height: '90%' }} />
        </div>
      </div>
    );
  };

  if (!mounted) return null;

  return (
    <div style={{ height: '100vh', backgroundColor: '#0A0C10', color: '#E0E6ED', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
      {/* 全局导航 */}
      <nav style={{ height: '60px', backgroundColor: '#161B22', borderBottom: '1px solid #30363D', display: 'flex', alignItems: 'center', px: '30px', gap: '40px', padding: '0 30px' }}>
        <div style={{ fontWeight: 900, color: '#7B61FF', letterSpacing: '1px', marginRight: '20px' }}>TWIN-FLOW AI</div>
        <div 
          onClick={() => setActiveTab('diagnostics')}
          style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: activeTab === 'diagnostics' ? '#fff' : '#8B949E', borderBottom: activeTab === 'diagnostics' ? '2px solid #7B61FF' : 'none', padding: '20px 0' }}
        >
          UNIT DIAGNOSTICS
        </div>
        <div 
          onClick={() => setActiveTab('energy')}
          style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: activeTab === 'energy' ? '#fff' : '#8B949E', borderBottom: activeTab === 'energy' ? '2px solid #7B61FF' : 'none', padding: '20px 0' }}
        >
          ENERGY FLOW BALANCING
        </div>
      </nav>

      {/* 页面内容切换 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'diagnostics' ? renderDiagnostics() : renderEnergyFlow()}
      </div>

      <footer style={{ height: '30px', borderTop: '1px solid #30363D', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#484F58' }}>
        SECURE CLOUD LINKED // ENCRYPTED DATA STREAM // PROD_NODE_01
      </footer>
    </div>
  );
}
