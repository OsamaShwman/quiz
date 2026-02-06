
import React from 'react';
import { useAppStore } from '../store';
import { TOKENS } from '../constants';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, setLanguage } = useAppStore();

  return (
    <div className="min-h-screen bg-white flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="bg-white/90 backdrop-blur-md border-b border-[#e2e8f0] sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-4">
              <div className="group flex items-center gap-3">
                <img
                  src="https://file-upload-lambda-bucket-2025.s3.amazonaws.com/uploads/20260203_144426_String.jpg"
                  alt="String Education"
                  className="h-10 w-auto object-contain rounded-lg"
                />
                <span className="text-xl font-bold tracking-tight text-[#091e42]">Quiz</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                className={`${TOKENS.typography.xs} px-4 py-2 rounded-full border border-[#e2e8f0] hover:bg-[#f8fafc] transition-colors text-[#091e42]`}
              >
                {language === 'en' ? 'Arabic' : 'English'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-12 py-10 relative">
        {children}
      </main>
    </div>
  );
};
