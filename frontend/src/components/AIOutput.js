import React from 'react';
import AIReport from './AIReport';

// Fresh responses and saved record fields share the structured report view.
export default function AIOutput({ data, title = 'AI Analysis' }) {
  if (data === null || data === undefined) return null;
  return <AIReport response={data} title={title} />;
}
