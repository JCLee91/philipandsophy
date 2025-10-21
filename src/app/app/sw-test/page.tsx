'use client';

import { useEffect, useState } from 'react';

export default function SWTestPage() {
  const [status, setStatus] = useState('🔍 Checking Service Worker...');
  const [details, setDetails] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDetails(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  useEffect(() => {
    const checkSW = async () => {
      addLog('Starting Service Worker diagnostics');

      // Check browser support
      if (!('serviceWorker' in navigator)) {
        setStatus('❌ Service Worker NOT supported in this browser');
        addLog('Browser does not support Service Workers');
        return;
      }
      addLog('✅ Service Worker API is supported');

      try {
        // Get all registrations
        addLog('Fetching all Service Worker registrations...');
        const registrations = await navigator.serviceWorker.getRegistrations();
        addLog(`Found ${registrations.length} Service Worker(s)`);

        if (registrations.length === 0) {
          setStatus('❌ No Service Worker registered');
          addLog('No Service Workers found - check if RegisterServiceWorker component is running');
          return;
        }

        // Check first registration
        const reg = registrations[0];
        const scriptURL = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || 'unknown';
        addLog(`Service Worker script: ${scriptURL}`);

        // Check state
        let state = 'unknown';
        if (reg.active) {
          state = 'active';
          addLog('✅ Service Worker is ACTIVE');
        } else if (reg.waiting) {
          state = 'waiting';
          addLog('⏳ Service Worker is WAITING (pending activation)');
        } else if (reg.installing) {
          state = 'installing';
          addLog('⏳ Service Worker is INSTALLING');
        } else {
          addLog('❌ Service Worker state is UNKNOWN');
        }

        setStatus(`Service Worker: ${state} ${state === 'active' ? '✅' : '⏳'}`);
        addLog(`Scope: ${reg.scope}`);

        // Test navigator.serviceWorker.ready with 5s timeout
        addLog('Testing navigator.serviceWorker.ready (5s timeout)...');

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('TIMEOUT after 5s')), 5000);
        });

        try {
          await Promise.race([navigator.serviceWorker.ready, timeoutPromise]);
          addLog('✅ navigator.serviceWorker.ready RESOLVED successfully');
          setStatus(prev => prev + '\n✅ serviceWorker.ready: OK');
        } catch (err) {
          addLog('❌ navigator.serviceWorker.ready TIMEOUT - this is the problem!');
          setStatus(prev => prev + '\n❌ serviceWorker.ready: TIMEOUT');
        }

        // Check controller
        if (navigator.serviceWorker.controller) {
          addLog(`✅ Page is controlled by: ${navigator.serviceWorker.controller.scriptURL}`);
        } else {
          addLog('⚠️ Page is NOT controlled by any Service Worker (first load?)');
        }

      } catch (error) {
        addLog(`❌ Error during check: ${error}`);
        setStatus('❌ Error checking Service Worker');
      }
    };

    checkSW();
  }, []);

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'monospace',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      minHeight: '100vh'
    }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#4ade80' }}>
        Service Worker Diagnostics
      </h1>

      <div style={{
        backgroundColor: '#2a2a2a',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        fontSize: '16px',
        whiteSpace: 'pre-wrap'
      }}>
        <strong>Status:</strong>
        <div style={{ marginTop: '10px' }}>{status}</div>
      </div>

      <div style={{
        backgroundColor: '#2a2a2a',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '12px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        <strong style={{ display: 'block', marginBottom: '10px' }}>Detailed Logs:</strong>
        {details.map((log, i) => (
          <div
            key={i}
            style={{
              padding: '5px 0',
              borderBottom: '1px solid #3a3a3a',
              color: log.includes('✅') ? '#4ade80' : log.includes('❌') ? '#f87171' : '#fbbf24'
            }}
          >
            {log}
          </div>
        ))}
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: '20px',
          padding: '12px 24px',
          backgroundColor: '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        🔄 Reload Test
      </button>
    </div>
  );
}
