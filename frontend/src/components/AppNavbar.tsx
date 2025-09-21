import { Button } from "@heroui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  HomeIcon,
  UserCircleIcon,
  BellIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BuildingStorefrontIcon,
  ChevronDownIcon
} from "@heroicons/react/24/outline";
import { Avatar } from "@heroui/avatar";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Badge } from "@heroui/badge";

export const AppNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 shadow-sm">
      <div className="flex items-center justify-end">
        {/* Right side - User actions */}
        {user && (
          <div className="flex items-center gap-4">
            {/* Notification button */}
            <Button
              isIconOnly
              variant="light"
              className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <div className="relative">
                <BellIcon className="w-5 h-5" />
                <Badge
                  content="3"
                  color="danger"
                  className="absolute -top-1 -right-1 min-w-[16px] h-[16px] text-[10px] p-0"
                >
                  3
                </Badge>
              </div>
            </Button>

            {/* Settings button */}
            <Button
              isIconOnly
              variant="light"
              className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              onPress={() => navigate("/settings")}
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </Button>

            {/* User menu dropdown */}
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button
                  variant="light"
                  className="p-1 h-auto data-[hover=true]:bg-slate-100 dark:data-[hover=true]:bg-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      isBordered
                      className="transition-transform"
                      name={user.name}
                      size="sm"
                      src=""
                      fallback={
                        <div className="w-full h-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white text-xs font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      }
                    />
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {user.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {user.role || "ผู้ดูแลระบบ"}
                      </p>
                    </div>
                    <ChevronDownIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </div>
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Profile Actions" variant="flat">
                <DropdownItem key="profile" className="h-14 gap-2">
                  <p className="font-semibold"> signed in as</p>
                  <p className="font-semibold">{user.name}</p>
                </DropdownItem>
                <DropdownItem key="settings" onPress={() => navigate("/settings")}>
                  <div className="flex items-center gap-2">
                    <Cog6ToothIcon className="w-4 h-4" />
                    การตั้งค่า
                  </div>
                </DropdownItem>
                <DropdownItem key="api-keys" onPress={() => navigate("/api-keys")}>
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    จัดการ API Keys
                  </div>
                </DropdownItem>
                <DropdownItem key="profile" onPress={() => navigate("/profile")}>
                  <div className="flex items-center gap-2">
                    <UserCircleIcon className="w-4 h-4" />
                    โปรไฟล์
                  </div>
                </DropdownItem>
                <DropdownItem key="divider" />
                <DropdownItem
                  key="logout"
                  color="danger"
                  onPress={handleLogout}
                  className="text-danger"
                >
                  <div className="flex items-center gap-2">
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    ออกจากระบบ
                  </div>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        )}
      </div>
    </nav>
  );
};