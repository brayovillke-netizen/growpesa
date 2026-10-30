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

export function useBiometrics() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (window.PublicKeyCredential) setIsSupported(true);
    setIsEnabled(localStorage.getItem('GrowPesa_biometric_enabled') === 'true');
  }, []);

  const enableBiometrics = async (phoneNumber: string) => {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge); // SECURE CHALLENGE

      const userID = new Uint8Array(16);
      window.crypto.getRandomValues(userID);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'GrowPesa Vault' },
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
      localStorage.setItem('GrowPesa_biometric_id', credentialId);
      localStorage.setItem('GrowPesa_biometric_phone', phoneNumber);
      localStorage.setItem('GrowPesa_biometric_enabled', 'true');
      setIsEnabled(true);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const disableBiometrics = () => {
    localStorage.removeItem('GrowPesa_biometric_enabled');
    localStorage.removeItem('GrowPesa_biometric_id');
    localStorage.removeItem('GrowPesa_biometric_phone');
    setIsEnabled(false);
  };

  const loginWithBiometrics = async (): Promise<string | null> => {
    try {
      const credentialIdBase64 = localStorage.getItem('GrowPesa_biometric_id');
      const phone = localStorage.getItem('GrowPesa_biometric_phone');
      
      if (!credentialIdBase64 || !phone) return null;

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge); // SECURE CHALLENGE FIX

      await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{
            id: base64ToBuffer(credentialIdBase64),
            type: 'public-key',
          }],
          userVerification: 'required',
          timeout: 60000,
        }
      });

      return phone;
    } catch (err) {
      console.error('Biometric login failed', err);
      return null;
    }
  };

  return { isEnabled, isSupported, enableBiometrics, disableBiometrics, loginWithBiometrics };
}