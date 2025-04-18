'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthForm() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem('access_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Password confirmation validation
    if (!isLogin && password !== confirmPassword) {
      setError('A jelszavak nem egyeznek!');
      return;
    }

    const endpoint = isLogin ? 'login' : 'register';
    const body = { 
      email, 
      password,
      // Add any additional required fields for registration
      ...(!isLogin && { confirmPassword })
    };

    try {
      const response = await fetch(`http://localhost:3100/users/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error messages from the backend
        throw new Error(data.message || 'Hiba történt a kérés során');
      }

      if (!isLogin) {
        // After successful registration, switch to login mode
        setIsLogin(true);
        setSuccess('Sikeres regisztráció! Most már bejelentkezhet.');
        // Clear the form
        setPassword('');
        setConfirmPassword('');
      } else {
        setSuccess('Sikeres bejelentkezés!');
        // Store the authentication token if provided
        if (data.access_token) {
          localStorage.setItem('access_token', data.access_token);
          router.push('/dashboard');
        }
      }
      
      console.log('Response:', data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt a kérés során');
      console.error('Error details:', err);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-center mb-6">
        <button
          onClick={() => setIsLogin(true)}
          className={`px-4 py-2 mr-2 rounded-l-md ${
            isLogin ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-black'
          }`}
        >
          Bejelentkezés
        </button>
        <button
          onClick={() => setIsLogin(false)}
          className={`px-4 py-2 rounded-r-md ${
            !isLogin ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-black'
          }`}
        >
          Regisztráció
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 text-black"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Jelszó
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 text-black"
            required
          />
        </div>
        {!isLogin && (
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Jelszó megerősítése
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 text-black"
              required={!isLogin}
            />
          </div>
        )}
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {isLogin ? 'Bejelentkezés' : 'Regisztráció'}
        </button>
      </form>

      {success && (
        <div className="mt-4 p-4 bg-green-100 rounded-md">
          <p className="text-green-800">{success}</p>
        </div>
      )}
      {error && (
        <div className="mt-4 p-4 bg-red-100 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
} 