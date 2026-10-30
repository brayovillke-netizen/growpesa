'use client';
import { useState, useEffect } from 'react';

function bufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function BiometricLock({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (window.PublicKeyCredential) {
      setIsSupported(true);
      const enabled = localStorage.getItem('tibapay_biometric_enabled');
      if (enabled === 'true') {
        setIsLocked(true);
      }
    }
  }, []);

  const unlock = async () => {
    try {
      setError('');
      const credentialIdBase64 = localStorage.getItem('tibapay_biometric_id');
      if (!credentialIdBase64) throw new Error('No biometric credentials found.');

      await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          allowCredentials: [{
            id: base64ToBuffer(credentialIdBase64),
            type: 'public-key',
          }],
          userVerification: 'required',
          timeout: 60000,
        }
      });

      setIsLocked(false);
    } catch (err: any) {
      console.error(err);
      setError('Authentication failed. Please try again.');
    }
  };

  if (!isSupported || !isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
        <span className="text-4xl">🔒</span>
      </div>
      <h2 className="text-2xl font-black text-white mb-2">TibaPay Locked</h2>
      <p className="text-slate-400 text-sm mb-8 text-center">Authenticate to access your vault.</p>
      
      {error && <p className="text-rose-400 text-xs mb-4 font-bold">{error}</p>}

      <button
        onClick={unlock}
        className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-2xl shadow-lg hover:scale-105 transition"
      >
        Unlock with Biometrics
      </button>
    </div>
  );
}

export function useBiometrics() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (window.PublicKeyCredential) setIsSupported(true);
    setIsEnabled(localStorage.getItem('tibapay_biometric_enabled') === 'true');
  }, []);

  const enableBiometrics = async (phoneNumber: string) => {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const userID = new Uint8Array(16);
      window.crypto.getRandomValues(userID);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'TibaPay Vault' },
          user: {
            id: userID,
            name: phoneNumber,
            displayName: phoneNumber,
          },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: { userVerification: 'required' },
          timeout: 60000,
        }
      }) as PublicKeyCredential;

      const credentialId = bufferToBase64(credential.rawId);
      localStorage.setItem('tibapay_biometric_id', credentialId);
      localStorage.setItem('tibapay_biometric_phone', phoneNumber); // Save phone for login
      localStorage.setItem('tibapay_biometric_enabled', 'true');
      setIsEnabled(true);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const disableBiometrics = () => {
    localStorage.removeItem('tibapay_biometric_enabled');
    localStorage.removeItem('tibapay_biometric_id');
    localStorage.removeItem('tibapay_biometric_phone');
    setIsEnabled(false);
  };

  const loginWithBiometrics = async (): Promise<string | null> => {
    try {
      const credentialIdBase64 = localStorage.getItem('tibapay_biometric_id');
      const phone = localStorage.getItem('tibapay_biometric_phone');
      
      if (!credentialIdBase64 || !phone) return null;

      await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          allowCredentials: [{
            id: base64ToBuffer(credentialIdBase64),
            type: 'public-key',
          }],
          userVerification: 'required',
          timeout: 60000,
        }
      });

      return phone; // Return the saved phone number on success
    } catch (err) {
      console.error('Biometric login failed', err);
      return null;
    }
  };

  return { isEnabled, isSupported, enableBiometrics, disableBiometrics, loginWithBiometrics };
}