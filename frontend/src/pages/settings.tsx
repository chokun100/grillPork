import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DefaultLayout from "@/layouts/default";
import { API_BASE_URL } from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Button,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Spinner,
  Divider,
  Checkbox,
  RadioGroup,
  Radio,
} from "@heroui/react";
import {
  Cog6ToothIcon,
  UserPlusIcon,
  PhoneIcon,
  IdentificationIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  UserIcon,
  LockClosedIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

interface Settings {
  adultPriceGross: number;
  currency: string;
  vatIncluded: boolean;
  vatRate: number;
  roundingMode: string;
  locales: string[];
  promptPayPhone?: string;
  promptPayId?: string;
}

interface UserFormData {
  name: string;
  username: string;
  password: string;
  role: "ADMIN" | "CASHIER" | "READ_ONLY";
  phone?: string;
  email?: string;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User creation modal
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [userForm, setUserForm] = useState<UserFormData>({
    name: "",
    username: "",
    password: "",
    role: "CASHIER",
    phone: "",
    email: "",
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/settings`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.ok) {
          setSettings(data.data);
        } else {
          setError(data.error?.message || "Failed to fetch settings");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSettings();
    }
  }, [token]);

  const handleSettingsChange = (key: keyof Settings, value: any) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : null);
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adultPriceGross: settings.adultPriceGross,
          currency: settings.currency,
          vatIncluded: settings.vatIncluded,
          vatRate: settings.vatRate,
          roundingMode: settings.roundingMode,
          locales: settings.locales,
          promptPayPhone: settings.promptPayPhone,
          promptPayId: settings.promptPayId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.ok) {
        alert("บันทึกการตั้งค่าเรียบร้อยแล้ว");
        // Refresh settings
        const refreshResponse = await fetch(`${API_BASE_URL}/settings`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData.ok) {
            setSettings(refreshData.data);
          }
        }
      } else {
        setError(data.error?.message || "Failed to save settings");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!userForm.name || !userForm.username || !userForm.password) {
      setUserError("กรุณากรอกข้อมูลที่จำเป็น");
      return;
    }

    try {
      setCreatingUser(true);
      setUserError(null);
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userForm),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.ok) {
        alert("สร้างผู้ใช้เรียบร้อยแล้ว");
        setUserForm({
          name: "",
          username: "",
          password: "",
          role: "CASHIER",
          phone: "",
          email: "",
        });
        onClose();
        // Refresh users list if needed
      } else {
        setUserError(data.error?.message || "Failed to create user");
      }
    } catch (err) {
      setUserError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleUserFormChange = (key: keyof UserFormData, value: string) => {
    setUserForm((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <DefaultLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">การตั้งค่า</h1>
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" />
          </div>
        </div>
      </DefaultLayout>
    );
  }

  if (error) {
    return (
      <DefaultLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">การตั้งค่า</h1>
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">การตั้งค่า</h1>
          <p className="mt-2 text-gray-600">จัดการการตั้งค่าระบบร้านอาหาร</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* General Settings */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Cog6ToothIcon className="w-5 h-5 text-blue-500" />
                <h2 className="text-xl font-semibold">การตั้งค่าทั่วไป</h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="adultPrice" className="block text-sm font-medium text-gray-700 mb-2">
                    ราคาต่อผู้ใหญ่ (บาท)
                  </label>
                  <Input
                    id="adultPrice"
                    type="number"
                    step="0.01"
                    value={settings?.adultPriceGross?.toString() || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        // Keep previous value
                      } else {
                        const num = parseFloat(value);
                        if (!isNaN(num) && num > 0) {
                          handleSettingsChange("adultPriceGross", num);
                        }
                      }
                    }}
                    placeholder="299.00"
                    startContent={<CurrencyDollarIcon className="w-4 h-4 text-gray-400" />}
                  />
                </div>
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">สกุลเงิน</label>
                  <Select
                    id="currency"
                    selectedKeys={settings?.currency}
                    onSelectionChange={(keys) => handleSettingsChange("currency", Array.from(keys)[0])}
                  >
                    <SelectItem key="THB">บาท (THB)</SelectItem>
                    <SelectItem key="USD">ดอลลาร์ (USD)</SelectItem>
                  </Select>
                </div>
              </div>

              <Divider />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  ภาษีมูลค่าเพิ่ม (VAT)
                </label>
                <div className="space-y-3">
                  <Checkbox
                    isSelected={settings?.vatIncluded}
                    onValueChange={(value) => handleSettingsChange("vatIncluded", value)}
                  >
                    ราคารวม VAT แล้ว
                  </Checkbox>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings?.vatRate ? (settings.vatRate * 100).toFixed(2) : ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        // Keep previous value
                      } else {
                        const num = parseFloat(value);
                        if (!isNaN(num)) {
                          handleSettingsChange("vatRate", num / 100);
                        }
                      }
                    }}
                    placeholder="7.00"
                    endContent={<ChartBarIcon className="w-4 h-4 text-gray-400" />}
                    disabled={!settings?.vatIncluded}
                  />
                </div>
              </div>

              <Divider />

              <div>
                <label htmlFor="locales" className="block text-sm font-medium text-gray-700 mb-3">ภาษาที่รองรับ</label>
                <Select
                  id="locales"
                  selectionMode="multiple"
                  selectedKeys={settings?.locales || []}
                  onSelectionChange={(keys) => handleSettingsChange("locales", Array.from(keys))}
                  placeholder="เลือกภาษา"
                  startContent={<GlobeAltIcon className="w-4 h-4 text-gray-400" />}
                >
                  <SelectItem key="th">ไทย</SelectItem>
                  <SelectItem key="en">English</SelectItem>
                </Select>
              </div>

              <Divider />

              <div>
                <label htmlFor="rounding" className="block text-sm font-medium text-gray-700 mb-3">โหมดปัดเศษ</label>
                <RadioGroup
                  id="rounding"
                  value={settings?.roundingMode}
                  onChange={(value) => handleSettingsChange("roundingMode", value)}
                >
                  <Radio value="NONE">ไม่ปัดเศษ</Radio>
                  <Radio value="UP">ปัดขึ้น</Radio>
                  <Radio value="DOWN">ปัดลง</Radio>
                  <Radio value="NEAREST">ปัดเศษเป็นทศนิยมที่ใกล้ที่สุด</Radio>
                </RadioGroup>
              </div>
            </CardBody>
          </Card>

          {/* PromptPay Settings */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <PhoneIcon className="w-5 h-5 text-green-500" />
                <h2 className="text-xl font-semibold">การตั้งค่า PromptPay</h2>
              </div>
            </CardHeader>
            <CardBody className="space-y-6">
              <div>
                <label htmlFor="promptPayPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  เบอร์โทรสำหรับ PromptPay (เบอร์ร้าน)
                </label>
                <Input
                  id="promptPayPhone"
                  type="tel"
                  value={settings?.promptPayPhone || ""}
                  onChange={(e) => handleSettingsChange("promptPayPhone", e.target.value)}
                  placeholder="08xxxxxxxx"
                  startContent={<PhoneIcon className="w-4 h-4 text-gray-400" />}
                />
                <p className="mt-1 text-xs text-gray-500">
                  เบอร์นี้จะใช้สำหรับสร้าง QR Code ชำระเงินของร้าน
                </p>
              </div>

              <Divider />

              <div>
                <label htmlFor="promptPayId" className="block text-sm font-medium text-gray-700 mb-2">
                  หมายเลขบัตรประชาชน (สำรอง)
                </label>
                <Input
                  id="promptPayId"
                  type="text"
                  value={settings?.promptPayId || ""}
                  onChange={(e) => handleSettingsChange("promptPayId", e.target.value)}
                  placeholder="1-XXXXX-XXXXXX-XX-X"
                  startContent={<IdentificationIcon className="w-4 h-4 text-gray-400" />}
                />
                <p className="mt-1 text-xs text-gray-500">
                  ใช้เป็นตัวเลือกสำรองหากเบอร์โทรไม่สามารถใช้งานได้
                </p>
              </div>

              <div className="pt-4">
                <p className="text-sm text-gray-600 mb-2">หมายเหตุ:</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• เบอร์โทรจะเป็นตัวหลักสำหรับ PromptPay QR</li>
                  <li>• หากไม่ตั้งค่า จะใช้เบอร์ลูกค้าแทน</li>
                  <li>• ระบบจะตรวจสอบเบอร์ก่อนสร้าง QR Code</li>
                </ul>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Save Settings Button */}
        <div className="flex justify-end mb-8">
          <Button
            color="primary"
            size="lg"
            onPress={handleSaveSettings}
            isLoading={saving}
            startContent={<Cog6ToothIcon className="w-4 h-4" />}
          >
            บันทึกการตั้งค่า
          </Button>
        </div>

        <Divider className="my-8" />

        {/* User Management */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-purple-500" />
              <h2 className="text-xl font-semibold">จัดการผู้ใช้</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-600">จัดการบัญชีผู้ใช้ในระบบ</p>
              <Button
                color="primary"
                startContent={<UserPlusIcon className="w-4 h-4" />}
                onPress={onOpen}
              >
                สร้างผู้ใช้ใหม่
              </Button>
            </div>

            {/* User List - Placeholder for now */}
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">รายชื่อผู้ใช้</h3>
              <p className="text-gray-500">รายชื่อผู้ใช้จะแสดงที่นี่</p>
              <p className="text-sm text-gray-400 mt-2">
                (เชื่อมต่อกับ API /users ในอนาคต)
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Create User Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="md">
          <ModalContent>
            <ModalHeader>
              <div className="flex items-center gap-2">
                <UserPlusIcon className="w-5 h-5 text-green-500" />
                <span className="text-lg font-semibold">สร้างผู้ใช้ใหม่</span>
              </div>
            </ModalHeader>
            <ModalBody>
              {userError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {userError}
                </div>
              )}
              <div className="space-y-4">
                <Input
                  label="ชื่อ-นามสกุล *"
                  value={userForm.name}
                  onChange={(e) => handleUserFormChange("name", e.target.value)}
                  placeholder="ชื่อผู้ใช้"
                  startContent={<UserIcon className="w-4 h-4 text-gray-400" />}
                />
                <Input
                  label="ชื่อผู้ใช้ *"
                  value={userForm.username}
                  onChange={(e) => handleUserFormChange("username", e.target.value)}
                  placeholder="username"
                  startContent={<UserIcon className="w-4 h-4 text-gray-400" />}
                />
                <Input
                  label="รหัสผ่าน *"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => handleUserFormChange("password", e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  startContent={<LockClosedIcon className="w-4 h-4 text-gray-400" />}
                />
                <Select
                  label="สิทธิ์การใช้งาน *"
                  selectedKeys={userForm.role}
                  onSelectionChange={(keys) => handleUserFormChange("role", Array.from(keys)[0] as UserFormData["role"])}
                >
                  <SelectItem key="ADMIN">ผู้ดูแลระบบ (Admin)</SelectItem>
                  <SelectItem key="CASHIER">พนักงานเก็บเงิน (Cashier)</SelectItem>
                  <SelectItem key="READ_ONLY">ดูอย่างเดียว (Read Only)</SelectItem>
                </Select>
                <Input
                  label="เบอร์โทร"
                  type="tel"
                  value={userForm.phone}
                  onChange={(e) => handleUserFormChange("phone", e.target.value)}
                  placeholder="08xxxxxxxx"
                  startContent={<PhoneIcon className="w-4 h-4 text-gray-400" />}
                />
                <Input
                  label="อีเมล"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => handleUserFormChange("email", e.target.value)}
                  placeholder="user@example.com"
                  startContent={<EnvelopeIcon className="w-4 h-4 text-gray-400" />}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                ยกเลิก
              </Button>
              <Button
                color="primary"
                onPress={handleCreateUser}
                isLoading={creatingUser}
                isDisabled={!userForm.name || !userForm.username || !userForm.password}
              >
                สร้างผู้ใช้
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </DefaultLayout>
  );
}