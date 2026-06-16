import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { AlertCircle, User, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from 'react-hot-toast';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { authService } from "../../services";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";

export function Login() {
  const { t } = useTranslation();

  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // MFA states
  const [showMfaInput, setShowMfaInput] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [tempUserId, setTempUserId] = useState<number | null>(null);

  const { executeRecaptcha } = useGoogleReCaptcha();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      let recaptchaToken = undefined;
      if (executeRecaptcha) {
        recaptchaToken = await executeRecaptcha('login');
      }

      const response = await authService.login({ 
        email: email.trim(), 
        password, 
        recaptchaToken 
      });
      
      if (response.data.requires_mfa) {
        setTempUserId(response.data.user_id);
        setShowMfaInput(true);
        setIsLoading(false);
        return;
      }

      const { access_token, user } = response.data;
      
      authService.saveToken(access_token);
      localStorage.setItem("userRole", user.role.toLowerCase());
      localStorage.setItem("user", JSON.stringify(user));
      
      if (user.role === "ADMIN") {
        navigate("/admin-dashboard");
      } else if (user.role === "INSTRUCTOR") {
        navigate("/instructor-dashboard");
      } else {
        navigate("/student-dashboard");
      }
    } catch (err: any) {
      toast.error(t("login_failed"));
      if (err.response?.data?.message) {
        // Có thể là Array message (Validation) hoặc string (Blacklist/Unauthorized)
        const msg = err.response.data.message;
        setErrorMessage(Array.isArray(msg) ? msg[0] : msg);
      } else {
        setErrorMessage(t("login_failed_network"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUserId) return;
    
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      const response = await authService.verifyMfa({ userId: tempUserId, code: mfaCode });
      const { access_token, user } = response.data;
      
      authService.saveToken(access_token);
      localStorage.setItem("userRole", user.role.toLowerCase());
      localStorage.setItem("user", JSON.stringify(user));
      
      if (user.role === "ADMIN") {
        navigate("/admin-dashboard");
      } else if (user.role === "INSTRUCTOR") {
        navigate("/instructor-dashboard");
      } else {
        navigate("/student-dashboard");
      }
    } catch (err: any) {
      toast.error(t("verify_mfa_failed"));
      if (err.response?.data?.message) {
        const msg = err.response.data.message;
        setErrorMessage(Array.isArray(msg) ? msg[0] : msg);
      } else {
        setErrorMessage(t("invalid_mfa_code"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-sans relative overflow-hidden bg-[#0F172A]">
      {/* Background Image & Overlay */}
      <ImageWithFallback 
        src="https://images.unsplash.com/photo-1759092912891-9f52486bb059?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB1bml2ZXJzaXR5JTIwbGFib3JhdG9yeSUyMGJ1aWxkaW5nfGVufDF8fHx8MTc3ODQwODk2OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
        alt="University Laboratory Background"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#1E5FA5]/90 via-[#0F172A]/95 to-[#020617]/95 z-0"></div>

      {/* Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500 rounded-full mix-blend-screen filter blur-[150px] opacity-30 animate-pulse z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-500 rounded-full mix-blend-screen filter blur-[150px] opacity-20 animate-pulse delay-1000 z-0"></div>

      {/* Main Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-[1000px] flex rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-xl border border-white/10 mx-4">
        
        {/* Left Brand Panel (Only visible on lg+) */}
        <div className="hidden lg:flex w-1/2 flex-col items-center justify-center p-12 text-center bg-slate-900 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800/80 to-black/90"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-28 h-28 bg-white dark:bg-slate-900/95 rounded-full p-3 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(255,255,255,0.2)] ring-8 ring-white/20 backdrop-blur-md transition-transform hover:scale-105 duration-500">
              <img src="/Logo-Dai-Hoc-Viet-Nhat-VJU.png" alt="VJU Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-[40px] font-black text-white tracking-tight mb-2 drop-shadow-lg dark:shadow-slate-900/50">
              LabBook
            </h1>
            <p className="text-[#E2E8F0] text-[18px] font-medium mb-12 drop-shadow-md dark:shadow-slate-900/50">
              {t("system_description")}
            </p>
            <div className="px-6 py-2 bg-white/10 dark:bg-slate-900/30 rounded-full backdrop-blur-md border border-white/20 shadow-inner">
              <p className="text-white text-[13px] font-bold tracking-widest uppercase">{t("vju")}</p>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="flex-1 w-full lg:w-1/2 p-8 sm:p-12 md:p-14 bg-white dark:bg-slate-900 flex flex-col justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-slate-800/40 dark:to-slate-900/10 pointer-events-none"></div>
          
          <div className="w-full max-w-[380px] mx-auto relative z-10">
            {/* Logo on small screens */}
            <div className="lg:hidden flex justify-center mb-8">
               <div className="w-20 h-20 bg-[#1E5FA5] dark:bg-blue-600 rounded-2xl p-2 flex items-center justify-center shadow-lg dark:shadow-slate-900/50">
                 <img src="/Logo-Dai-Hoc-Viet-Nhat-VJU.png" alt="VJU Logo" className="w-full h-full object-contain brightness-0 invert" />
               </div>
            </div>

            <div className="text-center lg:text-left mb-8">
              <h2 className="text-[32px] font-black text-[#1E293B] dark:text-white tracking-tight mb-2">{t("login")}</h2>
              <p className="text-[15px] text-[#64748B] dark:text-slate-400 font-medium">{t("welcome_back")}</p>
            </div>

            {/* Security Requirement / Blacklist Info */}
            {errorMessage && (
              <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-semibold">{errorMessage}</p>
                </div>
              </div>
            )}

            {showMfaInput ? (
              <form onSubmit={handleMfaVerify} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <label className="block text-[14px] font-bold text-[#334155] dark:text-slate-300" htmlFor="mfaCode">
                    {t("mfa_code_label")}
                  </label>
                  <div className="relative group">
                    <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] group-focus-within:text-[#1E5FA5] dark:text-blue-400 transition-colors" />
                    <input
                      id="mfaCode"
                      type="text"
                      maxLength={6}
                      required
                      value={mfaCode}
                      onChange={(e) => { setMfaCode(e.target.value.replace(/[^0-9]/g, '')); setErrorMessage(""); }}
                      className={`w-full pl-11 pr-4 h-[48px] rounded-xl border bg-[#F8FAFC] dark:bg-slate-800 focus:bg-white dark:bg-slate-900 dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50 focus:border-transparent transition-all text-[15px] text-[#0F172A] dark:text-white shadow-sm dark:shadow-slate-900/50 tracking-[0.25em] font-mono font-bold ${errorMessage ? 'border-red-300 dark:border-red-700 focus:ring-red-500' : 'border-[#E2E8F0] dark:border-slate-700'}`}
                      placeholder="000000"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || mfaCode.length !== 6}
                  className="w-full bg-[#1E5FA5] dark:bg-blue-600 hover:bg-[#0F172A] text-white font-bold h-[52px] rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50/30 flex justify-center items-center gap-2 text-[15px] disabled:opacity-70 disabled:cursor-not-allowed mt-4 shadow-lg dark:shadow-slate-900/50 hover:shadow-xl dark:shadow-slate-900/50 hover:-translate-y-0.5"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t("verifying")}
                    </>
                  ) : t("verify")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMfaInput(false);
                    setMfaCode("");
                    setErrorMessage("");
                  }}
                  className="w-full bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-[#64748B] dark:text-slate-400 font-bold h-[48px] rounded-xl transition-all duration-300 flex justify-center items-center text-[14px]"
                >
                  {t("back_to_login")}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-[14px] font-bold text-[#334155] dark:text-slate-300" htmlFor="email">
                    {t("username_or_email")}
                  </label>
                  <div className="relative group">
                    <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] group-focus-within:text-[#1E5FA5] dark:text-blue-400 transition-colors" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrorMessage(""); }}
                      className={`w-full pl-11 pr-4 h-[48px] rounded-xl border bg-[#F8FAFC] dark:bg-slate-800 focus:bg-white dark:bg-slate-900 dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50 focus:border-transparent transition-all text-[15px] text-[#0F172A] dark:text-white shadow-sm dark:shadow-slate-900/50 ${errorMessage ? 'border-red-300 dark:border-red-700 focus:ring-red-500' : 'border-[#E2E8F0] dark:border-slate-700'}`}
                      placeholder="vd: nguyen_van_a"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-[14px] font-bold text-[#334155] dark:text-slate-300" htmlFor="password">
                    {t("password")}
                  </label>
                  <div className="relative group">
                    <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] group-focus-within:text-[#1E5FA5] dark:text-blue-400 transition-colors" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrorMessage(""); }}
                      className={`w-full pl-11 pr-12 h-[48px] rounded-xl border bg-[#F8FAFC] dark:bg-slate-800 focus:bg-white dark:bg-slate-900 dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50 focus:border-transparent transition-all text-[15px] text-[#0F172A] dark:text-white shadow-sm dark:shadow-slate-900/50 ${errorMessage ? 'border-red-300 dark:border-red-700 focus:ring-red-500' : 'border-[#E2E8F0] dark:border-slate-700'}`}
                      placeholder="••••••••"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#1E5FA5] dark:text-blue-400 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input type="checkbox" className="peer appearance-none w-5 h-5 border-2 border-[#CBD5E1] dark:border-slate-600 rounded md:rounded-md checked:bg-[#1E5FA5] dark:bg-blue-600 checked:border-[#1E5FA5] transition-colors cursor-pointer" />
                      <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-[14px] font-medium text-[#475569] dark:text-slate-400 group-hover:text-[#1E293B] dark:group-hover:text-slate-200 transition-colors">{t("remember_me")}</span>
                  </label>
                  <Link to="/forgot-password" className="text-[14px] font-bold text-[#1E5FA5] dark:text-blue-400 hover:text-[#0F172A] dark:text-slate-100 dark:hover:text-blue-400 transition-colors">
                    Quên mật khẩu?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#1E5FA5] dark:bg-blue-600 hover:bg-[#0F172A] text-white font-bold h-[52px] rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50/30 flex justify-center items-center gap-2 text-[15px] disabled:opacity-70 disabled:cursor-not-allowed mt-4 shadow-lg dark:shadow-slate-900/50 hover:shadow-xl dark:shadow-slate-900/50 hover:-translate-y-0.5"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t("processing_btn")}
                    </>
                  ) : t("login_now")}
                </button>
              </form>
            )}

            <div className="mt-8 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E2E8F0] dark:border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-[13px] font-medium">
                <span className="bg-white dark:bg-slate-900 px-4 text-[#94A3B8] dark:text-slate-500">{t("or")}</span>
              </div>
            </div>

            <div className="mt-8 text-center bg-[#F8FAFC] dark:bg-slate-800/50 rounded-xl p-4 border border-[#E2E8F0] dark:border-slate-700">
              <p className="text-[14px] text-[#64748B] dark:text-slate-400 font-medium">
                {t("access_issue")} <a href="#" className="text-[#1E5FA5] dark:text-blue-400 font-bold hover:underline ml-1 transition-colors">{t("contact_admin")}</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
