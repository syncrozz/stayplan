import React from 'react';
import { ASSETS } from '../utils/constants';
import { Heart, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

interface FooterProps {
  onOpenSupport: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSupport }) => {
  return (
    <footer id="stayplan-footer" className="mt-16 bg-white border-t border-stone-200 py-12 text-stone-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          
          {/* Brand & Purpose */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <img
                src={ASSETS.LOGO}
                alt="StayPlan"
                className="w-8 h-8 rounded-lg object-cover border border-stone-200"
                referrerPolicy="no-referrer"
              />
              <span className="font-extrabold text-lg text-stone-900 tracking-tight">StayPlan</span>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">
              Platform perancangan agenda ringkas untuk short stay 2–4 hari. Mengutamakan aktiviti berkualiti, rehat bermakna, dan hubungan erat tanpa jadual yang memenatkan.
            </p>
          </div>

          {/* Privacy & Philosophy */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-800 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Privasi & Kawalan Anda</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed italic bg-stone-50 p-3 rounded-xl border border-stone-200">
              “Your StayPlan is yours. Plan freely. Your space is yours.”
            </p>
            <p className="text-[11px] text-stone-500">
              Semua pelan dan maklumat peribadi disimpan dengan selamat dalam peranti anda tanpa data tracking luaran.
            </p>
          </div>

          {/* Support CTA */}
          <div className="space-y-3 bg-rose-50/60 p-5 rounded-2xl border border-rose-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <span>Sokong Inisiatif StayPlan</span>
              </div>
              <p className="text-xs text-rose-800/80 mt-1 leading-relaxed">
                Bantu kami mengekalkan StayPlan percuma, pantas dan sentiasa bertambah baik untuk semua.
              </p>
            </div>
            <button
              id="footer-support-cta-btn"
              onClick={onOpenSupport}
              className="mt-3 inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all active:scale-98"
            >
              <Heart className="w-4 h-4 fill-white" />
              <span>Sumbang / Support ❤️</span>
            </button>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 gap-4">
          <p>© {new Date().getFullYear()} StayPlan. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Offline-ready & Responsive</span>
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};
