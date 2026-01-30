"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import {apiService} from "@/lib/service";
import { FaUser, FaLock } from 'react-icons/fa';
import { FiArrowRight } from 'react-icons/fi';
import { HiEye, HiEyeOff } from 'react-icons/hi';

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const {data} = await apiService.login(username, password);

      // Store token and user info
      localStorage.setItem('token', data.token)
      localStorage.setItem('userRole', data.user.role)
      localStorage.setItem('userId', data.user.id)
      localStorage.setItem('username', data.user.username)

      // Store team info for participants
      if (data.team) {
        localStorage.setItem('teamId', data.team.id)
        localStorage.setItem('teamCode', data.team.teamCode)
        localStorage.setItem('teamName', data.team.teamName)
      }

      // Redirect based on role
      const role = data.user.role
      if (role === 'admin') {
        router.push('/admin/dashboard')
      } else if (role === 'superadmin') {
        router.push('/superadmin/dashboard')
      } else if (role === 'participant') {
        router.push('/participant/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-cover bg-center" style={{ backgroundImage: 'url(/login.png)' }}>
      <div
        className="flex flex-col items-center justify-center"
        style={{
          width: 400,
          maxWidth: 420,
          minWidth: 320,
          borderRadius: 84.1,
          background: 'rgba(24,24,24,0.85)',
          border: '0.6px solid #FFFFFF',
          boxShadow: '0 2px 32px 0 rgba(0,0,0,0.18)',
          padding: '2.5rem 2rem',
          backdropFilter: 'blur(4px)',
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-wide mb-2" style={{ fontFamily: 'Orbitron, sans-serif', color: '#fff' }}>Welcome!</h1>
          <p className="text-gray-300 text-base" style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 400 }}>Please sign in to your account</p>
        </div>
        <form onSubmit={handleLogin} className="w-full flex flex-col gap-6">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm text-center">
              {error}
            </div>
          )}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
              <FaUser />
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-full bg-[#232323] text-white placeholder-gray-400 border-none focus:ring-2 focus:ring-yellow-500 text-base"
              placeholder="Username"
              required
              autoComplete="username"
              style={{ boxShadow: 'none' }}
            />
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
              <FaLock />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-3 rounded-full bg-[#232323] text-white placeholder-gray-400 border-none focus:ring-2 focus:ring-yellow-500 text-base"
              placeholder="Password"
              required
              autoComplete="current-password"
              style={{ boxShadow: 'none' }}
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg focus:outline-none"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? <HiEyeOff /> : <HiEye />}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-28 h-12 mx-auto flex items-center justify-center rounded-full border-2 border-yellow-500 text-yellow-500 bg-transparent hover:bg-yellow-500 hover:text-black transition-colors duration-200 text-2xl mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ boxShadow: '0 0 0 2px rgba(255,193,7,0.08)' }}
          >
            <FiArrowRight style={{ width: 38, height: 24 }} />
          </button>
        </form>
      </div>
    </div>
  )
}
