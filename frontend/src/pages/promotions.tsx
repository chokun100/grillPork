import { useState, useEffect } from 'react'
import DefaultLayout from '@/layouts/default'
import { Promotion } from '@/types'
import { API_BASE_URL } from '@/config/api'
import { Plus, Edit, Trash2, CalendarIcon, Percent, DollarSign, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    type: 'PERCENT' as 'PERCENT' | 'AMOUNT',
    value: '',
    expiresAt: '',
    conditions: { minAdults: '', payAdults: '' },
    daysOfWeek: [] as string[],
    active: true
  })
  const [date, setDate] = useState<Date>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPromotions()
  }, [])

  const fetchPromotions = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/promotions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setPromotions(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching promotions:', error)
      setError('ไม่สามารถโหลดโปรโมชั่นได้')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (error) setError('')
  }

  const handleTypeChange = (value: 'PERCENT' | 'AMOUNT') => {
    setFormData({ ...formData, type: value })
  }

  const handleConditionChange = (field: 'minAdults' | 'payAdults', value: string) => {
    setFormData({
      ...formData,
      conditions: { ...formData.conditions, [field]: value }
    })
  }

  const handleDayChange = (day: string) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
    }))
  }

  const handleActiveChange = (checked: boolean) => {
    setFormData({ ...formData, active: checked })
  }

  const handleDateChange = (date: Date | undefined) => {
    setDate(date)
    setFormData({ ...formData, expiresAt: date ? date.toISOString().split('T')[0] : '' })
  }

  const resetForm = () => {
    setFormData({
      key: '',
      name: '',
      type: 'PERCENT',
      value: '',
      expiresAt: '',
      conditions: { minAdults: '', payAdults: '' },
      daysOfWeek: [],
      active: true
    })
    setDate(undefined)
    setEditingId(null)
    setError('')
  }

  const openModal = (promotion?: Promotion) => {
    if (promotion) {
      setFormData({
        key: promotion.key,
        name: promotion.name,
        type: promotion.type,
        value: promotion.value.toString(),
        expiresAt: promotion.expiresAt || '',
        conditions: {
          minAdults: promotion.conditions?.minAdults?.toString() || '',
          payAdults: promotion.conditions?.payAdults?.toString() || ''
        },
        daysOfWeek: promotion.daysOfWeek || [],
        active: promotion.active
      })
      if (promotion.expiresAt) {
        setDate(new Date(promotion.expiresAt))
      }
      setEditingId(promotion.id)
    } else {
      resetForm()
    }
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.key.trim() || !formData.value.trim()) {
      setError('กรุณากรอกข้อมูลที่จำเป็น: ชื่อ, รหัส, และมูลค่า')
      return
    }

    const conditionsObj: Record<string, number> = {}
    if (formData.conditions.minAdults) {
      const min = parseInt(formData.conditions.minAdults)
      if (min > 0) conditionsObj.minAdults = min
    }
    if (formData.conditions.payAdults) {
      const pay = parseInt(formData.conditions.payAdults)
      if (pay >= 0) conditionsObj.payAdults = pay
    }
    const conditions = Object.keys(conditionsObj).length > 0 ? conditionsObj : undefined

    const data = {
      key: formData.key.trim(),
      name: formData.name.trim(),
      type: formData.type,
      value: parseFloat(formData.value),
      expiresAt: formData.expiresAt || undefined,
      conditions,
      daysOfWeek: formData.daysOfWeek,
      active: formData.active
    }

    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const url = editingId
        ? `${API_BASE_URL}/promotions/${editingId}`
        : `${API_BASE_URL}/promotions`
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        fetchPromotions()
        setIsOpen(false)
        resetForm()
      } else {
        const errData = await response.json()
        setError(errData.error?.message || 'เกิดข้อผิดพลาดในการบันทึก')
      }
    } catch (error) {
      console.error('Error saving promotion:', error)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบโปรโมชั่นนี้?')) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/promotions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        fetchPromotions()
      } else {
        setError('ไม่สามารถลบโปรโมชั่นได้')
      }
    } catch (error) {
      console.error('Error deleting promotion:', error)
      setError('เกิดข้อผิดพลาดในการลบ')
    } finally {
      setLoading(false)
    }
  }

  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  const dayNames: Record<string, string> = {
    MON: 'จันทร์',
    TUE: 'อังคาร',
    WED: 'พุธ',
    THU: 'พฤหัสบดี',
    FRI: 'ศุกร์',
    SAT: 'เสาร์',
    SUN: 'อาทิตย์'
  }

  const isActive = (promotion: Promotion) => promotion.active && (!promotion.expiresAt || new Date(promotion.expiresAt) > new Date())

  return (
    <DefaultLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">จัดการโปรโมชั่น</h1>
            <p className="text-gray-600 mt-1">สร้างและจัดการโปรโมชั่นสำหรับลูกค้า</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มโปรโมชั่นใหม่
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'แก้ไขโปรโมชั่น' : 'เพิ่มโปรโมชั่นใหม่'}</DialogTitle>
                <DialogDescription>
                  กรอกข้อมูลโปรโมชั่นให้ครบถ้วนเพื่อสร้างหรืออัพเดทโปรโมชั่น
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 py-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="key">รหัสโปรโมชั่น <span className="text-red-500">*</span></Label>
                    <Input
                      id="key"
                      name="key"
                      type="text"
                      value={formData.key}
                      onChange={handleInputChange}
                      placeholder="เช่น BUY4PAY3"
                      disabled={!!editingId}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">ชื่อโปรโมชั่น <span className="text-red-500">*</span></Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="เช่น ซื้อ 4 จ่าย 3"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>ประเภทส่วนลด <span className="text-red-500">*</span></Label>
                    <Select value={formData.type} onValueChange={handleTypeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกประเภท" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENT">เปอร์เซ็นต์ (%)</SelectItem>
                        <SelectItem value="AMOUNT">จำนวนเงิน (บาท)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="value">มูลค่าส่วนลด <span className="text-red-500">*</span></Label>
                    <Input
                      id="value"
                      name="value"
                      type="number"
                      value={formData.value}
                      onChange={handleInputChange}
                      placeholder="เช่น 25 สำหรับ 25%"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiresAt">วันหมดอายุ (ไม่บังคับ)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? date.toLocaleDateString('th-TH') : <span>เลือกวันที่</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-foreground">เงื่อนไขการใช้ (ตัวอย่าง: มาทาน 4 จ่าย 3)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="minAdults" className="text-sm font-normal">ต้องมารับประทานอย่างน้อย</Label>
                      <Input
                        id="minAdults"
                        type="number"
                        value={formData.conditions.minAdults}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleConditionChange('minAdults', e.target.value)}
                        placeholder="4"
                        min="1"
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">คน</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="payAdults" className="text-sm font-normal">แต่จ่ายเงินเพียง</Label>
                      <Input
                        id="payAdults"
                        type="number"
                        value={formData.conditions.payAdults}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleConditionChange('payAdults', e.target.value)}
                        placeholder="3"
                        min="0"
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">คน</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">หากไม่ตั้งค่า จะใช้โปรโมชั่นกับทุกการสั่งซื้อ</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-foreground">วันที่จะใช้ได้ (เลือกได้หลายวัน)</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border rounded-md bg-muted/50">
                    {days.map((day) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={day}
                          checked={formData.daysOfWeek.includes(day)}
                          onCheckedChange={() => handleDayChange(day)}
                        />
                        <Label htmlFor={day} className="text-sm font-normal cursor-pointer">
                          {dayNames[day]}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">หากไม่เลือก จะใช้ได้ทุกวัน</p>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-md bg-muted/50">
                  <Label htmlFor="active" className="text-sm font-medium">เปิดใช้งานโปรโมชั่นนี้</Label>
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={handleActiveChange}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
                    ยกเลิก
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'กำลังบันทึก...' : (editingId ? 'อัพเดทโปรโมชั่น' : 'สร้างโปรโมชั่น')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {promotions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="text-lg mb-2">ยังไม่มีโปรโมชั่น</CardTitle>
              <CardDescription>เริ่มสร้างโปรโมชั่นแรกของคุณเพื่อดึงดูดลูกค้า</CardDescription>
              <Button onClick={() => openModal()} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                สร้างโปรโมชั่น
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {promotions.map((promotion) => (
              <Card key={promotion.id} className={cn(isActive(promotion) ? 'border-green-200 bg-green-50/50' : '')}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={promotion.type === 'PERCENT' ? 'secondary' : 'default'}>
                      {promotion.type === 'PERCENT' ? <Percent className="h-3 w-3 mr-1" /> : <DollarSign className="h-3 w-3 mr-1" />}
                      {promotion.type === 'PERCENT' ? 'เปอร์เซ็นต์' : 'จำนวนเงิน'}
                    </Badge>
                    <div>
                      <CardTitle className="text-lg leading-tight">{promotion.name}</CardTitle>
                      <CardDescription className="text-xs">รหัส: {promotion.key}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isActive(promotion) ? 'default' : 'secondary'}>
                      {isActive(promotion) ? 'ใช้งานได้' : 'หมดอายุ'}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => openModal(promotion)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(promotion.id)} disabled={loading}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>มูลค่า: <strong>{promotion.value} {promotion.type === 'PERCENT' ? '%' : 'บาท'}</strong></span>
                  </div>
                  {promotion.expiresAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span>หมดอายุ: <strong>{new Date(promotion.expiresAt).toLocaleDateString('th-TH')}</strong></span>
                    </div>
                  )}
                  {promotion.conditions && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>เงื่อนไข: มาอย่างน้อย <strong>{promotion.conditions.minAdults}</strong> คน จ่าย <strong>{promotion.conditions.payAdults}</strong> คน</span>
                    </div>
                  )}
                  {promotion.daysOfWeek && promotion.daysOfWeek.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span>วัน: <strong>{promotion.daysOfWeek.map(d => dayNames[d]).join(', ')}</strong></span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DefaultLayout>
  )
}