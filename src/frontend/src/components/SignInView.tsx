import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from './ui/button';
import { Loader2, Shield, Zap, Lock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useEffect } from 'react';

export default function SignInView() {
  const { login, isLoggingIn, isLoginSuccess, identity } = useInternetIdentity();
  const { setCurrentView } = useAppContext();

  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();

  useEffect(() => {
    if (isLoginSuccess || isLoggedIn) {
      setCurrentView('chat');
    }
  }, [isLoginSuccess, isLoggedIn, setCurrentView]);

  return (
    <div className="flex flex-col h-full bg-[#0d1117] items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <img
              src="/assets/uploads/file_000000006f9c71f88d2ac80e55328a9d-4.png"
              alt="Jarvis"
              className="w-24 h-24 rounded-full object-cover glow-green"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-[#0d1117] flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
          </div>
          <h1 className="font-orbitron text-white text-3xl font-bold tracking-widest text-glow-green">
            JARVIS
          </h1>
          <p className="text-green-400 text-sm mt-1">Your Study Tutor</p>
        </div>

        {/* Sign In Card */}
        <div className="bg-[#161b22] border border-[#1e2d3d] rounded-2xl p-6 space-y-5">
          <div className="text-center">
            <h2 className="text-white text-xl font-semibold">Welcome to Jarvis</h2>
            <p className="text-gray-400 text-sm mt-1">
              Sign in to sync your notes, flashcards, and progress across devices
            </p>
          </div>

          {/* Features */}
          <div className="space-y-2.5">
            {[
              { icon: <Shield size={14} className="text-green-400" />, text: 'Secure Internet Identity login' },
              { icon: <Lock size={14} className="text-blue-400" />, text: 'Your data stays private on ICP' },
              { icon: <Zap size={14} className="text-yellow-400" />, text: 'Sync across all devices' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 text-gray-400 text-sm">
                <span className="shrink-0">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Sign In Button */}
          <Button
            type="button"
            onClick={login}
            disabled={isLoggingIn}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-medium rounded-xl glow-blue"
          >
            {isLoggingIn ? (
              <>
                <Loader2 size={18} className="animate-spin mr-2" />
                Signing in...
              </>
            ) : (
              <>
                <Shield size={18} className="mr-2" />
                Sign in with Internet Identity
              </>
            )}
          </Button>

          {/* Guest option */}
          <div className="text-center">
            <span className="text-gray-500 text-xs">or </span>
            <button
              type="button"
              onClick={() => setCurrentView('chat')}
              className="text-gray-400 text-xs hover:text-white underline underline-offset-2 transition-colors"
            >
              Continue as guest
            </button>
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          Jarvis Super AI · Powered by ICP & Gemini
        </p>
      </div>
    </div>
  );
}
