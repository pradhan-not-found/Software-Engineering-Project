import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-black font-sans selection:bg-black/20 dark:selection:bg-white/20 transition-colors duration-300">
      
      {/* Left Side: Form Container */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-center px-8 sm:px-16 md:px-24 py-12 overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          {children}
        </div>
      </div>

      {/* Right Side: Visual/Image Container */}
      <div className="hidden lg:block lg:w-[55%] xl:w-[60%] relative bg-black">
        <Image
          src="/bg.png"
          alt="Office Atmosphere"
          fill
          className="object-cover grayscale"
          priority
        />
        {/* Complex granular overlay to match the premium "noise" look */}
        <div className="absolute inset-0 bg-black/20 mix-blend-multiply"></div>
        <div 
          className="absolute inset-0 opacity-[0.15] mix-blend-overlay"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
        ></div>
        
        {/* Caption */}
        <div className="absolute bottom-10 right-10 text-right z-10">
          <p className="text-white/80 font-medium text-sm tracking-wide bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10">
            The daily routine of an employee...<br/>
            can be made much simpler.
          </p>
        </div>
      </div>

    </div>
  );
}
