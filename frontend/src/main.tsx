import { createRoot } from "react-dom/client";
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import App from "./App.tsx";
import "./styles/index.css";
import "./i18n";

const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // Google Test Site Key

createRoot(document.getElementById("root")!).render(
  <GoogleReCaptchaProvider reCaptchaKey={recaptchaKey}>
    <App />
  </GoogleReCaptchaProvider>
);