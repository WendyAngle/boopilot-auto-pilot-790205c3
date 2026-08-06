import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ACTIVE_TENANTS } from "@/lib/managed-account-mock";
import { getCurrentUser } from "@/lib/auth";
import { getTenantScope } from "@/lib/tenant-scope";

/**
 * 「分配租户」通用弹窗
 * - 可选项：与顶部租户选择器一致（受 allowedTenantNames 约束）
 * - 默认选中：当前顶部租户作用域；若为「全部租户」则取首个可选项
 * - 新增：有效期至 设置项
 */
export function AssignTenantDialog({
  open,
  onOpenChange,
  count,
  entityLabel = "条数据",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  count: number;
  entityLabel?: string;
  onConfirm: (tenant: { id: string; name: string; expiryDate?: Date }) => void;
}) {
  const user = getCurrentUser();
  const allowed = user?.allowedTenantNames;
  const visibleTenants = allowed
    ? ACTIVE_TENANTS.filter((t) => allowed.includes(t.name))
    : ACTIVE_TENANTS;

  const pickDefault = () => {
    const scope = getTenantScope();
    if (scope && scope !== "all" && visibleTenants.some((t) => t.id === scope)) {
      return scope;
    }
    return visibleTenants[0]?.id ?? "";
  };

  const [value, setValue] = useState<string>(pickDefault);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>();

  useEffect(() => {
    if (open) {
      setValue(pickDefault());
      setExpiryDate(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>分配租户</DialogTitle>
          <DialogDescription>
            将所选 <b>{count}</b> {entityLabel}分配到指定租户。
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              目标租户
              <span className="text-destructive">*</span>
            </Label>
            <Select value={value} onValueChange={setValue}>
              <SelectTrigger className={cn(!value && "border-destructive/50")}>
                <SelectValue placeholder="请选择租户" />
              </SelectTrigger>
              <SelectContent>
                {visibleTenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center justify-between gap-1">
              <span className="flex items-center gap-1">
                有效期至
                <span className="text-destructive">*</span>
              </span>
              {expiryDate && (
                <span className="text-[10px] text-muted-foreground font-normal">
                  默认到所选日的 24:00
                </span>
              )}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !expiryDate && "text-muted-foreground border-destructive/50"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiryDate ? format(expiryDate, "yyyy-MM-dd") : <span>选择过期日期</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiryDate}
                  onSelect={setExpiryDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={!value || !expiryDate}
            onClick={() => {
              const t = visibleTenants.find((x) => x.id === value);
              if (!t || !expiryDate) return;
              onConfirm({ 
                id: t.id, 
                name: t.name, 
                expiryDate: new Date(expiryDate.setHours(23, 59, 59, 999))
              });
            }}
          >
            分配
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
