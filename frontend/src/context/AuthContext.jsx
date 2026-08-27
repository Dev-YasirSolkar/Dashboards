import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail
} from '../firebase';
import { api } from '../api';

// MASTER ADMIN UID WHITELIST (Strictly Super Admin)
export const ADMIN_UIDS = [
  'juoQofnkViXcZn9Cg1F6haV8Q2j2'
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userStatus, setUserStatus] = useState('LOADING'); // 'APPROVED' | 'PENDING' | 'REJECTED' | 'LOADING'
  const [userRecord, setUserRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  // Strict role determination: only users with UID in ADMIN_UIDS get ADMIN role
  const isUidAdmin = currentUser && currentUser.uid ? ADMIN_UIDS.includes(currentUser.uid) : false;
  const isAdmin = isUidAdmin;
  const role = isAdmin ? 'ADMIN' : (userRecord?.role || 'STAFF');

  // Sync user with backend database on login
  const syncWithBackend = async (firebaseUser) => {
    if (!firebaseUser) {
      setUserStatus('LOADING');
      setUserRecord(null);
      return;
    }

    try {
      localStorage.setItem('ve_user_uid', firebaseUser.uid);
    } catch (e) {}

    // Super Admin bypass - Instant Approve
    if (ADMIN_UIDS.includes(firebaseUser.uid)) {
      setUserStatus('APPROVED');
      try {
        const res = await api.registerOrSyncUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'Master Admin'
        });
        if (res.success && res.user) {
          setUserRecord(res.user);
        }
      } catch (err) {
        console.warn('Admin backend sync warn:', err);
      }
      return;
    }

    // Non-admin user sync
    try {
      const res = await api.registerOrSyncUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User')
      });
      if (res && res.success) {
        setUserStatus(res.status || 'PENDING');
        if (res.user) setUserRecord(res.user);
      } else {
        setUserStatus('PENDING');
      }
    } catch (err) {
      console.error('Failed to sync user with backend:', err);
      // Fallback status check
      try {
        const check = await api.getUserStatus(firebaseUser.uid);
        if (check && check.success) {
          setUserStatus(check.status || 'PENDING');
          if (check.user) setUserRecord(check.user);
        } else {
          setUserStatus('PENDING');
        }
      } catch (e) {
        setUserStatus('PENDING');
      }
    }
  };

  // Re-check live status on demand
  const refreshUserStatus = async () => {
    if (!currentUser) return;
    if (ADMIN_UIDS.includes(currentUser.uid)) {
      setUserStatus('APPROVED');
      return 'APPROVED';
    }

    try {
      const res = await api.getUserStatus(currentUser.uid);
      if (res.success) {
        setUserStatus(res.status || 'PENDING');
        if (res.user) setUserRecord(res.user);
        return res.status;
      }
    } catch (err) {
      console.error('Refresh status error:', err);
    }
    return userStatus;
  };

  // Configure persistence according to rememberMe preference
  const applyPersistence = async (rememberMe = true) => {
    try {
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);
      localStorage.setItem('ve_remember_login', rememberMe ? 'true' : 'false');
    } catch (err) {
      console.warn('Could not set persistence:', err);
    }
  };

  // Sign In with Email & Password
  const loginWithEmail = async (email, password, rememberMe = true) => {
    await applyPersistence(rememberMe);
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    await syncWithBackend(cred.user);
    return cred;
  };

  // Create New Account
  const signupWithEmail = async (email, password, rememberMe = true) => {
    await applyPersistence(rememberMe);
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await syncWithBackend(cred.user);
    return cred;
  };

  // Sign In with Google
  const loginWithGoogle = async (rememberMe = true) => {
    await applyPersistence(rememberMe);
    const cred = await signInWithPopup(auth, googleProvider);
    await syncWithBackend(cred.user);
    return cred;
  };

  // Sign Out
  const logout = async () => {
    try {
      localStorage.removeItem('ve_user_uid');
      localStorage.removeItem('ve_remember_login');
    } catch (e) {}
    setUserStatus('LOADING');
    setUserRecord(null);
    setCurrentUser(null);
    return signOut(auth);
  };

  // Forgot Password / Password Reset
  const resetPassword = async (email) => {
    return sendPasswordResetEmail(auth, email.trim());
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await syncWithBackend(user);
      } else {
        setUserStatus('LOADING');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    userRecord,
    userStatus,
    loading,
    role,
    isAdmin,
    ADMIN_UIDS,
    loginWithEmail,
    signupWithEmail,
    loginWithGoogle,
    logout,
    resetPassword,
    refreshUserStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
