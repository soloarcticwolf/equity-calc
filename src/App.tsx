import React, { useState } from 'react';
import { Calculator, DollarSign, Percent, TrendingUp, Info, AlertCircle, Save, Trash2, Clock, ChevronDown, ChevronUp, Users, Settings, Flame } from 'lucide-react';
import './App.css';

type Field = 'preMoney' | 'investment' | 'postMoney' | 'equity';
type AdvField = 'existingShares' | 'optionPool' | 'monthlyBurn' | 'stepUpMultiple';

interface Values {
  preMoney: string;
  investment: string;
  postMoney: string;
  equity: string;
}

interface AdvValues {
  existingShares: string;
  optionPool: string;
  poolTiming: 'pre' | 'post';
  monthlyBurn: string;
  stepUpMultiple: string;
}

interface HistoryRecord {
  id: string;
  timestamp: Date;
  values: Values;
  advValues: AdvValues;
}

function parseNumber(val: string): number | null {
  const clean = val.replace(/,/g, '').toLowerCase().trim();
  if (clean === '') return null;
  
  const match = clean.match(/^([0-9.]+)([a-z]*)$/);
  if (!match) {
    const num = Number(clean.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? null : num;
  }

  const numPart = Number(match[1]);
  const suffixPart = match[2];

  if (isNaN(numPart)) return null;

  let multiplier = 1;
  if (suffixPart === 'c' || suffixPart === 'cr') multiplier = 10000000;
  else if (suffixPart === 'l' || suffixPart === 'la') multiplier = 100000;
  else if (suffixPart === 'k') multiplier = 1000;
  else if (suffixPart === 'm') multiplier = 1000000;
  else if (suffixPart === 'b') multiplier = 1000000000;

  return numPart * multiplier;
}

function formatWithCommas(num: number | null, maxDecimals = 2): string {
  if (num === null) return '';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: maxDecimals }).format(num);
}

function formatIndian(num: number | null): string {
  if (num === null) return '';
  if (num >= 10000000) {
    return (num / 10000000).toFixed(2).replace(/\.00$/, '') + ' Cr';
  } else if (num >= 100000) {
    return (num / 100000).toFixed(2).replace(/\.00$/, '') + ' L';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2).replace(/\.00$/, '') + ' k';
  }
  return num.toString();
}

