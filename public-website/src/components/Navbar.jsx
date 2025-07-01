import React, { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="w-full bg-white shadow-professional sticky top-0 z-50 border-b border-neutral-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <a href="/" className="text-3xl font-bold text-primary-900 font-display">LAB DNA</a>
        <div className="hidden md:flex gap-8">
          <a href="#home" className="text-neutral-700 hover:text-primary-600 font-medium transition-colors duration-200">Home</a>
          <a href="#how" className="text-neutral-700 hover:text-primary-600 font-medium transition-colors duration-200">How it Works</a>
          <a href="#pricing" className="text-neutral-700 hover:text-primary-600 font-medium transition-colors duration-200">Pricing</a>
          <a href="#contact" className="text-neutral-700 hover:text-primary-600 font-medium transition-colors duration-200">Contact</a>
          <a href="#" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors duration-200">Staff Login</a>
        </div>
        <button
          className="md:hidden flex items-center px-3 py-2 border rounded-lg text-primary-900 border-primary-300 hover:bg-primary-50 transition-colors duration-200"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      {/* Mobile menu */}
      {open && (
        <div className="md:hidden px-6 pb-6 flex flex-col gap-4 bg-white shadow-professional-lg animate-fade-in border-t border-neutral-200">
          <a href="#home" className="text-neutral-700 hover:text-primary-600 font-medium py-2 transition-colors duration-200" onClick={() => setOpen(false)}>Home</a>
          <a href="#how" className="text-neutral-700 hover:text-primary-600 font-medium py-2 transition-colors duration-200" onClick={() => setOpen(false)}>How it Works</a>
          <a href="#pricing" className="text-neutral-700 hover:text-primary-600 font-medium py-2 transition-colors duration-200" onClick={() => setOpen(false)}>Pricing</a>
          <a href="#contact" className="text-neutral-700 hover:text-primary-600 font-medium py-2 transition-colors duration-200" onClick={() => setOpen(false)}>Contact</a>
          <a href="#" className="text-primary-600 font-semibold py-2 hover:text-primary-700 transition-colors duration-200" onClick={() => setOpen(false)}>Staff Login</a>
        </div>
      )}
    </nav>
  );
} 