import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import { Button } from '../components/ui/button';

const features = [
  { icon: '🔐', title: 'Secure Authentication', desc: 'JWT-based auth with email verification, password reset, and account lockout protection.' },
  { icon: '💳', title: 'Subscription Management', desc: 'Stripe-powered billing with multiple plans, invoices, and webhook handling.' },
  { icon: '👥', title: 'Role-Based Access', desc: 'Fine-grained permissions with user, admin, and superadmin roles.' },
  { icon: '📊', title: 'Analytics Dashboard', desc: 'Real-time usage tracking, API call metrics, and storage monitoring.' },
  { icon: '🔒', title: 'Security First', desc: 'Rate limiting, input sanitization, XSS protection, and audit logging.' },
  { icon: '📈', title: 'Scalable Architecture', desc: 'Modular MERN stack with service layers, proper error handling, and logging.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30">
      <Navbar />
      
      {/* Hero Section */}
      <section className="px-6 py-24 md:py-32 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 font-['Space_Grotesk'] leading-[1.1]">
          Build SaaS Products
          <br />
          <span className="bg-gradient-to-r from-indigo-500 to-teal-400 bg-clip-text text-transparent">
            Faster & Smarter
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          A production-ready MERN stack SaaS boilerplate with authentication, billing, RBAC, and everything you need to ship.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register" className="w-full sm:w-auto">
            <Button size="lg" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 text-base h-14 px-8 rounded-xl transition-all">
              Start Free Today
            </Button>
          </Link>
          <Link to="/pricing" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-base h-14 px-8 rounded-xl bg-transparent transition-all">
              View Pricing
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 md:py-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div 
              key={i} 
              className="group p-8 rounded-2xl bg-[#1a1a2e] border border-[#2d2d4e] hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300 origin-left inline-block">
                {f.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-200 font-['Space_Grotesk']">
                {f.title}
              </h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2d2d4e] py-10 text-center mt-10">
        <p className="text-slate-500 text-sm">
          © {new Date().getFullYear()} SaaSApp. Built with MERN Stack. Production-ready.
        </p>
      </footer>
    </div>
  );
}
