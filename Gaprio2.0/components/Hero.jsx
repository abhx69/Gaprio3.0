'use client'

import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

// --- SVG Icon Components ---
const ArrowRightIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
)

const BotIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>
)

const UsersIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
)

const FileTextIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
)

const MessageCircleIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
)

const ZapIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
)

const SparklesIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"></path></svg>
)

// --- Custom Hook to load external scripts ---
const useExternalScript = (url, callback) => {
  useEffect(() => {
    if (!url) return
    const script = document.createElement('script')
    script.src = url
    script.async = true
    script.onload = () => {
      if (callback) callback()
    }
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [url, callback])
}

// --- Animated Magnetic Button Component ---
const MagneticButton = ({ children }) => {
  const ref = useRef(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouse = (e) => {
    if (!ref.current) return
    const { clientX, clientY } = e
    const { height, width, left, top } = ref.current.getBoundingClientRect()
    const middleX = clientX - (left + width / 2)
    const middleY = clientY - (top + height / 2)
    setPosition({ x: middleX * 0.15, y: middleY * 0.15 })
  }

  const reset = () => {
    setPosition({ x: 0, y: 0 })
  }

  const { x, y } = position

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x, y }}
      transition={{ type: "spring", stiffness: 250, damping: 20, mass: 0.5 }}
      className="relative"
    >
      {children}
    </motion.div>
  )
}

// --- Floating Icon Components ---
const FloatingIcon = ({ icon: Icon, position, delay, size = "normal" }) => {
  const sizeClasses = {
    small: "w-8 h-8 sm:w-10 sm:h-10",
    normal: "w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14",
    large: "w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20"
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className={`absolute ${position} ${sizeClasses[size]} bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 flex items-center justify-center`}
    >
      <Icon className={`${size === "small" ? "w-4 h-4 sm:w-5 sm:h-5" : size === "normal" ? "w-5 h-5 sm:w-6 sm:h-6" : "w-6 h-6 sm:w-8 sm:h-8"} text-purple-300`} />
    </motion.div>
  )
}

