'use client';

import Link from "next/link";
import { useState } from "react";

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="bg-blue-600 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold hover:text-blue-200 transition-colors">
          ROIC分析システム
        </Link>
        <div className="hidden md:flex space-x-6">
          <Link href="/" className="hover:text-blue-200 transition-colors font-medium">
            ホーム
          </Link>
          <Link href="/dashboard" className="hover:text-blue-200 transition-colors font-medium">
            進捗ダッシュボード
          </Link>
          <Link href="/functional-spec" className="hover:text-blue-200 transition-colors font-medium">
            機能設計書
          </Link>
          <Link href="/test-docs/test-spec" className="hover:text-blue-200 transition-colors font-medium">
            テスト仕様書
          </Link>
          <Link href="/companies" className="hover:text-blue-200 transition-colors font-medium">
            企業検索
          </Link>
        </div>
        
        {/* Mobile menu button */}
        <div className="md:hidden">
          <button 
            className="text-white hover:text-blue-200 focus:outline-none"
            onClick={toggleMobileMenu}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden mt-4 space-y-2`}>
        <Link href="/" className="block py-2 px-4 hover:bg-blue-700 rounded transition-colors">
          ホーム
        </Link>
        <Link href="/dashboard" className="block py-2 px-4 hover:bg-blue-700 rounded transition-colors">
          進捗ダッシュボード
        </Link>
        <Link href="/functional-spec" className="block py-2 px-4 hover:bg-blue-700 rounded transition-colors">
          機能設計書
        </Link>
        <Link href="/test-docs/test-spec" className="block py-2 px-4 hover:bg-blue-700 rounded transition-colors">
          テスト仕様書
        </Link>
        <Link href="/companies" className="block py-2 px-4 hover:bg-blue-700 rounded transition-colors">
          企業検索
        </Link>
      </div>
    </nav>
  );
}