import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Badge } from "@heroui/badge";
import { KeyIcon, PlusIcon, TrashIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";

interface ApiKey {
  id: string;
  label: string;
  scopes: string[];
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
}

const API_KEY_SCOPES = [
  { key: "admin:*", label: "Admin Full Access" },
  { key: "admin:read", label: "Admin Read Only" },
  { key: "cashier:read", label: "Cashier Read" },
  { key: "cashier:write", label: "Cashier Write" },
  { key: "read-only:read", label: "Read Only" },
];

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newApiKey, setNewApiKey] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/my/apikeys", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.ok) {
        setApiKeys(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
      alert("ไม่สามารถดึงข้อมูล API keys ได้");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!label || selectedScopes.length === 0) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      const response = await fetch("/api/apikeys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          label,
          scopes: selectedScopes,
          expiresAt: expiresAt || null,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        setNewApiKey(data.data.apiKey);
        alert("สร้าง API key สำเร็จ");
        fetchApiKeys();
        setLabel("");
        setSelectedScopes([]);
        setExpiresAt("");
      } else {
        alert(data.error.message || "ไม่สามารถสร้าง API key ได้");
      }
    } catch (error) {
      console.error("Failed to create API key:", error);
      alert("ไม่สามารถสร้าง API key ได้");
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะยกเลิก API key นี้?")) {
      return;
    }

    try {
      const response = await fetch(`/api/apikeys/${id}/revoke`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();
      if (data.ok) {
        alert("ยกเลิก API key สำเร็จ");
        fetchApiKeys();
      } else {
        alert(data.error.message || "ไม่สามารถยกเลิก API key ได้");
      }
    } catch (error) {
      console.error("Failed to revoke API key:", error);
      alert("ไม่สามารถยกเลิก API key ได้");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("คัดลอกไปยังคลิปบอร์ดแล้ว");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">จัดการ API Keys</h1>
        <p className="text-foreground/60">สร้างและจัดการ API keys สำหรับการเข้าถึงระบบ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">API Keys ของคุณ</h2>
                <Button
                  color="primary"
                  startContent={<PlusIcon className="w-4 h-4" />}
                  onPress={onOpen}
                >
                  สร้าง API Key
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="text-center py-8">กำลังโหลด...</div>
              ) : (
                <Table aria-label="API Keys table">
                  <TableHeader>
                    <TableColumn>Label</TableColumn>
                    <TableColumn>Scopes</TableColumn>
                    <TableColumn>สร้างเมื่อ</TableColumn>
                    <TableColumn>หมดอายุ</TableColumn>
                    <TableColumn>สถานะ</TableColumn>
                    <TableColumn>การจัดการ</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <KeyIcon className="w-4 h-4 text-default-400" />
                            <span className="font-medium">{key.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {key.scopes.map((scope) => (
                              <Badge key={scope} size="sm" variant="flat">
                                {scope}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(key.createdAt)}</TableCell>
                        <TableCell>
                          {key.expiresAt ? formatDate(key.expiresAt) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            color={key.revokedAt ? "danger" : "success"}
                            variant="flat"
                          >
                            {key.revokedAt ? "ยกเลิกแล้ว" : "ใช้งานอยู่"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {!key.revokedAt && (
                            <Button
                              isIconOnly
                              size="sm"
                              color="danger"
                              variant="light"
                              onPress={() => handleRevokeApiKey(key.id)}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">ข้อมูลการใช้งาน</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">วิธีการใช้งาน API Key</h3>
                  <p className="text-sm text-foreground/60">
                    ใช้ API key ในส่วนหัวของคำขอ HTTP:
                  </p>
                  <div className="mt-2 p-3 bg-default-100 rounded-lg">
                    <code className="text-sm">
                      Authorization: Bearer YOUR_API_KEY
                    </code>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">สิทธิ์การใช้งาน (Scopes)</h3>
                  <div className="space-y-2">
                    {API_KEY_SCOPES.map((scope) => (
                      <div key={scope.key} className="flex items-center gap-2">
                        <Badge size="sm" variant="flat">
                          {scope.key}
                        </Badge>
                        <span className="text-sm text-foreground/60">
                          {scope.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">ความปลอดภัย</h3>
                  <ul className="text-sm text-foreground/60 space-y-1">
                    <li>• เก็บ API key เป็นความลับ</li>
                    <li>• ไม่ควรเปิดเผยในโค้ดฝั่งไคลเอนต์</li>
                    <li>• ยกเลิก API key ที่ไม่ใช้งานแล้ว</li>
                    <li>• ตั้งค่าวันหมดอายุที่เหมาะสม</li>
                  </ul>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Create API Key Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          <ModalHeader>สร้าง API Key ใหม่</ModalHeader>
          <ModalBody>
            {newApiKey ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-foreground/60 mb-2">
                    API key ของคุณ (แสดงครั้งเดียวเท่านั้น):
                  </p>
                  <div className="p-3 bg-default-100 rounded-lg flex items-center justify-between">
                    <code className="text-sm break-all">{newApiKey}</code>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => copyToClipboard(newApiKey)}
                    >
                      <DocumentDuplicateIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-warning-600">
                  กรุณาบันทึก API key นี้ไว้อย่างปลอดภัย คุณจะไม่สามารถเห็นมันอีกครั้ง
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Input
                  label="Label"
                  placeholder="ใส่ชื่อสำหรับ API key"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
                <Select
                  label="Scopes"
                  placeholder="เลือกสิทธิ์การใช้งาน"
                  selectedKeys={selectedScopes}
                  onSelectionChange={(keys) => setSelectedScopes(Array.from(keys) as string[])}
                  selectionMode="multiple"
                >
                  {API_KEY_SCOPES.map((scope) => (
                    <SelectItem key={scope.key}>
                      {scope.label}
                    </SelectItem>
                  ))}
                </Select>
                <Input
                  label="วันหมดอายุ (ไม่บังคับ)"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              {newApiKey ? "ปิด" : "ยกเลิก"}
            </Button>
            {!newApiKey && (
              <Button color="primary" onPress={handleCreateApiKey}>
                สร้าง API Key
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}