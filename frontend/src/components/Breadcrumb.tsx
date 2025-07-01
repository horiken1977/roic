'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const routeMap: Record<string, string> = {
  '/': 'ホーム',
  '/dashboard': '進捗ダッシュボード',
  '/functional-spec': '機能設計書',
  '/test-docs': 'テスト文書',
  '/test-docs/test-spec': 'テスト仕様書',
  '/test-docs/test-plan': 'テスト計画書',
  '/companies': '企業検索',
};

export default function Breadcrumb() {
  const pathname = usePathname();
  
  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [{ label: 'ホーム', href: '/' }];
    
    if (pathname === '/') {
      return [{ label: 'ホーム' }];
    }
    
    const segments = pathname.split('/').filter(Boolean);
    let currentPath = '';
    
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      
      if (routeMap[currentPath]) {
        items.push({
          label: routeMap[currentPath],
          href: isLast ? undefined : currentPath
        });
      }
    });
    
    return items;
  };
  
  const breadcrumbItems = getBreadcrumbItems();
  
  // Always show breadcrumb for better navigation
  if (breadcrumbItems.length <= 1 && pathname === '/') {
    return null; // Only hide on home page
  }
  
  return (
    <nav className="bg-gray-50 border-b border-gray-300 py-3 shadow-sm">
      <div className="container mx-auto px-4">
        <ol className="flex items-center space-x-2 text-sm">
          {breadcrumbItems.map((item, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="text-gray-500 mx-2 font-medium">/</span>
              )}
              {item.href ? (
                <Link 
                  href={item.href}
                  className="text-blue-700 hover:text-blue-900 font-medium transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-900 font-semibold">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}