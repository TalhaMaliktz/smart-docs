'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Phase 1: Direct HTTP Call (Traditional)
    fetch('http://localhost:3000')
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch((err) => {
        console.error("Fetch error:", err);
        setError("Connection Failed. This is likely CORS.");
      });
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-950 text-white">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-800 bg-zinc-800/30 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30 font-bold text-black dark:text-white">
          SmartDocs Phase 1: The Foundation
        </p>
      </div>

      <div className="mt-10">
        {status ? (
          <div className="p-6 border border-green-500 rounded bg-green-900/20">
            <h2 className="text-xl font-bold text-green-400">✅ System Online</h2>
            <pre className="mt-4 p-4 bg-black rounded text-green-300">
              {JSON.stringify(status, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="p-6 border border-red-500 rounded bg-red-900/20">
            <h2 className="text-xl font-bold text-red-400">❌ System Offline</h2>
            <p className="mt-2 text-red-300">{error || "Pinging Backend..."}</p>
          </div>
        )}
      </div>
    </main>
  );
}