function App() {
  const [values, setValues] = useState<Values>({
    preMoney: '',
    investment: '',
    postMoney: '',
    equity: ''
  });
  
  const [advValues, setAdvValues] = useState<AdvValues>({
    existingShares: '',
    optionPool: '',
    poolTiming: 'pre',
    monthlyBurn: '',
    stepUpMultiple: '2.5'
  });

  const [lastModified, setLastModified] = useState<Field[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const handleClear = () => {
    setValues({ preMoney: '', investment: '', postMoney: '', equity: '' });
    setAdvValues({ existingShares: '', optionPool: '', poolTiming: 'pre', monthlyBurn: '', stepUpMultiple: '2.5' });
    setLastModified([]);
    setError(null);
  };

  const handleSaveToHistory = () => {
    if (error) return;
    const filledCount = Object.values(values).filter(v => v !== '').length;
    if (filledCount < 2) return;

    const newRecord: HistoryRecord = {
      id: Date.now().toString(),
      timestamp: new Date(),
      values: { ...values },
      advValues: { ...advValues }
    };
    setHistory(prev => [newRecord, ...prev]);
  };

  const toggleHistoryItem = (id: string) => {
    setExpandedHistoryId(prev => prev === id ? null : id);
  };

  const calculateMissing = (currentValues: Values, modifiedFields: Field[]) => {
    if (modifiedFields.length < 2) return currentValues;

    const pre = parseNumber(currentValues.preMoney);
    const inv = parseNumber(currentValues.investment);
    const post = parseNumber(currentValues.postMoney);
    const eq = parseNumber(currentValues.equity);

    const f1 = modifiedFields[modifiedFields.length - 1];
    const f2 = modifiedFields[modifiedFields.length - 2];
    
    const active = [f1, f2];
    let newValues = { ...currentValues };
    let currError = null;

    try {
      if (active.includes('preMoney') && active.includes('investment')) {
        if (pre !== null && inv !== null) {
          const calculatedPost = pre + inv;
          const calculatedEq = calculatedPost > 0 ? (inv / calculatedPost) * 100 : 0;
          newValues.postMoney = formatWithCommas(calculatedPost);
          newValues.equity = calculatedEq.toFixed(2).replace(/\.00$/, '');
        }
      } else if (active.includes('preMoney') && active.includes('postMoney')) {
        if (pre !== null && post !== null) {
          if (post < pre) throw new Error("Post-money cannot be less than Pre-money");
          const calculatedInv = post - pre;
          const calculatedEq = post > 0 ? (calculatedInv / post) * 100 : 0;
          newValues.investment = formatWithCommas(calculatedInv);
          newValues.equity = calculatedEq.toFixed(2).replace(/\.00$/, '');
        }
      } else if (active.includes('investment') && active.includes('postMoney')) {
        if (inv !== null && post !== null) {
          if (post < inv) throw new Error("Post-money cannot be less than Investment");
          const calculatedPre = post - inv;
          const calculatedEq = post > 0 ? (inv / post) * 100 : 0;
          newValues.preMoney = formatWithCommas(calculatedPre);
          newValues.equity = calculatedEq.toFixed(2).replace(/\.00$/, '');
        }
      } else if (active.includes('equity') && active.includes('postMoney')) {
        if (eq !== null && post !== null) {
          if (eq < 0 || eq > 100) throw new Error("Equity must be between 0 and 100");
          const calculatedInv = post * (eq / 100);
          const calculatedPre = post - calculatedInv;
          newValues.investment = formatWithCommas(calculatedInv);
          newValues.preMoney = formatWithCommas(calculatedPre);
        }
      } else if (active.includes('equity') && active.includes('preMoney')) {
        if (eq !== null && pre !== null) {
          if (eq <= 0 || eq >= 100) throw new Error("Equity must be between 0 and 100");
          const calculatedPost = pre / (1 - (eq / 100));
          const calculatedInv = calculatedPost - pre;
          newValues.postMoney = formatWithCommas(calculatedPost);
          newValues.investment = formatWithCommas(calculatedInv);
        }
      } else if (active.includes('equity') && active.includes('investment')) {
        if (eq !== null && inv !== null) {
          if (eq <= 0 || eq > 100) throw new Error("Equity must be between 0 and 100");
          const calculatedPost = inv / (eq / 100);
          const calculatedPre = calculatedPost - inv;
          newValues.postMoney = formatWithCommas(calculatedPost);
          newValues.preMoney = formatWithCommas(calculatedPre);
        }
      }
    } catch (e: any) {
      currError = e.message;
    }

    setError(currError);
    return newValues;
  };

  const handleBaseChange = (field: Field, value: string) => {
    const cleanValue = value.replace(/[^0-9.,kmlcrbKMLCRB]/g, '');
    setValues(prev => {
      const next = { ...prev, [field]: cleanValue };
      const newModified = lastModified.filter(f => f !== field);
      newModified.push(field);
      if (newModified.length > 2) newModified.shift();
      setLastModified(newModified);
      return calculateMissing(next, newModified);
    });
  };

  const handleBaseBlur = (field: Field) => {
    setValues(prev => {
      const num = parseNumber(prev[field]);
      if (num !== null) {
        return { ...prev, [field]: field === 'equity' ? num.toString() : formatWithCommas(num) };
      }
      return prev;
    });
  };

  const handleAdvChange = (field: AdvField, value: string) => {
    const cleanValue = value.replace(/[^0-9.,kmlcrbKMLCRB]/g, '');
    setAdvValues(prev => ({ ...prev, [field]: cleanValue }));
  };

  const handleAdvBlur = (field: AdvField) => {
    setAdvValues(prev => {
      const num = parseNumber(prev[field]);
      if (num !== null) {
        return { ...prev, [field]: field === 'optionPool' || field === 'stepUpMultiple' ? num.toString() : formatWithCommas(num) };
      }
      return prev;
    });
  };

  const renderBaseInput = (field: Field, label: string, icon: React.ReactNode, prefix: string, suffix: string) => {
    const rawVal = values[field];
    const num = parseNumber(rawVal);
    const indFormat = field !== 'equity' ? formatIndian(num) : '';
    const formatted = field !== 'equity' && num !== null ? formatWithCommas(num) : '';

    return (
      <div className="input-group">
        <label className="input-label">{icon} {label}</label>
        <div className="input-wrapper">
          {prefix && <span className="input-prefix">{prefix}</span>}
          <input
            type="text"
            className={`calc-input ${prefix ? 'has-prefix' : ''} ${suffix ? 'has-suffix' : ''}`}
            value={values[field]}
            onChange={(e) => handleBaseChange(field, e.target.value)}
            onBlur={() => handleBaseBlur(field)}
            placeholder="0"
          />
          {suffix && <span className="input-suffix">{suffix}</span>}
        </div>
        <div className="formatted-preview">
          <span>{field !== 'equity' && formatted && num !== null && num >= 1000 ? formatted : ''}</span>
          <span className="indian-format">{indFormat}</span>
        </div>
      </div>
    );
  };

  const renderAdvInput = (field: AdvField, label: string, icon: React.ReactNode, prefix: string, suffix: string) => {
    const rawVal = advValues[field];
    const num = parseNumber(rawVal);
    const indFormat = field !== 'optionPool' && field !== 'stepUpMultiple' && field !== 'existingShares' ? formatIndian(num) : '';

    return (
      <div className="input-group">
        <label className="input-label">{icon} {label}</label>
        <div className="input-wrapper">
          {prefix && <span className="input-prefix">{prefix}</span>}
          <input
            type="text"
            className={`calc-input ${prefix ? 'has-prefix' : ''} ${suffix ? 'has-suffix' : ''}`}
            value={advValues[field]}
            onChange={(e) => handleAdvChange(field, e.target.value)}
            onBlur={() => handleAdvBlur(field)}
            placeholder="0"
          />
          {suffix && <span className="input-suffix">{suffix}</span>}
        </div>
        <div className="formatted-preview">
          <span></span>
          <span className="indian-format">{indFormat}</span>
        </div>
      </div>
    );
  };

  // --- Derived Calculations ---
  const pre = parseNumber(values.preMoney);
  const post = parseNumber(values.postMoney);
  const inv = parseNumber(values.investment);
  const eq = parseNumber(values.equity);
  
  const shares = parseNumber(advValues.existingShares);
  const pool = parseNumber(advValues.optionPool);
  const burn = parseNumber(advValues.monthlyBurn);
  const stepUp = parseNumber(advValues.stepUpMultiple) ?? 2.5;

  let trueFounder: number | null = null;
  let pps: number | null = null;
  let poolImpactPre: number | null = null;
  let poolImpactPost: number | null = null;
  let deltaFounder: number | null = null;
  let dilutionPerCr: number | null = null;
  let nextPre: number | null = null;
  let runway: number | null = null;

  if (pre !== null && post !== null && inv !== null && eq !== null && !error) {
    const eqDec = eq / 100;
    const poolDec = pool !== null ? pool / 100 : 0;

    const founderPre = 1 - eqDec - poolDec;
    const founderPost = (1 - eqDec) * (1 - poolDec);
    
    poolImpactPre = founderPre * 100;
    poolImpactPost = founderPost * 100;
    deltaFounder = Math.abs(poolImpactPost - poolImpactPre);

    trueFounder = advValues.poolTiming === 'pre' ? poolImpactPre : poolImpactPost;

    if (shares !== null && shares > 0) {
      if (advValues.poolTiming === 'pre') {
        const optionPoolValue = post * poolDec;
        pps = (pre - optionPoolValue) / shares;
      } else {
        pps = pre / shares;
      }
    }

    if (inv > 0) {
      const invCr = inv / 10000000;
      dilutionPerCr = eq / invCr;
    }

    nextPre = post * stepUp;

    if (burn !== null && burn > 0) {
      runway = inv / burn;
    }
  }

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isFormFilled = Object.values(values).filter(v => v !== '').length >= 2;

  return (
    <div className="fullscreen-container">
      <div className="header-compact">
        <h1>Equity Calc</h1>
        <p>Advanced cap table metrics & dilution modeling on a single screen</p>
      </div>

      <div className="three-column-grid">
        {/* Column 1: Inputs */}
        <div className="panel inputs-panel">
          <div className="section-title">Core Round Mechanics</div>
          <div className="input-grid-compact">
            {renderBaseInput('investment', 'Investment Amount', <DollarSign className="input-icon" />, '₹', '')}
            {renderBaseInput('equity', 'Equity Given', <Percent className="input-icon" />, '', '%')}
            {renderBaseInput('preMoney', 'Pre-money Valuation', <TrendingUp className="input-icon" />, '₹', '')}
            {renderBaseInput('postMoney', 'Post-money Valuation', <Calculator className="input-icon" />, '₹', '')}
          </div>

          <div className="section-title" style={{ marginTop: '0.2rem' }}>Advanced Inputs</div>
          <div className="input-grid-compact">
            {renderAdvInput('existingShares', 'Existing Fully-Diluted Shares', <Users className="input-icon" />, '', '')}
            
            <div className="input-group">
              <label className="input-label"><Percent className="input-icon" /> Option Pool Created</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  className="calc-input has-suffix"
                  value={advValues.optionPool}
                  onChange={(e) => handleAdvChange('optionPool', e.target.value)}
                  onBlur={() => handleAdvBlur('optionPool')}
                  placeholder="0"
                />
                <span className="input-suffix">%</span>
              </div>
              <div className="toggle-group">
                <button 
                  className={`toggle-btn ${advValues.poolTiming === 'pre' ? 'active' : ''}`}
                  onClick={() => setAdvValues(prev => ({...prev, poolTiming: 'pre'}))}
                >Pre-money</button>
                <button 
                  className={`toggle-btn ${advValues.poolTiming === 'post' ? 'active' : ''}`}
                  onClick={() => setAdvValues(prev => ({...prev, poolTiming: 'post'}))}
                >Post-money</button>
              </div>
            </div>

            {renderAdvInput('monthlyBurn', 'Monthly Burn (Post-raise)', <Flame className="input-icon" />, '₹', '')}
            {renderAdvInput('stepUpMultiple', 'Target Step-up Multiple', <Settings className="input-icon" />, '', 'x')}
          </div>

          {error && (
            <div className="status-indicator error">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="actions-bar">
            <button className="btn btn-secondary" onClick={handleClear}>
              <Trash2 size={16} /> Clear All
            </button>
            <button className="btn btn-primary" onClick={handleSaveToHistory} disabled={!isFormFilled || !!error}>
              <Save size={16} /> Save Record
            </button>
          </div>
        </div>

        {/* Column 2: Outputs */}
        <div className="panel outputs-panel">
          <div className="section-title">Advanced Outputs</div>
          {!isFormFilled || error ? (
             <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Fill inputs to see outputs and sensitivity table.
             </div>
          ) : (
            <>
              <div className="outputs-grid-compact">
                <div className="output-metric">
                  <span className="output-label">Price per Share</span>
                  <span className="output-value">{pps !== null ? `₹${formatWithCommas(pps, 4)}` : '-'}</span>
                  <span className="output-subvalue">{advValues.poolTiming}-money pool</span>
                </div>

                <div className="output-metric">
                  <span className="output-label">True Founder Ownership</span>
                  <span className="output-value">{trueFounder !== null ? `${formatWithCommas(trueFounder)}%` : '-'}</span>
                  <span className="output-subvalue">Fully diluted</span>
                </div>
                
                <div className="output-metric">
                  <span className="output-label">Dilution / ₹1Cr Raised</span>
                  <span className="output-value">{dilutionPerCr !== null ? `${formatWithCommas(dilutionPerCr)}%` : '-'}</span>
                </div>

                <div className="output-metric">
                  <span className="output-label">Runway Bought</span>
                  <span className="output-value">{runway !== null && isFinite(runway) ? `${formatWithCommas(runway, 1)} mo` : '-'}</span>
                </div>

                <div className="output-metric" style={{ gridColumn: 'span 2' }}>
                  <span className="output-label">Implied Next Round Pre-money ({advValues.stepUpMultiple || '2.5'}x)</span>
                  <span className="output-value" style={{ color: 'var(--success-color)' }}>{nextPre !== null ? `₹${formatIndian(nextPre)}` : '-'}</span>
                </div>

                <div className="output-metric" style={{ gridColumn: '1 / -1' }}>
                  <span className="output-label">Option Pool Dilution Impact (Delta: {deltaFounder !== null ? `${formatWithCommas(deltaFounder)}%` : '-'})</span>
                  <div className="pool-impact-grid">
                    <div className="pool-impact-box">
                      <div className="pool-impact-box-label">Pre-money (Founder Diluted)</div>
                      <div className="pool-impact-box-val">{poolImpactPre !== null ? `${formatWithCommas(poolImpactPre)}%` : '-'}</div>
                    </div>
                    <div className="pool-impact-box">
                      <div className="pool-impact-box-label">Post-money (Pro-rata)</div>
                      <div className="pool-impact-box-val">{poolImpactPost !== null ? `${formatWithCommas(poolImpactPost)}%` : '-'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="section-title" style={{ marginTop: 'auto' }}>Sensitivity Matrix (Dilution %)</div>
              <div className="sensitivity-table-wrapper">
                <table className="sensitivity-table">
                  <thead>
                    <tr>
                      <th className="table-corner">Raise ↓ \ Pre →</th>
                      <th>₹16 Cr</th>
                      <th>₹18 Cr</th>
                      <th>₹20 Cr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[20000000, 30000000, 40000000].map(r => (
                      <tr key={r}>
                        <th style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>₹{formatIndian(r)}</th>
                        {[160000000, 180000000, 200000000].map(p => {
                          const dilution = (r / (p + r)) * 100;
                          return <td key={p}>{dilution.toFixed(2)}%</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Column 3: History */}
        <div className="panel history-panel">
          <div className="sidebar-header">
            <Clock size={16} className="input-icon" />
            History
          </div>
          
          {history.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.8rem', marginTop: '1rem' }}>
              No calculations saved.
            </div>
          ) : (
            <div className="history-list">
              {history.map(record => {
                const isExpanded = expandedHistoryId === record.id;
                const preVal = parseNumber(record.values.preMoney);
                const preStr = preVal !== null && preVal >= 100000 ? formatIndian(preVal) : record.values.preMoney;
                const eqStr = record.values.equity ? `${record.values.equity}%` : '?';

                return (
                  <div key={record.id} className="history-item">
                    <div className="history-summary" onClick={() => toggleHistoryItem(record.id)}>
                      <div>
                        <div className="history-title">Pre: {preStr || '?'} • Eq: {eqStr}</div>
                        <div className="history-time">{formatTime(record.timestamp)}</div>
                      </div>
                      {isExpanded ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
                    </div>
                    
                    {isExpanded && (
                      <div className="history-details">
                        <div className="history-detail-row">
                          <span className="history-detail-label">Pre-money</span>
                          <span className="history-detail-value">₹{record.values.preMoney || '-'}</span>
                        </div>
                        <div className="history-detail-row">
                          <span className="history-detail-label">Investment</span>
                          <span className="history-detail-value">₹{record.values.investment || '-'}</span>
                        </div>
                        <div className="history-detail-row">
                          <span className="history-detail-label">Post-money</span>
                          <span className="history-detail-value">₹{record.values.postMoney || '-'}</span>
                        </div>
                        <div className="history-detail-row">
                          <span className="history-detail-label">Equity</span>
                          <span className="history-detail-value">{record.values.equity ? `${record.values.equity}%` : '-'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
