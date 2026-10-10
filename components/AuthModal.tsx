import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SignInPage } from "./SignInPage";
import { SignUpPage } from "./SignUpPage";
import { Modal } from "./Modal";

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

  // The sign-in/up pages render their own card; strip its chrome so the modal panel provides it.
  return (
    <Modal
      onClose={handleClose}
      size="md"
      bodyClassName="p-0 pb-[env(safe-area-inset-bottom)] sm:pb-0 [&>div]:max-w-none [&>div]:border-0 [&>div]:rounded-none [&>div]:shadow-none [&>div]:bg-transparent [&>div>h1]:pr-10"
    >
      {mode === "signin" ? (
        <SignInPage onClose={handleClose} onSwitchMode={handleSwitchMode} />
      ) : (
        <SignUpPage onClose={handleClose} onSwitchMode={handleSwitchMode} />
      )}
    </Modal>
  );
};
