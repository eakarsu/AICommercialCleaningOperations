import React from 'react';

const AIOutput = ({ data, title = 'AI Analysis' }) => {
  if (!data) return null;

  const content = data.content || '';
  const model = data.model || 'AI Model';
  const usage = data.usage;

  const renderValue = (value, depth = 0) => {
    if (value === null || value === undefined) return <span className="detail-value">N/A</span>;

    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="detail-value">None</span>;
      if (typeof value[0] === 'object') {
        return (
          <div className="ai-section">
            {value.map((item, i) => (
              <div key={i} className="ai-metric" style={{ flexDirection: 'column', gap: '4px' }}>
                {Object.entries(item).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="ai-metric-label" style={{ textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                    <span className="ai-metric-value">{String(v)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      }
      return (
        <ul className="ai-list">
          {value.map((item, i) => <li key={i}>{String(item)}</li>)}
        </ul>
      );
    }

    if (typeof value === 'object') {
      return (
        <div className="ai-section">
          {Object.entries(value).map(([k, v]) => (
            <div key={k} className="ai-metric">
              <span className="ai-metric-label" style={{ textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
              <span className="ai-metric-value">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
            </div>
          ))}
        </div>
      );
    }

    return <span>{String(value)}</span>;
  };

  const parseContent = (text) => {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {}
    return null;
  };

  const parsedJson = parseContent(content);

  return (
    <div className="ai-output">
      <div className="ai-output-header">
        <div className="ai-icon">🤖</div>
        <h3>{title}</h3>
        <span className="ai-model">{model}</span>
      </div>
      <div className="ai-content">
        {parsedJson ? (
          Object.entries(parsedJson).map(([key, value]) => (
            <div key={key} className="ai-section">
              <div className="ai-section-title">{key.replace(/_/g, ' ')}</div>
              {renderValue(value)}
            </div>
          ))
        ) : (
          content.split('\n').map((line, i) => {
            if (!line.trim()) return null;
            if (line.startsWith('#') || line.startsWith('**')) {
              return <div key={i} className="ai-section-title" style={{ marginTop: '12px' }}>{line.replace(/[#*]/g, '').trim()}</div>;
            }
            if (line.startsWith('-') || line.startsWith('•')) {
              return (
                <div key={i} style={{ padding: '6px 12px', background: 'rgba(15,23,42,0.5)', borderRadius: '6px', marginBottom: '4px', fontSize: '13px' }}>
                  {line.replace(/^[-•]\s*/, '')}
                </div>
              );
            }
            return <p key={i}>{line}</p>;
          })
        )}
        {usage && (
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(139,92,246,0.2)', display: 'flex', gap: '16px', fontSize: '11px', color: '#64748b' }}>
            <span>Tokens: {usage.total_tokens || 'N/A'}</span>
            <span>Prompt: {usage.prompt_tokens || 'N/A'}</span>
            <span>Completion: {usage.completion_tokens || 'N/A'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIOutput;
