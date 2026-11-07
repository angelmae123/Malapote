"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "malapote-auth";
const CHANGE_EVENT = "malapote-auth-change";

function subscribeToSession(callback) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSessionSnapshot() {
  const savedSession = window.sessionStorage.getItem(STORAGE_KEY);
  if (!savedSession) return "";

  try {
    JSON.parse(savedSession);
    return savedSession;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return "";
  }
}

function getServerSessionSnapshot() {
  return null;
}

export function AuthProvider({ children }) {
  const snapshot = useSyncExternalStore(
    subscribeToSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );
  const session = useMemo(() => {
    if (!snapshot) return null;
    try {
      return JSON.parse(snapshot);
    } catch {
      return null;
    }
  }, [snapshot]);
  const ready = snapshot !== null;

  const saveSession = useCallback((nextSession) => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const clearSession = useCallback(() => {
    window.sessionStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = useMemo(
    () => ({ session, ready, saveSession, clearSession }),
    [session, ready, saveSession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return value;
}
