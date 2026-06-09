import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SignInPage } from "./SignInPage";
import { SignUpPage } from "./SignUpPage";

interface AuthModalProps {
  mode: "signin" | "signup";
}

export const AuthModal: React.FC<AuthModalProps> = ({ mode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const background = (location.state as { background?: unknown } | null)?.background;

  const handleClose = () => {
    navigate(-1);
  };

  const handleSwitchMode = () => {
    const target = mode === "signin" ? "/signup" : "/signin";
    navigate(target, { state: { background }, replace: true });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-md"
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="absolute -top-3 -right-3 z-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-lg text-lg leading-none"
        >
          ×
        </button>
        {mode === "signin" ? (
          <SignInPage onClose={handleClose} onSwitchMode={handleSwitchMode} />
        ) : (
          <SignUpPage onClose={handleClose} onSwitchMode={handleSwitchMode} />
        )}
      </div>
    </div>
  );
};
