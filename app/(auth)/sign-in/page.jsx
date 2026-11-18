"use client"

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      login(data.user, data.accessToken);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md p-8 bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-zinc-800">
        <h1 className="text-3xl font-bold mb-6 text-center">Welcome Back</h1>
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input 
            type="email" 
            placeholder="Email Address" 
            className="p-3 rounded-lg bg-zinc-800 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="p-3 rounded-lg bg-zinc-800 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required
          />
          <Button type="submit" className="w-full mt-4 bg-gradient-to-r from-pink-600 to-orange-500 hover:opacity-90 transition-opacity">
            Sign In
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-400">
          Don't have an account? <Link href="/sign-up" className="text-pink-400 hover:text-pink-300 font-semibold transition-colors">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
