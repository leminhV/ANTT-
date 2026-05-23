import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Shield, AlertCircle, User, Lock, Eye, EyeOff } from "lucide-react";
import { authService } from "../../services";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(false);
    
    try {
      const response = await authService.login({ email, password });
      const { access_token, user } = response.data;
      
      authService.saveToken(access_token);
      localStorage.setItem("userRole", user.role.toLowerCase());
      localStorage.setItem("user", JSON.stringify(user));
      
      if (user.role === "ADMIN") {
        navigate("/admin-dashboard");
      } else {
        navigate("/student-dashboard");
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* Left Panel - Brand Panel (45%) */}
      <div className="hidden lg:flex w-[45%] relative bg-[#1E5FA5] overflow-hidden flex-col items-center justify-center p-12 text-center z-0">
        <ImageWithFallback 
          src="https://images.unsplash.com/photo-1759092912891-9f52486bb059?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB1bml2ZXJzaXR5JTIwbGFib3JhdG9yeSUyMGJ1aWxkaW5nfGVufDF8fHx8MTc3ODQwODk2OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="University Laboratory"
          className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay pointer-events-none"
        />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <span className="text-[#1E5FA5] text-3xl font-bold">L</span>
          </div>
          <h1 className="text-[32px] font-bold text-white tracking-tight mb-2">
            LabBook
          </h1>
          <p className="text-[#D6E4F7] text-[18px] font-medium mb-12">
            Quản lý phòng Lab thông minh
          </p>
          <div className="mt-auto pt-24">
            <p className="text-white/60 text-[14px]">Đại học Việt Nhật</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Panel (55%) */}
      <div className="flex-1 w-[55%] flex flex-col justify-center items-center px-[48px] bg-white relative">
        <div className="w-full max-w-[420px]">
          
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-[28px] font-bold text-[#212121] tracking-tight mb-2">Đăng nhập</h2>
            <p className="text-[14px] text-[#757575]">Chào mừng trở lại! Vui lòng đăng nhập để tiếp tục.</p>
          </div>

          {/* Security Requirement: Generic Error Message */}
          {error && (
            <div className="mb-6 flex items-start gap-3 p-3 rounded bg-[#FDEDED] border border-[#C62828] text-[#C62828] animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-medium">Tên đăng nhập hoặc mật khẩu không đúng.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[14px] font-medium text-[#212121]" htmlFor="email">
                Tên đăng nhập hoặc Email
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#757575]" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(false); }}
                  className={`w-full pl-10 pr-4 h-[44px] rounded-[8px] border bg-white focus:outline-none focus:ring-2 focus:ring-[#1E5FA5] transition-all text-[14px] ${error ? 'border-[#C62828]' : 'border-[#E0E0E0]'}`}
                  placeholder="vd: nguyen_van_a"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-[14px] font-medium text-[#212121]" htmlFor="password">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#757575]" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(false); }}
                  className={`w-full pl-10 pr-10 h-[44px] rounded-[8px] border bg-white focus:outline-none focus:ring-2 focus:ring-[#1E5FA5] transition-all text-[14px] ${error ? 'border-[#C62828]' : 'border-[#E0E0E0]'}`}
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#757575] hover:text-[#212121]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-[#E0E0E0] text-[#1E5FA5] focus:ring-[#1E5FA5] w-4 h-4" />
                <span className="text-[14px] text-[#212121]">Ghi nhớ đăng nhập</span>
              </label>
              <Link to="/forgot-password" className="text-[14px] font-medium text-[#1E5FA5] hover:underline">
                Quên mật khẩu?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#1E5FA5] hover:bg-[#154a85] text-white font-bold h-[48px] rounded-[8px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1E5FA5] focus:ring-offset-2 flex justify-center items-center gap-2 text-[14px] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang xử lý...
                </>
              ) : "Đăng nhập"}
            </button>
          </form>

          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E0E0E0]"></div>
            </div>
            <div className="relative flex justify-center text-[12px]">
              <span className="bg-white px-2 text-[#757575]">Hoặc</span>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-[13px] text-[#757575]">
              Cần hỗ trợ? <a href="#" className="text-[#1E5FA5] hover:underline">Liên hệ quản trị viên.</a>
            </p>
          </div>
        </div>
      </div>
      
      {/* Dev helper */}
      <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-xl text-xs text-[#212121] border border-[#E0E0E0] z-50">
        <p className="font-bold mb-2 border-b pb-1">Demo Logins</p>
        <p className="flex justify-between gap-4"><span>Student:</span> <span className="font-mono bg-[#F5F5F5] px-1 rounded">student@vju.ac.vn</span></p>
        <p className="flex justify-between gap-4 mt-1"><span>Admin:</span> <span className="font-mono bg-[#F5F5F5] px-1 rounded">admin@vju.ac.vn</span></p>
        <p className="mt-2 text-[10px] text-[#757575]">Password: <span className="font-mono">password</span></p>
      </div>
    </div>
  );
}
