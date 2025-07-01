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
  
  if (breadcrumbItems.length <= 1) {
    return null;
  }
  
  return (
    <nav className="bg-white border-b border-gray-200 py-3">
      <div className="container mx-auto px-4">
        <ol className="flex items-center space-x-2 text-sm">
          {breadcrumbItems.map((item, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="text-gray-400 mx-2">/</span>
              )}
              {item.href ? (
                <Link 
                  href={item.href}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-700 font-medium">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}