const AnimatedFloatingIcon = ({ icon: Icon, position, delay, size = "normal" }) => {
  const sizeClasses = {
    small: "w-8 h-8 sm:w-10 sm:h-10",
    normal: "w-10 h-10 sm:w-12 sm:h-12",
    large: "w-12 h-12 sm:w-16 sm:h-16"
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay }}
      className={`absolute ${position} ${sizeClasses[size]} bg-gradient-to-br from-blue-500/20 to-cyan-400/20 backdrop-blur-lg rounded-full shadow-2xl border border-white/10 flex items-center justify-center`}
    >
      <motion.div
        animate={{ 
          rotate: [0, 10, -10, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Icon className={`${size === "small" ? "w-4 h-4" : size === "normal" ? "w-5 h-5" : "w-6 h-6"} text-cyan-300`} />
      </motion.div>
    </motion.div>
  )
}

// --- Main Hero Section Component ---
export default function Hero() {
  const heroRef = useRef(null)
  const [isGsapReady, setIsGsapReady] = useState(false)

  // Load GSAP and then set ready state
  useExternalScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js', () => {
    setIsGsapReady(true)
  })

  const textGradient = `bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 bg-clip-text text-transparent`

  // GSAP Animations
  useEffect(() => {
    if (!isGsapReady || !heroRef.current) return
    const gsap = window.gsap
    
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }})

    tl.fromTo('.hero-element', 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1, stagger: 0.2, delay: 0.5 }
    )
  }, [isGsapReady])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!heroRef.current) return
      const { clientX, clientY } = e
      const x = (clientX / window.innerWidth) * 100
      const y = (clientY / window.innerHeight) * 100
      heroRef.current.style.setProperty('--x', `${x}%`)
      heroRef.current.style.setProperty('--y', `${y}%`)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <section
      ref={heroRef}
      className="relative w-full bg-gray-900 text-white overflow-hidden flex items-center justify-center min-h-auto sm:min-h-screen pt-14 sm:pt-0 pb-4 sm:py-8"
      style={{ '--x': '50%', '--y': '50%' }}
    >
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 -z-20 grid-pattern"></div>
      <div 
        className="pointer-events-none absolute inset-0 -z-10 transition-all duration-300"
        style={{
          background: `radial-gradient(circle at var(--x) var(--y), rgba(139, 92, 246, 0.25), transparent 35%)`,
        }}
      />
      
      {/* Animated Orbs */}
      <motion.div
        animate={{ 
          x: [0, 100, 0],
          y: [0, -50, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10"
      />
      <motion.div
        animate={{ 
          x: [0, -80, 0],
          y: [0, 60, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10"
      />

      {/* Floating Icons - Responsive positioning */}
      <div className="hidden sm:block">
        {/* Top Right - File Icon */}
        <FloatingIcon 
          icon={FileTextIcon} 
          position="top-6 right-6 sm:top-10 sm:right-10 lg:top-16 lg:right-16" 
          delay={1.2} 
          size="normal"
        />
        
        {/* Bottom Left - Users Icon */}
        <FloatingIcon 
          icon={UsersIcon} 
          position="bottom-16 left-6 sm:bottom-20 sm:left-10 lg:bottom-28 lg:left-20" 
          delay={1.4} 
          size="normal"
        />
        
        {/* Center Right - Animated Bot Icon */}
        <AnimatedFloatingIcon 
          icon={BotIcon} 
          position="top-1/2 right-1/4 transform -translate-y-1/2" 
          delay={1.6} 
          size="large"
        />
        
        {/* Top Left - Sparkles Icon */}
        <FloatingIcon 
          icon={SparklesIcon} 
          position="top-10 left-8 sm:top-16 sm:left-16 lg:top-24 lg:left-24" 
          delay={1.0} 
          size="small"
        />
        
        {/* Bottom Right - Zap Icon */}
        <FloatingIcon 
          icon={ZapIcon} 
          position="bottom-10 right-8 sm:bottom-16 sm:right-16 lg:bottom-24 lg:right-24" 
          delay={1.8} 
          size="small"
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-6xl mx-auto">
          {/* Top Badge - More compact on mobile */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.25, 1, 0.5, 1], delay: 0.5 }}
            className="hero-element inline-flex items-center gap-2 border border-white/20 bg-black/40 backdrop-blur-lg rounded-full px-3 py-1.5 sm:px-4 sm:py-2 mb-4 sm:mb-8 shadow-2xl"
          >
            <BotIcon className="text-purple-400 w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-medium text-gray-300">
              Next-Gen AI Workspace
            </span>
          </motion.div>
          
          {/* Main Heading - More compact spacing */}
          <h1 className="hero-element text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter mb-4 sm:mb-6 leading-tight">
            Your All-in-One <span className={`${textGradient} animate-gradient`}>AI Workspace</span>
          </h1>

          {/* Description - Shorter and more compact */}
          <p className="hero-element text-base sm:text-xl lg:text-2xl text-gray-300 max-w-2xl sm:max-w-4xl mx-auto mb-6 sm:mb-10 leading-relaxed px-2">
            Generate contracts, collaborate in group chats, and leverage AI assistants—all in one intelligent platform for modern teams.
          </p>

          {/* Feature Highlights - Compact grid */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="hero-element grid grid-cols-3 gap-2 sm:gap-4 mb-8 sm:mb-12 max-w-md sm:max-w-2xl mx-auto px-2"
          >
            {[
              { icon: FileTextIcon, text: "Smart Contracts" },
              { icon: UsersIcon, text: "Group Chats" },
              { icon: MessageCircleIcon, text: "AI Assistants" }
            ].map((feature, index) => (
              <motion.div
                key={feature.text}
                whileHover={{ scale: 1.05 }}
                className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-4 rounded-lg sm:rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
              >
                <feature.icon className="w-4 h-4 sm:w-6 sm:h-6 text-purple-400" />
                <span className="text-xs sm:text-sm font-medium text-gray-300 text-center leading-tight">
                  {feature.text.split(' ').map((word, i) => (
                    <span key={i}>
                      {word}
                      {i < feature.text.split(' ').length - 1 && <br />}
                    </span>
                  ))}
                </span>
              </motion.div>
            ))}
          </motion.div>
          
          {/* CTA Buttons - Compact and stacked on mobile */}
          <div className="hero-element flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-2">
            <MagneticButton>
              <Link href="/chat" className="group relative flex items-center justify-center w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 sm:py-4 px-6 sm:px-10 rounded-full transition-all duration-300 shadow-2xl hover:shadow-purple-500/50 hover:scale-105 text-sm sm:text-base">
                Start your journey
                <ArrowRightIcon className="ml-2 h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </MagneticButton>
            <MagneticButton>
              <Link href="/contract-generator" className="group relative flex items-center justify-center w-full sm:w-auto bg-transparent border-2 border-white/20 hover:bg-white/10 hover:border-white/30 text-gray-300 font-medium py-3 sm:py-4 px-6 sm:px-10 rounded-full transition-all duration-300 backdrop-blur-sm text-sm sm:text-base">
                Generate Contract
              </Link>
            </MagneticButton>
          </div>
        </div>
      </div>

      {/* Enhanced Styles */}
      <style jsx>{`
        .grid-pattern {
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 2rem 2rem;
        }
        @media (min-width: 640px) {
          .grid-pattern {
            background-size: 3rem 3rem;
          }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradientMove 3s ease infinite;
        }
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </section>
  )
}