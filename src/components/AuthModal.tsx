import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, ShieldCheck, Sparkles, Lock, ArrowRight, Loader2 } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, signInWithGoogle, authModalContext } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setErrorMsg(null);
      await signInWithGoogle();
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain') {
        setErrorMsg('Domain ini (stayplan.syncrozz.com) belum disenaraikan dalam Authorized Domains di Firebase Console.');
      } else if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMsg('Gagal log masuk dengan Google. Sila cuba lagi.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="auth-modal-card"
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative overflow-hidden text-stone-900"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          disabled={isSigningIn}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon / Branding */}
        <div className="text-center space-y-3 mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900">
              Your personal StayPlan starts here.
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 font-medium">
              {authModalContext || 'Sign in with Google to create, customize and save your plans.'}
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2.5 mb-6 text-xs text-stone-700">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Ruang Peribadi Selamat:</strong> Setiap stay, agenda & checklist dimiliki secara eksklusif oleh akaun anda.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Autosimpan Awan (Cloud Sync):</strong> Akses pelan anda di mana-mana sahaja dari telefon atau komputer.
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 text-xs bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Google OAuth Action Button */}
        <div className="space-y-3">
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white hover:bg-stone-50 text-stone-800 font-bold text-sm rounded-2xl border border-stone-300 shadow-xs hover:shadow-md transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {isSigningIn ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                <span>Menyambungkan Google...</span>
              </>
            ) : (
              <>
                {/* Google G Logo SVG */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
                <ArrowRight className="w-4 h-4 text-stone-400" />
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-stone-500 font-medium">
            “Your StayPlan is yours. Plan freely. Your space is yours.”
          </p>
        </div>
      </div>
    </div>
  );
};
