import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AIOutput from '../components/AIOutput';
import { toast } from 'react-toastify';

const AIInsightsPage = () => {
  const [tab, setTab] = useState('client-retention');
  const [clients, setClients] = useState([]);
  const [crews, setCrews] = useState([]);
  const [equipment, setEquipment] = useState([]);

  const [clientId, setClientId] = useState('');
  const [crewId, setCrewId] = useState('');
  const [periodDays, setPeriodDays] = useState(30);
  const [locationId, setLocationId] = useState('');
  const [routeDate, setRouteDate] = useState('');
  const [routeCrewId, setRouteCrewId] = useState('');
  const [complianceTopic, setComplianceTopic] = useState('');
  const [complianceJurisdiction, setComplianceJurisdiction] = useState('');
  const [complianceChemicals, setComplianceChemicals] = useState('');
  const [inspectionId, setInspectionId] = useState('');
  const [inspectionLocation, setInspectionLocation] = useState('');
  const [inspectionDays, setInspectionDays] = useState(60);
  const [supplyCategory, setSupplyCategory] = useState('');
  const [supplyHorizon, setSupplyHorizon] = useState(30);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  useEffect(() => {
    api.get('/clients').then(r => setClients(Array.isArray(r.data) ? r.data : (r.data.rows || []))).catch(() => {});
    api.get('/crews').then(r => setCrews(Array.isArray(r.data) ? r.data : (r.data.rows || []))).catch(() => {});
    api.get('/equipment').then(r => setEquipment(Array.isArray(r.data) ? r.data : (r.data.rows || []))).catch(() => {});
  }, []);

  const callAI = async (path, payload) => {
    setLoading(true);
    setResult(null);
    setServiceUnavailable(false);
    try {
      const { data } = await api.post(path, payload);
      setResult(data);
      toast.success('AI analysis complete');
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || err.message;
      if (status === 503 || /api[_ ]?key/i.test(msg) || /OPENROUTER/i.test(msg)) {
        setServiceUnavailable(true);
        toast.warn('AI service unavailable: OPENROUTER_API_KEY not configured on server');
      } else {
        toast.error(msg || 'AI request failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const runRetention = (e) => {
    e.preventDefault();
    if (!clientId) return toast.error('Pick a client');
    callAI('/ai/client-retention', { client_id: clientId });
  };
  const runCrew = (e) => {
    e.preventDefault();
    if (!crewId) return toast.error('Pick a crew');
    callAI('/ai/crew-performance', { crew_id: crewId, period_days: parseInt(periodDays) || 30 });
  };
  const runEnergy = (e) => {
    e.preventDefault();
    if (!locationId) return toast.error('Pick a location');
    callAI('/ai/energy-audit', { location_id: locationId });
  };
  const runOptimizeRoutes = (e) => {
    e.preventDefault();
    const payload = {};
    if (routeDate) payload.date = routeDate;
    if (routeCrewId) payload.crew_id = routeCrewId;
    callAI('/ai/optimize-routes', payload);
  };
  const runInspectionAnalysis = (e) => {
    e.preventDefault();
    const payload = {};
    if (inspectionId) payload.inspection_id = inspectionId;
    if (inspectionLocation) payload.location_name = inspectionLocation;
    if (inspectionDays) payload.days = parseInt(inspectionDays) || 60;
    callAI('/ai/inspection-analysis', payload);
  };
  const runSupplyForecast = (e) => {
    e.preventDefault();
    const payload = { horizon_days: parseInt(supplyHorizon) || 30 };
    if (supplyCategory) payload.category = supplyCategory;
    callAI('/ai/supply-forecast', payload);
  };
  const runComplianceAdvisor = (e) => {
    e.preventDefault();
    if (!complianceTopic && !complianceChemicals) return toast.error('Provide a topic or chemicals');
    const payload = {};
    if (complianceTopic) payload.topic = complianceTopic;
    if (complianceJurisdiction) payload.jurisdiction = complianceJurisdiction;
    if (complianceChemicals) payload.chemicals = complianceChemicals.split(',').map(c => c.trim()).filter(Boolean);
    callAI('/ai/compliance-advisor', payload);
  };

  const locationOptions = [...new Set(equipment.map(e => e.location_id || e.location).filter(Boolean))];

  const buttonStyle = (active) => ({
    padding: '8px 14px',
    marginRight: '8px',
    background: active ? '#8b5cf6' : 'rgba(15,23,42,0.6)',
    color: active ? '#fff' : '#cbd5e1',
    border: '1px solid rgba(139,92,246,0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px'
  });

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '8px' }}>AI Insights</h1>
      <p style={{ color: '#64748b', marginBottom: '20px' }}>
        Run advanced AI analyses across clients, crews, and locations. Powered by OpenRouter.
      </p>

      <div style={{ marginBottom: '20px' }}>
        <button style={buttonStyle(tab === 'client-retention')} onClick={() => { setTab('client-retention'); setResult(null); }}>
          Client Retention
        </button>
        <button style={buttonStyle(tab === 'crew-performance')} onClick={() => { setTab('crew-performance'); setResult(null); }}>
          Crew Performance
        </button>
        <button style={buttonStyle(tab === 'energy-audit')} onClick={() => { setTab('energy-audit'); setResult(null); }}>
          Energy Audit
        </button>
        <button style={buttonStyle(tab === 'optimize-routes')} onClick={() => { setTab('optimize-routes'); setResult(null); }}>
          Optimize Routes
        </button>
        <button style={buttonStyle(tab === 'compliance-advisor')} onClick={() => { setTab('compliance-advisor'); setResult(null); }}>
          Compliance Advisor
        </button>
        <button style={buttonStyle(tab === 'inspection-analysis')} onClick={() => { setTab('inspection-analysis'); setResult(null); }}>
          Inspection Analysis
        </button>
        <button style={buttonStyle(tab === 'supply-forecast')} onClick={() => { setTab('supply-forecast'); setResult(null); }}>
          Supply Forecast
        </button>
      </div>

      {serviceUnavailable && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.4)',
          color: '#f59e0b',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          AI service unavailable. The server is missing <code>OPENROUTER_API_KEY</code>. Configure it in the backend <code>.env</code> and restart.
        </div>
      )}

      {tab === 'client-retention' && (
        <form onSubmit={runRetention} className="form-row" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1', fontSize: '13px' }}>Client</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} className="form-input" style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', color: '#fff', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px' }}>
              <option value="">-- choose client --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '10px 20px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? 'Analyzing...' : 'Run Retention Analysis'}
          </button>
        </form>
      )}

      {tab === 'crew-performance' && (
        <form onSubmit={runCrew} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1', fontSize: '13px' }}>Crew</label>
            <select value={crewId} onChange={e => setCrewId(e.target.value)} style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', color: '#fff', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px' }}>
              <option value="">-- choose crew --</option>
              {crews.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1', fontSize: '13px' }}>Days</label>
            <input type="number" min={1} max={365} value={periodDays} onChange={e => setPeriodDays(e.target.value)} style={{ width: '100px', padding: '8px', background: 'rgba(15,23,42,0.6)', color: '#fff', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px' }} />
          </div>
          <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? 'Analyzing...' : 'Run Performance Analysis'}
          </button>
        </form>
      )}

      {tab === 'energy-audit' && (
        <form onSubmit={runEnergy} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1', fontSize: '13px' }}>Location</label>
            {locationOptions.length > 0 ? (
              <select value={locationId} onChange={e => setLocationId(e.target.value)} style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', color: '#fff', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px' }}>
                <option value="">-- choose location --</option>
                {locationOptions.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            ) : (
              <input type="text" value={locationId} onChange={e => setLocationId(e.target.value)} placeholder="Location ID or name" style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', color: '#fff', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px' }} />
            )}
          </div>
          <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? 'Analyzing...' : 'Run Energy Audit'}
          </button>
        </form>
      )}

      {tab === 'optimize-routes' && (
        <form onSubmit={runOptimizeRoutes} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1', fontSize: '13px' }}>Date (optional)</label>
            <input type="date" value={routeDate} onChange={e => setRouteDate(e.target.value)} style={{ padding: '8px', background: 'rgba(15,23,42,0.6)', color: '#fff', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px' }} />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1', fontSize: '13px' }}>Crew (optional)</label>
            <select value={routeCrewId} onChange={e => setRouteCrewId(e.target.value)} style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', color: '#fff', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px' }}>
              <option value="">-- all active crews --</option>
              {crews.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? 'Optimizing...' : 'Optimize Dispatch'}
          </button>
        </form>
      )}

      {tab === 'compliance-advisor' && (
        <form onSubmit={runComplianceAdvisor} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1', fontSize: '13px' }}>Topic</label>
            <input type="text" value={complianceTopic} onChange={e => setComplianceTopic(e.target.value)} placeholder="e.g. floor stripping safety, OSHA HAZCOM" style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', color: '#fff', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1', fontSize: '13px' }}>Jurisdiction</label>
            <input type="text" value={complianceJurisdiction} onChange={e => setComplianceJurisdiction(e.target.value)} placeholder="e.g. California, US Federal" style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', color: '#fff', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1', fontSize: '13px' }}>Chemicals (comma-separated)</label>
            <input type="text" value={complianceChemicals} onChange={e => setComplianceChemicals(e.target.value)} placeholder="bleach, ammonia, isopropanol" style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', color: '#fff', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px' }} />
          </div>
          <div>
            <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', cursor: loading ? 'wait' : 'pointer' }}>
              {loading ? 'Analyzing...' : 'Get Compliance Guidance'}
            </button>
          </div>
        </form>
      )}

      {tab === 'inspection-analysis' && (
        <form onSubmit={runInspectionAnalysis} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1', fontSize: '13px' }}>Inspection ID (optional)</label>
            <input type="text" value={inspectionId} onChange={e => setInspectionId(e.target.value)} placeholder="e.g. 42" style={{ padding: '8px', background: 'rgba(15,23,42,0.6)', color: '#fff', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px' }} />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1', fontSize: '13px' }}>Location (optional)</label>
            <input type="text" value={inspectionLocation} onChange={e => setInspectionLocation(e.target.value)} placeholder="Location name" style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', color: '#fff', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1', fontSize: '13px' }}>Lookback Days</label>
            <input type="number" min={1} max={365} value={inspectionDays} onChange={e => setInspectionDays(e.target.value)} style={{ width: '100px', padding: '8px', background: 'rgba(15,23,42,0.6)', color: '#fff', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px' }} />
          </div>
          <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? 'Analyzing...' : 'Run Inspection Analysis'}
          </button>
        </form>
      )}

      {tab === 'supply-forecast' && (
        <form onSubmit={runSupplyForecast} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1', fontSize: '13px' }}>Category (optional)</label>
            <select value={supplyCategory} onChange={e => setSupplyCategory(e.target.value)} style={{ width: '100%', padding: '8px', background: 'rgba(15,23,42,0.6)', color: '#fff', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px' }}>
              <option value="">-- all categories --</option>
              <option value="chemicals">chemicals</option>
              <option value="equipment">equipment</option>
              <option value="disposables">disposables</option>
              <option value="safety">safety</option>
              <option value="tools">tools</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1', fontSize: '13px' }}>Horizon Days</label>
            <input type="number" min={7} max={180} value={supplyHorizon} onChange={e => setSupplyHorizon(e.target.value)} style={{ width: '100px', padding: '8px', background: 'rgba(15,23,42,0.6)', color: '#fff', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px' }} />
          </div>
          <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? 'Forecasting...' : 'Forecast Replenishment'}
          </button>
        </form>
      )}

      {loading && <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Calling AI service...</div>}

      {result && (
        <div style={{ marginTop: '20px' }}>
          <AIOutput
            data={{
              content: JSON.stringify(
                result.ai_retention_analysis ||
                result.ai_performance_analysis ||
                result.ai_energy_analysis ||
                result.ai_dispatch_plan ||
                result.ai_compliance_advice ||
                result.ai_inspection_analysis ||
                result.ai_supply_forecast ||
                result.analysis ||
                result,
                null,
                2
              ),
              model: result.model,
              usage: result.usage
            }}
            title={
              tab === 'client-retention' ? 'Client Retention Analysis' :
              tab === 'crew-performance' ? 'Crew Performance Analysis' :
              tab === 'energy-audit' ? 'Energy Audit' :
              tab === 'optimize-routes' ? 'Dispatch Optimization' :
              tab === 'compliance-advisor' ? 'Compliance Advisor' :
              tab === 'inspection-analysis' ? 'Inspection Analysis' :
              tab === 'supply-forecast' ? 'Supply Forecast' :
              'AI Analysis'
            }
          />
        </div>
      )}
    </div>
  );
};

export default AIInsightsPage;
