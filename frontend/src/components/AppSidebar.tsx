import { Menu, MenuItem } from "@heroui/menu";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useState } from "react";
import {
  HomeIcon,
  TableCellsIcon,
  PlusIcon,
  DocumentTextIcon,
  UsersIcon,
  TagIcon,
  ChartBarIcon,
  CogIcon,
  UserIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BuildingStorefrontIcon,
  UserCircleIcon,
  KeyIcon,
  CalendarIcon,
  ChartPieIcon,
} from "@heroicons/react/24/outline";

const menuSections = [
  {
    title: "หลัก",
    items: [
      { label: "แดชบอร์ด", href: "/", icon: HomeIcon },
    ]
  },
  {
    title: "การจัดการ",
    items: [
      { label: "โต๊ะ", href: "/tables", icon: TableCellsIcon },
      { label: "เปิดโต๊ะ", href: "/table-open", icon: PlusIcon },
      { label: "บิล", href: "/bills", icon: DocumentTextIcon },
      { label: "ลูกค้า", href: "/customers", icon: UsersIcon },
      { label: "โปรโมชั่น", href: "/promotions", icon: TagIcon },
    ]
  },
  {
    title: "ระบบ",
    items: [
      {
        label: "รายงาน",
        href: "/reports",
        icon: ChartBarIcon,
        subItems: [
          { label: "รายงานประจำวัน", href: "/reports/daily", icon: CalendarIcon },
          { label: "รายงานประจำเดือน", href: "/reports/monthly", icon: ChartPieIcon },
        ]
      },
      { label: "การตั้งค่า", href: "/settings", icon: CogIcon },
      { label: "ผู้ใช้", href: "/users", icon: UserIcon },
      { label: "จัดการ API Key", href: "/api-keys", icon: KeyIcon },
    ]
  }
];

export const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleSection = (sectionTitle: string) => {
    if (isCollapsed) return;
    setExpandedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <div className={`bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-r border-slate-200 dark:border-slate-700 h-full flex flex-col transition-all duration-300 shadow-lg ${isCollapsed ? 'w-20' : 'w-72'}`}>
      {/* Logo/Brand Section */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
        <Link
          to="/"
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} hover:opacity-80 transition-opacity`}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
            <BuildingStorefrontIcon className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">GrillPork</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">ระบบจัดการร้านอาหาร</p>
            </div>
          )}
        </Link>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRightIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          )}
        </button>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-auto py-4 px-2">
        {menuSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-4">
            {!isCollapsed && (
              <h3 className="px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isItemActive = isActive(item.href);
                const isExpanded = expandedSections[item.label];
                
                return (
                  <div key={item.href} className="relative">
                    <Link
                      to={hasSubItems ? '#' : item.href}
                      onClick={(e) => {
                        if (hasSubItems) {
                          e.preventDefault();
                          toggleSection(item.label);
                        } else {
                          navigate(item.href);
                        }
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                        isItemActive
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 flex-shrink-0 ${isItemActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-orange-500 dark:group-hover:text-orange-400'}`} />
                      {!isCollapsed && (
                        <>
                          <span className={`font-medium ${isItemActive ? 'text-white' : ''}`}>
                            {item.label}
                          </span>
                          {hasSubItems && (
                            <div className="ml-auto transition-transform duration-200">
                              {isExpanded ? (
                                <ChevronDownIcon className="w-4 h-4 text-white" />
                              ) : (
                                <ChevronRightIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </Link>
                    
                    {/* Sub-items */}
                    {hasSubItems && !isCollapsed && isExpanded && (
                      <div className="ml-8 mt-1 space-y-1">
                        {item.subItems?.map((subItem) => (
                          <Link
                            key={subItem.href}
                            to={subItem.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                              isActive(subItem.href)
                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-l-2 border-orange-500'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <subItem.icon className={`w-4 h-4 flex-shrink-0 ${isActive(subItem.href) ? 'text-orange-500' : 'text-slate-400'}`} />
                            <span className="text-sm">{subItem.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
        <Link
          to="/profile"
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
        >
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center shadow-md">
              <UserCircleIcon className="w-6 h-6 text-white" />
            </div>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-orange-600 dark:group-hover:text-orange-400">
                ผู้ดูแลระบบ
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                admin@grillpork.com
              </p>
            </div>
          )}
        </Link>
      </div>
    </div>
  );
};